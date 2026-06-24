/**
 * @version 1.0
 */
class AndroidViewAccount extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        this.#initialize();
        this.#addEventListeners();
        if (typeof this.options.onReady === "function") {
            this.options.onReady();
        }
        window.instance_AndroidViewAccount = this;
        setTimeout(() => {
            this.elements.userInfo.innerText = App.app_status.user_info;
        }, 0);
    }
    elements = {
        userInfo: this.self_ref.querySelector("[data-ref='userInfo']"),
        preferences: this.self_ref.querySelector("[data-ref='preferences']"),
        appInfo: this.self_ref.querySelector("[data-ref='appInfo']")
    };
    async #initialize() {
        const owner = this;
        //TODO initialize component here
        return;
    }
    async #addEventListeners() {
        const owner = this;
        //TODO add event listeners for component here
    }
    //#region  FWClickEventListeners
    async onClickLogout(event) {
        /**
         * @type Element
         */
        const element_with_this_event = this;
        ///**
        // * @type AndroidViewAccount
        // */
        //const owner = element_with_this_event.fwInstanceReference;
        element_with_this_event.classList.add("clicked");
        Lobby.post({ prompt: 16/*logout*/ }, (rsp) => { });
    }
    async onClickImpostazioni(event) {
        /**
         * @type Element
         */
        const element_with_this_event = this;
        ///**
        // * @type AndroidViewAccount
        // */
        //const owner = element_with_this_event.fwInstanceReference;
        element_with_this_event.classList.add("clicked");
        new BottomSheet({
            element: new AndroidViewSettings({}).elementReference(),
            onClose: () => {
                element_with_this_event.classList.remove("clicked");
            },
            centered: true
        });
    }
    //#endregion
    // owner.self_ref;//access element reference here
    // owner.elementReference();//alternative way to access element reference
    // owner.destroy();//call destroy method when needed
    // owner.options;//access building options here
}
