using FWITD;
#if WPF && WINDOWS
using FWShellWPF.Windows;
#endif
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;

namespace FM32_25.WebViewUi {
    internal class Ui {
        public enum TypeLog {
            none,
            info,
            warn,
            danger,
            success
        }
#if WPF && WINDOWS
        private const int id_main_webview = (int)IDWebviews.MainWindow;
#else
        // MAUI never registers a second webview like WPF's ExtraWindow, so 0 is always "the" webview.
        private const int id_main_webview = 0;
#endif
        public static void log(string what, TypeLog type = TypeLog.none, int to_who = 0) {
            var webview = RequestDispatcher.webviews.ContainsKey(to_who) ? RequestDispatcher.webviews[to_who] : RequestDispatcher.webviews[id_main_webview];
            var encoded_what = JsonSerializer.Serialize(what);
            // type.ToString() must be JSON-encoded too - interpolating it bare produced
            // `window.live_logger.log("...",warn)`, an unquoted identifier the page never
            // defined, which threw "warn is not defined" and silently dropped every log line.
            var encoded_type = JsonSerializer.Serialize(type.ToString());
            var script = $"(() => {{ window.live_logger?.log({encoded_what},{encoded_type}); }})();";
            // sendCommand()/DataReceivedHandler call this from background threads (Task.Run / SerialPort.DataReceived),
            // but WebView2/MAUI WebView are UI-affinity objects - touching them off their owning thread throws.
#if WPF && WINDOWS
            webview.Dispatcher.InvokeAsync(() => {
                webview.CoreWebView2.ExecuteScriptAsync(script);
            });
#else
            Microsoft.Maui.ApplicationModel.MainThread.BeginInvokeOnMainThread(() => {
                _ = webview.EvaluateJavaScriptAsync(script);
            });
#endif
        }
        /// <summary>
        /// invokes a public, no-arg method on `window.the_main_app` (the page's `App` instance) -
        /// e.g. to notify the page a long-running native operation finished on its own,
        /// as opposed to the page having cancelled it itself.
        /// </summary>
        public static void callApp(string method_name) {
            var webview = RequestDispatcher.webviews[id_main_webview];
            var encoded_method = JsonSerializer.Serialize(method_name);
            var script = $"(() => {{ if (window.the_main_app && typeof window.the_main_app[{encoded_method}] === 'function') {{ window.the_main_app[{encoded_method}](); }} }})();";
#if WPF && WINDOWS
            webview.Dispatcher.InvokeAsync(() => {
                webview.CoreWebView2.ExecuteScriptAsync(script);
            });
#else
            Microsoft.Maui.ApplicationModel.MainThread.BeginInvokeOnMainThread(() => {
                _ = webview.EvaluateJavaScriptAsync(script);
            });
#endif
        }
    }
}
