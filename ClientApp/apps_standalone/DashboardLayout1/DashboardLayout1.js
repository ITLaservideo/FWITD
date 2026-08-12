//keep AndroidViewSettings, ThemeSelector

const debug = false;
/**
 * @version 1.0
 */
class App {
    elements = {

        /**
         * @type HTMLElement
         */
        "app-shopping": document.querySelector(`[fw-id="app-shopping"]`),

        /**
         * @type HTMLElement
         */
        "app-starred": document.querySelector(`[fw-id="app-starred"]`),

        /**
         * @type HTMLElement
         */
        "app-monitoring": document.querySelector(`[fw-id="app-monitoring"]`),

        /**
         * @type HTMLElement
         */
        "app-customers": document.querySelector(`[fw-id="app-customers"]`),

        /**
         * @type HTMLElement
         */
        "app-logo": document.querySelector(`[fw-id="app-logo"]`),

        /**
         * @type HTMLElement
         */
        main_settings: document.querySelector(`[fw-id="main_settings"]`),

        /**
         * @type HTMLElement
         */
        "app-user-settings": document.querySelector(`[fw-id="app-user-settings"]`),

        /**
         * @type HTMLElement
         */
        app_content: document.querySelector(`[fw-id="app_content"]`),

        /**
         * @type HTMLElement
         */
        "app-style": document.querySelector(`[fw-id="app-style"]`),

        /** @type {HTMLElement} */
        da_app: document.querySelector(`[fw-id="da_app"]`),

        /** @type {HTMLElement} */
        "start-content": document.querySelector(`[fw-id="start-content"]`),
    }
    instances = {
        /**
         * @type AppRouter
         */
        AppRouter: null,
    }
    constructor() {
        document.body.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.key == "r") {
                e.stopPropagation();
                e.preventDefault();
                Lobby.post("AppRouter/Navigate", { where: "DashboardLayout1" }, (rsp) => {
                    resolve();
                    //owner.elements.button_login.classList.toggle("clicked", false);
                });
            }
        })
        this.#asyncInit();
        const owner = this;
        owner.instances.AppRouter = new AppRouter(owner.elements.app_content, {
            AndroidViewAccount,
            AndroidViewAnalytics,
            AndroidViewHome,
            AndroidViewInventory,
            // AppRouter always constructs routes as `new Cls({})`, so these forward the fixed
            // scope onto the shared Settings component instead of registering it twice.
            UserSettings: (options) => { return new Settings({ ...options, scope: 'UserSettings' }); },
            Settings
        });
        AppStatus.displayVersion();
    }
    async #asyncInit() {
        const owner = this;
        //TODO async stuff
    }
    async goGoTo(where) {
        const owner = this;
        owner.instances.AppRouter.navigate(where);
    }
    /**
     * Auto-generated handler
     * @param {Event} event
     */
    onChangeAppearance(event) {
        /** @type HTMLElement */
        const element_with_this_event = this;
        /** @type App */
        const owner = element_with_this_event.fwInstanceReference;
        owner.elements.da_app.classList.toggle("app-grid-expanded");
    }

    /**
     * Auto-generated handler
     * @param {Event} event
     */
    onClickLogo(event) {
        /** @type HTMLElement */
        const element_with_this_event = this;
        /** @type App */
        const owner = element_with_this_event.fwInstanceReference;
        owner.elements.da_app.innerText = '';
        owner.elements.da_app.appendChild(owner.elements["start-content"]);
    }
}
// setTimeout(() => {
//     window.the_main_app //access the app instance
// }, 0);