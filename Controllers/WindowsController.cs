using System.Text.Json.Nodes;

namespace FWITD.Controllers {
    internal class WindowsController {
        // Looks up `key` in the appsettings.json "TypeDictionary" section and types the resolved value.
        // JS usage: await Lobby.postAsync("Windows/TypeKey", { key: "the-email-cf" });
        // appsettings.json: { "PublicTypeWriter": { "the-email-cf": "user@example.com" } }
        public void TypeKey(JsonNode req) {
            var key = req["key"]?.GetValue<string>()
                ?? "Missing 'key'";

            var value = AppSettings.Get<string>($"PublicTypeWriter.{key}")
                ?? $"PublicTypeWriter.{key}";
            TypeWriter.DeleteAll();
            TypeWriter.SimulateKeyboardInput(value, 10);
        }

        // JS usage: await Lobby.postAsync("Windows/Type", { text: "hello world" });
        public void Type(JsonNode req) {
            var text = req["text"]?.GetValue<string>()
                ?? "Missing 'text'";

            var parts = text.Split('\n');
            for (int i = 0; i < parts.Length; i++) {
                if (parts[i].Length > 0)
                    TypeWriter.SimulateKeyboardInput(parts[i], 10);
                if (i < parts.Length - 1)
                    TypeWriter.SimulateKeyPress(0x0D); // VK_RETURN
            }
        }

        // JS usage: await Lobby.postAsync("Windows/ClickAt", { x: 100, y: 200 });
        public void ClickAt(JsonNode req) {
            var x = req["x"]?.GetValue<int>() ?? throw new ArgumentException("Missing 'x'");
            var y = req["y"]?.GetValue<int>() ?? throw new ArgumentException("Missing 'y'");
            var id_webview = req["__owner_id"]?.GetValue<int>() ?? throw new ArgumentException("Missing '__owner_id'");
            var webView = RequestDispatcher.webviews[id_webview] ?? throw new InvalidOperationException("WebView not initialised");

            webView.Dispatcher.Invoke(() => MouseClicker.ClickAt(x, y, webView));
        }

        // JS usage: await Lobby.postAsync("Windows/MoveMouseAt", { x: 100, y: 200 });
        public void MoveMouseAt(JsonNode req) {
            var x = req["x"]?.GetValue<int>() ?? throw new ArgumentException("Missing 'x'");
            var y = req["y"]?.GetValue<int>() ?? throw new ArgumentException("Missing 'y'");
            var id_webview = req["__owner_id"]?.GetValue<int>() ?? throw new ArgumentException("Missing '__owner_id'");
            var webView = RequestDispatcher.webviews[id_webview] ?? throw new InvalidOperationException("WebView not initialised");

            webView.Dispatcher.Invoke(() => MouseClicker.MoveMouseAt(x, y, webView));
        }
    }
}
