using QStorage;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace FWITD.Controllers.ServerStatus {
    /// <summary>
    /// The ServerStatus dashboard's list of health-check targets: the `CheckForHealth` entries of appsettings.json
    /// (read-only from the UI, edited in the file itself) followed by the ones the user added from the settings popup.
    /// User entries are stored in <see cref="UserSettings"/> (outside the deploy folder) so they survive restarts and redeploys.
    /// </summary>
    internal class ServerStatusController {
        private const string ServersPath = "ServerStatus.Servers";
        private const int MaxServers = 200;
        private const int MaxFieldLength = 2048;

        private sealed class Server {
            public string name { get; set; } = "";
            public string url { get; set; } = "";
        }

        // `debug`: a DEBUG build, where appsettings.json is read from the copy the build puts next to the exe
        // (see WindowsController.OpenAppSettings), so editing the project's one needs a rebuild to show up.
        // JS usage: const { servers, debug } = await Lobby.postAsync("ServerStatus/GetServers", {});  // servers: [{ name, url, readonly }, ...]
        public object GetServers() {
#if DEBUG
            const bool debug = true;
#else
            const bool debug = false;
#endif
            // GetForTemplate, not AppSettings.Get: Get would write a `null` into appsettings.json when the key is missing
            var config = JsonSerializer.Deserialize<List<Server>?>(AppSettings.GetForTemplate("CheckForHealth")) ?? [];

            // UserSettings.Get persists the default when the path is missing: drop the `null` it leaves behind
            var saved = UserSettings.Get<List<Server>?>(ServersPath, null);
            if (saved == null) UserSettings.Remove(ServersPath);

            // a saved list may still hold copies of the appsettings entries (earlier versions seeded it with them)
            var user = (saved ?? []).Where(u => !config.Any(c => c.name == u.name && c.url == u.url));

            var servers = config.Select(s => new { s.name, s.url, @readonly = true })
                .Concat(user.Select(s => new { s.name, s.url, @readonly = false }))
                .ToList();
            return new { servers, debug };
        }

        // Only the user-added servers: the appsettings.json ones are never written from here.
        // JS usage: await Lobby.postAsync("ServerStatus/SaveServers", { servers: [{ name: "x", url: "https://..." }] });
        public void SaveServers(JsonNode req) {
            var array = req["servers"] as JsonArray ?? throw new ArgumentException("Missing 'servers'");
            if (array.Count > MaxServers) throw new ArgumentException($"Too many servers (max {MaxServers})");

            var servers = array.Select((item, i) => {
                var name = item?["name"]?.GetValue<string>()?.Trim();
                var url = item?["url"]?.GetValue<string>()?.Trim();
                if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(url))
                    throw new ArgumentException($"servers[{i}]: 'name' and 'url' are required");
                if (name.Length > MaxFieldLength || url.Length > MaxFieldLength)
                    throw new ArgumentException($"servers[{i}]: 'name'/'url' too long (max {MaxFieldLength})");
                return new Server { name = name, url = url };
            }).ToList();

            UserSettings.Set(ServersPath, servers);
        }
    }
}
