using System;

namespace FWITD.Controllers {
    // Holds a file handed to the app by the OS ("Open with" on Windows, an ACTION_VIEW intent on
    // Android, ...) until the JS app that handles it asks for it on startup.
    internal class OpenedFileController {
        private static readonly object _lock = new();
        private static (string fileName, byte[] bytes)? _pending;

        internal static void SetPending(string fileName, byte[] bytes) {
            lock (_lock) {
                _pending = (fileName, bytes);
            }
        }

        // JS usage: const rsp = await Lobby.postAsync("OpenedFile/TakePending");
        //           if (rsp?.base64) { const { base64, fileName } = rsp; ... }
        // Returns null (no base64/fileName in the response) when nothing is pending. The file is consumed, so a later reload of the
        // same page starts empty instead of re-opening it.
        public object? TakePending() {
            lock (_lock) {
                if (_pending is not { } pending)
                    return null;
                _pending = null;
                return new {
                    fileName = pending.fileName,
                    base64 = Convert.ToBase64String(pending.bytes),
                };
            }
        }
    }
}
