using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

namespace FWITD.Controllers {
    internal class SaveFileController {
        private static readonly Dictionary<string, string> _mimeByExtension = new(StringComparer.OrdinalIgnoreCase) {
            [".pdf"] = "application/pdf",
            [".png"] = "image/png",
            [".jpg"] = "image/jpeg",
            [".jpeg"] = "image/jpeg",
            [".txt"] = "text/plain",
            [".csv"] = "text/csv",
            [".zip"] = "application/zip",
        };

        // JS usage: await Lobby.postAsync("SaveFile/Save", { fileName: "documento.pdf", base64: "..." });
        // Asks for storage permission (needed pre-scoped-storage on Android), then opens the platform's
        // native "save as" picker so the user chooses where the file ends up.
        public async Task<object> Save(JsonNode req) {
            var fileName = req["fileName"]?.GetValue<string>()
                ?? throw new ArgumentException("Missing 'fileName'");
            var base64 = req["base64"]?.GetValue<string>()
                ?? throw new ArgumentException("Missing 'base64'");

            fileName = Path.GetFileName(fileName); // strip any path components sent from JS
            if (fileName.Length == 0)
                throw new ArgumentException("Invalid 'fileName'");

            var bytes = Convert.FromBase64String(base64);

            if (!await FileSaver.RequestStoragePermissionAsync())
                throw new UnauthorizedAccessException("Storage permission was not granted");

            var mimeType = MimeTypeFor(fileName);

            var saved_path = await FileSaver.PickAndSaveAsync(fileName, bytes, mimeType);
            return new { path = saved_path, cancelled = saved_path == null };
        }

        // JS usage: await Lobby.postAsync("SaveFile/Open", { path: rsp.path, fileName: "documento.pdf" });
        // Follow-up call for after the user confirms they want to open a file just saved via Save above.
        public async Task<object> Open(JsonNode req) {
            var path = req["path"]?.GetValue<string>()
                ?? throw new ArgumentException("Missing 'path'");
            var fileName = req["fileName"]?.GetValue<string>() ?? string.Empty;

            var opened = await FileSaver.OpenSavedFileAsync(path, MimeTypeFor(fileName));
            return new { opened };
        }

        private static string MimeTypeFor(string fileName) {
            var extension = Path.GetExtension(fileName);
            return _mimeByExtension.TryGetValue(extension, out var mime) ? mime : "application/octet-stream";
        }
    }
}
