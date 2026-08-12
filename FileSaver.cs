using System;
using System.IO;
using System.Threading.Tasks;
#if !WPF
using Microsoft.Maui.ApplicationModel;
using Microsoft.Maui.Storage;
#endif
#if ANDROID
using FWShellMAUI;
#elif IOS || MACCATALYST
using Foundation;
using UIKit;
#elif WPF
using Microsoft.Win32;
#elif WINDOWS
using Windows.Storage.Pickers;
using WinRT.Interop;
#endif

namespace FWITD {
    /// <summary>
    /// Lets JS-initiated saves (see <see cref="FWITD.Controllers.SaveFileController"/>) hand bytes to the
    /// user's chosen location via each platform's native "save as" flow (Storage Access Framework on
    /// Android, the document picker's export mode on iOS/MacCatalyst, FileSavePicker on Windows).
    /// </summary>
    internal static class FileSaver {
        /// <summary>
        /// Requests whatever permission the platform needs to write to arbitrary device storage.
        /// The SAF/document-picker/FileSavePicker flows below are all OS-mediated and need no app-level
        /// permission on modern OS versions - this only matters on Android before scoped storage (API &lt; 29).
        /// </summary>
        internal static async Task<bool> RequestStoragePermissionAsync() {
#if ANDROID
            if (Android.OS.Build.VERSION.SdkInt >= Android.OS.BuildVersionCodes.Q)
                return true; // scoped storage: writes go through the SAF picker below, no runtime permission needed
            var status = await Permissions.CheckStatusAsync<Permissions.StorageWrite>();
            if (status != PermissionStatus.Granted)
                status = await Permissions.RequestAsync<Permissions.StorageWrite>();
            return status == PermissionStatus.Granted;
#else
            return true;
#endif
        }

        /// <summary>
        /// Opens the platform's "save as" picker for <paramref name="fileName"/> and writes <paramref name="bytes"/>
        /// to wherever the user chose. Returns the saved location, or null if the user cancelled the picker.
        /// </summary>
        internal static async Task<string?> PickAndSaveAsync(string fileName, byte[] bytes, string mimeType) {
#if ANDROID
            return await SaveOnAndroidAsync(fileName, bytes);
#elif IOS || MACCATALYST
            return await SaveOnAppleAsync(fileName, bytes);
#elif WPF
            return await SaveOnWpfAsync(fileName, bytes);
#elif WINDOWS
            return await SaveOnWindowsAsync(fileName, bytes);
#else
            throw new PlatformNotSupportedException("Saving to a user-chosen location isn't supported on this platform.");
#endif
        }

        /// <summary>
        /// Opens the file at <paramref name="savedPath"/> (as returned by <see cref="PickAndSaveAsync"/>)
        /// with whatever app the OS considers the default handler for <paramref name="mimeType"/>.
        /// Returns false if no handler was found or the save location can no longer be resolved.
        /// </summary>
        internal static Task<bool> OpenSavedFileAsync(string savedPath, string mimeType) {
#if ANDROID
            return Task.FromResult(OpenOnAndroid(savedPath, mimeType));
#elif IOS || MACCATALYST
            return OpenOnAppleAsync(savedPath);
#elif WPF
            return Task.FromResult(OpenOnWpf(savedPath));
#elif WINDOWS
            return OpenOnWindowsAsync(savedPath);
#else
            return Task.FromResult(false);
#endif
        }

#if ANDROID
        private static async Task<string?> SaveOnAndroidAsync(string fileName, byte[] bytes) {
            var activity = Platform.CurrentActivity as MainActivity
                ?? throw new InvalidOperationException("No current Android activity");

            var uri = await MainThread.InvokeOnMainThreadAsync(() => activity.PickSaveLocationAsync(fileName));
            if (uri == null) return null;

            var resolver = Android.App.Application.Context.ContentResolver
                ?? throw new InvalidOperationException("No ContentResolver available");
            using var stream = resolver.OpenOutputStream(uri)
                ?? throw new IOException($"Unable to open output stream for {uri}");
            await stream.WriteAsync(bytes, 0, bytes.Length);
            return uri.ToString();
        }

