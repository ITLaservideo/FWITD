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
    }
}
// setTimeout(() => {
//     window.the_main_app //access the app instance
// }, 0);