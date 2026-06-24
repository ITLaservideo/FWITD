const debug = false;
class App {
    elements = {
        app_main_content: document.getElementById("app-main-content"),
    }
    constructor() {
        this.#init();
        this.#asyncInit();
    }
    #init(){
        AppStatus.displayVersion();
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