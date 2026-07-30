using FWITD;
using FWShellWPF.Windows;
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
        public static void log(string what, TypeLog type = TypeLog.none, int to_who = 0) {
            var webview = RequestDispatcher.webviews.ContainsKey(to_who) ? RequestDispatcher.webviews[to_who] : RequestDispatcher.webviews[(int)IDWebviews.MainWindow];
            var encoded_what = JsonSerializer.Serialize(what);
            // type.ToString() must be JSON-encoded too - interpolating it bare produced
            // `window.live_logger.log("...",warn)`, an unquoted identifier the page never
            // defined, which threw "warn is not defined" and silently dropped every log line.
            var encoded_type = JsonSerializer.Serialize(type.ToString());
            // sendCommand()/DataReceivedHandler call this from background threads (Task.Run / SerialPort.DataReceived),
            // but WebView2 is a WPF DispatcherObject - touching .CoreWebView2 off its owning thread throws
            // "The calling thread cannot access this object because a different thread owns it."
            webview.Dispatcher.InvokeAsync(() => {
                webview.CoreWebView2.ExecuteScriptAsync($"(() => {{ window.live_logger?.log({encoded_what},{encoded_type}); }})();");
            });
        }
        /// <summary>
        /// invokes a public, no-arg method on `window.the_main_app` (the page's `App` instance) -
        /// e.g. to notify the page a long-running native operation finished on its own,
        /// as opposed to the page having cancelled it itself.
        /// </summary>
        public static void callApp(string method_name) {
            var webview = RequestDispatcher.webviews[(int)IDWebviews.MainWindow];
            var encoded_method = JsonSerializer.Serialize(method_name);
            webview.Dispatcher.InvokeAsync(() => {
                webview.CoreWebView2.ExecuteScriptAsync($"(() => {{ if (window.the_main_app && typeof window.the_main_app[{encoded_method}] === 'function') {{ window.the_main_app[{encoded_method}](); }} }})();");
            });
        }
    }
}
