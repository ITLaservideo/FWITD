using QStorage;
using System;
using System.Linq;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

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

        // Switches the CSS theme (persisted), then reloads every webview's current app so it's re-assembled with the new theme vars.
        // JS usage: await Lobby.postAsync("Settings/ChangeTheme", { a_number: 1 /*JSProvider.CSSThemes.vscode_light*/ });
        public async Task ChangeTheme(JsonNode req) {
            var id_theme = req["a_number"]?.GetValue<int>() ?? throw new ArgumentException("Missing 'a_number'");
            if (!Enum.IsDefined(typeof(JSProvider.CSSThemes), id_theme))
                throw new ArgumentException($"Unknown theme: {id_theme}");

            var theme = (JSProvider.CSSThemes)id_theme;
            JSProvider.current_css_theme = theme;
            AppSettings.Set(JSProvider.css_theme_setting, theme.ToString());

            foreach (var (id_webview, app) in AppLoader.current_apps.ToArray())
                await AppLoader.LoadAsync(id_webview, app);
        }
    }
}
