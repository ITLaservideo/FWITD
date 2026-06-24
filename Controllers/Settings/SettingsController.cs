using System;
using System.Text.Json.Nodes;

namespace FWITD.Controllers {
    internal class SettingsController {
        public object Get() {
            return new {
                SomeSetting = true,
                MoreSettings = "pong",
                timestamp = DateTime.UtcNow
            };
        }

        public void SaveDimensions(JsonNode req) {
            var key = req["key"]?.GetValue<string>() ?? throw new ArgumentException("Missing 'key'");
            var Width = req["Width"]?.GetValue<int>() ?? throw new ArgumentException("Missing 'Width'");
            var Height = req["Height"]?.GetValue<int>() ?? throw new ArgumentException("Missing 'Height'");

            AppSettings.Set($"GlobalPreferences.{key}.Width", Width);
            AppSettings.Set($"GlobalPreferences.{key}.Height", Height);
        }
    }
}
