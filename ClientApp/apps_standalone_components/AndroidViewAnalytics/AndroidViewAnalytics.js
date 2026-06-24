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
        if (typeof this.options.onReady === "function") {
            this.options.onReady();
        }
    }
    async #initialize() {
        const owner = this;
        //TODO initialize component here
        owner.elements = {
            filters: owner.self_ref.querySelector("[data-ref='filters']"),
            kpiSales: owner.self_ref.querySelector("[data-ref='kpiSales']"),
            kpiUptime: owner.self_ref.querySelector("[data-ref='kpiUptime']"),
            kpiFaults: owner.self_ref.querySelector("[data-ref='kpiFaults']"),
            kpiTopProduct: owner.self_ref.querySelector("[data-ref='kpiTopProduct']"),
            chartSales: owner.self_ref.querySelector("[data-ref='chartSales']"),
            chartFaults: owner.self_ref.querySelector("[data-ref='chartFaults']")
        };

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