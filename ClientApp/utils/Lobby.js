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
    /**
     * reqId → called with the error text instead of the `alert` (see `post`'s `onError`)
     */
    static #errorCallbacks = {};
    static reqIdCounter = 0;
    static __owner_id = Number("{{@owner_id}}");
    static BaseSrcImages = "{{@HttpImagesAddress}}";//"http://192.168.1.217:16895/";
    /**
     * @param payload_stringified
     */
    static #doThePost = (the_str) => { console.assert(window.FWBridge != undefined, "back-end not linked"); window.FWBridge.postMessage(the_str); };
    /**
     * 
     * @param {string} url 
     * @param {Object} payload
     * @param {(response: LobbyResponse) => void} callback
     * @param {(error: string) => void} [onError] called when the server answers with an error; without it the error is `alert`ed and `callback` is never called
     */
    static post(url, payload, callback, onError) {
        const reqId = ++Lobby.reqIdCounter;
        payload.__reqId = reqId;
        payload.__owner_id = Lobby.__owner_id;
        payload.__url = url;
        Lobby.#postToWebviewCallbacks[reqId] = callback;
        if (onError != undefined) {
            Lobby.#errorCallbacks[reqId] = onError;
        }
        // console.log(request)
        Lobby.#doThePost(JSON.stringify(payload));
    }
    /**
     * @param {string} url
     * @param {Object} [payload={}]
     * @param {Object} [options]
     * @param {number} [options.timeout_ms] the promise always settles: with `{ ok: false, error }` when the server answers
     *   with an error (no `alert`) or doesn't answer within `timeout_ms`. Without it, an error is `alert`ed and the promise never settles.
     * @returns {Promise<LobbyResponse>}
     */
    static postAsync(url, payload = {}, options = {}) {
        if (options.timeout_ms == undefined) {
            return new Promise((resolve) => {
                Lobby.post(url, payload, resolve);
            });
        }
        return new Promise((resolve) => {
            let settled = false;
            const settle = (rsp) => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timer);
                resolve(rsp);
            };
            const timer = setTimeout(() => settle({ ok: false, error: `${url}: no answer in ${options.timeout_ms / 1000} s` }), options.timeout_ms);
            Lobby.post(url, payload, settle, (error) => settle({ ok: false, error }));
        });
    }
    /**
     * Runs `tick` now and then every `every_ms`, never two at once: a tick still running when the next is due skips it.
     * @param {() => (void|Promise<void>)} tick a rejection is logged, the polling goes on
     * @param {number} every_ms
     * @returns {{ now: () => Promise<void>, stop: () => void }} `now()` runs a tick at once (unless one is running); `stop()` ends the polling
     */
    static poll(tick, every_ms) {
        let busy = false;
        const now = async () => {
            if (busy) {
                return;
            }
            busy = true;
            try {
                await tick();
            } catch (error) {
                console.error(error);
            } finally {
                busy = false;
            }
        };
        const timer = setInterval(now, every_ms);
        now();
        return { now, stop: () => clearInterval(timer) };
    }
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
                const onError = Lobby.#errorCallbacks[reqId];
                if (rsp.__type == "ok") {
                    // console.error(rsp);
                    next(rsp);
                } else if (onError != undefined) {
                    onError(rsp.error || `Unknown error:${rsp.__type}`);
                } else {
                    alert(rsp.error || `Unknown error:${rsp.__type}`);
                }
                setTimeout(() => {
                    delete Lobby.#postToWebviewCallbacks[reqId];
                    delete Lobby.#errorCallbacks[reqId];
                }, 3000);
            } else {
                if (rsp.error) {
                    alert(`post receiver not defined:(error: ${rsp.error})`);
                }
                if (rsp.__type == "osback") {
                    if (typeof SpaHistory !== "undefined" && SpaHistory.popState()) {
                        return;
                    }
                    Lobby.closeApp();
                }
            }
        } catch (err) {
            alert("Bad response from native\n" + err);
        }
    }
    static #confirm_exit_app = undefined;
    static async closeApp(just_do_it = false) {
        if (just_do_it) {
            Lobby.#closeApp();
        }
        if (Lobby.#confirm_exit_app != undefined) {
            Lobby.#confirm_exit_app.destroy();
        }
        Lobby.#confirm_exit_app = UiBuilder.mockDialog({
            text1: `${Locale.at("close app")}`,
            onConfirm: () => {
                Lobby.#closeApp();
            },
            onDeny: () => {
            },
            onClose: () => {
            }
        });
    }
    static async #closeApp() { await new Promise((resolve) => { Lobby.post("AppRouter/CloseApp", {}, (rsp) => { resolve(); }); }); }
}
window.Lobby = Lobby;