class LobbyResponse {
    /**
     * @type string
     */
    __reqId;        //string { get; set; }
    /**
     * @type string
     */
    error;        //string { get; set; }
}
class Lobby {
    static #postToWebviewCallbacks = {};
    static reqIdCounter = 0;
    static __owner_id = Number("{{@owner_id}}");
    static BaseSrcImages = "{{@HttpImagesAddress}}";//"http://192.168.1.217:16895/";
    /**
     * @param payload_stringified
     */
    static #doThePost = (the_str) => { window.FWBridge.postMessage(the_str); };
    /**
     * 
     * @param {string} url 
     * @param {Object} payload
     * @param {(response: LobbyResponse) => void} callback
     */
    static post(url, payload, callback) {
        const reqId = ++Lobby.reqIdCounter;
        payload.__reqId = reqId;
        payload.__owner_id = Lobby.__owner_id;
        payload.__url = url;
        Lobby.#postToWebviewCallbacks[reqId] = callback;
        // console.log(request)
        Lobby.#doThePost(JSON.stringify(payload));
    }
    /**
     * @param {string} url
     * @param {Object} [payload={}]
     * @returns {Promise<LobbyResponse>}
     */
    static postAsync(url, payload = {}) {
        return new Promise((resolve) => {
            Lobby.post(url, payload, resolve);
        });
    }
    static #confirm_exit_app = undefined;
    static handleWebviewResponse(jsonResponse) {
        // console.error(jsonResponse);
        if (jsonResponse == null) {
            alert("json response is null");
            return;
        }
        try {
            const rsp = (jsonResponse);
            if (rsp == null) {
                alert("parsed null");
                return;
            }
            const reqId = rsp.__reqId;
            const next = Lobby.#postToWebviewCallbacks[reqId];
            if (next) {
                if (rsp.__type == "ok") {
                    // console.error(rsp);
                    next(rsp);
                } else {
                    alert(rsp.error || `Unknown error:${rsp.__type}`);
                }
                setTimeout(() => {
                    delete Lobby.#postToWebviewCallbacks[reqId];
                }, 3000);
            } else {
                if (rsp.error) {
                    alert(`post receiver not defined:(error: ${rsp.error})`);
                }
                if (rsp.__type == "osback") {
                    if (typeof SpaHistory !== "undefined" && SpaHistory.popState()) {
                        return;
                    }
                    if (Lobby.#confirm_exit_app != undefined) {
                        Lobby.#confirm_exit_app.destroy();
                    }
                    Lobby.#confirm_exit_app = UiBuilder.mockDialog({
                        text1: `${Locale.at("close app")}`,
                        onConfirm: () => {
                            Lobby.closeApp();
                        },
                        onDeny: () => {
                        },
                        onClose: () => {
                        }
                    });
                }
            }
        } catch (err) {
            alert("Bad response from native\n" + err);
        }
    }
    static async closeApp() {
        await new Promise((resolve) => { Lobby.post({ url: "App/CloseApp" }, (rsp) => { resolve(); }); });
    }
}
window.Lobby = Lobby;