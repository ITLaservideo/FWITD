/**
 * @version 1.0
 */
class SpeedActions extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.target - element to attach the mouseenter listener to
     * @param {string} [options.label] - top label
     * @param {HTMLElement} [options.element] - element to display inside the container
     * @param {Object|Object[]} [options.createButtons] - UiBuilder.createButton config(s)
     * @param {Function|Array<Function>} [options.onClose] - callback(s) on destroy
     * @param {Function} [options.onReady] - callback when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(
            options.element != null || options.createButtons != null,
            "SpeedActions: provide options.element and/or options.createButtons"
        );
        this.#initialize();
        if (typeof this.options.onReady === "function") {
            this.options.onReady();
        }
    }

    elements = {
        self_ref: this.self_ref,
        container: this.self_ref.querySelector('.speed-actions-container'),
    }

    /**
     * Single shared DOM container appended to body. Populated dynamically per hover.
     * @type {SpeedActions|null}
     */
    static the_one_instance = null;

    static #is_visible = false;
    static #current_instance = null;

    /** @type {HTMLElement[]} */
    #buttons = [];
    /** @type {HTMLElement} */
    #target = null;

    // Arrow-function fields so removeEventListener works with the same reference
    #onTargetEnter = () => SpeedActions.#show(this);
    #onTargetLeave = () => SpeedActions.#hide();

    async #initialize() {
        const owner = this;
        owner.#target = owner.options.target;
        console.assert(owner.#target instanceof HTMLElement, "SpeedActions: options.target must be an HTMLElement");

        if (owner.options.createButtons) {
            const configs = Array.isArray(owner.options.createButtons)
                ? owner.options.createButtons
                : [owner.options.createButtons];
            owner.#buttons = configs.map(cfg => UiBuilder.createButton(cfg));
        }

        if (SpeedActions.the_one_instance === null) {
            SpeedActions.the_one_instance = owner;
            document.body.appendChild(owner.self_ref);
            SpeedActions.#attachRootListeners();
        }

        owner.#target.addEventListener('mouseenter', owner.#onTargetEnter);
        owner.#target.addEventListener('mouseleave', owner.#onTargetLeave);
    }
    static prevent_hiding = null;
    static #attachRootListeners() {
        SpeedActions.the_one_instance.self_ref.addEventListener('mouseenter', () => {
            if (SpeedActions.prevent_hiding) {
                clearTimeout(SpeedActions.prevent_hiding);
                SpeedActions.prevent_hiding = null;
            }
            // console.error("prevent closing")
        });
        SpeedActions.the_one_instance.self_ref.addEventListener('mouseleave', () => {
            SpeedActions.#hide();
        });
    }

    static #show(instance) {
        // console.log("show " + new Date().toISOString());
        if (SpeedActions.prevent_hiding) {
            clearTimeout(SpeedActions.prevent_hiding);
            SpeedActions.prevent_hiding = null;
        }
        const one = SpeedActions.the_one_instance;
        const root = one.self_ref;
        const container = one.elements.container;

        // Remove dot from previous target if switching
        if (SpeedActions.#current_instance && SpeedActions.#current_instance !== instance) {
            SpeedActions.#current_instance.#target.classList.remove('sa-target-active');
        }

        SpeedActions.#current_instance = instance;
        instance.#target.classList.add('sa-target-active');

        // Populate content
        container.innerHTML = '';
        if (instance.options.label) {
            const lbl = document.createElement('div');
            lbl.className = 'speed-actions-label';
            lbl.textContent = instance.options.label;
            container.appendChild(lbl);
        }
        if (instance.options.element) {
            container.appendChild(instance.options.element);
        }
        instance.#buttons.forEach(btn => container.appendChild(btn));

        // Render hidden to measure container dimensions
        root.style.visibility = 'hidden';
        root.classList.add('sa-visible');

        const tr = instance.#target.getBoundingClientRect();
        const W = container.offsetWidth || 60;
        const H = container.offsetHeight || 40;
        const gap = 8;
        const pad_x = Math.max(W * 0.1, 10);
        const pad_y = Math.max(H * 0.1, 10);

        // Prefer left side of target, fall back to right if insufficient space
        let c_left = tr.left - W - gap;
        if (c_left < pad_x) {
            c_left = tr.right + gap;
        }

        // Vertically center container on target, clamped to viewport
        let c_top = tr.top + (tr.height / 2) - (H / 2);
        c_top = Math.max(pad_y, Math.min(c_top, window.innerHeight - H - pad_y));

        // Root is the 120% invisible zone around the container only
        const safe_left = c_left - pad_x;
        const safe_right = c_left + W + pad_x;
        const safe_top = c_top - pad_y;
        const safe_bottom = c_top + H + pad_y;

        root.style.left = `${safe_left}px`;
        root.style.top = `${safe_top}px`;
        root.style.width = `${safe_right - safe_left}px`;
        root.style.height = `${safe_bottom - safe_top}px`;

        // Container is absolutely positioned within root
        container.style.left = `${c_left - safe_left}px`;
        container.style.top = `${c_top - safe_top}px`;

        root.style.visibility = '';
        SpeedActions.#is_visible = true;
    }

    static #hide() {
        if (SpeedActions.prevent_hiding) {
            clearTimeout(SpeedActions.prevent_hiding)
        }
        SpeedActions.prevent_hiding = setTimeout(() => {
            // console.warn("hide " + new Date().toISOString());
            const one = SpeedActions.the_one_instance;
            if (!one || !SpeedActions.#is_visible) return;
            SpeedActions.#is_visible = false;
            SpeedActions.#current_instance.#target.classList.remove('sa-target-active');
            SpeedActions.#current_instance = null;
            one.self_ref.classList.remove('sa-visible');
        }, 100);
    }

    destroy(timeout_ms = 0) {
        this.#target?.removeEventListener('mouseenter', this.#onTargetEnter);
        this.#target?.removeEventListener('mouseleave', this.#onTargetLeave);
        if (SpeedActions.#current_instance === this) {
            SpeedActions.#hide();
        }
        super.destroy(timeout_ms);
    }
}


// for UiBuilder
// setTimeout(() => {
//     const mock_target = document.createElement('div');
//     mock_target.innerText = 'Hover me for SpeedActions';
//     mock_target.style = 'margin: 100px; background-color: #f8a2a2; padding: 10px;';
//     document.body.appendChild(mock_target);

//     const ss = new SpeedActions({
//         target: mock_target,
//         createButtons: [
//             { title: 'Action 1', onClick: () => alert('Action 1 clicked') },
//             { title: 'Action 2', onClick: () => alert('Action 2 clicked') },
//         ],
//         onReady: () => console.log('SpeedActions ready'),
//     });
//     const mock_target2 = document.createElement('div');
//     mock_target2.innerText = 'Hover me for SpeedActions 2';
//     mock_target2.style = 'margin: 100px; background-color: #f8a2a2; padding: 10px;';

//     document.body.appendChild(mock_target2);

//     const ss2 = new SpeedActions({
//         target: mock_target2,
//         element: (() => {
//             const el = document.createElement('div');
//             el.innerText = 'Custom content';
//             return el;
//         })(),
//         onReady: () => console.log('SpeedActions 2 ready'),
//     });
//     //document.body.appendChild(ss.elementReference());
// }, 0);