const debug = false;
class App {
    /**
     * Holds references to important HTML elements.
     */
    elements = {
        app_main_content: null,
    }
    /**
     * Represents the current status of the application.
     */
    static app_status = {
    };
    constructor() {
        App.init();
        this.#getReferencesElements();
        this.#asyncContructor();
    }
    static async init() {
        App.app_status = await new Promise((resolve) => {
            Lobby.post({ prompt: 3/*app status*/ }, (rsp) => {
                resolve(rsp.ps);
            });
        });
    }
    #getReferencesElements() {
        const owner = this;
        owner.elements.app_main_content = document.getElementById("app-main-content");
    }
    async #asyncContructor() {
        const owner = this;
        //TODO start page
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
                        owner.navigate(enumAppRouting.DataAnalizis1);
                    }
                },
                {
                    icon_code: "f86e",
                    title: "inventory",
                    onSelect: () => {
                        owner.navigate(enumAppRouting.AndroidViewInventory);
                    }
                },
                {
                    icon_code: "e88a",
                    title: "home",
                    onSelect: () => {
                        owner.navigate(enumAppRouting.AndroidViewHome);
                    }
                },
                {
                    icon_code: "e172",
                    title: "tasks",
                    onSelect: () => {
                        owner.navigate(enumAppRouting.AndroidViewTasks);
                    }
                },
                {
                    icon_code: "ebb7",
                    title: "2502089",
                    onSelect: () => {
                        owner.navigate(enumAppRouting.AndroidViewAccount);
                    }
                },
            ]
        });
        document.body.appendChild(owner.instances.BottomNavBar.elementReference());
    }
}
// setTimeout(() => {
//     window.the_main_app //access the app instance
// }, 0);