using QStorage;
using System.Text.Json.Nodes;

namespace FWITD.Controllers {
    internal class WindowsController {
        // Looks up `key` in the appsettings.json "PublicTypeWriter" section and types the resolved value.
        // With `account`, the key is read from that entry of "PublicTypeWriter.accounts" instead.
        // JS usage: await Lobby.postAsync("Windows/TypeKey", { key: "cf-the-local-app-url" });
        //           await Lobby.postAsync("Windows/TypeKey", { key: "cf-the-email", account: 1 });
        // appsettings.json: { "PublicTypeWriter": { "cf-the-local-app-url": "...",
        //                     "accounts": [ { "label": "optional", "cf-the-email": "...", "cf-the-password": "..." } ] } }
        public void TypeKey(JsonNode req) {
            var key = req["key"]?.GetValue<string>()
                ?? "Missing 'key'";
            var account = req["account"]?.GetValue<int>();

            string value;
            if (account is int i) {
                var accounts = GetAccounts();
                value = i >= 0 && i < accounts.Count && accounts[i].TryGetValue(key, out var v) && v != null
                    ? v
                    : $"PublicTypeWriter.accounts[{i}].{key}";
            } else {
                value = AppSettings.Get<string>($"PublicTypeWriter.{key}")
                    ?? $"PublicTypeWriter.{key}";
            }
            TypeWriter.DeleteAll();
            TypeWriter.SimulateKeyboardInput(value, 10);
        }

        // Display names of the "PublicTypeWriter.accounts" entries, in order (index = `account` for TypeKey).
        // Only labels are returned - the account values themselves never reach JS.
        // JS usage: (await Lobby.postAsync("Windows/GetTypeWriterAccounts", {})).data  -> ["label or email", ...]
        public object GetTypeWriterAccounts() {
            return GetAccounts().Select((a, i) =>
                a.TryGetValue("label", out var label) && !string.IsNullOrWhiteSpace(label) ? label
                : a.TryGetValue("cf-the-email", out var email) && !string.IsNullOrWhiteSpace(email) ? email
                : $"account {i + 1}"
            ).ToList();
        }

        private static List<Dictionary<string, string>> GetAccounts() {
            return AppSettings.Get("PublicTypeWriter.accounts", new List<Dictionary<string, string>>())
                ?? new List<Dictionary<string, string>>();
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
