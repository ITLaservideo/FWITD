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

        internal static async Task<string> LoadAssetFileAsync(string full_path_filename) {
#if DEBUG && WINDOWS && USE_JS_PROJECT_FILES
            return await File.ReadAllTextAsync(full_path_filename);
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

        private static readonly string folder_path_cache = Path.Combine(FileSystem.CacheDirectory,
            new Guid("656ae83f-8ace-4d71-a515-181e9399531e").ToString());
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
            return tempPath;
        }
    }
}
