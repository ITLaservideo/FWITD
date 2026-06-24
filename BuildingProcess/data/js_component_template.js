/**
 * @version 1.0
 */
class ComponentTemplate {
    /**
     * @type Element
     */
    #self_ref;
    /**
     * @type Element
     */
    static #html_placeholder = null;
    /**
     * store onClose callbacks
     * @type {Array<Function>}
     */
    #onClose = [];
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        this.#self_ref = (ComponentTemplate.#html_placeholder).cloneNode(true);
        this.#initialize(options);
        this.#addEventListeners(options);
        this.#finalize(options);
    }
    async #initialize(options) {
        const owner = this;
        //TODO initialize component here
    }
    async #addEventListeners(options) {
        const owner = this;
        //TODO add event listeners for component here
    }
    ////////////////////////////////////////////////////////////////////
    // START BOILERPLATE METHODS
    ////////////////////////////////////////////////////////////////////
    #finalize(options) {
        const owner = this;
        if (options.onClose != undefined && typeof options.onClose === "function") {
            owner.#onClose.push(options.onClose);
        } else if (options.onClose != undefined && Array.isArray(options.onClose)) {
            for (let i = 0; i < options.onClose.length; i++) {
                if (typeof options.onClose[i] === "function") {
                    owner.#onClose.push(options.onClose[i]);
                }
            }
        }
        setTimeout(() => {
            //owner.#self_ref.style['opacity'] = 1;
            if (options.onReady != undefined) {
                options.onReady();
            }
        }, 0);
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
     * @param {number} timeout_ms 0 by default
     */
    async destroy(timeout_ms = 0) {
        setTimeout(() => {
            this.#self_ref.remove();
        }, timeout_ms);
        for (let i = 0; i < this.#onClose.length; i++) {
            setTimeout(() => {
                this.#onClose[i]();
            }, 0);
        }
    }
    static async load() {
        const tmp_div = document.createElement("div");
        const text_html_localized = Locale.localizeHTML(`${injector_html}`);
        tmp_div.innerHTML = policy.createHTML(text_html_localized);
        ComponentTemplate.#html_placeholder = tmp_div.firstElementChild;
    }

    ////////////////////////////////////////////////////////////////////
    // END BOILERPLATE METHODS
    ////////////////////////////////////////////////////////////////////
}
ComponentTemplate.load();