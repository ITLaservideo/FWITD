using System.Text.Json.Nodes;

namespace FWITD.Controllers {
    internal class AppRouterController {
        // Switches the app/page/injectable app currently shown in the calling webview.
        // JS usage: await Lobby.postAsync("AppRouter/Navigate", { where: "GestionaleDistributore" });
        public async Task Navigate(JsonNode req) {
            var where = req["where"]?.GetValue<string>() ?? throw new ArgumentException("Missing 'where'");
            var id_webview = req["__owner_id"]?.GetValue<int>() ?? throw new ArgumentException("Missing '__owner_id'");

            if (!Enum.TryParse<StartApp>(where, ignoreCase: true, out var app))
                throw new ArgumentException($"Unknown app: {where}");

            await AppLoader.LoadAsync(id_webview, app);
        }

        // Terminates the whole app (not just the calling webview).
        // JS usage: await Lobby.postAsync("AppRouter/CloseApp");
        public Task CloseApp() {
#if WPF && WINDOWS
            System.Windows.Application.Current.Dispatcher.Invoke(() => System.Windows.Application.Current.Shutdown());
#else
            Microsoft.Maui.Controls.Application.Current?.Quit();
#endif
            return Task.CompletedTask;
        }
    }
}
