const enumAppRouting = Object.freeze({
    AndroidViewAccount: 0,
    AndroidViewAnalytics: 1,
    AndroidViewHome: 2,
    AndroidViewInventory: 3,
    AndroidViewTasks: 4,
    DataAnalizis1: 5,
});

class AppRouter {
    #instances = {};
    #contentContainer = null;
    #routes = {};

    /**
     * @param {Element} contentContainer
     * @param {{ [key: string]: new (args: object) => any }} routes
     */
    constructor(contentContainer, routes) {
        this.#contentContainer = contentContainer;
        this.#routes = routes;
        this.#initListeners();
    }

    #initListeners() {
        addEventListener("popstate", (event) => { console.warn("popstate"); });
        window.addEventListener("keydown", (event) => {
            if (event.altKey && event.key === "ArrowLeft") {
                event.preventDefault();
                SpaHistory.popState();
            }
        });
    }

    /**
     * @param {enumAppRouting} enum_app_routing
     */
    async navigate(enum_app_routing) {
        const key = Object.keys(enumAppRouting).find(k => enumAppRouting[k] === enum_app_routing);
        if (!key) {
            console.error('Invalid routing enum:', enum_app_routing);
            return;
        }
        if (typeof SpaHistory !== "undefined") {
            SpaHistory.clear();
        }
        if (this.#instances[key] === undefined) {
            const Cls = this.#routes[key];
            if (!Cls) { console.warn('No class found for:', key); return; }
            this.#instances[key] = new Cls({});
        } else {
            try {
                this.#instances[key].reload();
            } catch { }
        }
        this.#contentContainer.innerText = '';
        this.#contentContainer.appendChild(this.#instances[key].elementReference());
    }
}
