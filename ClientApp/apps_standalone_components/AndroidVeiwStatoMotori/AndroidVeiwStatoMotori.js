/**
 * @version 1.0
 */
class AndroidVeiwStatoMotori extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        this.#initialize();
        this.#addEventListeners();
    }
    /**
     * store here the elements references of the html  
     * automatically gathers elements with attribute `fw-id=` after super()
     */
    elements = {
        /**
         * @type Element
         */
        self_ref: this.self_ref
    }
    async #initialize() {
        const owner = this;
        //TODO initialize component here
        return;
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