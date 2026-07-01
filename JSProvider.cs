#define USE_JS_NON_MINIMIZED_FILES

using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using static FWITD.JSProvider;

namespace FWITD {
    internal static class JSProvider {
        private static readonly string the_app_version = AppSettings.Get<string>("app-version", "1.0.0");
#if DEBUG && WINDOWS
        private static readonly string path_scriptsBase = FindProjectRoot();
        private static string FindProjectRoot() {
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            while (dir != null) {
                dir = dir.Parent;
                if (dir != null) {
                    if (Directory.Exists(Path.Combine(dir.FullName, "FWITD")))
                        return dir.FullName;
                }
            }
            return AppContext.BaseDirectory;
        }
#else
        private static readonly string path_scriptsBase = AppContext.BaseDirectory;
#endif
#if DEBUG && USE_JS_NON_MINIMIZED_FILES
        private static readonly string minimized_folder_extension = ".";
#else
        private static readonly string minimized_folder_extension = ".min.";
#endif
        /// <summary>
        /// FWITD/ClientApp/
        /// </summary>
        private static readonly string path_App = Path.Combine(path_scriptsBase, "FWITD/ClientApp/");
        /// <summary>
        /// FWITD/ClientApp/apps_injectable/
        /// </summary>
        public static readonly string path_script_apps_injectable = path_App + "apps_injectable/";
        /// <summary>
        /// FWITD/ClientApp/apps_standalone/
        /// </summary>
        public static readonly string path_script_apps_standalone = path_App + "apps_standalone/";
        /// <summary>
        /// FWITD/ClientApp/apps_standalone_components/
        /// </summary>
        public static readonly string path_script_apps_standalone_components = path_App + "apps_standalone_components/";
        public static readonly string path_script_default_app = path_script_apps_injectable + $"default{minimized_folder_extension}js";
        internal static CSSThemes current_css_theme = CSSThemes.vscode_dark;
        private static readonly Dictionary<string, string> cache_scripts = [];
#if DEBUG
        private static readonly string app_constructor_initialization = $"setTimeout(() => {{ try {{ window.the_main_app = new App(); }} catch (the_mfkng_e) {{ alert(the_mfkng_e?.message ?? the_mfkng_e); console.error(the_mfkng_e); }} }}, 0);";
#else
        private static readonly string app_constructor_initialization = $"setTimeout(() => {{ try {{ window.the_main_app = new App(); }} catch (the_mfkng_e) {{ console.error(the_mfkng_e); }} }}, 0);";
#endif
#if ANDROID
        private static readonly string fw_bridge_shim = ""; // window.FWBridge is the native JavascriptInterface
#elif WINDOWS
        private static readonly string fw_bridge_shim = "window.FWBridge={postMessage:m=>window.chrome.webview.postMessage(m)};";
#else
        private static readonly string fw_bridge_shim = "window.FWBridge={postMessage:m=>{console.error(m);window.location.href='wawapp://'+encodeURIComponent(m);}};";
#endif
        private static object[] buildJSComponents(object the_app, string the_app_script) {
            HashSet<object> result = [
                JS.frameworks.AppStatus,
                JS.utils.UiBuilder,
                JS.components.Notify,
                JS.utils.Locale,
                JS.utils.Icons,
                JS.utils.Logger,
                JS.utils.AppRouter,
                JS.utils.SpaHistory,
                JS.components.BottomSheet,
                JS.components.MousePopUp,
                JS.components.Tooltip,
            ];
            foreach (JS.components component in Enum.GetValues<JS.components>()) {
                if (the_app_script.Contains(component.ToString())) result.Add(component);
            }
            foreach (JS.utils util in Enum.GetValues<JS.utils>()) {
                if (the_app_script.Contains(util.ToString())) result.Add(util);
            }
            return [.. result];
        }
        private static async Task<(string cssThemeVars, string cssAnimations, string sharedAllCss, string jsFrameworkGC, KeyValuePair<string, string> jsCss)> loadSharedAssets(object[] js_components, int id_webview) {
            var cssThemeVars = (await AssetLoader.LoadAssetFileAsync($"{path_App}styles/themes/vars_{current_css_theme}{minimized_folder_extension}css")).Replace("\\", "\\\\"); //2026_06_08 escape `\`
            var cssAnimations = await AssetLoader.LoadAssetFileAsync($"{path_App}styles/animations{minimized_folder_extension}css");
            var sharedAllCss = await AssetLoader.LoadAssetFileAsync($"{path_App}styles/styles{minimized_folder_extension}css");
            sharedAllCss = sharedAllCss.Replace("@BASE64FrameworkIcons", await AssetLoader.LoadAssetFileAsBase64Async($"{path_App}utils\\frameworks\\google3.woff2"));
            int index_lobby = js_components.IndexOf(JS.utils.Lobby);
            if (index_lobby >= 0) {
                js_components[index_lobby] = null;
            }
            int index_FrameworkGC = js_components.IndexOf(JS.frameworks.FrameworkGC);
            if (index_FrameworkGC >= 0) {
                js_components[index_FrameworkGC] = null;
            }
            var jsFrameworkGC = (await JS.getJSPair([JS.frameworks.FrameworkGC, JS.utils.Lobby])).Key.Replace("{{@owner_id}}", $"{id_webview}");
            var jsCss = await JS.getJSPair(js_components);
            return (cssThemeVars, cssAnimations, sharedAllCss, jsFrameworkGC, jsCss);
        }
        public async static Task<string> getPathJSHTMLApp(JS.pages the_app, int id_webview = 1, Dictionary<string, string>? swap_on_ready = null) {
            string file_name = the_app.ToString();
            var cache_id = Utils.HashToID(file_name);
#if DEBUG && WINDOWS
            JS.clearCache(true);
#endif
            if (cache_scripts.ContainsKey(cache_id)) {
                return cache_scripts[cache_id];
            }
            var p_html = await AssetLoader.LoadAssetFileAsync($"{path_script_apps_standalone}/{file_name}/{file_name}{minimized_folder_extension}html");
            if (!p_html.Contains("</head>") || !p_html.Contains("</body>")) {
                throw new Exception("not valid html provided missing `</head>` and `</body>`");
            }
            var p_js = (await AssetLoader.LoadAssetFileAsync($"{path_script_apps_standalone}/{file_name}/{file_name}{minimized_folder_extension}js")).Replace("@fromwho", file_name);
            object[] js_components = buildJSComponents(the_app, p_js);
            var (css_theme_vars, css_animations, shared_all_css, js_FrameworkGC, js_css) = await loadSharedAssets(js_components, id_webview);

            var js_css_r_c = await JS.getJSRelativeComponents(the_app);
            var p_css = await AssetLoader.LoadAssetFileAsync($"{path_script_apps_standalone}/{file_name}/{file_name}{minimized_folder_extension}css");
            var js_html = JS.linkJSToFWHTML(p_js, p_html);
            p_js = js_html.Item1;
            p_html = js_html.Item2;
            var p_script = js_FrameworkGC + Environment.NewLine + js_css.Key + Environment.NewLine + await JS.loadAllOtherJSFiles($"{path_script_apps_standalone}/{file_name}") + p_js + js_css_r_c.Key;
            string the_css = css_theme_vars + shared_all_css + css_animations + js_css.Value + p_css + js_css_r_c.Value;

            string headers = "";
            var p_fp = p_html.Replace("</head>", $"{headers}{Environment.NewLine}<link rel=\"stylesheet\" href=\"{file_name}.css?v={DateTime.Now.ToString("yyyy-MM-dd-HH-mm-ss")}\">{Environment.NewLine}</head>").Replace("</body>", $"<script  type=\"text/javascript\"src=\"{file_name}.js?v={DateTime.Now.ToString("yyyy-MM-dd-HH-mm-ss")}\" ></script>{Environment.NewLine}</body>");
            if (swap_on_ready != null) {
                foreach (var o in swap_on_ready) {
                    p_fp = p_fp.Replace(o.Key, o.Value);
                }
            }
            string the_js = $"{fw_bridge_shim}{Environment.NewLine}{p_script};{Environment.NewLine}\n{app_constructor_initialization};";
#if DEBUG && WINDOWS 
            Directory.CreateDirectory(Path.Combine(path_scriptsBase, "FWITD/out"));
            File.WriteAllText(Path.Combine(path_scriptsBase, $"FWITD/out/{file_name}.js"), the_js);
            File.WriteAllText(Path.Combine(path_scriptsBase, $"FWITD/out/{file_name}.html"), p_fp);
            File.WriteAllText(Path.Combine(path_scriptsBase, $"FWITD/out/{file_name}.css"), the_css);
            cache_scripts.Add(cache_id, Path.Combine(path_scriptsBase, $"FWITD/out/{file_name}"));
#else

            var the_css_file_path = await AssetLoader.SaveToTempFileAsync(the_css, $"{file_name}.css");
            var the_js_file_path = await AssetLoader.SaveToTempFileAsync(the_js, $"{file_name}.js");
            var the_html_file_path = await AssetLoader.SaveToTempFileAsync(p_fp, $"{file_name}.html");
            cache_scripts.Add(cache_id, the_html_file_path);
#endif
            return cache_scripts[cache_id];
        }
        public async static Task<string> getScriptApp(JS.injectable_apps the_app, int id_webview = 1) {
            string file_name = the_app.ToString();
            var cache_id = Utils.HashToID(file_name);
#if DEBUG && WINDOWS
            JS.clearCache(true);
#endif
            if (cache_scripts.ContainsKey(cache_id)) {
                return cache_scripts[cache_id];
            }
            var p_js = (await AssetLoader.LoadAssetFileAsync($"{path_script_apps_injectable}/{file_name}/{file_name}{minimized_folder_extension}js")).Replace("@fromwho", file_name);
            var p_html = (await AssetLoader.LoadAssetFileAsyncIfExists($"{path_script_apps_injectable}/{file_name}/{file_name}{minimized_folder_extension}html"));
            if (p_html != null) {
                var js_html = JS.linkJSToFWHTML(p_js, p_html);
                p_js = js_html.Item1.Replace("${injector_html}", $"{js_html.Item2}");
            }
            object[] js_components = buildJSComponents(the_app, p_js);
            var (css_theme_vars, css_animations, shared_all_css, js_FrameworkGC, js_css) = await loadSharedAssets(js_components, id_webview);

            //var js_css_r_c = await JS.getJSRelativeComponents(the_page); todo
            var p_script = js_FrameworkGC + Environment.NewLine + js_css.Key + Environment.NewLine + await JS.loadAllOtherJSFiles($"{path_script_apps_injectable}/{file_name}") + p_js;// + js_css_r_c.Key;
            var p_css = (await AssetLoader.LoadAssetFileAsyncIfExists($"{path_script_apps_injectable}/{file_name}/{file_name}{minimized_folder_extension}css"));
            string the_css = css_theme_vars + shared_all_css + css_animations + js_css.Value + (p_css ?? ""); //+ js_css_r_c.Value;
            string injectCss = $"(()=>{{const stylex_1 = document.createElement('style');stylex_1.textContent  = `{the_css}`;setTimeout(() => {{ document.head.appendChild(stylex_1); }}, 0);}})();";

            string the_js = $"{fw_bridge_shim};{injectCss};{Environment.NewLine}{p_script};{Environment.NewLine}\n{app_constructor_initialization};";

            try {
#if DEBUG && WINDOWS
                Directory.CreateDirectory(Path.Combine(path_scriptsBase, "FWITD/out"));
                File.WriteAllText(Path.Combine(path_scriptsBase, $"FWITD/out/{file_name}.js"), the_js);
#endif
                cache_scripts.Add(cache_id, the_js);
            } catch (Exception) { }
            return the_js;
        }
        internal enum CSSThemes {
            dark, light, vscode_dark
        }
        internal static class JS {
            /// <summary>
            /// the child components are loaded automatically
            /// </summary>
            internal static readonly Dictionary<pages, components[]> page_to_components = new Dictionary<pages, components[]>() {
                { pages.test_page, new components[] { components.FrameworkTestComponent } },
            };
            /// <summary>
            /// the child components are loaded automatically
            /// </summary>
            internal static readonly Dictionary<components, components[]> components_views = new Dictionary<components, components[]>() {
                { components.AndroidVeiwStatoMotori, Array.Empty<components>() },
                { components.AndroidViewAccount, Array.Empty<components>() },
                { components.AndroidViewAnalytics, Array.Empty<components>() },
                { components.AndroidViewHome, Array.Empty<components>() },
                { components.AndroidViewInventory, new components[] { components.PosizioneMotore } },
                { components.AndroidViewLogin, new components[] { components.OTPComponent } },
                { components.AndroidViewSalesDrivenRestock, new components[] { components.CardRefillmentSuggestions } },
                { components.AndroidViewSettings, Array.Empty<components>() },
                { components.AndroidViewTasks, new components[] { components.TaskItem } },
                { components.DataAnalizis1, Array.Empty<components>() },
                { components.SystemSettings, Array.Empty<components>() },
            };
            internal enum pages { AndroidAppDemo, AndroidLogin, AndroidMasterSettings, left_panel, some_page, test_page }
            internal enum injectable_apps { cloudflared, GoogleDocs, LetSTry, TemplateJobs, TemplateTools, YouTube }
            internal enum components { AndroidVeiwStatoMotori, AndroidViewAccount, AndroidViewAnalytics, AndroidViewHome, AndroidViewInventory, AndroidViewLogin, AndroidViewSalesDrivenRestock, AndroidViewSettings, AndroidViewTasks, BottomNavBar, BottomSheet, CardRefillmentSuggestions, DataAnalizis1, DatePicker, DockWindow, DragAndDrop, FrameworkTestComponent, Insight, ListBox, MousePopUp, Notify, OTPComponent, PieChart, PosizioneMotore, SideBarLeft, SpeedActions, SpeedDial, SystemSettings, Table, Table2, TaskItem, ThemeSelector, Tooltip }
            internal enum utils { AppRouter, Icons, Lobby, Locale, Logger, MovableUtil, SpaHistory, UiBuilder }
            internal enum frameworks { AppStatus, FrameworkGC }
            private static Dictionary<JS.pages, string> cache_path_files = new Dictionary<pages, string>();

