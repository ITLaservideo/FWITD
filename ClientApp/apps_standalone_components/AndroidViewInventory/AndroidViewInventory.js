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
        this.#addEventListeners();
        if (typeof this.options.onReady === "function") {
            this.options.onReady();
        }
    }
    elements = {
        filters: this.self_ref.querySelector("[data-ref='filters']"),
        list: this.self_ref.querySelector("[data-ref='list']"),
        sidePanel: this.self_ref.querySelector("[data-ref='sidePanel']")
    };
    async #initialize() {
        const owner = this;
        return;
    }
    async openSalesDrivenRestock(event) {
        /**
         * @type HTMLElement
         */
        const element_with_this_event = this;
        element_with_this_event.classList.add("clicked");
        const owner = element_with_this_event.fwInstanceReference;
        //owner.elements["avi-main"].innerText = 'caricamento . . .';
        const i = new AndroidViewSalesDrivenRestock({});
        owner.elements["avi-main"].innerText = '';
        owner.elements["avi-main"].appendChild(i.self_ref);
        element_with_this_event.classList.remove("clicked");
        SpaHistory.pushState(() => {
            owner.reload();
        });
    }
    async openListaMotorini(event) {
        /**
         * @type HTMLElement
         */
        const element_with_this_event = this;
        element_with_this_event.classList.add("clicked");
        const owner = element_with_this_event.fwInstanceReference;
        //owner.elements["avi-main"].innerText = 'caricamento . . .';
        const i = new AndroidVeiwStatoMotori({});
        owner.elements["avi-main"].innerText = '';
        owner.elements["avi-main"].appendChild(i.self_ref);
        element_with_this_event.classList.remove("clicked");
        SpaHistory.pushState(() => {
            owner.reload();
        });
    }
    async reload() {
        const owner = this;
        owner.elements["avi-main"].innerText = '';
        owner.elements["avi-main"].appendChild(owner.elements["avi-main-routes"]);
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
// const ss = new AndroidViewInventory({})
// document.body.appendChild(ss.elementReference());