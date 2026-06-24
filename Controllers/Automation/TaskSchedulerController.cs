using DotNet.Utility;
using System;
using System.Collections.Concurrent;
using System.Data;
using System.Linq;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;

namespace FWITD.Controllers.Automation {

    internal enum JobStatus { Pending, Scheduled, Running, Paused, Completed, Failed, Interrupted }

    /// <summary>
    /// Passed to registered job delegates.
    /// Call CheckPause() inside long-running loops to honour pause/interrupt signals.
    /// </summary>
    internal sealed class JobContext {
        private readonly ManualResetEventSlim _pauseGate;
        private readonly JobInfo _job;

        internal JobContext(CancellationToken cancellationToken, ManualResetEventSlim pauseGate, JobInfo job) {
            CancellationToken = cancellationToken;
            _pauseGate = pauseGate;
            _job = job;
        }

        public CancellationToken CancellationToken { get; }

        /// <summary>Blocks while the job is paused; throws OperationCanceledException on interrupt.</summary>
        public void CheckPause() => _pauseGate.Wait(CancellationToken);

        /// <summary>Reports current completion percentage (0–100). Persisted to DB every 5 points.</summary>
        public void UpdateProgress(int percent) {
            _job.Progress = Math.Clamp(percent, 0, 100);
            TaskSchedulerController.PersistJobProgress(_job);
        }
    }

    internal sealed class JobInfo {
        public required string Id { get; init; }
        public required string Name { get; set; }
        public string? Description { get; set; }
        public string? ActionName { get; set; }
        public JobStatus Status { get; set; } = JobStatus.Pending;
        public DateTime CreatedAt { get; init; }
        public DateTime? ScheduledAt { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? Error { get; set; }
        public string? Result { get; set; }
        public int Progress { get; set; } = 0;

        internal int _lastPersistedProgress = -1;
        internal CancellationTokenSource? Cts { get; set; }
        internal ManualResetEventSlim PauseGate { get; } = new ManualResetEventSlim(initialState: true);
        internal Timer? ScheduleTimer { get; set; }
    }

    /// <summary>
    /// Task-scheduler controller — routes as TaskScheduler/&lt;Method&gt;.
    /// Job state is persisted to TS_Jobs (SQL Server); on startup interrupted jobs are
    /// recovered and their status is reset to Interrupted so the client can react.
    ///
    /// Register job delegates in application startup:
    ///   TaskSchedulerController.RegisterAction("myTask", ctx => { ... ctx.CheckPause(); ... });
    ///
    /// Then from JS:
    ///   await Lobby.postAsync("TaskScheduler/CreateJob",   { name: "...", action: "myTask" });
    ///   await Lobby.postAsync("TaskScheduler/ScheduleJob", { id, delayMs: 5000 });
    ///   await Lobby.postAsync("TaskScheduler/StartJob",    { id });
    ///   await Lobby.postAsync("TaskScheduler/PauseJob",    { id });
    ///   await Lobby.postAsync("TaskScheduler/ResumeJob",   { id });
    ///   await Lobby.postAsync("TaskScheduler/InterruptJob",{ id });
    ///   await Lobby.postAsync("TaskScheduler/DeleteJob",   { id });
    ///   await Lobby.postAsync("TaskScheduler/GetJob",      { id });
    ///   await Lobby.postAsync("TaskScheduler/ListJobs");
    ///   await Lobby.postAsync("TaskScheduler/ListActions");
    /// </summary>
    internal class TaskSchedulerController {

        // ── SQL ───────────────────────────────────────────────────────────────────

        private const string SQL_SELECT_ALL = @"
            SELECT Id, Name, Description, ActionName, Status, Progress,
                   CreatedAt, ScheduledAt, StartedAt, CompletedAt, Error, Result
            FROM TS_Jobs ORDER BY CreatedAt;";

        private const string SQL_INSERT = @"
            INSERT INTO TS_Jobs (Id, Name, Description, ActionName, Status, Progress, CreatedAt)
            VALUES (@0, @1, @2, @3, @4, @5, @6);";

        // Updates every persisted field in one shot — used for all state transitions.
        private const string SQL_UPDATE_STATE = @"
            UPDATE TS_Jobs
            SET Status=@0, Progress=@1, ScheduledAt=@2, StartedAt=@3, CompletedAt=@4, Error=@5
            WHERE Id=@6;";

