/**
 * @version 1.2
 */
class BottomSheet extends FrameworkGC(`${injector_html}`) {
    static enable_animations = document.querySelector("[name~=enable-animations][content]")?.content == "true";
    static pro_user = document.querySelector("[name~=expert-user][content]")?.content == "true";
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        this.#initialize();
        this.enqueueHistory();
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
    async #initialize() {
        const owner = this;
        owner.self_ref.addEventListener("click", (event) => {
            if (event.target == owner.self_ref) {
                owner.destroy();
            }
        });
        owner.#getElements();
        owner.#updateUi(owner.options);
        setTimeout(() => {
            document.body.appendChild(owner.self_ref);
            if (BottomSheet.enable_animations == true) {
                setTimeout(() => {
                    owner.#whole_container.style["transform"] = 'translateY(0px)';
                }, 50);
            } else {
                owner.#whole_container.style["transform"] = 'translateY(0px)';
            }
        }, 0);
        return;
    }
    /**
     * @type Element
     */
    #whole_container;
    /**
     * @type Element
     */
    #content_container;
    /**
     * @type Element
     */
    #button_close;
    #getElements() {
        const owner = this;
        owner.#whole_container = owner.self_ref.getElementsByClassName("bottom-sheet-template")[0];
        console.assert(owner.#whole_container != undefined, "BottomSheet whole_container does not exist");
        owner.#content_container = owner.self_ref.getElementsByClassName("bst-content")[0];
        console.assert(owner.#content_container != undefined, "BottomSheet content_container does not exist");
        owner.#button_close = owner.self_ref.getElementsByClassName("button-close")[0];
        console.assert(owner.#button_close != undefined, "BottomSheet button_close does not exist");
        owner.#button_close.addEventListener("click", () => {
            owner.destroy();
        });
    }
    /**
     * 
     * @param {Object} options 
     */
    #updateUi(options) {
        const owner = this;
        if (options.element != undefined) {
            owner.#content_container.innerText = '';
            owner.#content_container.appendChild(options.element);
        } else {
            console.error("empty bottom sheet");
        }
        if (options.centered == true) {
            owner.#whole_container.style["top"] = 0;
        }
    }
}