            private static readonly Dictionary<components, string> component_name_to_js = new Dictionary<components, string>();
            internal static async Task<string> getJSComponent(components component) {
#if DEBUG && WINDOWS
                component_name_to_js.Clear();
#endif
                if (!component_name_to_js.ContainsKey(component)) {
                    string component_name = component.ToString();

                    var html = await AssetLoader.LoadAssetFileAsync($"{path_App}components/{component_name}{minimized_folder_extension}html");
                    var css = await AssetLoader.LoadAssetFileAsync($"{path_App}components/{component_name}{minimized_folder_extension}css");
                    var js = await AssetLoader.LoadAssetFileAsync($"{path_App}components/{component_name}{minimized_folder_extension}js");
                    var result = js.Replace("${injector_css}", $"{css}").Replace("${injector_html}", $"{html}");
                    try {
                        component_name_to_js.Add(component, result);
                    } catch (Exception) { }
                }
                return component_name_to_js[component];
            }
            internal static async Task<string> loadAllOtherJSFiles(string path) {
#if ANDROID
                var assets = Android.App.Application.Context.Assets;
                if (assets == null) return "";
                string logical = path.Replace('\\', '/');
                while (logical.Contains("//")) logical = logical.Replace("//", "/");
                int fi = logical.IndexOf("FWITD/", StringComparison.OrdinalIgnoreCase);
                if (fi < 0) return "";
                logical = logical[fi..].TrimEnd('/');
                var result = new StringBuilder();
                await loadJsFromSubdirsAsync(assets, logical, result);
                return result.ToString();
#else
                if (!Directory.Exists(path)) {
                    return "";
                }

                StringBuilder result = new();
                var allDirectories = Directory.GetDirectories(path, "*", SearchOption.AllDirectories)
                    .Where(dir => !Path.GetFileName(dir).Equals("components", StringComparison.OrdinalIgnoreCase))
                    .ToList();

                if (allDirectories.Count == 0) {
                    return "";
                }

                foreach (var directory in allDirectories) {
                    var jsFiles = Directory.GetFiles(directory, $"*{minimized_folder_extension}js", SearchOption.TopDirectoryOnly)
                        .Where(f => minimized_folder_extension == ".min." || !f.EndsWith(".min.js"))
                        .ToArray();
                    foreach (var jsFile in jsFiles) {
                        try {
                            string fileContent = await AssetLoader.LoadAssetFileAsync((jsFile));
                            result.AppendLine(fileContent);
                        } catch (Exception ex) {
                            System.Diagnostics.Debug.WriteLine($"Error reading file {jsFile}: {ex.Message}");
                        }
                    }
                }
                return result.ToString();
#endif
            }
#if ANDROID
            private static async Task loadJsFromSubdirsAsync(
                    Android.Content.Res.AssetManager assets, string dir, StringBuilder result) {
                var entries = assets.List(dir);
                if (entries == null || entries.Length == 0) return;
                foreach (var entry in entries) {
                    if (entry.Equals("components", StringComparison.OrdinalIgnoreCase)) continue;
                    string subdir = $"{dir}/{entry}";
                    var children = assets.List(subdir);
                    if (children == null || children.Length == 0) continue; // it's a file, not a dir
                    foreach (var child in children) {
                        if (child.EndsWith($"{minimized_folder_extension}js", StringComparison.OrdinalIgnoreCase)
                                && (minimized_folder_extension == ".min." || !child.EndsWith(".min.js", StringComparison.OrdinalIgnoreCase))) {
                            try {
                                result.AppendLine(await AssetLoader.LoadAssetFileAsync($"{subdir}/{child}"));
                            } catch (Exception ex) {
                                System.Diagnostics.Debug.WriteLine($"Error reading {subdir}/{child}: {ex.Message}");
                            }
                        }
                    }
                    await loadJsFromSubdirsAsync(assets, subdir, result);
                }
            }
#endif
            private static readonly Dictionary<components, KeyValuePair<string, string>> component_name_to_js_component = new Dictionary<components, KeyValuePair<string, string>>();
            internal static async Task<KeyValuePair<string, string>> getJSComponentPair(components component, string? default_path = null) {
                default_path ??= $"{path_App}components/";
#if DEBUG && WINDOWS
                component_name_to_js_component.Clear();
#endif
                if (!component_name_to_js_component.ContainsKey(component)) {
                    string component_name = component.ToString();
                    var html = await AssetLoader.LoadAssetFileAsync(Path.Combine(default_path, component_name, $"{component_name}{minimized_folder_extension}html"));
                    var css = await AssetLoader.LoadAssetFileAsync(Path.Combine(default_path, component_name, $"{component_name}{minimized_folder_extension}css"));
                    var js = await AssetLoader.LoadAssetFileAsync(Path.Combine(default_path, component_name, $"{component_name}{minimized_folder_extension}js"));
                    var compiled = linkJSToFWHTML(js, html);
                    js = compiled.Item1;
                    html = compiled.Item2;
                    var r_js = js.Replace("${injector_html}", $"{html}");
                    try {
                        component_name_to_js_component.Add(component, new KeyValuePair<string, string>(r_js, css));
                    } catch (Exception) { }
                }
                return component_name_to_js_component[component];
            }
            private static readonly Dictionary<pages, KeyValuePair<string, string>> page_to_relative_components = new Dictionary<pages, KeyValuePair<string, string>>();
            internal static async Task<KeyValuePair<string, string>> getJSRelativeComponents(JS.pages page) {
                if (!page_to_components.ContainsKey(page)) {
                    return new KeyValuePair<string, string>("", "");
                }
#if WINDOWS && DEBUG
                page_to_relative_components.Clear();
#endif
                if (!page_to_relative_components.ContainsKey(page)) {
                    List<components> list_of_components = page_to_components[page].ToList();
                    StringBuilder r_js = new StringBuilder();
                    StringBuilder r_css = new StringBuilder();
                    foreach (components component in list_of_components) {
                        var c_pair = await getJSComponentPair(component, $"{path_script_apps_standalone}{page.ToString()}/components");
                        r_js.AppendLine();
                        r_js.Append(c_pair.Key);

                        r_css.Append(c_pair.Value);
                    }
                    var result = new KeyValuePair<string, string>(r_js.ToString(), r_css.ToString());
                    try {
                        page_to_relative_components.Add(page, result);
                    } catch (Exception) { }
                }
                return page_to_relative_components[page];
            }
            internal static Tuple<string, string> linkJSToFWHTML(string js, string html) {
                Regex reg_find_super = new Regex("super\\([a-zA-Z_0-9,;]+\\)");
                var the_match = reg_find_super.Match(js);
                StringBuilder jscode = new StringBuilder();
                if (the_match.Success) {
                    jscode.Append($"{the_match.Value};");
                } else {
                    Regex reg_find_constructor = new Regex("constructor\\([a-z A-Z0-9,]*\\)\\{");
                    the_match = reg_find_constructor.Match(js);
                    if (the_match.Success) {
                        jscode.Append($"{the_match.Value}");
                    } else {
                        return new Tuple<string, string>(js, html);
                    }
                }
                jscode.Append("const fw_owner=this;const ___tmp_container=document.createElement('div');___tmp_container.appendChild(fw_owner.self_ref);");
                int bloat_len = jscode.Length;
                declareHtmlVariablesInsideTheJs(html, jscode);
                List<FWEventListenerAggregation> event_listeners = [
                    new FWEventListenerAggregation(){event_name = "click"},
                    new FWEventListenerAggregation(){event_name = "change"},
                    new FWEventListenerAggregation(){event_name = "beforeinput", event_phase = JSEventPhase.Bubbling},
                    new FWEventListenerAggregation(){event_name = "keydown"},
                    new FWEventListenerAggregation(){event_name = "keyup"},
                    new FWEventListenerAggregation(){event_name = "paste"},
                ];
                for (int i = 0; i < event_listeners.Count; i++) {
                    addEventListener($"({event_listeners[i].event_name})", event_listeners[i].event_name, html, jscode, event_listeners[i].event_phase);
                }
                for (int i = 0; i < event_listeners.Count; i++) {
                    html = html.Replace($"({event_listeners[i].event_name})", $"fw-{event_listeners[i].event_name}");
                }
                return new Tuple<string, string>(bloat_len < jscode.Length ? js.Replace(the_match.Value, jscode.ToString()) : js, html);
            }
            internal class FWEventListenerAggregation {
                public string event_name { get; set; } = "";
                public JSEventPhase event_phase { get; set; } = JSEventPhase.Default;
            }
            private static void declareHtmlVariablesInsideTheJs(string html, StringBuilder append_to) {
                Regex reg_find_fw_ids = new Regex(@"fw-id=(['""])[A-Za-z](?:(?!\1).)+\1");
                var fw_ids_arr = reg_find_fw_ids.Matches(html);
                for (int tis = 0; tis < fw_ids_arr.Count; tis++) {
                    var fw_ids = fw_ids_arr[tis];
                    if (fw_ids.Success && fw_ids.Groups.Count == 2) {
                        for (int i = 0; i < fw_ids.Groups.Count - 1; i++) {
                            append_to.Append($";fw_owner.elements[`{fw_ids.Groups[i].Value.Substring(7, fw_ids.Groups[i].Value.Length - 1 - 7).Trim()}`]=___tmp_container.querySelector(`[{fw_ids.Groups[i].Value}]`)");
                        }
                    }
                }
#if DEBUG && WINDOWS
                //append_to.Append(";console.error(___tmp_container);");
#endif
            }
            private static void addEventListener(string tag, string js_event_listener, string html, StringBuilder append_to, JSEventPhase event_phase = JSEventPhase.Default) {
                Regex reg_find_fw_keyDown = new Regex(tag.Replace("(", "\\(").Replace(")", "\\)") + @"=(['""])[A-Za-z](?:(?!\1).)+\1");
                var fw_onKeyDown_arr = reg_find_fw_keyDown.Matches(html);
                var unique_fw_onKeyDown_arr_MatchesDict = new Dictionary<string, Match>();
                foreach (Match match in fw_onKeyDown_arr) {
                    if (!unique_fw_onKeyDown_arr_MatchesDict.ContainsKey(match.Value)) {
                        unique_fw_onKeyDown_arr_MatchesDict.Add(match.Value, match);
                    }
                }
                Match[] fw_onKeyDown_unique_arr = unique_fw_onKeyDown_arr_MatchesDict.Values.ToArray();
                for (int tis = 0; tis < fw_onKeyDown_unique_arr.Length; tis++) {
                    Match fw_onKeyDown = fw_onKeyDown_unique_arr[tis];
                    if (fw_onKeyDown.Success && fw_onKeyDown.Groups.Count == 2) {
                        for (int i = 0; i < fw_onKeyDown.Groups.Count - 1; i++) {
                            var func_ref = fw_onKeyDown.Groups[i].Value.Substring((tag.Length + 2), fw_onKeyDown.Groups[i].Value.Length - 1 - (tag.Length + 2)).Trim();
                            var index_tonda = func_ref.IndexOf("(");
                            if (index_tonda >= 0) {
                                func_ref = func_ref.Substring(0, index_tonda);
                            }
                            append_to.Append($";___tmp_container.querySelectorAll(`[{fw_onKeyDown.Groups[i].Value.Replace(tag, ("fw-" + js_event_listener))}]`).forEach((el)=>{{el.fwInstanceReference=fw_owner;el.addEventListener('{js_event_listener}',fw_owner.{func_ref}");
                            switch (event_phase) {
                                case JSEventPhase.Capturing:
                                    append_to.Append(",true");
                                    break;
                                case JSEventPhase.Bubbling:
                                    append_to.Append(",false");
                                    break;
                                case JSEventPhase.Default:
                                default:
                                    break;
                            }
                            append_to.Append($");el.removeAttribute('{tag}');}})");
                        }
                    }
                }
            }

