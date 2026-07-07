
/**
 * @version 1.0
 */
class BottomNavBar extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Array<Object>} options.selections
     * @param {string} options.selections[i].icons_code
     * @param {string} options.selections[i].title
     * @param {Function} options.selections[i].onSelect
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        this.#initialize();
        //this.#addEventListeners();
    }
    elements = {
        buttons: []
    }
    async #initialize() {
        const owner = this;
        for (let i = 0; i < this.options.selections.length; i++) {
            const the_object = this.options.selections[i];
            const btn = await this.#createSelezione(the_object);
            owner.self_ref.appendChild(btn);
        }
        return;
    }
    async #createSelezione(the_object) {
        const owner = this;
        const btn = document.createElement("div");
        btn.classList.add("ez-button");
        btn.innerText = the_object.title;
        btn.appendChild(Icons.ezIcon(the_object.icon_code));
        btn.addEventListener("click", (event) => {
            requestAnimationFrame(() => {
                for (let q = 0; q < owner.elements.buttons.length; q++) {
                    const btn_i = owner.elements.buttons[q];
                    btn_i.classList.toggle("selected", false);
                }
                btn.classList.toggle("selected", true);
            });
            if (the_object.onSelect != undefined) {
                the_object.onSelect();
            }
        });
        owner.elements.buttons.push(btn);
        return btn;
    }
    hide(fr = true) {
        this.self_ref.classList.add("display-none-important", fr);
    }
    show(fr = true) {
        this.hide(!fr);
    }
    // owner.self_ref;//access element reference here
    // owner.elementReference();//alternative way to access element reference
    // owner.destroy();//call destroy method when needed
    // owner.options;//access building options here
}
// window.BottomNavBar = BottomNavBar;

//#START RESERVED AREA FOR UI_BUILDER
///*mock for the UIBuilder::live-watch-component uncomment to test it  */
// document.body.appendChild(new BottomNavBar({
//     selections: [
//         {
//             icon_code: "ef3e",
//             title: "analytics",
//         },
//         {
//             icon_code: "f86e",
//             title: "inventory"
//         },

//         {
//             icon_code: "e88a",
//             title: "home"
//         },

//         {
//             icon_code: "e172",
//             title: "tasks"
//         },
//         {
//             icon_code: "e853",
//             title: "account"
//         },
//     ]
// }).elementReference());
//#END RESERVED AREA FOR UI_BUILDER