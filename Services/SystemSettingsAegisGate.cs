using FWITD;
using System;
using System.Collections.Generic;
using System.Text;

namespace FWITD.Services {
    public static class SystemSettings {
        public static string AppVersion {
            get => AppSettings.Get<string>("app-version", "❓");
        }
        public static string db_update_version {
            get => TG_LocalSettings.Get("db_update_version", "❓");
        }
    }
}
