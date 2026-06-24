const debug = false;
const enumAppRouting = Object.freeze({
    AndroidViewAccount: 0,
    AndroidViewAnalytics: 1,
    AndroidViewHome: 2,
    AndroidViewInventory: 3,
    AndroidViewTasks: 4,
    DataAnalizis1: 5,
});
class App {
    /**
     * Holds references to important HTML elements.
     */
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
    }
    constructor() {
        AppStatus.displayVersion();
        App.init();
        this.#getReferencesElements();
        this.#asyncContructor();
    }
    static async init() {
        addEventListener("popstate", (event) => { console.warn("popstate"); });
        window.addEventListener("keydown", function (event) {
            if (event.altKey && event.key === "ArrowLeft") {
                event.preventDefault();
                SpaHistory.popState();
            }
        });
    }
    #getReferencesElements() {
        const owner = this;
        owner.elements.app_main_content = document.getElementById("app-main-content");
    }
    async #asyncContructor() {
        //TODO start page
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
    /**
     * 
     * @param {enumAppRouting} enum_app_routing 
     */
    async navigate(enum_app_routing) {
        const owner = this;
        const key = Object.keys(enumAppRouting).find(k => enumAppRouting[k] === enum_app_routing);
        if (!key) {
            console.error('Invalid routing enum:', enum_app_routing);
            return;
        }
        if (typeof SpaHistory !== "undefined") {
            SpaHistory.clear();
        }
        if (owner.instances[key] === undefined) {
            switch (enum_app_routing) {
                case enumAppRouting.AndroidViewHome:
                    owner.instances[key] = new AndroidViewHome({});
                    break;

                case enumAppRouting.AndroidViewAnalytics:
                    owner.instances[key] = new AndroidViewAnalytics({});
                    break;
                case enumAppRouting.DataAnalizis1:
                    owner.instances[key] = new DataAnalizis1({});
                    break;

                case enumAppRouting.AndroidViewAccount:
                    owner.instances[key] = new AndroidViewAccount({});
                    break;

                case enumAppRouting.AndroidViewInventory:
                    owner.instances[key] = new AndroidViewInventory({});
                    break;

                case enumAppRouting.AndroidViewTasks:
                    owner.instances[key] = new AndroidViewTasks({});
                    break;

                default:
                    console.warn('Unhandled routing case:', key);
                    return;
            }
        } else {
            try {
                owner.instances[key].reload();
            } catch { }
        }
        owner.elements.app_main_content.innerText = '';
        owner.elements.app_main_content.appendChild(owner.instances[key].elementReference());
    }
}