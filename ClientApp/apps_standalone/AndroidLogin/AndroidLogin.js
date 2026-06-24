const debug = false;
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
    constructor() {
        AppStatus.displayVersion();
        App.init();
        this.#getReferencesElements();
        this.#asyncContructor();
    }
    static async init() {
    }
    #getReferencesElements() {
        const owner = this;
        owner.elements.app_main_content = document.getElementById("app-main-content");
    }
    async #asyncContructor() {
        const owner = this;
        const avl = new AndroidViewLogin({});
        new ThemeSelector({});
        owner.elements.app_main_content.appendChild(avl.elementReference());
        //TODO start page
    }
}