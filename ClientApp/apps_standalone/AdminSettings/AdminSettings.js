const debug = false;
class App {
    /**
     * Holds references to important HTML elements.
     */
    static elements = {
        app_main_content: document.getElementById("app-main-content"),
    }
    constructor() {
        document.body.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.key == "r") {
                e.stopPropagation();
                e.preventDefault();
                Lobby.post("AppRouter/Navigate", { where: "AdminSettings" }, (rsp) => {
                    resolve();
                    //owner.elements.button_login.classList.toggle("clicked", false);
                });
            }
        })
        App.init();
        this.#asyncContructor();
    }
    static async init() {
        const ss = new Settings({ scope: 'SystemSettings' });
        App.elements.app_main_content.appendChild(ss.elementReference());

        const secureMessagingHeader = document.createElement('h4');
        secureMessagingHeader.textContent = Locale.at('Secure Messaging');
        App.elements.app_main_content.appendChild(secureMessagingHeader);
        const secureMessaging = new InstallationSecureMessaging({});
        App.elements.app_main_content.appendChild(secureMessaging.elementReference());

        document.body.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.key == "r") {
                e.stopPropagation();
                e.preventDefault();
                Lobby.post("AppRouter/Navigate", { where: "AdminSettings" }, (rsp) => {
                    resolve();
                    //owner.elements.button_login.classList.toggle("clicked", false);
                });
            }
        })
    }
    async #asyncContructor() {
        const owner = this;
    }
}
// setTimeout(() => {
//     window.the_main_app //access the app instance
// }, 0);