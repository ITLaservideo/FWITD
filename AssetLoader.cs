#define USE_JS_PROJECT_FILES
#if !WINDOWS
using Microsoft.Maui.Storage;
#else
using System.IO;
#endif

namespace FWITD {
    internal class AssetLoader {

        /// <summary>
        /// Converts an absolute path to a logical bundle name by taking everything
        /// from the first "FWITD/" segment onward (e.g. "FWITD/ClientApp/styles/foo.css").
        /// </summary>
        private static string ToLogicalName(string path) {
            path = path.Replace('\\', '/');
            while (path.Contains("//"))
                path = path.Replace("//", "/");
            int idx = path.IndexOf("FWITD/", StringComparison.OrdinalIgnoreCase);
            return idx >= 0 ? path[idx..] : Path.GetFileName(path);
        }

#if WPF
        // Release-WPF only: FWITD/ClientApp text/font/image assets are compiled in as EmbeddedResource
        // (see FWShellWPF.csproj) rather than shipped as loose Content files. %(RecursiveDir) in the
        // csproj's LogicalName produces backslashes, so the index below normalizes to the same
        // forward-slash form ToLogicalName() already produces, and looks up case-insensitively since
        // NTFS paths (what ToLogicalName's input is ultimately derived from) are case-insensitive while
        // manifest resource names are an exact string match.
        private static readonly Lazy<Dictionary<string, string>> _embeddedResourceIndex = new(() => {
            var index = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var name in System.Reflection.Assembly.GetExecutingAssembly().GetManifestResourceNames()) {
                index[name.Replace('\\', '/')] = name;
            }
            return index;
        });
        private static bool TryResolveEmbeddedResource(string logicalName, out string actualResourceName) =>
            _embeddedResourceIndex.Value.TryGetValue(logicalName, out actualResourceName!);
        private static async Task<string> ReadEmbeddedResourceTextAsync(string logicalName) {
            if (!TryResolveEmbeddedResource(logicalName, out var actual)) {
                throw new FileNotFoundException($"Embedded resource not found: {logicalName}");
            }
            using var stream = System.Reflection.Assembly.GetExecutingAssembly().GetManifestResourceStream(actual)!;
            using var reader = new StreamReader(stream);
            return await reader.ReadToEndAsync();
        }
        /// <summary>
        /// Embedded-resource counterpart of <c>Directory.GetDirectories(path, "*", AllDirectories)</c> +
        /// <c>Directory.GetFiles(dir, "*{ext}js", TopDirectoryOnly)</c> used by the non-Android/non-WPF
        /// branch of <c>JSProvider.JS.loadAllOtherJSFiles</c>: every embedded js file at any depth under
        /// <paramref name="path"/> (but not directly in <paramref name="path"/> itself, matching
        /// GetDirectories excluding the root), skipping anything under a "components" segment and
        /// any file whose name starts with a dot.
        /// </summary>
        internal static async Task<string> LoadAllOtherEmbeddedJSFilesAsync(string path, string minimized_folder_extension) {
            string logicalPrefix = ToLogicalName(path).TrimEnd('/') + "/";
            var result = new System.Text.StringBuilder();
            foreach (var logicalName in _embeddedResourceIndex.Value.Keys) {
                if (!logicalName.StartsWith(logicalPrefix, StringComparison.OrdinalIgnoreCase)) continue;
                var relative = logicalName[logicalPrefix.Length..];
                var segments = relative.Split('/');
                if (segments.Length < 2) continue; // must be in a descendant directory, not directly under path
                if (segments.Take(segments.Length - 1).Any(s => s.Equals("components", StringComparison.OrdinalIgnoreCase))) continue;
                var last = segments[^1];
                if (last.StartsWith('.')) continue;
                if (!last.EndsWith($"{minimized_folder_extension}js", StringComparison.OrdinalIgnoreCase)) continue;
                if (minimized_folder_extension != ".min." && last.EndsWith(".min.js", StringComparison.OrdinalIgnoreCase)) continue;
                try {
                    result.AppendLine(await ReadEmbeddedResourceTextAsync(logicalName));
                } catch (Exception ex) {
                    System.Diagnostics.Debug.WriteLine($"Error reading embedded resource {logicalName}: {ex.Message}");
                }
            }
            return result.ToString();
        }
#endif

