using System.Globalization;
using System.IO;
using System.Text.Json;
#if !WINDOWS
using Microsoft.Maui.Storage;
#endif

namespace FWITD {
    internal sealed class LoadingMessagesDocument {
        public string Culture { get; set; } = "en";
        public int Version { get; set; }
        public List<string> Messages { get; set; } = new();
    }

    /// <summary>
    /// Loads the "Resources/Raw/loading-messages.{culture}.json" bundled assets, falling
    /// back to "en" when the current culture has no dedicated file.
    /// </summary>
    internal static class LoadingMessagesProvider {
        private static readonly JsonSerializerOptions _jsonOpts = new() { PropertyNameCaseInsensitive = true };
        private static readonly Dictionary<string, LoadingMessagesDocument> _cache = new();
        private static readonly object _lock = new object();
        private static readonly Random _random = new Random();

        internal static async Task<LoadingMessagesDocument> GetAsync(string? culture = null) {
            string key = NormalizeCulture(culture);

            lock (_lock) {
                if (_cache.TryGetValue(key, out var cached))
                    return cached;
            }

            var doc = await LoadFromDiskAsync(key)
                ?? (key != "en" ? await LoadFromDiskAsync("en") : null)
                ?? new LoadingMessagesDocument { Culture = "en" };

            lock (_lock) {
                _cache[key] = doc;
            }
            return doc;
        }

        internal static async Task<string> GetRandomMessageAsync(string? culture = null) {
            var doc = await GetAsync(culture);
            if (doc.Messages.Count == 0)
                return "Loading...";

            lock (_lock) {
                return doc.Messages[_random.Next(doc.Messages.Count)];
            }
        }

        private static async Task<LoadingMessagesDocument?> LoadFromDiskAsync(string culture) {
            string fileName = $"loading-messages.{culture}.json";
            try {
#if WINDOWS
                string path = Path.Combine(AppContext.BaseDirectory, fileName);
                if (!File.Exists(path))
                    return null;
                string json = await File.ReadAllTextAsync(path);
#else
                using var stream = await FileSystem.OpenAppPackageFileAsync(fileName);
                using var reader = new StreamReader(stream);
                string json = await reader.ReadToEndAsync();
#endif
                return JsonSerializer.Deserialize<LoadingMessagesDocument>(json, _jsonOpts);
            } catch (FileNotFoundException) {
                return null;
            }
        }

        private static string NormalizeCulture(string? culture) {
            if (string.IsNullOrWhiteSpace(culture))
                culture = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName;
            return culture.ToLowerInvariant();
        }
    }
}
