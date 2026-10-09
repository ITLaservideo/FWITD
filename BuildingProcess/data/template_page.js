const debug = false;
/**
 * @version 1.0
 */
class App {
    elements = {
        app_main_content: document.getElementById("app-main-content"),
    }
    constructor() {
        this.#init();
        this.#asyncInit();
    }
    #init() {
        AppStatus.displayVersion();
        const btn_exit = UiBuilder.createButton({
            onClick: () => Lobby.closeApp(true),
            icon_code: "f508",
            hint: Locale.at("close app"),
            anchor: 'bottom'
        });
        this.elements.app_main_content.appendChild(btn_exit);
        //TODO constructor
    }
    async #asyncInit() {
        const owner = this;
        //TODO async stuff
    }
}
// setTimeout(() => {
//     window.the_main_app //access the app instance
// }, 0);