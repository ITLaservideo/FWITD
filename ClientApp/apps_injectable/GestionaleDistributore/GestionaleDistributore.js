/**
 * @version 1.0
 * Injected into the GestionaleDistributore Angular client: a floating TreeMenu with shortcuts into the web app.
 * Injected again after every full page load (AppLoader, NavigationCompleted); Angular in-app navigation keeps it alive.
 */
class App extends FrameworkGC(`${injector_html}`) {
    /** Angular route of AssociaProdottiAlleSelezioniComponent (app-routing.module.ts, base href "/") */
    static #ROUTE_ASSOCIA_PRODOTTI = "/associa-prodotti-alle-selezioni";
    /** how long to wait for AssociaProdottiAlleSelezioniComponent to set `window.searchBarcode` after navigating */
    static #SEARCH_BARCODE_TIMEOUT_MS = 8000;
    static #MALFORMED_TOKEN = "not-a-guid";
    static #EMPTY_TOKEN = "00000000-0000-0000-0000-000000000000";
    /** bad tokens from one non-trusted IP in an hour that ban it (LoginSessionService.banIPIfErrorCountHitLastHour) */
    static #BAN_THRESHOLD = 5;
    /** ASP.NET answers 204 with an empty body when an action returns null */
    static #isNullBody = (body) => body.trim() === "" || body.trim() === "null";
    /**
     * @typedef {Object} AuthTest
     * @property {string} id - TreeMenu node id
     * @property {string} label
     * @property {string} method
     * @property {string} url
     * @property {string|null} token - sent as the `Token` header; null = no header
     * @property {Object<string, string>} [headers]
     * @property {Array<number>} expect - statuses that pass
     * @property {Array<number>} [expectDebug] - what a DEBUG server answers instead: the RequiredTokenVerification* attributes do nothing in DEBUG
     * @property {(body: string) => boolean} [checkBody]
     * @property {string} why - what it checks (row tooltip)
     */
    /**
     * Token handling checks (see GestionaleDistributore.Server/Controllers/readme.controller.md and user_session.md,
     * "What counts toward the ban"). They call the API with `fetch`, outside Angular's RequestProofInterceptor, so:
     * - never with the real token: sent without this browser's proof it would end the session (C3, TokenUsedWithoutProof);
     * - a 401 doesn't open the "Sessione scaduta" overlay.
     * None of these counts toward the IP ban: malformed tokens never reach IsAuthorized, Guid.Empty is refused before the lookup.
     * @type {Array<AuthTest>}
     */
    static #AUTH_TESTS = [
        {
            id: "test-logout-malformed", label: "LogOut · malformed token", method: "POST", url: "/User/LogOut",
            token: App.#MALFORMED_TOKEN, expect: [200],
            why: "LogOut parses the token with TryParse and always answers 200 (new Guid() used to answer 500)",
        },
        {
            id: "test-logout-none", label: "LogOut · no token", method: "POST", url: "/User/LogOut",
            token: null, expect: [200],
            why: "LogOut without a token: nothing to end, still 200",
        },
        {
            id: "test-refresh-malformed", label: "Refresh · malformed token", method: "GET", url: "/User/Refresh",
            token: App.#MALFORMED_TOKEN, expect: [200, 204], checkBody: App.#isNullBody,
            why: "Refresh goes through SessionOf: a malformed token is \"no session\" (null), not a 500, and is not traced",
        },
        {
            id: "test-refresh-empty-guid", label: "Refresh · Guid.Empty", method: "GET", url: "/User/Refresh",
            token: App.#EMPTY_TOKEN, expect: [200, 204], checkBody: App.#isNullBody,
            why: "Guid.Empty: IsAuthorized returns null on its first line, no InvalidSessionToken row",
        },
        {
            id: "test-get-version", label: "GetVersion · anonymous", method: "GET", url: "/api/Device/GetVersion",
            token: null, expect: [200],
            why: "The only anonymous Device endpoint: the client calls it at startup and to diagnose failures",
        },
        {
            id: "test-assistance-keys-none", label: "GetAssistanceKeys · no token", method: "GET", url: "/api/Device/GetAssistanceKeys",
            token: null, expect: [401], expectDebug: [200],
            why: "[RequiredTokenVerificationAny]: Branch and Matricola only to a session (was anonymous)",
        },
        {
            id: "test-lista-motori-none", label: "GetListaMotori · no token", method: "GET", url: "/api/Device/GetListaMotori",
            token: null, expect: [401], expectDebug: [200],
            why: "[RequiredTokenVerificationAny] (was anonymous)",
        },
        {
            id: "test-products-search-malformed", label: "ProductsSearch · malformed token", method: "GET", url: "/ProductsSearch/getProdotti",
            token: App.#MALFORMED_TOKEN, headers: { UserQuery: "__auth_test__" }, expect: [401], expectDebug: [200],
            why: "Release: SessionToken.Parse answers 401 before the action. DEBUG: IsPro reads it as \"not PRO\", no 500",
        },
    ];
    /**
     * @param {Object} options
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options = {}) {
        super(options);
        AppStatus.displayVersion();
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        this.#initialize();
    }
    /**
     * store here the elements references of the html
     * automatically gathers elements with attribute ` fw-id="xxx" ` after super()
     */
    elements = {
        tree_host: null,
        floating_container: null,
    }
    /** @type {TreeMenu} */
    #tree = null;
    /** a double click activates the same leaf twice (preview + pinned): run its action once */
    #lastActivation = { id: null, at: 0 };
    async #initialize() {
        const owner = this;
        owner.#tree = new TreeMenu({
            density: "comfortable",
            sort: "none",
            nodes: [
                { id: "search-barcode", label: "Search barcode", icon: "e8b6" },
                { id: "list-motors", label: "List the motors", icon: "e896" },
                {
                    id: "auth-tests", label: "Auth tests", icon: "e868",
                    children: [
                        { id: "test-run-all", label: "Run all (safe)", icon: "e037", tooltip: "Every test below except the ban, one after the other" },
                        ...App.#AUTH_TESTS.map(test => ({ id: test.id, label: test.label, icon: "e86f", tooltip: `${test.method} ${test.url}\n${test.why}` })),
                        {
                            id: "test-ban", label: `Ban · ${App.#BAN_THRESHOLD} unknown tokens`, icon: "e14b",
                            tooltip: `Sends ${App.#BAN_THRESHOLD} distinct well-formed tokens that aren't sessions: the IP gets banned unless trusted (localhost, 192.168.*): 30 min, 1 h, 4 h, then permanently at the 4th ban in 24 h`,
                            decoration: { color: "#c62828" },
                        },
                    ],
                },
            ],
            onActivate: (node) => owner.#onActivate(node),
        });
        owner.elements.tree_host.appendChild(owner.#tree.elementReference());
        owner.elements.floating_container = UiBuilder.createFloatingContainer(owner.elementReference(), {
            id: "gestionale-distributore-menu",
            direction: "vertical",
        });
    }
    /** @param {TreeMenuNode} node */
    async #onActivate(node) {
        const owner = this;
        const now = Date.now();
        if (owner.#lastActivation.id === node.id && now - owner.#lastActivation.at < 500) {
            return;
        }
        owner.#lastActivation = { id: node.id, at: now };
        switch (node.id) {
            case "search-barcode":
                await App.#searchBarcode();
                break;
            case "list-motors":
                App.#navigate(App.#ROUTE_ASSOCIA_PRODOTTI);
                break;
            case "test-run-all":
                await owner.#runAllAuthTests();
                break;
            case "test-ban":
                await owner.#runBanTest();
                break;
            default: {
                const test = App.#AUTH_TESTS.find(t => t.id === node.id);
                if (test != null) {
                    await owner.#runAuthTest(test);
                }
                break;
            }
        }
    }
    //#region auth tests
    /**
     * @param {AuthTest} test
     * @returns {Promise<"pass"|"debug"|"fail">}
     */
    async #runAuthTest(test) {
        const owner = this;
        owner.#tree.updateNode({ id: test.id, description: "…", decoration: { badge: "…", color: "gray" } });
        const { status, body, ms } = await App.#request(test.method, test.url, test.token, test.headers);
        const body_ok = test.checkBody == null || test.checkBody(body);
        /** @type {"pass"|"debug"|"fail"} */
        let verdict = "fail";
        if (test.expect.includes(status) && body_ok) {
            verdict = "pass";
        } else if (test.expectDebug?.includes(status) && body_ok) {
            verdict = "debug";
        }
        const expected = `expected ${test.expect.join("/")}${test.expectDebug ? ` (DEBUG server: ${test.expectDebug.join("/")})` : ""}`;
        const decoration = {
            pass: { badge: "✓", color: "#2e7d32", tooltip: `passed, ${expected}` },
            debug: { badge: "D", color: "#ef6c00", tooltip: `the answer of a DEBUG server (auth attributes off): in Release this fails, ${expected}` },
            fail: { badge: "✗", color: "#c62828", tooltip: `failed, ${expected}${body_ok ? "" : ", unexpected body"}` },
        }[verdict];
        owner.#tree.updateNode({ id: test.id, description: `${status === 0 ? "no answer" : status} · ${ms}ms`, decoration });
        const log = verdict === "fail" ? console.warn : console.info;
        log(`[auth-test] ${test.label}: ${verdict.toUpperCase()} ${test.method} ${test.url} → ${status} in ${ms}ms (${expected})`, body.slice(0, 300));
        return verdict;
    }
    async #runAllAuthTests() {
        const owner = this;
        const counts = { pass: 0, debug: 0, fail: 0 };
        for (const test of App.#AUTH_TESTS) {
            counts[await owner.#runAuthTest(test)]++;
        }
        const summary = `${counts.pass}/${App.#AUTH_TESTS.length} passed`
            + (counts.debug ? `, ${counts.debug} DEBUG-only` : "")
            + (counts.fail ? `, ${counts.fail} failed` : "");
        owner.#tree.updateNode({
            id: "test-run-all", description: summary,
            decoration: { badge: counts.fail ? "✗" : counts.debug ? "D" : "✓", color: counts.fail ? "#c62828" : counts.debug ? "#ef6c00" : "#2e7d32" },
        });
        UiBuilder.Notify(`Auth tests: ${summary}`, null, 4000);
    }
    /**
     * Sends BAN_THRESHOLD distinct well-formed tokens that aren't sessions the last one bans the IP
     */
    async #runBanTest() {
        const owner = this;
        const host = location.hostname;
        const is_localhost = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
        // dismissing the sheet resolves nothing → the test just never runs
        const confirmed = await new Promise(resolve => UiBuilder.mockDialog({
            text1: "your ip is going to be banned, are you sure?",
            onConfirm: () => resolve(true),
            onDeny: () => resolve(false),
            prefer_selection: 0,
        }));
        if (!confirmed) {
            return;
        }
        owner.#tree.updateNode({ id: "test-ban", description: "…", decoration: { badge: "…", color: "gray" } });
        const statuses = [];
        for (let i = 0; i < App.#BAN_THRESHOLD; i++) {
            const { status } = await App.#request("GET", "/User/Refresh", App.#randomGuid());
            statuses.push(status);
        }
        const answered = statuses.every(s => s === 200 || s === 204);
        owner.#tree.updateNode({
            id: "test-ban",
            description: `${App.#BAN_THRESHOLD} sent · ${[...new Set(statuses)].join("/")}`,
            decoration: {
                badge: answered ? "!" : "✗", color: "#c62828",
                tooltip: is_localhost ? "traced only, if the server saw a trusted IP check logs" : "IP banned if not trusted check bans",
            },
        });
        console.warn(`[auth-test] ban: ${App.#BAN_THRESHOLD} unknown tokens sent from ${host}, statuses ${statuses.join(", ")}. `
            + `Check bans, or the log line "[ban-debug] BANNING IP"`);
        UiBuilder.Notify(is_localhost
            ? `${App.#BAN_THRESHOLD} unknown tokens sent: traced, no ban expected (trusted host)`
            : `${App.#BAN_THRESHOLD} unknown tokens sent: your IP should now be banned`, null, 6000);
    }
    /**
     * @param {string} method
     * @param {string} url
     * @param {string|null} token - null = no `Token` header
     * @param {Object<string, string>} [headers]
     * @returns {Promise<{status: number, body: string, ms: number}>} status 0 = no answer
     */
    static async #request(method, url, token, headers = {}) {
        // straight to the network, like RequestFaultService.probe: never a service worker or HTTP cache
        const all_headers = { "ngsw-bypass": "true", "Accept": "application/json", ...headers };
        if (token != null) {
            all_headers["Token"] = token;
        }
        const init = { method, headers: all_headers, cache: "no-store" };
        if (method !== "GET") {
            all_headers["Content-Type"] = "application/json";
            init.body = "{}";
        }
        const started = performance.now();
        try {
            const response = await fetch(url, init);
            const body = await response.text();
            return { status: response.status, body, ms: Math.round(performance.now() - started) };
        } catch (error) {
            return { status: 0, body: `${error}`, ms: Math.round(performance.now() - started) };
        }
    }
    /** v4 GUID; crypto.randomUUID exists only in a secure context (HTTPS, localhost), not on plain-http LAN addresses */
    static #randomGuid() {
        if (typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    //#endregion
    /**
     * asks for a barcode and passes it to `window.searchBarcode`, set by AssociaProdottiAlleSelezioniComponent
     * while it's on screen: opens that page first when needed
     */
    static async #searchBarcode() {
        const barcode = `${prompt("Barcode") ?? ""}`.trim();
        if (barcode === "") {
            return;
        }
        if (typeof window.searchBarcode !== "function") {
            App.#navigate(App.#ROUTE_ASSOCIA_PRODOTTI);
        }
        const searchBarcode = await App.#waitFor(() => typeof window.searchBarcode === "function" ? window.searchBarcode : null, App.#SEARCH_BARCODE_TIMEOUT_MS);
        if (searchBarcode == null) {
            UiBuilder.Notify("window.searchBarcode not available", null, 4000);
            return;
        }
        await searchBarcode(barcode);
    }
    /**
     * Angular in-app navigation (no reload): the router follows `popstate`, so the page and this injected app stay alive
     * and the route's canDeactivate guards (unsaved changes) still run
     * @param {string} path
     */
    static #navigate(path) {
        if (location.pathname === path) {
            return;
        }
        history.pushState(history.state, "", path);
        window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
    }
    /**
     * @template T
     * @param {() => T|null} getter
     * @param {number} timeout_ms
     * @returns {Promise<T|null>} the first non-null value of `getter`, null on timeout
     */
    static async #waitFor(getter, timeout_ms) {
        const until = Date.now() + timeout_ms;
        let value = getter();
        while (value == null && Date.now() < until) {
            await new Promise(resolve => setTimeout(resolve, 100));
            value = getter();
        }
        return value;
    }
}


//#START RESERVED AREA FOR UI_BUILDER
// setTimeout(() => {
//     const ss = new App({});
//     document.body.appendChild(ss.elementReference());
// }, 0);
//#END RESERVED AREA FOR UI_BUILDER
