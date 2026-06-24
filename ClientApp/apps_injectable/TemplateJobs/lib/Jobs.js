/**
 * JobExecutor — frontend side of the TaskScheduler.
 *
 * Loaded automatically before TemplateJobs.js because JSProvider.loadAllOtherJSFiles
 * injects every JS file found in subdirectories of the app folder.
 *
 * Usage:
 *   const executor = new JobExecutor()
 *       .register('MyTask', async ctx => {
 *           for (let i = 1; i <= 10; i++) {
 *               await ctx.checkPause();           // blocks while Paused, throws on Interrupted
 *               await ctx.sleep(300);
 *               await ctx.updateProgress(i * 10);
 *           }
 *       });
 *
 *   // On every poll cycle:
 *   executor.tick(jobsArray);
 */
class JobExecutor {
    #actions = new Map()   // actionName → async (ctx) => void
    #running = new Map()   // jobId      → AbortController

    /** Register a named async action. Returns `this` for chaining. */
    register(name, fn) {
        this.#actions.set(name, fn);
        return this;
    }

    /**
     * Call on every poll with the latest jobs array from TaskScheduler/ListJobs.
     * Starts newly-running jobs that have a JS action and aren't already executing.
     * Aborts handles for jobs that left the Running state externally (Interrupted etc.).
     */
    tick(jobs) {
        const runningIds = new Set(jobs.filter(j => j.status === 'Running').map(j => j.id));

        for (const job of jobs) {
            if (job.status === 'Running' && this.#actions.has(job.action) && !this.#running.has(job.id)) {
                this.#launch(job);
            }
        }

        for (const id of this.#running.keys()) {
            if (!runningIds.has(id)) {
                this.#running.get(id).abort();
                this.#running.delete(id);
            }
        }
    }

    // ── Private ───────────────────────────────────────────────────────────────

    #launch(job) {
        const controller = new AbortController();
        this.#running.set(job.id, controller);

        const ctx = {
            /** Progress at the moment the action starts — use to resume from a saved position. */
            progress: job.progress ?? 0,
            /** Resolves immediately when Running; loops while Paused; throws AbortError on Interrupted. */
            checkPause: () => JobExecutor.#pollUntilRunning(job.id, controller.signal),
            /** Reports progress (0–100) to the backend. Silent no-op if already aborted. */
            updateProgress: (pct) => JobExecutor.#pushProgress(job.id, pct, controller.signal),
            /** Abortable sleep helper — throws AbortError if interrupted mid-wait. */
            sleep: (ms) => JobExecutor.#abortableSleep(ms, controller.signal),
        };

        this.#actions.get(job.action)(ctx)
            .then(async () => {
                this.#running.delete(job.id);
                if (controller.signal.aborted) return;
                try {
                    await Lobby.postAsync('TaskScheduler/CompleteJob', { id: job.id });
                } catch (_) { /* job may have been interrupted between last step and here */ }
            })
            .catch(async (err) => {
                this.#running.delete(job.id);
                if (controller.signal.aborted || err?.name === 'AbortError') return;
                try {
                    await Lobby.postAsync('TaskScheduler/FailJob', { id: job.id, error: err?.message ?? String(err) });
                } catch (_) { }
            });
    }

    static async #pollUntilRunning(jobId, signal) {
        while (true) {
            if (signal.aborted) throw new DOMException('Job interrupted', 'AbortError');
            const res = await Lobby.postAsync('TaskScheduler/GetJob', { id: jobId });
            if (res.status === 'Interrupted') throw new DOMException('Job interrupted', 'AbortError');
            if (res.status === 'Running') return;
            if (res.status !== 'Paused') return; // terminal state — tick() will clean up
            await JobExecutor.#abortableSleep(400, signal);
        }
    }

    static async #pushProgress(jobId, pct, signal) {
        if (signal.aborted) return;
        try {
            await Lobby.postAsync('TaskScheduler/UpdateProgress', { id: jobId, progress: pct });
        } catch (_) { }
    }

    static #abortableSleep(ms, signal) {
        return new Promise((resolve, reject) => {
            if (signal.aborted) return reject(new DOMException('Job interrupted', 'AbortError'));
            const id = setTimeout(resolve, ms);
            signal.addEventListener('abort', () => { clearTimeout(id); reject(new DOMException('Job interrupted', 'AbortError')); }, { once: true });
        });
    }
}
