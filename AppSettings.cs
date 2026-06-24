using System.IO;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
#if !WINDOWS
using Microsoft.Maui.Storage;
#endif

namespace FWITD {
    internal static class AppSettings {
#if WINDOWS
        private static readonly string _filePath = Path.Combine(Directory.GetCurrentDirectory(), "appsettings.json");
#else
        private static readonly string _filePath = Path.Combine(FileSystem.AppDataDirectory, "appsettings.json");
#endif

        private static JObject _cache;
        private static readonly object _lock = new object();

        /// <summary>
        /// Loads the JSON file into memory (lazy-loaded).
        /// </summary>
        private static JObject Json {
            get {
                if (_cache != null)
                    return _cache;

                lock (_lock) {
#if WINDOWS
                    if (!File.Exists(_filePath))
                        File.WriteAllText(_filePath, "{}", Encoding.UTF8);
#else
                    try {
                        string seed = Task.Run(async () => {
                            using var stream = await FileSystem.OpenAppPackageFileAsync("appsettings.json");
                            using var reader = new StreamReader(stream, Encoding.UTF8);
                            return await reader.ReadToEndAsync();
                        }).GetAwaiter().GetResult();
                        File.WriteAllText(_filePath, seed, Encoding.UTF8);
                    } catch {
                        if (!File.Exists(_filePath))
                            File.WriteAllText(_filePath, "{}", Encoding.UTF8);
                    }
#endif
                    var jsonText = File.ReadAllText(_filePath, Encoding.UTF8);
                    _cache = JObject.Parse(jsonText);
                    return _cache;
                }
            }
        }

        /// <summary>
        /// Gets a value from appsettings.json using a JSON path.
        /// </summary>
        /// <param name="jsonPath">
        /// Dot-separated path into the JSON object. Examples:
        /// <list type="bullet">
        ///   <item><c>"ServerUrl"</c> — top-level key</item>
        ///   <item><c>"Database.Host"</c> — nested key</item>
        ///   <item><c>"Logging.Level"</c> — nested key</item>
        /// </list>
        /// </param>
        /// <param name="defaultValue">Returned when the path does not exist.</param>
        public static T Get<T>(string jsonPath, T defaultValue = default(T)) {
            JToken token = Json.SelectToken(jsonPath);
            if (token == null) {
                Set(jsonPath, defaultValue);
                return defaultValue;
            }

            return token.ToObject<T>();
        }

        /// <summary>
        /// Resolves a value for JS template substitution (see JSProvider's
        /// <c>{{@AppSettings.key}}</c> placeholders). Scalars render as their plain string
        /// form (for embedding inside a JS template-literal); arrays/objects render as raw
        /// JSON (for embedding as a JS literal without surrounding quotes) since
        /// <see cref="Get{T}"/>'s <c>ToObject&lt;string&gt;</c> conversion cannot coerce them.
        /// </summary>
        public static string GetForTemplate(string jsonPath) {
            JToken token = Json.SelectToken(jsonPath);
            if (token == null)
                return "null";

            return token.Type is JTokenType.Array or JTokenType.Object
                ? token.ToString(Formatting.None)
                : token.ToObject<string>();
        }

        /// <summary>
        /// Sets a value in appsettings.json and writes the file back to disk.
        /// </summary>
        public static void Set<T>(string jsonPath, T value) {
            lock (_lock) {
                var token = Json.SelectToken(jsonPath);

                if (token == null) {
                    // Create missing path segments
                    CreatePath(Json, jsonPath).Replace(value == null ? JValue.CreateNull() : JToken.FromObject(value));
                } else {
                    token.Replace(value == null ? JValue.CreateNull() : JToken.FromObject(value));
                }

                File.WriteAllText(_filePath, Json.ToString(Formatting.Indented), Encoding.UTF8);
            }
        }

        /// <summary>
        /// Creates missing JSON path segments (C# 7.3 compatible).
        /// </summary>
        private static JToken CreatePath(JObject root, string path) {
            string[] parts = path.Split('.');
            JToken current = root;

            foreach (var part in parts) {
                var next = current[part];
                if (next == null) {
                    var newObj = new JObject();
                    ((JObject)current).Add(part, newObj);
                    current = newObj;
                } else {
                    current = next;
                }
            }

            return current;
        }
    }
}
