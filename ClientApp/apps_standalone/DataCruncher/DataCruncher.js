//keep GeneralChart Table2 (used inside DataCruncher, JSProvider only bundles components named in the page script)
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
    }
    #init() {
        const owner = this;
        AppStatus.displayVersion();
        document.body.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.key == "r") {
                e.stopPropagation();
                e.preventDefault();
                Lobby.post("AppRouter/Navigate", { where: "DataCruncher" });
            }
        });
        const data_cruncher = new DataCruncher({});
        owner.elements.app_main_content.appendChild(data_cruncher.elementReference());
    }
}