        private const string SQL_UPDATE_PROGRESS = @"
            UPDATE TS_Jobs SET Progress=@0 WHERE Id=@1;";

        private const string SQL_DELETE = @"
            DELETE FROM TS_Jobs WHERE Id=@0;";

        // ── Static state ──────────────────────────────────────────────────────────

        private static readonly ConcurrentDictionary<string, JobInfo> _jobs;
        private static readonly ConcurrentDictionary<string, Func<JobContext, Task>> _actions =
            new(StringComparer.OrdinalIgnoreCase);

        static TaskSchedulerController() {
            _jobs = LoadJobsFromDatabase();
        }

        // ── Registration ──────────────────────────────────────────────────────────

        public static void RegisterAction(string name, Func<JobContext, Task> action) =>
            _actions[name] = action;

        public static void RegisterAction(string name, Action<JobContext> action) =>
            _actions[name] = ctx => Task.Run(() => action(ctx), ctx.CancellationToken);

        // ── Controller endpoints ──────────────────────────────────────────────────

        // POST TaskScheduler/CreateJob  { name, description?, action? }
        public object CreateJob(JsonNode req) {
            var name = req["name"]?.GetValue<string>()
                ?? throw new ArgumentException("name is required");

            var job = new JobInfo {
                Id          = Guid.NewGuid().ToString("N")[..8],
                Name        = name,
                Description = req["description"]?.GetValue<string>(),
                ActionName  = req["action"]?.GetValue<string>(),
                CreatedAt   = DateTime.UtcNow,
            };

            _jobs[job.Id] = job;
            SQL.ExecuteNonQuery(SQL_INSERT, [job.Id, job.Name, (object?)job.Description, (object?)job.ActionName,
                                             job.Status.ToString(), job.Progress, job.CreatedAt]);
            return ToDto(job);
        }

        // POST TaskScheduler/ScheduleJob  { id, runAt? (ISO 8601 UTC), delayMs? }
        public object ScheduleJob(JsonNode req) {
            var job = Resolve(req);

            if (job.Status != JobStatus.Pending)
                throw new InvalidOperationException($"Job '{job.Id}' is {job.Status}; expected Pending");

            var runAtStr = req["runAt"]?.GetValue<string>();
            var delayMs  = req["delayMs"]?.GetValue<double>();

            DateTime runAt;
            if (runAtStr is not null)
                runAt = DateTime.Parse(runAtStr, null, System.Globalization.DateTimeStyles.RoundtripKind);
            else if (delayMs.HasValue)
                runAt = DateTime.UtcNow.AddMilliseconds(delayMs.Value);
            else
                throw new ArgumentException("Either runAt or delayMs is required");

            var delay = runAt - DateTime.UtcNow;
            if (delay < TimeSpan.Zero) delay = TimeSpan.Zero;

            job.ScheduledAt = runAt;
            job.Status = JobStatus.Scheduled;
            job.ScheduleTimer?.Dispose();
            job.ScheduleTimer = new Timer(_ => _ = LaunchAsync(job), null,
                (long)delay.TotalMilliseconds, Timeout.Infinite);

            PersistState(job);
            return ToDto(job);
        }

        // POST TaskScheduler/StartJob  { id }
        public object StartJob(JsonNode req) {
            var job = Resolve(req);

            if (job.Status is not (JobStatus.Pending or JobStatus.Scheduled))
                throw new InvalidOperationException($"Job '{job.Id}' is {job.Status}; expected Pending or Scheduled");

            job.ScheduleTimer?.Dispose();
            job.ScheduleTimer = null;
            _ = LaunchAsync(job);
            return ToDto(job);
        }

        // POST TaskScheduler/PauseJob  { id }
        public object PauseJob(JsonNode req) {
            var job = Resolve(req);

            if (job.Status != JobStatus.Running)
                throw new InvalidOperationException($"Job '{job.Id}' is not Running");

            job.PauseGate.Reset();
            job.Status = JobStatus.Paused;
            PersistState(job);
            return ToDto(job);
        }

        // POST TaskScheduler/ResumeJob  { id }
        public object ResumeJob(JsonNode req) {
            var job = Resolve(req);

            if (job.Status != JobStatus.Paused)
                throw new InvalidOperationException($"Job '{job.Id}' is not Paused");

