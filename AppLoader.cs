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
        // last app loaded into each webview, so it can be reloaded (e.g. after a theme change)
        internal static readonly Dictionary<int, StartApp> current_apps = new();

        internal static async Task LoadAsync(int id_webview, StartApp app) {
            if (!RequestDispatcher.webviews.TryGetValue(id_webview, out var webView))
                throw new InvalidOperationException($"WebView not registered: {id_webview}");

            if (!AppConfig._scripts.TryGetValue(app, out var entry))
                throw new InvalidOperationException($"No configuration found for app: {app}");
            current_apps[id_webview] = app;

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
            int chunkCount = (b64.Length + chunkSize - 1) / chunkSize;
            // A buffer of its own per call: Android raises Navigated (OnPageFinished) more than once per load
            // (redirects, service worker...), and the async handlers interleave. With one shared window.__fw_chunks
            // a call reset, merged (atob: "not correctly encoded") or deleted (undefined.join) the other's chunks.
            string buffer = $"window['__fw_chunks_{Guid.NewGuid():N}']";

            await EvalAsync($"{buffer}=[];");
            for (int i = 0; i < b64.Length; i += chunkSize) {
                string chunk = b64.Substring(i, Math.Min(chunkSize, b64.Length - i));
                // the page may have navigated mid-transfer: the buffer is gone, don't throw
                await EvalAsync($"{buffer}&&{buffer}.push('{chunk}');");
            }
            await EvalAsync(
                $"(() => {{ const chunks = {buffer}; delete {buffer};" +
                // incomplete = a new document arrived mid-transfer: its own Navigated injects again
                $" if (!chunks || chunks.length !== {chunkCount}) return;" +
                // once per document: a second Navigated for the same page would build a second App
                " if (window.__fw_app_injected) return; window.__fw_app_injected = true;" +
                // indirect eval: global scope, like the former top-level eval
                " try { (0, eval)(new TextDecoder().decode(Uint8Array.from(atob(chunks.join('')), c => c.charCodeAt(0)))) } catch (e) { alert(e); console.error(e) } })();");

#if WPF && WINDOWS
            Task EvalAsync(string js) => webView.CoreWebView2.ExecuteScriptAsync(js);
#else
            Task EvalAsync(string js) => webView.EvaluateJavaScriptAsync(js);
#endif
        }
    }
}
