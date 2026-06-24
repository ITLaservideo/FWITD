/**
 * automatically instantiated with setTimeout(`window.the_main_app = new App()`)
 */
class App {
    elements = {
        /**
         * @type Element
         */
        floating_container: null
    }
    constructor() {
        AppStatus.displayVersion();
        this.#init();
        const late_ops = setInterval(() => {
            if (document.readyState == 'complete') {
                App.#onPageFullyLoaded();
                clearInterval(late_ops);
                UiBuilder.Notify("🪒 time " + `TemplateTools`);
            }
        }, 750);
    }
    async #init() {
        const owner = this;
        owner.elements.floating_container = UiBuilder.createFloatingContainer(null, { id: "test-floater" });
        // this.elements.floating_container.classList.add("themain-floating-container");
        const some_style = "width:fit-content;white-space:nowrap;font-size: 15px;height: fit-content;";
        const input = document.createElement("input");
        const btn = UiBuilder.createButton({
            onClick: async (event) => {
                document.body.innerText = Locale.localizeDate(Date.now(), { tipo: 2 });
                document.body.appendChild(owner.elements.floating_container);
                btn.classList.remove("clicked");
                document.body.appendChild(input);
                input.focus();
                await Lobby.postAsync("Windows/TypeKey", {
                    key: "cf-the-local-app-url"
                });
            },
            title: "wipe page"
            , style: some_style
        });
        const btnx = UiBuilder.createButton({
            onClick: async (event) => {
                UiBuilder.Notify("🪒 time " + `TemplateTools`, event, 1000);
                btnx.classList.remove("clicked");
            },
            title: "test"
            , style: some_style
        });
        owner.elements.floating_container.appendChild(btn);
        owner.elements.floating_container.appendChild(btnx);
        //TODO
    }
    static #onPageFullyLoaded() {
        //TODO
    }
}