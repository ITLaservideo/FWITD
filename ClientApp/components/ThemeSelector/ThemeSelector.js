
/** mirrors JSProvider.CSSThemes (C#) */
const enumThemes = Object.freeze({
    vscode_dark: 0,
    vscode_light: 1,
});
/**
 * @version 1.0
 */
class ThemeSelector extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     * @param {boolean} [options.floating] - floating top right
     * @param {string} [options.label] - text near icon
     */
    constructor(options) {
        super(options);
        this.#initialize();
        this.#addEventListeners();
    }
    async #initialize() {
        const owner = this;
        owner.self_ref.addEventListener("click", (event) => {
            new MousePopUp({
                title: `change theme`,
                action_titles: [`set dark theme`, "set light theme"],
                text_svgs: ["e51c", "e518"],
                next: [() => {
                    ThemeSelector.askChangeTheme(enumThemes.vscode_dark);
                }, () => {
                    ThemeSelector.askChangeTheme(enumThemes.vscode_light)
                }],
                event: event
            });
        });
        if (owner.options.auto_deploy != false) {
            document.body.appendChild(owner.self_ref);
        }
        if (owner.options.label != undefined) {
            const span = document.createElement("span");
            span.innerText = owner.options.label;
            owner.self_ref.appendChild(span);
        }
        if (owner.options.floating == false) {
            owner.self_ref.id = "";
            owner.self_ref.classList.add("ez-button");
        }
        return;
    }
    static async askChangeTheme(id_theme) {
        console.warn("askChangeTheme");
        Lobby.post("Settings/ChangeTheme", {
            a_number: id_theme,
        }, (rsp) => {/*none, the app automatically reloads the current app of every webview */ });
    }
    async #addEventListeners() {
        const owner = this;
        //TODO add event listeners for component here
    }
    // owner.self_ref;//access element reference here
    // owner.elementReference();//alternative way to access element reference
    // owner.destroy();//call destroy method when needed
    // owner.options;//access building options here
}