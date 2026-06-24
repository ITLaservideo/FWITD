/**
 * contains public settings from different sources `AppSettings, DBSettings` ecc...
 */
class AppStatus {
    static displayVersion() {
        setTimeout(() => {
            const js_running = document.getElementsByClassName("js-running-check-ok")[0] ?? document.createElement("div");
            js_running.className = "js-running-check-ok";
            js_running.innerText = `v${AppStatus.VERSION} ✓`;
            document.body.appendChild(js_running);
        }, 0);
    }
}
//#region {{@AppSettings.[a-zA-Z_-]+}}
Object.defineProperty(AppStatus, "VERSION", {
    value: `{{@AppSettings.app-version}}`,
    writable: false,
    configurable: false,
    enumerable: true
});

Object.defineProperty(AppStatus, "CF_URL_NEW_TUNNEL", {
    value: `{{@AppSettings.Cloudflare.URL_NEW_TUNNEL}}`,
    writable: false,
    configurable: false,
    enumerable: true
});


Object.defineProperty(AppStatus, "CF_URL_DeleteURL", {
    value: `{{@AppSettings.Cloudflare.URL_DeleteURL}}`,
    writable: false,
    configurable: false,
    enumerable: true
});


Object.defineProperty(AppStatus, "UseThisDeviceForNotifications", {
    value: `{{@AppSettings.Device.UseThisDeviceForNotifications}}`,
    writable: false,
    configurable: false,
    enumerable: true
});

Object.defineProperty(AppStatus, "IsPhone", {
    value: `{{@AppSettings.Device.IsPhone}}`,
    writable: false,
    configurable: false,
    enumerable: true
});

//#endregion

//#region {{@DBSettings.[a-zA-Z_-]+}}


//#endregion