        internal static async Task<string> LoadAssetFileAsync(string full_path_filename) {
#if DEBUG && WINDOWS && USE_JS_PROJECT_FILES
            return await File.ReadAllTextAsync(full_path_filename);
#elif WPF
            return await ReadEmbeddedResourceTextAsync(ToLogicalName(full_path_filename));
#elif WINDOWS
            return File.ReadAllText(full_path_filename);
#else
            //full_path_filename|Android=`/data/user/0/com.companyname.fwshell/files/FWITD/ClientApp/apps_injectable//TemplateTools/TemplateTools.js`
            using var stream = await FileSystem.OpenAppPackageFileAsync(ToLogicalName(full_path_filename));
            using var reader = new StreamReader(stream);
            return await reader.ReadToEndAsync();
#endif
        }

        internal static async Task<string?> LoadAssetFileAsyncIfExists(string full_path_filename) {
#if DEBUG && WINDOWS && USE_JS_PROJECT_FILES
            if (!File.Exists(full_path_filename)) return null;
            return await File.ReadAllTextAsync(full_path_filename);
#elif WPF
            var logicalName = ToLogicalName(full_path_filename);
            return TryResolveEmbeddedResource(logicalName, out _) ? await ReadEmbeddedResourceTextAsync(logicalName) : null;
#elif WINDOWS
            if (!File.Exists(full_path_filename)) return null;
            return File.ReadAllText(full_path_filename);
#else
            var logicalName = ToLogicalName(full_path_filename);
            try {
                using var stream = await FileSystem.OpenAppPackageFileAsync(logicalName);
                using var reader = new StreamReader(stream);
                return await reader.ReadToEndAsync();
            } catch (FileNotFoundException) {
                return null;
            }
#endif
        }

        internal static async Task<string> LoadAssetFileAsBase64Async(string filename) {
#if DEBUG && WINDOWS && USE_JS_PROJECT_FILES
            var bytes = await File.ReadAllBytesAsync(filename);
            return Convert.ToBase64String(bytes);
#elif WPF
            var logicalName = ToLogicalName(filename);
            if (!TryResolveEmbeddedResource(logicalName, out var actual)) {
                throw new FileNotFoundException($"Embedded resource not found: {logicalName}");
            }
            using var stream = System.Reflection.Assembly.GetExecutingAssembly().GetManifestResourceStream(actual)!;
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms);
            return Convert.ToBase64String(ms.ToArray());
#elif WINDOWS
            var bytes = File.ReadAllBytes(filename);
            return Convert.ToBase64String(bytes);
#else
            using var stream = await FileSystem.OpenAppPackageFileAsync(ToLogicalName(filename));
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms);
            return Convert.ToBase64String(ms.ToArray());
#endif
        }

        internal static async Task<string> LoadFileAsBase64Async(string filename) {
            string path = Path.Combine(AppContext.BaseDirectory, filename);
            using var stream = File.OpenRead(path);
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms);
            return Convert.ToBase64String(ms.ToArray());
        }

        private static object access_locks_streams = new object();
        private static readonly Dictionary<string, FileStream> _lockStreams = new Dictionary<string, FileStream>();
#if WINDOWS
        private static readonly string folder_path_cache = Path.Combine(Path.GetTempPath(),
            new Guid("656ae83f-8ace-4d71-a515-181e9399531e").ToString());
#else
        private static readonly string folder_path_cache = Path.Combine(FileSystem.CacheDirectory,
            new Guid("656ae83f-8ace-4d71-a515-181e9399531e").ToString());
