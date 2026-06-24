const debug = false;
/**
 * StartApp.AndroidAppDemo = 5
 */
class App {
    elements = {
        /**
         * @type Element
         */
        app_main_content: null,
    }
    instances = {
        /**
         * @type BottomNavBar
         */
        BottomNavBar: null,
        /**
         * @type AppRouter
         */
        AppRouter: null,
    }
    constructor() {
        AppStatus.displayVersion();
        this.#getReferencesElements();
        this.#asyncContructor();
    }
    #getReferencesElements() {
        const owner = this;
        owner.elements.app_main_content = document.getElementById("app-main-content");
        owner.instances.AppRouter = new AppRouter(owner.elements.app_main_content, {
            AndroidViewAccount,
            AndroidViewAnalytics,
            AndroidViewHome,
            AndroidViewInventory,
            AndroidViewTasks,
            DataAnalizis1,
        });
    }
    async #asyncContructor() {
        const owner = this;
        await this.#createNavBar();
    }
    async #createNavBar() {
        const owner = this;
        owner.instances.BottomNavBar = new BottomNavBar({
            selections: [
                {
                    icon_code: "ef3e",
                    title: "analytics",
                    onSelect: () => {
                        owner.instances.AppRouter.navigate(enumAppRouting.DataAnalizis1);
                    }
                },
                {
                    icon_code: "f86e",
                    title: "inventory",
                    onSelect: () => {
                        owner.instances.AppRouter.navigate(enumAppRouting.AndroidViewInventory);
                    }
                },
                {
                    icon_code: "e88a",
                    title: "home",
                    onSelect: () => {
                        owner.instances.AppRouter.navigate(enumAppRouting.AndroidViewHome);
                    }
                },
                {
                    icon_code: "e172",
                    title: "tasks",
                    onSelect: () => {
                        owner.instances.AppRouter.navigate(enumAppRouting.AndroidViewTasks);
                    }
                },
                {
                    icon_code: "ebb7",
                    title: "2502089",
                    onSelect: () => {
                        owner.instances.AppRouter.navigate(enumAppRouting.AndroidViewAccount);
                    }
                },
            ]
        });
        document.body.appendChild(owner.instances.BottomNavBar.elementReference());
    }
}
