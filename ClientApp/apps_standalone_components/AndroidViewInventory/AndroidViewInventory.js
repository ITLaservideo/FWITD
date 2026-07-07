/**
 * @version 1.0
 */
class AndroidViewInventory extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        this.#initialize();
    }
    elements = {
        filters: this.self_ref.querySelector("[data-ref='filters']"),
        list: this.self_ref.querySelector("[data-ref='list']"),
        sidePanel: this.self_ref.querySelector("[data-ref='sidePanel']")
    };
    #currentSubview = null;
    #subviewBackHandler = null;
    async #initialize() {
        const owner = this;
        return;
    }
    /**
     * destroys any currently open subview and pops its pending back-state.
     * @param {Object} [options]
     * @param {boolean} [options.skipReload] - when true, does not restore the main list (caller is about to render something else)
     */
    #closeCurrentSubview(options) {
        const owner = this;
        const skipReload = options?.skipReload ?? false;
        if (owner.#subviewBackHandler) {
            if (typeof SpaHistory !== "undefined") {
                SpaHistory.popState(owner.#subviewBackHandler);
            }
            owner.#subviewBackHandler = null;
        }
        if (owner.#currentSubview) {
            owner.#currentSubview.destroy();
            owner.#currentSubview = null;
        }
        if (!skipReload) {
            owner.reload();
        }
    }
    /**
     * replaces "avi-main" with the given subview instance and registers a back-state to close it.
     * @param {Object} instance - a FrameworkGC-based component instance
     */
    #openSubview(instance) {
        const owner = this;
        owner.#closeCurrentSubview({ skipReload: true });
        owner.elements["avi-main"].innerText = '';
        owner.elements["avi-main"].appendChild(instance.self_ref);
        owner.#currentSubview = instance;
        owner.#subviewBackHandler = () => {
            owner.#closeCurrentSubview();
        };
        if (typeof SpaHistory !== "undefined") {
            SpaHistory.pushState(owner.#subviewBackHandler);
        }
    }
    async openSalesDrivenRestock(event) {
        /**
         * @type HTMLElement
         */
        const element_with_this_event = this;
        element_with_this_event.classList.add("clicked");
        const owner = element_with_this_event.fwInstanceReference;
        const i = new AndroidViewSalesDrivenRestock({});
        owner.#openSubview(i);
        element_with_this_event.classList.remove("clicked");
    }
    async openListaMotorini(event) {
        /**
         * @type HTMLElement
         */
        const element_with_this_event = this;
        element_with_this_event.classList.add("clicked");
        const owner = element_with_this_event.fwInstanceReference;
        const i = new AndroidVeiwStatoMotori({});
        owner.#openSubview(i);
        element_with_this_event.classList.remove("clicked");
    }
    async reload() {
        const owner = this;
        owner.elements["avi-main"].innerText = '';
        owner.elements["avi-main"].appendChild(owner.elements["avi-main-routes"]);
    }
    /**
     * @param {number} timeout_ms
     */
    destroy(timeout_ms = 0) {
        this.#closeCurrentSubview({ skipReload: true });
        super.destroy(timeout_ms);
    }
    // owner.self_ref;//access element reference here
    // owner.elementReference();//alternative way to access element reference
    // owner.destroy();//call destroy method when needed
    // owner.options;//access building options here
}
// const ss = new AndroidViewInventory({})
// document.body.appendChild(ss.elementReference());