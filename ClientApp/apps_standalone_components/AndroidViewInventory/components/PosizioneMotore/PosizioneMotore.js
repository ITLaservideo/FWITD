/**
 * @version 1.0
 */
class PosizioneMotore extends FrameworkGC(`${injector_html}`) {
    #Iposizione = {
        TipoErogatoreProdotto: ""
    };
    ui_motore;
    /**
     * @notnull
    */
    static pro_user = document.querySelector("[name~=expert-user][content]")?.content == "true";
    static #viewportverticale = document.querySelector("[name~=viewportverticale][content]")?.content == "true";
    static isfs = (document.querySelector("[name~=isfs][content]")?.content == "True");
    static enabledFeatures = {
        TestMeccanici: (PosizioneMotore.pro_user && PosizioneMotore.#viewportverticale)
    }
    static last_time_focused_on_quantity = new Date();
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        if (PosizioneMotore.all_instances[options.Iposizione.IDMotore] == undefined) {
            PosizioneMotore.all_instances[options.Iposizione.IDMotore] = this;
        }
        this.#initialize();
        this.#addEventListeners();
    }
    /**
     * 
     */
    static all_instances = {};
    /**
     * store here the elements references of the html  
     * automatically gathers elements with attribute `fw-id=` after super()
     */
    elements = {
        /**
         * @type HTMLElement
         */
        self_ref: this.self_ref,
        /**
         * @type HTMLElement
         */
        quantity_input_saver: this.self_ref.querySelector(`[id="psc_save-quantity"]`),
        /**
         * @type HTMLElement
         */
        quantity_input: this.self_ref.querySelector(`[id="psc_quantity-product"]`),
        /**
         * @type HTMLElement
         */
        label_motore: this.self_ref.getElementsByClassName(`psc_product-id-motore`)[0],
        /**
         * @type HTMLElement
         */
        label_price: this.self_ref.getElementsByClassName(`psc_product-price`)[0],
        /**
         * @type HTMLElement
         */
        label_title_prodotto: this.self_ref.getElementsByClassName(`psc_product-title`)[0],
        /**
         * @type HTMLElement
         */
        img_prodotto: this.self_ref.getElementsByClassName(`psc_product-image`)[0],
        /**
         * @type HTMLElement
         */
        error_warning: undefined, //creted [setErrorCode]
        /**
         * @type HTMLElement
         */
        icon18plus: undefined //created [updateUi]
    }
    #building_options = {
        live_hint: {
            hint: "",
            target: null
        },
        features_motorSettins: {
            settings_motore: false
        }
    }
    static #motors_group_types = {
        defaultMotor: "1.PSPAL",
        gcv: "1.GVC",
    };
    async #initialize() {
        const owner = this;
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