#endif
        internal static async Task<string> SaveToTempFileAsync(string html, string fileName = "demo.html") {
            var tempPath = Path.Combine(folder_path_cache, fileName);
            if (!Directory.Exists(folder_path_cache)) {
                Directory.CreateDirectory(folder_path_cache);
            }
            if (!File.Exists(tempPath) || await File.ReadAllTextAsync(tempPath) != html) {
                lock (access_locks_streams) {
                    if (_lockStreams.ContainsKey(fileName)) {
                        _lockStreams[fileName].Dispose();
                        _lockStreams.Remove(fileName);
                    }
                }
                await File.WriteAllTextAsync(tempPath, html);
            }
            EnsureReadLock(fileName, tempPath);
            return tempPath;
        }
        private static void EnsureReadLock(string fileName, string tempPath) {
            lock (access_locks_streams) {
                if (!_lockStreams.ContainsKey(fileName)) {
                    _lockStreams.Add(fileName, new FileStream(
                        tempPath,
                        FileMode.Open,
                        FileAccess.Read,
                        FileShare.Read       // allow reading, block writing/deleting, as long as the app is alive it serves the files to the webview
                    ));
                }
            }
        }
        // Ordinary (non-shared) DataCipher key slot, meaningful only within this app's own IKeyStore.
        private const int TempCacheSigningKeySlot = 0;
        private static bool _keyStoreReady;
        // PreloadAsync's real await means two concurrent WebView navigations could otherwise both see
        // _keyStoreReady == false and race to create/overwrite the signing key; this lock keeps
        // initialization idempotent (the sync version this replaced had no yield point, so no race existed).
        private static readonly SemaphoreSlim _keyStoreInitLock = new(1, 1);
        private static async Task EnsureKeyStoreReadyAsync() {
            if (_keyStoreReady) return;
            await _keyStoreInitLock.WaitAsync();
            try {
                if (_keyStoreReady) return;
                var store = new SStorageKeyStore();
                await store.PreloadAsync(TempCacheSigningKeySlot);
                DataCipher.KeyManager.Store = store;
                if (!DataCipher.KeyManager.Store.Exists(TempCacheSigningKeySlot)) {
                    DataCipher.KeyManager.CreatePrivateKey(TempCacheSigningKeySlot);
                }
                _keyStoreReady = true;
            } finally {
                _keyStoreInitLock.Release();
            }
        }
        private static string BuildCanonicalFingerprint(string cache_id, string htmlContent, string jsContent, string cssContent) =>
            string.Join('\n', cache_id,
                DataCipher.Hashing.Hash256(htmlContent),
                DataCipher.Hashing.Hash256(jsContent),
                DataCipher.Hashing.Hash256(cssContent));
        /// <summary>
        /// Checks whether a previously built {file_name}.html/.js/.css triple (from a prior process run)
        /// still matches <paramref name="cache_id"/> and hasn't been altered on disk since it was signed
        /// by <see cref="WriteIntegritySignatureAsync"/>. Unlike a plain checksum, forging a match
        /// requires this app's own RSA private key (held in <see cref="SStorageKeyStore"/>), not just
        /// write access to the temp folder.
        /// </summary>
        /// <returns>the temp .html path if it can be reused as-is, otherwise null (caller must rebuild).</returns>
        internal static async Task<string?> TryGetVerifiedTempFileAsync(string file_name, string cache_id) {
            await EnsureKeyStoreReadyAsync();
            var sig_path = Path.Combine(folder_path_cache, $"{file_name}.integrity");
            if (!File.Exists(sig_path)) return null;
            var html_path = Path.Combine(folder_path_cache, $"{file_name}.html");
            var js_path = Path.Combine(folder_path_cache, $"{file_name}.js");
            var css_path = Path.Combine(folder_path_cache, $"{file_name}.css");
            if (!File.Exists(html_path) || !File.Exists(js_path) || !File.Exists(css_path)) return null;

            // Lock out other writers BEFORE reading the content below — otherwise a concurrent
            // process could swap the files in the gap between "hash checks out" and "lock acquired",
            // serving different bytes than the ones that were actually verified.
            EnsureReadLock($"{file_name}.html", html_path);
            EnsureReadLock($"{file_name}.js", js_path);
            EnsureReadLock($"{file_name}.css", css_path);

            var signed = await File.ReadAllTextAsync(sig_path);
            if (!DataCipher.KeyManager.VerifyData(TempCacheSigningKeySlot, signed)) return null; // signature itself doesn't check out

            var signedParts = signed.Split(':');
            if (signedParts.Length != 2) return null;
            string signedFingerprint;
            try {
                signedFingerprint = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(signedParts[1]));
            } catch (FormatException) {
                return null;
            }

            var currentFingerprint = BuildCanonicalFingerprint(cache_id,
                await File.ReadAllTextAsync(html_path),
                await File.ReadAllTextAsync(js_path),
                await File.ReadAllTextAsync(css_path));
            if (signedFingerprint != currentFingerprint) return null; // on-disk content no longer matches what was signed
            return html_path;
        }
        /// <summary>
        /// Signs a fingerprint of the just-built html/js/css with this app's own RSA key, alongside
        /// <paramref name="cache_id"/>, so a later process run can verify a match via
        /// <see cref="TryGetVerifiedTempFileAsync"/> instead of re-running asset loading and
        /// <c>linkJSToFWHTML</c>.
        /// </summary>
        internal static async Task WriteIntegritySignatureAsync(string file_name, string cache_id, string htmlContent, string jsContent, string cssContent) {
            await EnsureKeyStoreReadyAsync();
            var sig_path = Path.Combine(folder_path_cache, $"{file_name}.integrity");
            var fingerprint = BuildCanonicalFingerprint(cache_id, htmlContent, jsContent, cssContent);
            var signed = DataCipher.KeyManager.SignData(TempCacheSigningKeySlot, fingerprint);
            if (signed != null) {
                await File.WriteAllTextAsync(sig_path, signed);
            }
        }
    }
}
