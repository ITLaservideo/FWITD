using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

namespace FWITD.Controllers {
    internal class AppController {
        private static readonly Dictionary<string, string> _mimeByExtension = new(StringComparer.OrdinalIgnoreCase) {
            [".svg"] = "image/svg+xml",
            [".png"] = "image/png",
            [".jpg"] = "image/jpeg",
            [".jpeg"] = "image/jpeg",
            [".webp"] = "image/webp",
            [".gif"] = "image/gif",
        };

        // JS usage: await Lobby.postAsync("App/GetIconByName", { icon_name: "/search.svg" });
        public async Task<object> GetIconByName(JsonNode req) {
            var icon_name = req["icon_name"]?.GetValue<string>()
                ?? throw new ArgumentException("Missing 'icon_name'");

            var relative_path = icon_name.Replace('\\', '/').TrimStart('/');
            var icons_root = Path.GetFullPath(JSProvider.path_icons);
            var full_path = Path.GetFullPath(Path.Combine(icons_root, relative_path));
            if (!full_path.StartsWith(icons_root, StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("Invalid 'icon_name'");

            var extension = Path.GetExtension(full_path);
            if (!_mimeByExtension.TryGetValue(extension, out var mime))
                throw new ArgumentException($"Unsupported icon extension: {extension}");

            var base64 = await AssetLoader.LoadAssetFileAsBase64Async(full_path);
            return new { src = $"data:{mime};base64,{base64}" };
        }

        // the pdf.js worker's image codecs (see utils/external_libs/pdfjs_wasm/readme.md), handed to it as bytes
        // since pdf.js runs with `useWorkerFetch: false` and there's no URL they could be fetched from
        private static readonly HashSet<string> _pdfjsWasmFiles = new(StringComparer.Ordinal) { "jbig2.wasm", "openjpeg.wasm" };

        // JS usage: await Lobby.postAsync("App/GetPdfJsWasm", { filename: "jbig2.wasm" });
        public async Task<object> GetPdfJsWasm(JsonNode req) {
            var filename = req["filename"]?.GetValue<string>()
                ?? throw new ArgumentException("Missing 'filename'");
            if (!_pdfjsWasmFiles.Contains(filename))
                throw new ArgumentException($"Unknown pdf.js wasm file: {filename}");

            return new { base64 = await AssetLoader.LoadAssetFileAsBase64Async(JSProvider.path_pdfjs_wasm + filename) };
        }
    }
}