            public enum JSEventPhase : byte {
                Default,
                Capturing,
                Bubbling
            }
            private static readonly Dictionary<frameworks, string> component_name_to_js_framework = new Dictionary<frameworks, string>();
            static string default_language = "it";
            internal static async Task<string> getJSFramework(frameworks component) {
                if (!component_name_to_js_framework.ContainsKey(component)) {
                    string component_name = component.ToString();
                    var js = await AssetLoader.LoadAssetFileAsync($"{path_App}utils/frameworks/{component_name}{minimized_folder_extension}js");
                    if (component == frameworks.AppStatus) {
                        js = Regex.Replace(js, @"\{\{@AppSettings\.([a-zA-Z_][a-zA-Z0-9_.\\-]*)\}\}", m => {
                            var key = m.Groups[1].Value;
                            return AppSettings.Get<string>(key);
                        });
                    }
                    try {
                        component_name_to_js_framework.Add(component, js);
                    } catch (Exception) { }
                }
                return component_name_to_js_framework[component];
            }
            internal static async Task<string> getJSUtil(utils component) {
                //if (component == utils.Lobby || component == utils.WinLobby) {
                //    component = utils.WinLobby;
                //}
                if (!component_name_to_js_util.ContainsKey(component)) {
                    string component_name = component.ToString();
                    var js = await AssetLoader.LoadAssetFileAsync($"{path_App}utils/{component_name}{minimized_folder_extension}js");
                    if (component == utils.Locale) {
                        string the_locale = ((await AssetLoader.LoadAssetFileAsync($"{path_App}utils/translations/{default_language}{minimized_folder_extension}js")).Replace("const data=", ""));
#if DEBUG
                        the_locale = the_locale.Replace("const data = ", "");
#endif
                        component_name_to_js_util.TryAdd(component, js.Replace("\"{{@jsonTranslations}}\"", the_locale));
                        try {
                            component_name_to_js_util.Add(component, js.Replace("\"@jsonTranslations\"", the_locale));
                        } catch (Exception) { }
                    } else {
                        if (component == utils.Lobby) {
                            var res_js = js.Replace("{{@HttpImagesAddress}}", $"{RemoteServer.HttpVirtualCoversAddress}/");
                            component_name_to_js_util.TryAdd(component, res_js);
                        } else {
                            component_name_to_js_util.TryAdd(component, js);
                        }
                    }
                }
                return component_name_to_js_util[component];
            }
            [Obsolete("deprecated, use getJSPair instead.")]
            internal static async Task<string> getJS(object[] componentsAndUtils) {
                StringBuilder result = new StringBuilder();

                foreach (var item in componentsAndUtils) {
                    if (item is JS.components component) {
                        result.Append(Environment.NewLine);
                        result.Append(await getJSComponent(component));
                    } else if (item is utils util) {
                        result.Append(Environment.NewLine);
                        result.Append(await getJSUtil(util));
                    } else if (item is frameworks framework) {
                        result.Append(Environment.NewLine);
                        result.Append(await getJSFramework(framework));
                    } else {
                        // Optional: handle unexpected types
                        throw new InvalidOperationException($"Unsupported item type: {item.GetType()}");
                    }
                    result.Append(Environment.NewLine);
                }

                return result.ToString();
            }
            private static readonly Dictionary<utils, string> component_name_to_js_util = new Dictionary<utils, string>();
            /// <summary>
            /// </summary>
            /// <param name="componentsAndUtils"></param>
            /// <returns>
            /// - <b>Key</b> is the combined <b>JS</b> code   <br></br>
            /// - <i>Value</i> is the combined <i>CSS</i> code
            /// </returns>
            internal static async Task<KeyValuePair<string, string>> getJSPair(object[] componentsAndUtils) {
                StringBuilder r_js = new StringBuilder();
                StringBuilder r_css = new StringBuilder();

                foreach (var item in componentsAndUtils) {
                    if (item is JS.components component) {
                        if (components_views.ContainsKey(component)) {
                            var c_pair_v = await getJSComponentPair(component, path_script_apps_standalone_components);
                            r_js.Append(c_pair_v.Key);
                            r_css.Append(c_pair_v.Value);
                            foreach (JS.components x_component in components_views[component]) {
                                var c_pair_x = await getJSComponentPair(x_component, $"{path_script_apps_standalone_components}{component.ToString()}/components");
                                r_js.AppendLine();
                                r_js.Append(c_pair_x.Key);
                                r_css.Append(c_pair_x.Value);
                            }
                        } else {
                            var c_pair = await getJSComponentPair(component);
                            r_js.Append(c_pair.Key);
                            r_css.Append(c_pair.Value);
                        }
                    } else if (item is utils util) {
                        r_js.Append(Environment.NewLine);
                        r_js.Append(await getJSUtil(util));
                    } else if (item is frameworks framework) {
                        r_js.Append(Environment.NewLine);
                        r_js.Append(await getJSFramework(framework));
                    } else if (item is null) {
                        //skip
                    } else {
                        // Optional: handle unexpected types
#if DEBUG && WINDOWS
                        throw new InvalidOperationException($"Unsupported item type: {item.GetType()}");
#endif
                    }
                    r_js.Append(Environment.NewLine);
                }
                return new KeyValuePair<string, string>(r_js.ToString(), r_css.ToString());
            }
            /// <summary>
            /// on pageRequest it rebuilds it
            /// </summary>
            internal static void clearCache(bool also_each_component = false) {
                cache_path_files.Clear();
                cache_scripts.Clear();
                if (also_each_component) {
                    component_name_to_js_framework.Clear();
                    component_name_to_js.Clear();
                    component_name_to_js_component.Clear();
                    page_to_relative_components.Clear();
                    component_name_to_js_util.Clear();
                }
            }
        }
    }
}
