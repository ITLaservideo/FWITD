const policy = trustedTypes.createPolicy('docs-layout', {
    createHTML: (html) => html
});
/**
 * @version 2.0
 */
function FrameworkGC(the_framework_html) {
    const tmp_div = document.createElement("div");
    const text_html_localized = Locale.localizeHTML(the_framework_html);
    tmp_div.innerHTML = policy.createHTML(text_html_localized);
    const framework_html_placeholder = tmp_div.firstElementChild;
    const static_variables = {
        html_placeholder: framework_html_placeholder,
    };
    return class {
        /**
         * @type HTMLElement
         */
        self_ref;
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
            this.self_ref = static_variables.html_placeholder.cloneNode(true);
            this.options = options;
            this.#finalize(options);
        }
        ////////////////////////////////////////////////////////////////////
        // START BOILERPLATE METHODS
        ////////////////////////////////////////////////////////////////////
        #finalize(options) {
            const owner = this;
            console.assert(options != undefined, "provide arguments for the instantiated component.");
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
                //owner.self_ref.style['opacity'] = 1;
                if (options.onReady != undefined) {
                    options.onReady();
                }
            }, 0);
        }
        /**
         * overrides the back function to destroy this component stance 
         */
        enqueueHistory() {
            const owner = this;
            owner.#backHandler = (event) => {
                owner.destroy();
            }
            if (typeof SpaHistory !== "undefined") {
                SpaHistory.pushState(owner.#backHandler);
            }
            window.addEventListener('popstate', owner.#backHandler);
        }
        #backHandler = undefined
        /**
         * 
         * @returns Element
         */
        elementReference() {
            return this.self_ref;
        }
        /**
         * 
         * @param {number} timeout_ms 0 by default
         */
        destroy(timeout_ms = 0) {
            const owner = this;
            window.removeEventListener('popstate', owner.#backHandler);
            if (typeof SpaHistory !== "undefined") {
                SpaHistory.popState(owner.#backHandler);
            }
            setTimeout(() => {
                owner.self_ref.remove();
            }, timeout_ms);
            for (let i = 0; i < owner.#onClose.length; i++) {
                setTimeout(() => {
                    owner.#onClose[i]();
                }, 0);
            }
            // const references = [];
            // for (let [key, value] of Object.entries(owner.elements ?? {})) {
            //     references.push(key);
            // }
            // for (let i = 0; i < references.length; i++) {
            //     const key = references[i];
            //     owner.elements[key] = undefined;
            // }
        }
        ////////////////////////////////////////////////////////////////////
        // END BOILERPLATE METHODS
        ////////////////////////////////////////////////////////////////////
    };
}