            job.Status = JobStatus.Running;
            job.PauseGate.Set();
            PersistState(job);
            return ToDto(job);
        }

        // POST TaskScheduler/InterruptJob  { id }
        public object InterruptJob(JsonNode req) {
            var job = Resolve(req);

            if (job.Status is not (JobStatus.Running or JobStatus.Paused or JobStatus.Scheduled))
                throw new InvalidOperationException($"Job '{job.Id}' cannot be interrupted from {job.Status}");

            job.ScheduleTimer?.Dispose();
            job.ScheduleTimer = null;
            job.PauseGate.Set();   // unblock a paused job so the CT throw propagates
            job.Cts?.Cancel();
            job.Status = JobStatus.Interrupted;
            PersistState(job);
            return ToDto(job);
        }

        // POST TaskScheduler/DeleteJob  { id }
        public object DeleteJob(JsonNode req) {
            var job = Resolve(req);

            if (job.Status is JobStatus.Running or JobStatus.Paused) {
                job.PauseGate.Set();
                job.Cts?.Cancel();
            }

            job.ScheduleTimer?.Dispose();
            _jobs.TryRemove(job.Id, out _);
            SQL.ExecuteNonQuery(SQL_DELETE, [job.Id]);
            return new { deleted = true, id = job.Id };
        }

        // GET TaskScheduler/GetJob  { id }
        public object GetJob(JsonNode req) => ToDto(Resolve(req));

        // GET TaskScheduler/ListJobs
        public object ListJobs() =>
            new { jobs = _jobs.Values.OrderBy(j => j.CreatedAt).Select(ToDto).ToArray() };

        // GET TaskScheduler/ListActions
        public object ListActions() =>
            new { actions = _actions.Keys.ToArray() };

        // POST TaskScheduler/UpdateProgress  { id, progress }  — called by the frontend executor
        public object UpdateProgress(JsonNode req) {
            var job = Resolve(req);
            if (job.Status is not (JobStatus.Running or JobStatus.Paused))
                throw new InvalidOperationException($"Job '{job.Id}' is not in a running state");
            job.Progress = Math.Clamp(req["progress"]?.GetValue<int>() ?? throw new ArgumentException("progress is required"), 0, 100);
            PersistJobProgress(job);
            return ToDto(job);
        }

        // POST TaskScheduler/CompleteJob  { id, result? }  — called by the frontend executor on success
        public object CompleteJob(JsonNode req) {
            var job = Resolve(req);
            if (job.Status != JobStatus.Running)
                throw new InvalidOperationException($"Job '{job.Id}' is not Running");
            job.Status      = JobStatus.Completed;
            job.CompletedAt = DateTime.UtcNow;
            job.Progress    = 100;
            job.Result      = req["result"]?.GetValue<string>();
            PersistState(job);
            return ToDto(job);
        }

        // POST TaskScheduler/ContinueJob  { id }  — restart an Interrupted/Failed job from its saved progress
        public object ContinueJob(JsonNode req) {
            var job = Resolve(req);
            if (job.Status is not (JobStatus.Interrupted or JobStatus.Failed))
                throw new InvalidOperationException($"Job '{job.Id}' cannot be continued from {job.Status}");
            _ = LaunchAsync(job);
            return ToDto(job);
        }

        // POST TaskScheduler/FailJob  { id, error }  — called by the frontend executor on error
        public object FailJob(JsonNode req) {
            var job = Resolve(req);
            if (job.Status is not (JobStatus.Running or JobStatus.Paused))
                throw new InvalidOperationException($"Job '{job.Id}' cannot be failed from {job.Status}");
            job.Status      = JobStatus.Failed;
            job.CompletedAt = DateTime.UtcNow;
            job.Error       = req["error"]?.GetValue<string>() ?? "Unknown error";
            PersistState(job);
            return ToDto(job);
        }

        // ── DB persistence helpers ────────────────────────────────────────────────

        internal static void PersistJobProgress(JobInfo job) {
            if (job.Progress - job._lastPersistedProgress < 5 && job.Progress != 100) return;
            SQL.ExecuteNonQuery(SQL_UPDATE_PROGRESS, [job.Progress, job.Id]);
            job._lastPersistedProgress = job.Progress;
        }

