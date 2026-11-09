/**
 * Trusted Types policy used where a string is assigned to `innerHTML`.
 *
 * **It does not sanitize anything**: `createHTML` returns its input unchanged. It only wraps the string in a
 * `TrustedHTML`, so the assignment would still be accepted if a `require-trusted-types-for 'script'` CSP were
 * ever turned on (none is today). Wrapping a string in it does not make that string safe.
 *
 * Use it only for markup that is entirely ours and contains no runtime data: the components' and frameworks'
 * own HTML templates (`injector_html`, `the_framework_html`), loaded from the embedded ClientApp.
 * Never pass it a string that holds data (server responses, user input, settings, translations of data...);
 * build DOM nodes and set `textContent` instead, or escape every piece of data where the string is built.
 *
 * Helpers in `utils/UiBuilder.js` (there is no sanitizer that keeps "safe" tags: escape the data, don't filter the markup):
 * - `UiBuilder.escapeHTML(str)`: escapes `& < > " '` for HTML text and quoted attribute values. It normalizes first, so data
 *   stored raw (`<manual override>`) or already escaped (`&lt;manual override&gt;`) comes out the same; escaping twice is harmless.
 * - `UiBuilder.decodeHTMLEntities(str)`: that normalization alone, for `textContent`/`innerText`: decodes the entities,
 *   leaves anything that looks like a tag as text.
 * - `UiBuilder.escapeXmlCharacters(str)`: the same for XML (`&apos;`); escapes every `&`.
 * - `UiBuilder.parseHTMLToDisplay(str)`: strips the tags and returns the plain text. Its output is for `textContent`
 *   only, never `innerHTML`: entities come back decoded (`&lt;img&gt;` → `<img>`). With `trust_on_error = true`
 *   it returns the raw input when the text is empty, so that mode is not sanitization at all.
 *
 * A generic component (e.g. `Tooltip`) doesn't know where its content comes from, so it must not take HTML
 * strings at all: it takes text or an `Element`, and the caller that wrote the markup is the one who builds it.
 * @type {TrustedTypePolicy}
 */
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
        self_ref = static_variables.html_placeholder.cloneNode(true);
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
            // this.self_ref = static_variables.html_placeholder.cloneNode(true);
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
            if (owner.#backHandler != undefined) {
                window.removeEventListener('popstate', owner.#backHandler);
                if (typeof SpaHistory !== "undefined") {
                    SpaHistory.popState(owner.#backHandler);
                }
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
class Utils {
    static ParseBool(value) {
        if (typeof value === "boolean") return value;
        if (value == null) return false;
        if (typeof value === "number") return value !== 0 && !Number.isNaN(value);

        const str = String(value).trim().toLowerCase();
        if (["☑", "true", "1", "yes", "y", "on", "t"].includes(str)) return true;
        if (["☐", "false", "0", "no", "n", "off", "f", ""].includes(str)) return false;

        const num = Number(str);
        if (!Number.isNaN(num)) return num !== 0;

        return false;
    }

    static determineDimensionsElement(element) {
        return new Promise((resolve) => {
            const clone = element.cloneNode(true);
            clone.style.position = "absolute";
            //clone.style.visibility = "hidden";
            clone.style.height = "auto";
            clone.style.left = 0;
            clone.style.top = 0;
            clone.style.width = element.style.width || "auto";

            document.body.appendChild(clone);
            setTimeout(() => {
                const height = clone.offsetHeight;
                const width = clone.offsetWidth;
                document.body.removeChild(clone);
                resolve({ height: height, width: width });
            }, 0);
        });
    }
}