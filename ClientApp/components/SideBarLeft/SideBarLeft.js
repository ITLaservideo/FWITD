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
        owner.#on_pointer_up = (event) => {
            if (event.pointerType === "mouse" && event.button === 0 || event.pointerType === "touch") {
                if (owner.options.onClick != undefined) {
                    owner.options.onClick(event);
                } else {
                    console.error(`missing action onClick:\n    ${owner.text} || ${owner.hint}`);
                }
            }
        };
        owner.elements.container.addEventListener("pointerup", owner.#on_pointer_up);
    }
    #on_pointer_up = null;
    expand(fr = true) {
        const owner = this;
        owner.elements.text.classList.toggle("display-none-important", !fr);
        owner.status.expanded = fr;
    }
    hide(fr = true) {
        const owner = this;
        owner.elements.container.classList.toggle("display-none-important", fr);
    }
    destroy() {
        const owner = this;
        if (owner.#on_pointer_up != null) {
            owner.elements.container.removeEventListener("pointerup", owner.#on_pointer_up);
            owner.#on_pointer_up = null;
        }
        owner.elements.container?.remove();
        owner.elements.container = null;
        owner.elements.icon = null;
        owner.elements.text = null;
        owner.options = null;
        owner.status = null;
    }
}
/**
 * @version 1.1
 */
class SideBarLeft extends FrameworkGC(`${injector_html}`) {
    #overlay_handler = null;
    #destroyed = false;
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
        owner.#overlay_handler = () => {
            let can_self_destroy = true;
            if (owner.options.canSelfDestroy != undefined) {
                can_self_destroy = owner.options.canSelfDestroy();
            }
            if (can_self_destroy) {
                owner.destroy();
            }
        };
        overlay.addEventListener("click", owner.#overlay_handler);
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
            if (owner.options.onReady != undefined) {// FrameworkGC documents onReady but doesn't call it
                setTimeout(() => {
                    owner.options.onReady();
                }, 0);
            }
        }, 0);
    }
    async #addEventListeners() {
        const owner = this;
        //TODO add event listeners for component here
    }
    hide(fr = true) {
        this.self_ref.classList.toggle("display-none-important", fr);
    }
    setExpanded(fr = true) {
        const owner = this;
        const ops = [];
        for (const group of [owner.built_elements.top_selections, owner.built_elements.mid_selections, owner.built_elements.bot_selections]) {
            for (let i = 0; i < group.length; i++) {
                const t_selection = group[i];
                ops.push(() => {
                    t_selection.expand(fr);
                });
            }
        }
        requestAnimationFrame(() => {
            for (let i = 0; i < ops.length; i++) {
                ops[i]();
            }
        });
    }
    /**
     * `super.destroy()` (FrameworkGC) only detaches `self_ref`, runs the `onClose` callbacks and unregisters
     * the back handler - the overlay listener and the built selections are released here
     * @param {number} [timeout_ms=0]
     */
    destroy(timeout_ms = 0) {
        const owner = this;
        if (owner.#destroyed) {// overlay click + an explicit destroy() must not run onClose twice
            return;
        }
        owner.#destroyed = true;
        if (owner.#overlay_handler != null) {
            owner.self_ref.getElementsByClassName("sbl-overlay-close")[0]?.removeEventListener("click", owner.#overlay_handler);
            owner.#overlay_handler = null;
        }
        for (const group of Object.values(owner.built_elements)) {
            for (const t_selection of group) {
                try {
                    t_selection.destroy();
                } catch (error) {
                    console.warn(error);
                }
            }
            group.length = 0;
        }
        owner.self_ref.classList.add("unpop-from-below");
        super.destroy(timeout_ms);
    }
}
