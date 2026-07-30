using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace FWITD {
    public enum LogType {
        None,
        Info,
        Warning,
        Error
    }

    public class Log {
        private static readonly object _lock = new object();
        private static int _weeklyPackStarted = 0;

        public static void log(string what, LogType type = LogType.None) {
            string LogsDirectory = Path.Combine(Directory.GetCurrentDirectory(), "Logs");
            string FilePath = Path.Combine(LogsDirectory, $"FWITD_{DateTime.Now:yyyy-MM-dd}.txt");
            string pre = (type != LogType.None ? $"({type})" : "").PadRight(10);
            string Entry = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}]{pre} {what}{Environment.NewLine}";

            try {
                lock (_lock) {
                    Directory.CreateDirectory(LogsDirectory);
                    File.AppendAllText(FilePath, Entry);
                }
            } catch {
                // logging must never crash the caller
            }

            TryStartWeeklyPack();
        }

        private static void TryStartWeeklyPack() {
            if (Interlocked.Exchange(ref _weeklyPackStarted, 1) != 0) return;
            _ = PackPreviousAsync();
        }

        // Merges every daily log file (except today's) into a single "FWITD_Week_<first>_to_<last>.txt" file.
        // Packed files are deleted afterwards, so a re-run naturally has nothing left to redo.
        public static async Task PackPreviousAsync() {
            try {
                string LogsDirectory = Path.Combine(Directory.GetCurrentDirectory(), "Logs");
                if (!Directory.Exists(LogsDirectory)) return;

                string todayFileName = $"FWITD_{DateTime.Now:yyyy-MM-dd}.txt";

                var dailyFiles = new List<(DateTime date, string path)>();
                foreach (string path in Directory.GetFiles(LogsDirectory, "FWITD_*.txt")) {
                    string fileName = Path.GetFileName(path);
                    if (fileName == todayFileName) continue;
                    string datePart = Path.GetFileNameWithoutExtension(fileName).Substring("FWITD_".Length);
                    if (!DateTime.TryParseExact(datePart, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out DateTime date)) continue;
                    dailyFiles.Add((date, path));
                }
                if (dailyFiles.Count == 0) return; // nothing to pack

                dailyFiles = dailyFiles.OrderBy(f => f.date).ToList();

                var merged = new StringBuilder();
                foreach (var (date, path) in dailyFiles) {
                    merged.AppendLine($"[{date:yyyy-MM-dd} 00:00:00]");
                    merged.Append(await Task.Run(() => File.ReadAllText(path)));
                }

                string mergedText = merged.ToString();
                string suffix = (mergedText.Contains("(Warning)") ? "+Warning" : "") + (mergedText.Contains("(Error)") ? "+Error" : "");

                string PacksDirectory = Path.Combine(LogsDirectory, "Packs");
                string mergedFilePath = Path.Combine(PacksDirectory, $"FWITD_Pack_{dailyFiles[0].date:yyyy-MM-dd}_to_{dailyFiles[dailyFiles.Count - 1].date:yyyy-MM-dd}{suffix}.txt");

                await Task.Run(() => {
                    lock (_lock) {
                        Directory.CreateDirectory(PacksDirectory);
                        File.WriteAllText(mergedFilePath, mergedText);
                        foreach (var (_, path) in dailyFiles) File.Delete(path);
                    }
                });
            } catch {
                // packing must never crash the caller
            }
        }
    }
}
