/**
 * @version 1.0
 */
class CardRefillmentSuggestions extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     * @param {string} options.description - 
     * @param {string} options.Barcode - 
     * @param {string} [options.barcode_img] - 
     * @param {string} options.numero_motore - 
     * @param {string} options.number_of_sales - 
     * @param {boolean} options.refilled - 
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        this.#initialize();
        if (typeof this.options.onReady === "function") {
            this.options.onReady();
        }
    }
    /**
     * store here the elements references of the html  
     * automatically gathers elements with attribute ` fw-id="xxx" ` after super()
     */
    elements = {
        /**
         * @type HTMLElement
         */
        self_ref: this.self_ref
    }
    #createTheIComponent(numero_motore, prodotti_erogati) {
        const wrapper = document.createElement("div");
        wrapper.className = "the-i";

        // First block
        const firstBlock = document.createElement("div");

        const spanId = document.createElement("span");
        spanId.textContent = "id posizione";

        const numeroMotore = document.createElement("div");
        numeroMotore.setAttribute("fw-id", "numero-motore");
        numeroMotore.innerText = numero_motore;

        firstBlock.appendChild(spanId);
        firstBlock.appendChild(numeroMotore);

        // "prodotti erogati:"
        const prodottiLabel = document.createElement("span");
        prodottiLabel.textContent = ", prodotti erogati:";

        // number-of-sales
        const numberOfSales = document.createElement("div");
        numberOfSales.setAttribute("fw-id", "number-of-sales");
        numberOfSales.innerText = prodotti_erogati;
        // Assemble
        wrapper.appendChild(firstBlock);
        wrapper.appendChild(prodottiLabel);
        wrapper.appendChild(numberOfSales);

        return wrapper;
    }

    async #initialize() {
        const owner = this;
        owner.elements.barcode.innerText = owner.options.Barcode ?? '';
        if (owner.options.barcode_img != undefined) {
            const t = document.createElement("img");
            t.src = owner.options.barcode_img;
            owner.elements.barcode.appendChild(t);
        }
        if (owner.options.iterations != undefined) {
            owner.elements['iterations-container'].innerText = '';
            for (let i = 0; i < owner.options.iterations.length; i++) {
                const d = owner.options.iterations[i];
                owner.elements['iterations-container'].appendChild(owner.#createTheIComponent(d.numero_motore, d.number_of_sales));
            }
        } else {
            owner.elements["numero-motore"].innerText = owner.options.numero_motore;
            owner.elements["number-of-sales"].innerText = owner.options.number_of_sales;
        }
        if (owner.options.refilled == true) {
            owner.self_ref.classList.toggle("selected", true);
        }
        owner.elements["description-prodotto"].innerText = owner.options.description;
        const t = document.createElement("img");
        t.classList.add("icona-prodotto");
        t.src = owner.options.prodotto_img;
        t.onerror = () => {
            t.remove();
            owner.elements["left-side"].appendChild(Icons.ezIcon("f569"));
        }
        owner.elements["left-side"].appendChild(t);
        return;
    }
    // owner.self_ref;//access element reference here
    // owner.elementReference();//alternative way to access element reference
    // owner.destroy();//call destroy method when needed
    // owner.options;//access building options here

    //#region FrameworkEventListeners
    async onCardSelected(event) {// add attribute inside the .html ` fw-click='onButtonTestClick' `
        /**
         * @type HTMLElement
         */
        const element_with_this_event = this;
        /**
         * @type CardRefillmentSuggestions
         */
        const owner = element_with_this_event.fwInstanceReference;
        owner.self_ref.classList.toggle("selected");
    }
    //#endregion
}