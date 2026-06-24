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
     * @type {Array<{name: string, url: string, status: "checking"|"online"|"offline", latencyMs: number|null}>}
     */
    servers = [];
    #timerId = null;
    #settingsFloater = null;
    constructor() {
        AppStatus.displayVersion();
        this.elements.retryBtn.addEventListener("click", () => this.retryAll());
        this.elements.btn_lounch_app.addEventListener("click", () => Lobby.closeApp());

        this.#createSettingsButton();

        this.servers = (AppStatus.CheckForHealth ?? []).map((server) => ({
            name: server.name,
            url: server.url,
            status: Locale.at("checking"),
            latencyMs: null,
        }));
        this.#render();
        this.#checkAll();
        this.#timerId = setInterval(() => this.#checkAll(), SS_RECHECK_INTERVAL_MS);
        setTimeout(() => {
            Locale.setLang("it", true);
            this.elements.page.style.opacity = 1;
        }, 0);
    }
    retryAll() {
        this.servers.forEach((server) => {
            server.status = Locale.at("checking");
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
            hint: Locale.at("settings")
        });
        contianer.appendChild(btn);
        const btn2 = UiBuilder.createButton({
            onClick: () => Lobby.closeApp(),
            icon_code: "f508",
            hint: Locale.at("close app")
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

        const serversList = document.createElement("div");
        serversList.className = "ss-settings-servers";
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

                const remove = UiBuilder.createButton({
                    hint: Locale.at("remove server"),
                    icon_code: "e5cd",
                    class: "ss-settings-server-remove",
                    onClick: () => {
                        owner.servers.splice(index, 1);
                        renderServersList();
                        owner.#render();
                    }
                });
                row.append(info, remove);
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
        const urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.placeholder = Locale.at("url");
        const addBtn = UiBuilder.createButton({
            onClick: () => {
                const name = nameInput.value.trim();
                const url = urlInput.value.trim();
                if (!name || !url) return;
                const server = { name, url, status: Locale.at("checking"), latencyMs: null };
                owner.servers.push(server);
                nameInput.value = "";
                urlInput.value = "";
                renderServersList();
                owner.#render();
                owner.#checkOne(server);
            },
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
        if (!this.servers.length) {

            this.elements.list.innerHTML = `<div class="ss-empty">${Locale.at('No health check targets configured')}.</div>`;
            return;
        }
        this.elements.list.innerHTML = policy.createHTML(this.servers.map((server) => `
            <div class="ss-row">
                <div class="ss-row-info">
                    <div class="ss-row-name">${UiBuilder.escapeHTML(server.name)}</div>
                    <div class="ss-row-url">${UiBuilder.escapeHTML(server.url)}</div>
                </div>
                <div class="ss-row-status">
                    <div class="ss-badge ss-badge-${server.status}">${Locale.at(server.status)}</div>
                    ${server.latencyMs != null ? `<div class="ss-row-latency">${server.latencyMs} ms</div>` : ""}
                </div>
            </div>
        `).join(""));
    }
}
