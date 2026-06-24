using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
#if WPF && WINDOWS
using Microsoft.Web.WebView2.Wpf;
#else
using Microsoft.Maui.Controls;
#endif

namespace FWITD {
    internal static class RequestDispatcher {
#if WPF && WINDOWS
        internal static Dictionary<int, WebView2> webviews = [];
#else
        internal static Dictionary<int, WebView> webviews = [];
#endif

        private static readonly JsonSerializerOptions _jsonOpts = new() { PropertyNamingPolicy = null };
        private static readonly Dictionary<string, (Type ControllerType, MethodInfo Method)> _routes;

        static RequestDispatcher() {
            _routes = new(StringComparer.OrdinalIgnoreCase);
            foreach (var type in Assembly.GetExecutingAssembly().GetTypes()) {
                if (type.Namespace?.StartsWith("FWITD.Controllers") != true) continue;
                if (!type.Name.EndsWith("Controller")) continue;
                var prefix = type.Name[..^"Controller".Length];
                foreach (var m in type.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
                    _routes[$"{prefix}/{m.Name}"] = (type, m);
            }
        }

#if WPF && WINDOWS
        /// <summary>
        /// Wires WebMessageReceived on the given WebView2 to dispatch
        /// incoming Lobby.post requests to the matching controller method.
        /// </summary>
        internal static void Register(WebView2 webView, int id_webview) {
            webviews.Add(id_webview, webView);
            webView.CoreWebView2.WebMessageReceived += async (_, args) => {
                string jsonMessage = args.TryGetWebMessageAsString();
                int index__owner_id = jsonMessage.IndexOf("__owner_id");
                if (index__owner_id == -1) {//{\"x\":734,\"y\":361,\"__reqId\":1,\"__owner_id\":1,\"__url\":\"Windows/ClickAt\"}
                    return;//invalid request completely ignore it
                }
                if (!Int32.TryParse(new Regex("[0-9]+").Match(jsonMessage.Substring(index__owner_id, 20)).Groups[0].Value, out int owner_id)) {
                    return;//invalid request completely ignore it
                }
                var json_response = await DispatchAsync(jsonMessage, owner_id);
                await webviews[owner_id].CoreWebView2.ExecuteScriptAsync($"(() => {{ window.Lobby.handleWebviewResponse({json_response}); }})();");
            };
        }
#else
        /// <summary>
        /// Wires the Navigating event on the given MAUI WebView to dispatch
        /// incoming Lobby.post requests (sent via the wawapp:// URL scheme)
        /// to the matching controller method.
        /// JS side: window.location.href = "wawapp://" + encodeURIComponent(jsonPayload)
        /// </summary>
        internal static void Register(WebView webView, int id_webview) {
            webviews[id_webview] = webView;
            webView.Navigating += async (_, args) => {
                if (!args.Url.StartsWith("wawapp://", StringComparison.OrdinalIgnoreCase))
                    return;
                args.Cancel = true; // must be set before any await
                string jsonMessage = Uri.UnescapeDataString(args.Url["wawapp://".Length..]);
                int index__owner_id = jsonMessage.IndexOf("__owner_id");
                if (index__owner_id == -1)
                    return;
                if (!int.TryParse(new Regex("[0-9]+").Match(jsonMessage.Substring(index__owner_id, 20)).Groups[0].Value, out int owner_id))
                    return;
                var json_response = await DispatchAsync(jsonMessage, owner_id);
                if (webviews.TryGetValue(owner_id, out var targetWebView))
                    await targetWebView.EvaluateJavaScriptAsync($"(() => {{ window.Lobby.handleWebviewResponse({json_response}); }})();");
            };
        }
#endif

        private static async Task<string> DispatchAsync(string jsonMessage, int owner_id) {
            int reqId = 0;
            try {
                var node = JsonNode.Parse(jsonMessage)!;
                reqId = node["__reqId"]?.GetValue<int>() ?? 0;
                var url = node["__url"]?.GetValue<string>()
                    ?? throw new InvalidOperationException("Missing 'url'");

                if (!_routes.TryGetValue(url, out var route))
                    throw new InvalidOperationException($"No route for: {url}");

                var instance = Activator.CreateInstance(route.ControllerType)!;
                // Pass the full request node if the method accepts a JsonNode parameter.
                var parameters = route.Method.GetParameters();
                object?[] args = parameters.Length == 1 && parameters[0].ParameterType == typeof(JsonNode)
                    ? [node]
                    : [];
                object? result = route.Method.Invoke(instance, args);
                if (result is Task task) {
                    await task;
                    result = route.Method.ReturnType.IsGenericType
                        ? route.Method.ReturnType.GetProperty("Result")!.GetValue(task)
                        : null;
                }

                var rsp = new JsonObject { ["__reqId"] = reqId, ["__type"] = "ok", ["__owner_id"] = owner_id };
                if (result is not null) {
                    var resultNode = JsonSerializer.SerializeToNode(result, _jsonOpts);
                    if (resultNode is JsonObject obj)
                        foreach (var (k, v) in obj)
                            rsp[k] = v?.DeepClone();
                    else
                        rsp["data"] = resultNode?.DeepClone();
                }
                return rsp.ToJsonString();
            } catch (Exception ex) {
                var inner = ex is TargetInvocationException tie ? tie.InnerException ?? ex : ex;
                return JsonSerializer.Serialize(new { __reqId = reqId, __type = "error", error = inner.Message, __owner_id = owner_id });
            }
        }
    }
}
