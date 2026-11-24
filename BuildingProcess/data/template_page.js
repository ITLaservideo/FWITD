const debug = false;
/**
 * @version 1.0
 */
class App {
    elements = {
        app_main_content: document.getElementById("app-main-content"),
    }
    constructor() {
        // Ctrl+R: reload the page through the AppRouter
        document.body.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.key == "r") {
                e.stopPropagation();
                e.preventDefault();
                Lobby.post("AppRouter/Navigate", { where: "__PAGENAME__" });
            }
        });
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