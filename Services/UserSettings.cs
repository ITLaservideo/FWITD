using QStorage;
using System.Text.Json;
using SessionData = FWITD.Controllers.Sicurezza.LoginSessionController.UserSession;

namespace FWShellWPF.FWITD.Services {
    internal class UserSettings {
        public static bool UseThisDeviceForNotifications {
            set => AppSettings.Set("Device.UseThisDeviceForNotifications", value);
            get => AppSettings.Get<bool>("Device.UseThisDeviceForNotifications", false);
        }
        private static SessionData current_session = new SessionData();
        public static string UserSession {
            set => current_session = JsonSerializer.Deserialize<SessionData>(value);
            get => JsonSerializer.Serialize(current_session);
        }
        //public static string db_update_version {
        //    get => TG_LocalSettings.Get("db_update_version", "0");
        //}
        //public static bool AutoRestartInterruptedTasks {
        //    get => TG_LocalSettings.Get("AutoRestartInterruptedTasks", false);
        //    set => TG_LocalSettings.Set("AutoRestartInterruptedTasks", value);
        //}
    }
}
