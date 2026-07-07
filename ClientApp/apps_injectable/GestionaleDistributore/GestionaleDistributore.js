/**
 * @version 1.0
 */
class App extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options = {}) {
        super(options);
        // document.body.style.paddingTop = "20px";
        // document.body.style.paddingBottom = "20px";
        AppStatus.displayVersion();
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        this.#initialize();
        this.#addEventListeners();
    }
    /**
     * store here the elements references of the html  
     * automatically gathers elements with attribute ` fw-id="xxx" ` after super()
     */
    elements = {
        /**
         * @type HTMLElement
         */
        self_ref: this.self_ref,
    }
    async #initialize() {
        const owner = this;
        //TODO initialize component here
        // document.body.appendChild(owner.elements.self_ref);
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

    //#region FrameworkEventListeners
    //@note private methods do not work :: they get mangled
    async onButtonTestClick() {// add attribute inside the .html ` fw-click='onButtonTestClick' `
        /**
         * @type HTMLElement
         */
        const element_with_this_event = this;
        /**
         * @type App
         */
        const owner = element_with_this_event.fwInstanceReference;
        element_with_this_event.classList.add("clicked");
        alert("clicked");
    }
    //#endregion
}


//#START RESERVED AREA FOR UI_BUILDER
// setTimeout(() => {
//     const ss = new App({});
//     document.body.appendChild(ss.elementReference());
// }, 0);
//#END RESERVED AREA FOR UI_BUILDER