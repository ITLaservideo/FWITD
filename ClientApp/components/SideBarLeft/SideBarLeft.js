class TSelection {
    icon = "/indeterminate_question_box.svg";
    text = "some action";
    hint = "some action";
    elements = {
        /**
         * @type Element
         */
        container: null,
        /**
         * @type Element
         */
        icon: null,
        /**
         * @type Element
         */
        text: null
    }
    status = {
        expanded: false
    }
    constructor(options) {
        const owner = this;
        owner.icon = options.icon;
        owner.text = options.text;
        owner.hint = options.hint;
        owner.options = options;
        owner.buildElements();
    }
    buildElements() {
        const owner = this;
        const container = document.createElement("div");
        container.classList.add("sbl-selection");
        owner.elements.container = container;
        const img = document.createElement("img");
        img.scr = owner.icon;
        img.src = `/Icons/${owner.icon}`;
        img.alt = owner.text;
        owner.elements.icon = img;
        const text = document.createElement("div");
        owner.elements.text = text;
        this.status.expanded = this.options.expanded ?? this.status.expanded;
        this.expand(this.status.expanded);
        UiBuilder.addHint({
            hint: owner.hint,
            target: owner.elements.container,
            anchor: "left",
            conditionsMet: () => {
                return !owner.status.expanded;
            }
        });
        owner.elements.container.addEventListener("pointerup", (event) => {
            if (event.pointerType === "mouse" && event.button === 0 || event.pointerType === "touch") {
                if (owner.options.onClick != undefined) {
                    owner.options.onClick(event);
                } else {
                    console.error(`missing action onClick:\n    ${owner.text} || ${owner.hint}`);
                }
            }
        });
    }
    expand(fr = true) {
        const owner = this;
        owner.elements.text.classList.toggle("display-none-important", !fr);
        owner.status.expanded = fr;
    }
    hide(fr = true) {
        const owner = this;
        owner.elements.container.classList.toggle("display-none-important", fr);
    }
}
/**
 * @version 1.0
 */
class SideBarLeft extends FrameworkGC(`${injector_html}`) {
    elements = {
        self_ref: null,
        footer: null,
        header: null
    }
    built_elements = {
        top_selections: [],
        bot_selections: [],
        mid_selections: [],
    }
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     * @param {Boolean} [options.overlay] - whether to show overlay or not
     * @param {Element} [options.element] - element to be added to the mid container
     * @param {Array<Element>} [options.elements] - elements to be added to the mid container
     * @param {Function} [options.canSelfDestroy] - callback to determine whether the sidebar can self destroy on overlay click
     */
    constructor(options) {
        super(options);
        this.#initialize();
        this.#addEventListeners();
    }
    async #initialize() {
        const owner = this;
        owner.elements.self_ref = owner.self_ref;
        const overlay = owner.self_ref.getElementsByClassName("sbl-overlay-close")[0];
        overlay.addEventListener("click", () => {
            let can_self_destroy = true;
            if (owner.options.canSelfDestroy != undefined) {
                can_self_destroy = owner.options.canSelfDestroy();
            }
            if (can_self_destroy) {
                owner.destroy();
            }
        });
        const container = owner.self_ref.getElementsByClassName("mid-container")[0];
        if (owner.options.element != undefined) {
            if (owner.options.element instanceof Element) {
                container.appendChild(owner.options.element);
            } else {
                throw new Error("SideBarLeft :: the provided `element` is not of @Type Element");
            }
        }
        if (owner.options.elements != undefined) {
            for (let i = 0; i < owner.options.elements.length; i++) {
                const element = owner.options.elements[i];

                container.appendChild(element);
            }
        }
        setTimeout(() => {
            owner.self_ref.style['opacity'] = 1;
            document.body.appendChild(owner.self_ref);
            if (owner.options.overlay == true) {
                setTimeout(() => {
                    // overlay.style.left = `${owner.#self_ref.offsetWidth}px`;
                    overlay.style.display = `block`;
                }, 0);
            }
        }, 0);
    }
    async #addEventListeners() {
        const owner = this;
        //TODO add event listeners for component here
    }
    setExpanded(fr = true) {
        const owner = this;
        const ops = [];
        for (let i = 0; i > owner.built_elements.top_selections.length; i++) {
            const t_selection = owner.options.top_selections[i];
            ops.push(() => {
                t_selection.expand(fr);
            });
        }
        for (let i = 0; i > owner.built_elements.bot_selections.length; i++) {
            const t_selection = owner.options.bot_selections[i];
            ops.push(() => {
                t_selection.expand(fr);
            });
        }
        for (let i = 0; i > owner.built_elements.mid_selections.length; i++) {
            const t_selection = owner.options.mid_selections[i];
            ops.push(() => {
                t_selection.expand(fr);
            });
        }
        requestAnimationFrame(() => {
            for (let i = 0; i > ops.length; i++) {
                ops[i]();
            }
        });
    }
}