        private static void PersistState(JobInfo job) {
            SQL.ExecuteNonQuery(SQL_UPDATE_STATE, [
                job.Status.ToString(),
                job.Progress,
                (object?)job.ScheduledAt,
                (object?)job.StartedAt,
                (object?)job.CompletedAt,
                (object?)job.Error,
                job.Id,
            ]);
        }

        // ── Startup recovery ──────────────────────────────────────────────────────

        private static ConcurrentDictionary<string, JobInfo> LoadJobsFromDatabase() {
            var dict = new ConcurrentDictionary<string, JobInfo>(StringComparer.OrdinalIgnoreCase);
            DataTable dt = SQL.ExecuteQuery(SQL_SELECT_ALL);
            foreach (DataRow row in dt.Rows) {
                var job = MapRowToJob(row);
                // Threads no longer exist after a restart — reset active states.
                if (job.Status is JobStatus.Running or JobStatus.Paused or JobStatus.Scheduled) {
                    job.Status = JobStatus.Interrupted;
                    PersistState(job);
                }
                dict[job.Id] = job;
            }
            return dict;
        }

        private static JobInfo MapRowToJob(DataRow row) => new() {
            Id          = SQL.ToString(row["Id"]),
            Name        = SQL.ToString(row["Name"]),
            Description = SQL.IsNull(row["Description"]) ? null : SQL.ToString(row["Description"]),
            ActionName  = SQL.IsNull(row["ActionName"])  ? null : SQL.ToString(row["ActionName"]),
            Status      = Enum.TryParse<JobStatus>(SQL.ToString(row["Status"]), out var s) ? s : JobStatus.Pending,
            Progress    = SQL.ToInt32(row["Progress"]),
            CreatedAt   = SQL.ToDateTime(row["CreatedAt"]),
            ScheduledAt = SQL.IsNull(row["ScheduledAt"]) ? null : (DateTime?)SQL.ToDateTime(row["ScheduledAt"]),
            StartedAt   = SQL.IsNull(row["StartedAt"])   ? null : (DateTime?)SQL.ToDateTime(row["StartedAt"]),
            CompletedAt = SQL.IsNull(row["CompletedAt"]) ? null : (DateTime?)SQL.ToDateTime(row["CompletedAt"]),
            Error       = SQL.IsNull(row["Error"])       ? null : SQL.ToString(row["Error"]),
            Result      = SQL.IsNull(row["Result"])      ? null : SQL.ToString(row["Result"]),
        };

        // ── Launch ────────────────────────────────────────────────────────────────

        private static async Task LaunchAsync(JobInfo job) {
            job.Cts?.Dispose();
            job.Cts       = new CancellationTokenSource();
            job.PauseGate.Set();
            job.Status    = JobStatus.Running;
            job.StartedAt = DateTime.UtcNow;
            PersistState(job);

            // No registered C# action — frontend executor drives this job to completion.
            if (job.ActionName is null || !_actions.TryGetValue(job.ActionName, out var action))
                return;

            // Server-side action: run it and own the lifecycle.
            try {
                await action(new JobContext(job.Cts.Token, job.PauseGate, job));

                if (job.Status == JobStatus.Running) {
                    job.Status      = JobStatus.Completed;
                    job.CompletedAt = DateTime.UtcNow;
                    job.Progress    = 100;
                }
            } catch (OperationCanceledException) {
                // Status already set to Interrupted by the caller; leave it.
            } catch (Exception ex) {
                job.Status      = JobStatus.Failed;
                job.Error       = ex.Message;
                job.CompletedAt = DateTime.UtcNow;
            }

            PersistState(job);
        }

        // ── Helpers ───────────────────────────────────────────────────────────────

        private static JobInfo Resolve(JsonNode req) {
            var id = req["id"]?.GetValue<string>() ?? throw new ArgumentException("id is required");
            return _jobs.TryGetValue(id, out var job)
                ? job
                : throw new KeyNotFoundException($"Job '{id}' not found");
        }

        private static object ToDto(JobInfo job) => new {
            id          = job.Id,
            name        = job.Name,
            description = job.Description,
            action      = job.ActionName,
            status      = job.Status.ToString(),
            progress    = job.Progress,
            createdAt   = job.CreatedAt,
            scheduledAt = job.ScheduledAt,
            startedAt   = job.StartedAt,
            completedAt = job.CompletedAt,
            error       = job.Error,
            result      = job.Result,
        };
    }
}