        private static bool OpenOnAndroid(string uriString, string mimeType) {
            var activity = Platform.CurrentActivity as MainActivity
                ?? throw new InvalidOperationException("No current Android activity");

            var uri = Android.Net.Uri.Parse(uriString);
            var intent = new Android.Content.Intent(Android.Content.Intent.ActionView);
            intent.SetDataAndType(uri, mimeType);
            intent.AddFlags(Android.Content.ActivityFlags.GrantReadUriPermission);
            intent.AddFlags(Android.Content.ActivityFlags.NewTask);
            try {
                activity.StartActivity(intent);
                return true;
            } catch (Android.Content.ActivityNotFoundException) {
                return false;
            }
        }
#elif IOS || MACCATALYST
        private static async Task<string?> SaveOnAppleAsync(string fileName, byte[] bytes) {
            // UIDocumentPickerViewController's export mode copies from an existing file URL, so the
            // bytes need a temporary source file on disk before the picker can hand it off.
            var temp_path = Path.Combine(FileSystem.CacheDirectory, fileName);
            await File.WriteAllBytesAsync(temp_path, bytes);
            var source_url = NSUrl.FromFilename(temp_path);

            var tcs = new TaskCompletionSource<string?>();
            await MainThread.InvokeOnMainThreadAsync(() => {
                var picker = new UIDocumentPickerViewController(new[] { source_url }, UIDocumentPickerMode.ExportToService);
                picker.DidPickDocument += (_, e) => tcs.TrySetResult(e.Url?.Path);
                picker.WasCancelled += (_, __) => tcs.TrySetResult(null);

                var controller = Platform.GetCurrentUIViewController()
                    ?? throw new InvalidOperationException("No current view controller to present the document picker from");
                controller.PresentViewController(picker, true, null);
            });
            return await tcs.Task;
        }

        private static Task<bool> OpenOnAppleAsync(string path) {
            var tcs = new TaskCompletionSource<bool>();
            MainThread.BeginInvokeOnMainThread(() => {
                try {
                    var controller = Platform.GetCurrentUIViewController();
                    if (controller == null) {
                        tcs.TrySetResult(false);
                        return;
                    }
                    var interaction = UIDocumentInteractionController.FromUrl(NSUrl.FromFilename(path));
                    tcs.TrySetResult(interaction.PresentPreview(true));
                } catch {
                    tcs.TrySetResult(false);
                }
            });
            return tcs.Task;
        }
#elif WPF
        private static Task<string?> SaveOnWpfAsync(string fileName, byte[] bytes) {
            var extension = Path.GetExtension(fileName);
            var dialog = new SaveFileDialog {
                FileName = Path.GetFileNameWithoutExtension(fileName),
                DefaultExt = extension,
                AddExtension = true,
                Filter = string.IsNullOrEmpty(extension)
                    ? "All files (*.*)|*.*"
                    : $"{extension.TrimStart('.').ToUpperInvariant()} files (*{extension})|*{extension}",
            };

            var owner = System.Windows.Application.Current?.MainWindow;
            var picked = owner != null ? dialog.ShowDialog(owner) : dialog.ShowDialog();
            if (picked != true) return Task.FromResult<string?>(null);

            File.WriteAllBytes(dialog.FileName, bytes);
            return Task.FromResult<string?>(dialog.FileName);
        }

        private static bool OpenOnWpf(string path) {
            try {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(path) { UseShellExecute = true });
                return true;
            } catch {
                return false;
            }
        }
#elif WINDOWS
        private static async Task<string?> SaveOnWindowsAsync(string fileName, byte[] bytes) {
            var picker = new FileSavePicker();
            var window = Microsoft.Maui.Controls.Application.Current!.Windows[0].Handler!.PlatformView as Microsoft.UI.Xaml.Window
                ?? throw new InvalidOperationException("No current window to attach the file picker to");
            InitializeWithWindow.Initialize(picker, WindowNative.GetWindowHandle(window));

            var extension = Path.GetExtension(fileName);
            picker.FileTypeChoices.Add(
                string.IsNullOrEmpty(extension) ? "File" : extension.TrimStart('.').ToUpperInvariant(),
                new System.Collections.Generic.List<string> { string.IsNullOrEmpty(extension) ? ".dat" : extension });
            picker.SuggestedFileName = Path.GetFileNameWithoutExtension(fileName);

            var file = await picker.PickSaveFileAsync();
            if (file == null) return null;

            await Windows.Storage.FileIO.WriteBytesAsync(file, bytes);
            return file.Path;
        }

        private static async Task<bool> OpenOnWindowsAsync(string path) {
            try {
                var file = await Windows.Storage.StorageFile.GetFileFromPathAsync(path);
                return await Windows.System.Launcher.LaunchFileAsync(file);
            } catch {
                return false;
            }
        }
#endif
    }
}
