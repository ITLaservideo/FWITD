/**
 * @version 1.0
 */
class AndroidViewAnalytics extends FrameworkGC(`${injector_html}`) {
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
        /** @type {HTMLElement} */
        chartSales: null,

        /** @type {HTMLElement} */
        chartFaults: null,

        /** @type {HTMLElement} */
        kpiTopProduct: null,

        /** @type {HTMLElement} */
        kpiUptime: null,

        /** @type {HTMLElement} */
        kpiFaults: null,

        /** @type {HTMLElement} */
        kpiSales: null,

        /** @type {HTMLElement} */
        filters: null,
    }
    async #initialize() {
        const owner = this;

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

    updateKPIs(data) {
        // TODO: call KPI components
    }

    updateCharts(data) {
        // TODO: call chart components
    }
}