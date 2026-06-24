#if WPF && WINDOWS
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
#else
using Microsoft.Maui.Controls;
#endif

namespace FWITD {
    /// <summary>
    /// Loads a configured <see cref="StartApp"/> (page, injectable app, or bare URL) into a
    /// specific registered webview. Shared by MainPage's initial load and AppRouterController's
    /// on-demand navigation, both of which resolve the target via RequestDispatcher.webviews.
    /// </summary>
    internal static class AppLoader {
#if WPF && WINDOWS
        private static readonly Dictionary<int, EventHandler<CoreWebView2NavigationCompletedEventArgs>> _injectableAppHandlers = new();
#else
        private static readonly Dictionary<int, EventHandler<WebNavigatedEventArgs>> _injectableAppHandlers = new();
#endif

        internal static async Task LoadAsync(int id_webview, StartApp app) {
            if (!RequestDispatcher.webviews.TryGetValue(id_webview, out var webView))
                throw new InvalidOperationException($"WebView not registered: {id_webview}");

            if (!AppConfig._scripts.TryGetValue(app, out var entry))
                throw new InvalidOperationException($"No configuration found for app: {app}");

            // Each call may target the same, reused webview (see AppRouterController's on-demand
            // navigation), so the handler attached by a *previous* LoadAsync call must be detached
            // before deciding whether to attach a new one — otherwise stale handlers pile up and
            // keep injecting old scripts on every future navigation, including onto pages/URLs
            // that aren't injectable apps at all.
            if (_injectableAppHandlers.Remove(id_webview, out var previousHandler)) {
#if WPF && WINDOWS
                webView.CoreWebView2.NavigationCompleted -= previousHandler;
#else
                webView.Navigated -= previousHandler;
#endif
            }

            if (entry.main.script is JSProvider.JS.pages page) {
                var basePath = await JSProvider.getPathJSHTMLApp(page, id_webview);
#if WPF && WINDOWS
                webView.CoreWebView2.Navigate(new Uri(basePath).AbsoluteUri);
#else
                webView.Source = new UrlWebViewSource { Url = new Uri(basePath).AbsoluteUri };
#endif
                return;
            }

            if (entry.main.script is JSProvider.JS.injectable_apps injectableApp) {
#if WPF && WINDOWS
                async void handler(object? _, CoreWebView2NavigationCompletedEventArgs __) {
                    string script = await JSProvider.getScriptApp(injectableApp, id_webview);
                    await InjectScriptAsync(webView, script);
                }
                webView.CoreWebView2.NavigationCompleted += handler;
#else
                async void handler(object? _, WebNavigatedEventArgs args) {
                    if (args.Url.StartsWith("wawapp://", StringComparison.OrdinalIgnoreCase))
                        return;
                    string script = await JSProvider.getScriptApp(injectableApp, id_webview);
                    await InjectScriptAsync(webView, script);
                }
                webView.Navigated += handler;
#endif
                _injectableAppHandlers[id_webview] = handler;
            }

            if (entry.main.url is not null) {
                string url = entry.main.url;
                if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                    !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                    url = "http://" + url;
#if WPF && WINDOWS
                webView.CoreWebView2.Navigate(url);
#else
                webView.Source = new UrlWebViewSource { Url = url };
#endif
            } else {
                throw new InvalidOperationException($"No URL configured for app: {app}");
            }
        }

        internal static async Task InjectScriptAsync(
#if WPF && WINDOWS
            WebView2 webView,
#else
            WebView webView,
#endif
            string script) {
            string b64 = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(script));
            const int chunkSize = 4_500_000;//4.5 MB

#if WPF && WINDOWS
            await webView.CoreWebView2.ExecuteScriptAsync("window.__fw_chunks=[];");
            for (int i = 0; i < b64.Length; i += chunkSize) {
                string chunk = b64.Substring(i, Math.Min(chunkSize, b64.Length - i));
                await webView.CoreWebView2.ExecuteScriptAsync($"window.__fw_chunks.push('{chunk}');");
            }
            await webView.CoreWebView2.ExecuteScriptAsync(
                "try{eval(new TextDecoder().decode(Uint8Array.from(atob(window.__fw_chunks.join('')),c=>c.charCodeAt(0))))}finally{delete window.__fw_chunks}");
#else
            await webView.EvaluateJavaScriptAsync("window.__fw_chunks=[];");
            for (int i = 0; i < b64.Length; i += chunkSize) {
                string chunk = b64.Substring(i, Math.Min(chunkSize, b64.Length - i));
                await webView.EvaluateJavaScriptAsync($"window.__fw_chunks.push('{chunk}');");
            }
            await webView.EvaluateJavaScriptAsync(
                "try{eval(new TextDecoder().decode(Uint8Array.from(atob(window.__fw_chunks.join('')),c=>c.charCodeAt(0))))}finally{delete window.__fw_chunks}");
#endif
        }
    }
}
