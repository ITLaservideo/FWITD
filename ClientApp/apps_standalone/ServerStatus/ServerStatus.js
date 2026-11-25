const debug = false;
let SS_CHECK_TIMEOUT_MS = 8000;
let SS_RECHECK_INTERVAL_MS = 30000;

class App {
    /**
     * Holds references to important HTML elements.
     */
    elements = {
        page: document.getElementById("ss-page"),
        summary: document.getElementById("ss-summary"),
        list: document.getElementById("ss-list"),
        btn_lounch_app: document.getElementById("ss-lounch-app"),
        retryBtn: document.getElementById("ss-retry-btn"),
    }
    /**
     * @type {Array<{name: string, url: string, readonly: boolean, status: "checking"|"online"|"offline", latencyMs: number|null}>}
     */
    servers = [];
    #timerId = null;
    #settingsFloater = null;
    /** DEBUG build (from ServerStatus/GetServers): appsettings.json edits need a rebuild + restart */
    #isDebug = false;
    constructor() {
        document.body.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.key == "r") {
                e.stopPropagation();
                e.preventDefault();
                Lobby.post("AppRouter/Navigate", { where: "ServerStatus" }, (rsp) => {
                    resolve();
                    //owner.elements.button_login.classList.toggle("clicked", false);
                });
            }
        })
        AppStatus.displayVersion();
        this.elements.retryBtn.addEventListener("click", () => this.retryAll());
        this.elements.btn_lounch_app.addEventListener("click", () => Lobby.closeApp());

        this.#createSettingsButton();

        this.#loadServers();
        setTimeout(() => {
            Locale.setLang("it", true);
            this.elements.page.style.opacity = 1;
        }, 0);
    }
    // appsettings.json's CheckForHealth (readonly) followed by the user-added ones (UserSettings)
    async #loadServers() {
        const rsp = await Lobby.postAsync("ServerStatus/GetServers", {}, { timeout_ms: 5000 });
        const servers = rsp.ok === false
            ? (AppStatus.CheckForHealth ?? []).map((server) => ({ ...server, readonly: true }))
            : rsp.servers;
        this.#isDebug = rsp.debug === true;
        this.servers = (servers ?? []).map((server) => ({
            name: server.name,
            url: server.url,
            readonly: server.readonly === true,
            status: "checking",
            latencyMs: null,
        }));
        this.#render();
        this.#checkAll();
        this.#restartTimer();
    }
    #saveServers() {
        const servers = this.servers.filter((server) => !server.readonly).map(({ name, url }) => ({ name, url }));
        Lobby.postAsync("ServerStatus/SaveServers", { servers }, { timeout_ms: 5000 }).then((rsp) => {
            if (rsp.ok === false) {
                console.error("ServerStatus/SaveServers failed", rsp.error);
            }
        });
    }
    retryAll() {
        this.servers.forEach((server) => {
            server.status = "checking";
            server.latencyMs = null;
        });
        this.#render();
        this.#checkAll();
    }
    #createSettingsButton() {
        const contianer = document.createElement("div");
        contianer.className = "container-top-right-buttons";
        const btn = UiBuilder.createButton({
            onClick: () => this.#toggleSettings(),
            icon_code: "e8b8",
            hint: Locale.at("settings"),
            anchor: 'bottom'
        });
        contianer.appendChild(btn);
        document.body.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.key == "r") {
                e.stopPropagation();
                e.preventDefault();
                Lobby.post("AppRouter/Navigate", { where: "ServerStatus" }, (rsp) => {
                    resolve();
                    //owner.elements.button_login.classList.toggle("clicked", false);
                });
            }
        })
        const btn2 = UiBuilder.createButton({
            onClick: () => Lobby.closeApp(true),
            icon_code: "f508",
            hint: Locale.at("close app"),
            anchor: 'bottom'
        });
        contianer.appendChild(btn2);
        this.elements.page.appendChild(contianer);
    }
    #restartTimer() {
        clearInterval(this.#timerId);
        this.#timerId = setInterval(() => this.#checkAll(), SS_RECHECK_INTERVAL_MS);
    }
    #toggleSettings() {
        if (this.#settingsFloater) {
            this.#settingsFloater.querySelector(".floating-container-close")?.click();
            return;
        }
        this.#settingsFloater = UiBuilder.createFloatingContainer(this.#buildSettingsPanel(), {
            id: "ss-settings-floater",
            direction: "vertical",
            onDestroy: () => { this.#settingsFloater = null; },
        });
    }
    #buildSettingsPanel() {
        const owner = this;
        const panel = document.createElement("div");
        panel.className = "ss-settings-panel";

        const timeoutRow = document.createElement("div");
        timeoutRow.className = "ss-settings-row";
        const timeoutLabel = document.createElement("label");
        timeoutLabel.innerText = Locale.at("check timeout (ms)");
        const timeoutInput = document.createElement("input");
        timeoutInput.type = "number";
        timeoutInput.min = "500";
        timeoutInput.step = "500";
        timeoutInput.value = SS_CHECK_TIMEOUT_MS;
        timeoutInput.addEventListener("change", () => {
            SS_CHECK_TIMEOUT_MS = Math.max(500, Number(timeoutInput.value) || SS_CHECK_TIMEOUT_MS);
            timeoutInput.value = SS_CHECK_TIMEOUT_MS;
        });
        timeoutRow.append(timeoutLabel, timeoutInput);

        const intervalRow = document.createElement("div");
        intervalRow.className = "ss-settings-row";
        const intervalLabel = document.createElement("label");
        intervalLabel.innerText = Locale.at("recheck interval (ms)");
        const intervalInput = document.createElement("input");
        intervalInput.type = "number";
        intervalInput.min = "1000";
        intervalInput.step = "1000";
        intervalInput.value = SS_RECHECK_INTERVAL_MS;
        intervalInput.addEventListener("change", () => {
            SS_RECHECK_INTERVAL_MS = Math.max(1000, Number(intervalInput.value) || SS_RECHECK_INTERVAL_MS);
            intervalInput.value = SS_RECHECK_INTERVAL_MS;
            owner.#restartTimer();
        });
        intervalRow.append(intervalLabel, intervalInput);

        const serversTitle = document.createElement("div");
        serversTitle.className = "ss-settings-section-title";
        serversTitle.innerText = Locale.at("servers");
        if (owner.#isDebug) {
            const syncInfo = Icons.create("e629");
            syncInfo.classList.add("ss-settings-sync-info");
            UiBuilder.addHint({
                target: serversTitle,
                hint: Locale.at("DEBUG: after editing appsettings.json, rebuild the app (the build copies it next to the exe), then restart ServerStatus"),
                anchor: "bottom",
            });
            serversTitle.appendChild(syncInfo);
        }

        const serversList = document.createElement("div");
        serversList.className = "ss-settings-servers";
        // the check fetches the url as typed: without a scheme it'd be resolved against the page's own origin
        const createUrlInput = () => {
            const input = document.createElement("input");
            input.type = "text";
            input.placeholder = "https://…";
            UiBuilder.addHint({
                target: input,
                hint: Locale.at("full url, including http:// or https://"),
                anchor: "bottom",
            });
            return input;
        };
        // Enter on any input but the last moves focus to the next one; Enter on the last calls `submit`
        const enterFocusesNextOrSubmits = (inputs, submit) => {
            inputs.forEach((input, i) => input.addEventListener("keydown", (e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (i < inputs.length - 1) inputs[i + 1].focus();
                else submit();
            }));
        };
        const buildEditRow = (server) => {
            const row = document.createElement("div");
            row.className = "ss-settings-server-row ss-settings-server-row-editing";

            const fields = document.createElement("div");
            fields.className = "ss-settings-server-edit";
            const editName = document.createElement("input");
            editName.type = "text";
            editName.placeholder = Locale.at("name");
            editName.value = server.name;
            const editUrl = createUrlInput();
            editUrl.value = server.url;
            fields.append(editName, editUrl);

            const save = () => {
                const name = editName.value.trim();
                const url = editUrl.value.trim();
                if (!name) { editName.focus(); return; }
                if (!url) { editUrl.focus(); return; }
                const urlChanged = url !== server.url;
                server.name = name;
                server.url = url;
                owner.#saveServers();
                renderServersList();
                if (urlChanged) {
                    server.status = "checking";
                    server.latencyMs = null;
                    owner.#render();
                    owner.#checkOne(server);
                } else {
                    owner.#render();
                }
            };
            const cancel = () => renderServersList();

            enterFocusesNextOrSubmits([editName, editUrl], save);
            [editName, editUrl].forEach((input) => input.addEventListener("keydown", (e) => {
                if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancel(); }
            }));

            const saveBtn = UiBuilder.createButton({
                hint: Locale.at("save"),
                icon_code: "e5ca",
                class: "ss-settings-server-action",
                onClick: save,
            });
            const cancelBtn = UiBuilder.createButton({
                hint: Locale.at("cancel"),
                icon_code: "e5cd",
                class: "ss-settings-server-remove",
                onClick: cancel,
            });
            row.append(fields, saveBtn, cancelBtn);
            setTimeout(() => editName.focus(), 0);
            return row;
        };
        const renderServersList = () => {
            serversList.replaceChildren();
            owner.servers.forEach((server, index) => {
                const row = document.createElement("div");
                row.className = "ss-settings-server-row";

                const info = document.createElement("div");
                info.className = "ss-settings-server-info";
                const name = document.createElement("div");
                name.className = "ss-settings-server-name";
                name.innerText = server.name;
                const url = document.createElement("div");
                url.className = "ss-settings-server-url";
                url.innerText = server.url;
                info.append(name, url);

                if (server.readonly) {
                    row.classList.add("ss-settings-server-row-readonly");
                    const locked = UiBuilder.createButton({
                        hint: Locale.at("defined in appsettings.json: click to open it"),
                        icon_code: "e950",
                        class: "ss-settings-server-action",
                        onClick: () => Lobby.postAsync("Windows/OpenAppSettings", {}),
                    });
                    row.append(info, locked);
                    serversList.appendChild(row);
                    return;
                }

                const edit = UiBuilder.createButton({
                    hint: Locale.at("edit server"),
                    icon_code: "e3c9",
                    class: "ss-settings-server-action",
                    onClick: () => row.replaceWith(buildEditRow(server)),
                });
                const remove = UiBuilder.createButton({
                    hint: Locale.at("remove server"),
                    icon_code: "e5cd",
                    class: "ss-settings-server-remove",
                    onClick: () => {
                        owner.servers.splice(index, 1);
                        owner.#saveServers();
                        renderServersList();
                        owner.#render();
                    }
                });
                row.append(info, edit, remove);
                serversList.appendChild(row);
            });
        };
        renderServersList();

        const addTitle = document.createElement("div");
        addTitle.className = "ss-settings-section-title";
        addTitle.innerText = Locale.at("add server");

        const addRow = document.createElement("div");
        addRow.className = "ss-settings-add-row";
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.placeholder = Locale.at("name");
        const urlInput = createUrlInput();
        const addServer = () => {
            const name = nameInput.value.trim();
            const url = urlInput.value.trim();
            if (!name) { nameInput.focus(); return; }
            if (!url) { urlInput.focus(); return; }
            const server = { name, url, readonly: false, status: "checking", latencyMs: null };
            owner.servers.push(server);
            owner.#saveServers();
            nameInput.value = "";
            urlInput.value = "";
            renderServersList();
            owner.#render();
            owner.#checkOne(server);
            nameInput.focus();
        };
        enterFocusesNextOrSubmits([nameInput, urlInput], addServer);
        const addBtn = UiBuilder.createButton({
            onClick: addServer,
            title: Locale.at("add"),
        });
        addRow.append(nameInput, urlInput, addBtn);

        panel.append(timeoutRow, intervalRow, serversTitle, serversList, addTitle, addRow);
        return panel;
    }
    async #checkAll() {
        await Promise.all(this.servers.map((server) => this.#checkOne(server)));
    }
    #toggledScheme(url) {
        if (/^https:/i.test(url)) return url.replace(/^https:/i, "http:");
        if (/^http:/i.test(url)) return url.replace(/^http:/i, "https:");
        return null;
    }
    async #checkOne(server) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SS_CHECK_TIMEOUT_MS);
        const started = performance.now();
        try {
            // no-cors: we only care whether the host is reachable, not the HTTP status —
            // most of these endpoints live on a different host/port than the WebView origin.
            await fetch(server.url, { mode: "no-cors", cache: "no-store", signal: controller.signal });
            server.status = ("online");
        } catch (some_e) {
            // The configured scheme may be wrong or blocked (e.g. http/https mismatch) —
            // retry once with the opposite scheme before giving up. fetch() never exposes
            // the real network error (cert/DNS/connection reset) to script, so any failure
            // here just reports as a generic "failed to fetch"-style message.
            const altUrl = this.#toggledScheme(server.url);
            if (altUrl) {
                const altController = new AbortController();
                const altTimeoutId = setTimeout(() => altController.abort(), SS_CHECK_TIMEOUT_MS);
                try {
                    await fetch(altUrl, { mode: "no-cors", cache: "no-store", signal: altController.signal });
                    server.status = ("online");
                    server.url = altUrl;
                } catch (more_e) {
                    server.status = ("offline");
                } finally {
                    clearTimeout(altTimeoutId);
                }
            } else {
                server.status = ("offline");
            }
        } finally {
            clearTimeout(timeoutId);
        }
        server.latencyMs = Math.round(performance.now() - started);
        this.#render();
    }
    #render() {
        if (this.elements.summary) {
            const online = this.servers.filter((server) => server.status === ("online")).length;
            this.elements.summary.innerText = this.servers.length
                ? `${Locale.at(online)}/${this.servers.length} ${Locale.at('online')}`
                : "";
        }
        if (!this.elements.list) return;
        // DOM nodes and textContent only: name and url are typed in by the user (settings popup)
        const node = (className, text) => {
            const el = document.createElement("div");
            el.className = className;
            if (text != undefined) {
                el.textContent = text;
            }
            return el;
        };
        if (!this.servers.length) {
            this.elements.list.replaceChildren(node("ss-empty", `${Locale.at('No health check targets configured')}.`));
            return;
        }
        this.elements.list.replaceChildren(...this.servers.map((server) => {
            const info = node("ss-row-info");
            const url = node("ss-row-url");
            url.append(node("ss-row-url-text", UiBuilder.decodeHTMLEntities(server.url)), Icons.create("e89e"));
            UiBuilder.addHint({ target: url, hint: Locale.at("open in browser"), anchor: "bottom" });
            url.addEventListener("click", () => {
                Lobby.postAsync("Windows/OpenInBrowser", { url: server.url })
                    .catch((err) => console.error("OpenInBrowser failed", err));
            });
            info.append(node("ss-row-name", UiBuilder.decodeHTMLEntities(server.name)), url);
            const status = node("ss-row-status");
            const badge = node("ss-badge", Locale.at(server.status));
            badge.classList.add(`ss-badge-${server.status}`);
            status.append(badge);
            if (server.latencyMs != null) {
                status.append(node("ss-row-latency", `${server.latencyMs} ms`));
            }
            const row = node("ss-row");
            row.append(info, status);
            return row;
        }));
    }
}
