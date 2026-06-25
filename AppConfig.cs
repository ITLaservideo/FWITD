namespace FWITD {
    public enum StartApp {
        Dashboard = 0,
        Cloudflared = 1,
        GestionaleDistributore = 2,
        ReservedAppDoNotChangeMe = 3,
        GoogleDocs = 4,
        AndroidAppDemo = 5,
        AndroidLogin = 6,
        ToDoList = 7,
        TemplateJobs = 8,
        YouTube = 9,
        AndroidDebug = 10,
    }

    internal static class AppConfig {
        #pragma warning disable IDE0055
        internal static readonly Dictionary<StartApp, ((object? script, string? url) main, (object? script, string? url) extra)> _scripts = new() {
            [StartApp.Dashboard]              = ( main: (JSProvider.JS.injectable_apps.TemplateTools, AppSettings.Get<string>("Urls.DebugWebsite")),
                                                  extra: (null, null)),
            [StartApp.Cloudflared]            = ( main: (JSProvider.JS.injectable_apps.cloudflared,   AppSettings.Get<string>("Cloudflare.URL_NEW_TUNNEL")),
                                                  extra: (JSProvider.JS.injectable_apps.GoogleDocs,   AppSettings.Get<string>("Google.URL_ListaMacchineConfigurateCloudflare"))),
            [StartApp.GestionaleDistributore] = ( main: (JSProvider.JS.injectable_apps.cloudflared,   null),
                                                  extra: (null, null)),
            [StartApp.GoogleDocs]             = ( main: (JSProvider.JS.injectable_apps.GoogleDocs,    AppSettings.Get<string>("Google.URL_ListaMacchineConfigurateCloudflare")),
                                                  extra: (null, null)),
            [StartApp.AndroidAppDemo]         = ( main: (JSProvider.JS.pages.AndroidAppDemo,          null),
                                                  extra: (null, null)),
            [StartApp.AndroidLogin]           = ( main: (JSProvider.JS.pages.AndroidLogin,            null),
                                                  extra: (null, null)),
            [StartApp.AndroidDebug]           = ( main: (JSProvider.JS.injectable_apps.TemplateTools, AppSettings.Get<string>("Urls.LocalWebsite")),
                                                  extra: (null, null)),
            [StartApp.TemplateJobs]           = ( main: (JSProvider.JS.injectable_apps.TemplateJobs,  AppSettings.Get<string>("Urls.DebugWebsite")),
                                                  extra: (null, null)),
#if WINDOWS
            [StartApp.ToDoList]               = ( main: (null, null),
                                                  extra: (JSProvider.JS.injectable_apps.GoogleDocs,   AppSettings.Get<string>("Google.URL_TodoGestionaleDistributore"))),
#else
            [StartApp.ToDoList]               = ( main: (JSProvider.JS.injectable_apps.GoogleDocs,    AppSettings.Get<string>("Google.URL_TodoGestionaleDistributore")),
                                                  extra: (null, null)),
#endif
            [StartApp.YouTube]                = ( main: (JSProvider.JS.injectable_apps.YouTube,       AppSettings.Get<string>("Urls.YouTube")),
                                                  extra: (null, null)),
        };
        #pragma warning restore IDE0055
    }
}
