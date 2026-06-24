using System;
using System.Collections.Generic;
using System.Text;

namespace FWITD {
    public static class SystemSettings {
        public static string AppVersion {
            get => AppSettings.Get<string>("app-version", "❓");
        }
        public static string db_update_version {
            get => TG_LocalSettings.Get("db_update_version", "❓");
        }
        public static bool AutoRestartInterruptedTasks {
            get => TG_LocalSettings.Get("AutoRestartInterruptedTasks", false);
            set => TG_LocalSettings.Set("AutoRestartInterruptedTasks", value);
        }
    }
}
