
class PCMockProduct {
    constructor(name, saleAmount) {
        this.name = name;
        this.saleAmount = saleAmount;
    }
}
/**
 * @version 1.1
 */
class PieChart {
    /**
     * @type Element
     */
    #self_ref;
    static #html_placeholder = null;
    #onClose = [];
    /**
    * Creates a new PieChart instance.
    *
    * @param {Object} options - Configuration options for the PieChart.
    *
    * @param {Array<PCMockProduct>} [options.products]
    * An optional array of product objects used to populate the chart.
    * Each product must contain:
    *   - {string} product.name — The display label.
    *   - {number} product.saleAmount — The numeric value used in the chart.
    * If omitted, the chart defaults to `PieChart.productsOne`.
    *
    * @param {Function|Function[]} [options.onClose]
    * A callback or array of callbacks executed when the chart is destroyed.
    * Each function is invoked with no arguments.
    *
    * @example
    * const chart = new PieChart({
    *   products: [
    *     new PCMockProduct("Apples", 120),
    *     new PCMockProduct("Bananas", 80)
    *   ],
    *   onClose: () => console.log("Chart closed")
    * });
    */
    constructor(options) {
        this.#initialize(options);
    }
    static dependencies_resolved = false;
    async #initialize(options) {
        // if (PieChart.pro_user == undefined) {
        //     if (document.querySelector("[name~=expert-user][content]")?.content == "true") {
        //         PieChart.pro_user = true;
        //     } else {
        //         PieChart.pro_user = false;
        //     }
        // }
        const owner = this;
        this.#self_ref = (PieChart.#html_placeholder).cloneNode(true);
        const continueInitialization = () => {
            if (options.onClose != undefined) {
                try {
                    for (let i = 0; i < options.onClose.length; i++) {
                        owner.#onClose.push(options.onClose[i]);
                    }
                } catch (error) {
                    owner.#onClose.push(options.onClose);
                }
            }
            // await Locale.initialize();
            owner.#getElements();
            owner.#updateUi(options);
            // setTimeout(() => {//debug
            //     document.body.appendChild(owner.#self_ref)
            // }, 0);
        }
        const id_chart_js_script = "npm-chart-js";
        if (document.getElementById(id_chart_js_script) == undefined) {
            const script = document.createElement("script");
            script.id = id_chart_js_script;
            script.src = "https://cdn.jsdelivr.net/npm/chart.js?v=016"
            document.head.appendChild(script);
            script.onload = () => {
                PieChart.dependencies_resolved = true;
            }
        }

        const i = setInterval(() => {
            if (PieChart.dependencies_resolved == false) {
                return;
            }
            clearInterval(i);
            continueInitialization();
        }, 1000);
    }
    #getElements() {
        const owner = this;
        owner.#canvas = owner.#self_ref.getElementsByClassName("cspct-canvas")[0];
        console.assert(owner.#canvas != undefined, "PieChart canvas does not exist");
    }
    /**
     * @type Element
     */
    #canvas;
    /**
     * Product.saleAmount
     * Product.name
     */
    static productsOne = Array.from({ length: 35 }, (_, i) => new PCMockProduct(`Product ${i + 1}`, Math.floor(Math.random() * 100)));
    static productsTwo = Array.from({ length: 66 }, (_, i) => new PCMockProduct(`Product ${i + 1}`, Math.floor(Math.random() * 100)));
    static productsThree = Array.from({ length: 99 }, (_, i) => new PCMockProduct(`Product ${i + 1}`, Math.floor(Math.random() * 100)));
    /**
     * 
     * @param {Object} options 
     * @param {Array<Product>} options.products
     */
    #updateUi(options) {
        if (options.products == undefined) {
            options.products = Array.from(PieChart.productsOne);
        }
        const sortedProducts = options.products.sort((a, b) => b.saleAmount - a.saleAmount);
        // Get the top 10 products
        const topProducts = sortedProducts.slice(0, 10);

        // Extract remaining products for 'Others'
        const remainingProducts = sortedProducts.slice(10);
        const othersTotal = remainingProducts.reduce((sum, product) => sum + product.saleAmount, 0);
        const labels = topProducts.map(product => product.name);
        const data = topProducts.map(product => product.saleAmount);
        if (othersTotal > 0) {
            labels.push('Others');
            data.push(othersTotal);
        }
        // Clear existing chart if necessary
        if (this.#canvas.chart) {
            this.#canvas.chart.destroy();
        }

        // Create a new chart
        const ctx = this.#canvas.getContext('2d');
        this.#canvas.chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: this.#generateColors(data.length),
                    borderColor: '#ffffff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.raw;
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    // Helper method to generate random colors for the pie chart
    #generateColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(`hsl(${Math.random() * 360}, 88%, 32%)`); // Random color
        }
        colors[colors.length - 1] = "hsl(220, 13%, 18%)";
        return colors;
    }
    /**
     * 
     * @returns Element
     */
    elementReference() {
        return this.#self_ref;
    }
    /**
     * 
     * @param {Node} clone 
     * @param {Number} timeout ms
     */
    static #executeDestroy(clone, timeout) {
        setTimeout(() => {
            if (clone != null) {
                if (PieChart.enable_animations == true) {
                    clone.classList.add("PieChart-destroy-animation");
                    timeout += 30;
                }
                setTimeout(() => {
                    clone.remove();
                }, timeout);
            } else {
                console.warn("tried to destroy a PieChart already destroyed!");
            }
        }, timeout);
    }/**
     * 
     * @param {number} timeout_ms 0 by default
     */
    async destroy(timeout_ms = 0) {
        if (this.destroyed != undefined) {
            return;
        }
        this.destroyed = true;
        if (this.#self_ref != undefined) {
            PieChart.#executeDestroy(this.#self_ref, timeout_ms);
        } else {
            setTimeout(() => {
                PieChart.#executeDestroy(this.#self_ref, timeout_ms);
            }, 1500);
        }
        for (let i = 0; i < this.#onClose.length; i++) {
            setTimeout(() => {
                this.#onClose[i]();
            }, 0);
        }
    }
    static load() {
        const tmp_div = document.createElement("div");
        tmp_div.innerHTML = policy.createHTML(`${injector_html}`);
        PieChart.#html_placeholder = tmp_div.firstElementChild;
    }
}
PieChart.load();