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
            style: `right: -4px;top: -6px;position: absolute;background: transparent;box-shadow: unset;opacity: 0.3;padding:4px;`,
            icon_code: "f508",
            anchor: 'bottom'
        });
        this.elements.app_main_content.appendChild(btn_exit);
        setTimeout(() => {
            const ss = new DCSVAC({});
            document.body.appendChild(ss.elementReference());
        }, 0);
    }
    async #asyncInit() {
        const owner = this;
        //TODO async stuff
    }
}
// setTimeout(() => {
//     window.the_main_app //access the app instance
// }, 0);