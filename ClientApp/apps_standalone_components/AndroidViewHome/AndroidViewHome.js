/**
 * @version 1.0
 */
class AndroidViewHome extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        this.#initialize();
        this.#addEventListeners();
    }
    elements = {
        kpiContainer: null,
        statusContainer: null,
        activityContainer: null
    }
    async #initialize() {
        const owner = this;
        owner.elements.kpiContainer = owner.self_ref.querySelector("[data-ref='kpiContainer']");
        owner.elements.statusContainer = owner.self_ref.querySelector("[data-ref='statusContainer']");
        owner.elements.activityContainer = owner.self_ref.querySelector("[data-ref='activityContainer']");
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