/**
 * @version 1.3
 */
class SpeedActions extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options
     * @param {HTMLElement} options.target - element to attach the mouseenter/mouseleave listeners to; hovering it shows the popup, leaving it hides it (after a short delay, unless pinned); clicking it toggles the popup (see `toggle_on_click`)
     * @param {boolean} [options.toggle_on_click=true] - if false, clicking `target` doesn't toggle the popup (use when the target's own click action shouldn't also close it)
     * @param {string} [options.label] - top label
     * @param {HTMLElement} [options.element] - element to display inside the container
     * @param {Object|Object[]} [options.createButtons] - one or more option objects, each passed as-is to `UiBuilder.createButton()` (see its JSDoc for the full shape: `onClick`/`onRightClick`, `title`/`icon`/`icon_code`, `hint`, `class`, `style`, `theme`, ...). At least one of `element`/`createButtons` must be provided
     * @param {'left'|'right'|'top'|'bottom'} [options.side='left'] - preferred side of the target to show the popup on; falls back to the opposite side (left<->right, top<->bottom) if there isn't enough room
     * @param {boolean} [options.side_strict=false] - if true, always use `side`, never falling back to the opposite one even when there isn't enough room
     * @param {boolean} [options.non_relative=false] - if true, don't add the `sa-target-active`/`sta-relative` classes to the target while shown (use when forcing `position: relative` on the target would break its layout)
     * @param {boolean} [options.unpinnable=false] - if true, the "pin" button (prevent auto-closing) is not shown for this instance
     * @param {() => boolean} [options.conditionsMet] - evaluated on every hover of `target`, before the popup opens; if it returns a falsy value the popup is not shown for that hover
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
    /** @type {SpeedActions|null} */
    static #current_instance = null;
    /** `performance.now()` of the last time the popup was opened for a (new) instance */
    static #shown_at = 0;
    /**
     * a tap fires the compat `mouseenter` (which opens the popup) right before `click`:
     * a click this soon after opening belongs to the same tap and must not close it again
     */
    static #CLICK_AFTER_SHOW_GRACE_MS = 350;

    /** @type {HTMLElement|null} */
    static #pin_button = null;

    /**
     * Shared "pin" state: while pinned, `#hide()` no longer closes the popup on
     * mouseleave — it only dims it (opacity 0.7) as a visual cue.
     * Pressing any key inside the popup pins it; Escape unpins it.
     * Switching to a different target always unpins.
     */
    static pinned = {
        value: false,
        /**
         * @param {boolean} [force] - if omitted, flips the current value
         * @returns {boolean} the resulting value
         */
        toggle(force) {
            const next = force !== undefined ? force : !SpeedActions.pinned.value;
            SpeedActions.pinned.value = next;
            SpeedActions.#pin_button?.classList.toggle('sa-pinned', next);
            if (next) {
                SpeedActions.the_one_instance.elements.container.appendChild(SpeedActions.#pin_button);
            }
            return next;
        }
    };

    /** @type {HTMLElement[]} */
    #buttons = [];
    /** @type {HTMLElement} */
    #target = null;
    /** @type {'left'|'right'|'top'|'bottom'} */
    #side = 'left';

    // Arrow-function fields so removeEventListener works with the same reference
    #onTargetEnter = () => SpeedActions.#show(this);
    #onTargetLeave = () => SpeedActions.#hide();
    #onTargetClick = () => {
        const owner = this;
        const opened_by_this_tap = performance.now() - SpeedActions.#shown_at < SpeedActions.#CLICK_AFTER_SHOW_GRACE_MS;
        if (owner.isVisible() && opened_by_this_tap) {
            return;
        }
        owner.toggle();
    };

    async #initialize() {
        const owner = this;
        owner.#target = owner.options.target;
        console.assert(owner.#target instanceof HTMLElement, "SpeedActions: options.target must be an HTMLElement");
        owner.#side = ['right', 'top', 'bottom'].includes(owner.options.side) ? owner.options.side : 'left';

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
        if (owner.options.toggle_on_click !== false) {
            owner.#target.addEventListener('click', owner.#onTargetClick);
        }
    }
    static prevent_hiding = null;
    static #attachRootListeners() {
        SpeedActions.the_one_instance.self_ref.addEventListener('mouseenter', () => {
            if (SpeedActions.prevent_hiding) {
                clearTimeout(SpeedActions.prevent_hiding);
                SpeedActions.prevent_hiding = null;
            }
            SpeedActions.the_one_instance.self_ref.style.opacity = '';
            // console.error("prevent closing")
        });
        SpeedActions.the_one_instance.self_ref.addEventListener('mouseleave', () => {
            SpeedActions.#hide();
        });
        SpeedActions.the_one_instance.self_ref.addEventListener('keydown', (event) => {
            if (event.key == "Escape") {
                SpeedActions.pinned.toggle(false);
            } else {
                SpeedActions.pinned.toggle(true);
            }
        });
    }
    /**
     * 
     * @param {SpeedActions} instance 
     */
    static #show(instance) {
        // console.log("show " + new Date().toISOString());
        if (instance.options.conditionsMet != undefined) {
            if (!instance.options.conditionsMet()) {
                return;
            }
        }
        if (SpeedActions.prevent_hiding) {
            clearTimeout(SpeedActions.prevent_hiding);
            SpeedActions.prevent_hiding = null;
        }
        const one = SpeedActions.the_one_instance;
        const root = one.self_ref;
        const container = one.elements.container;

        // Remove dot from previous target if switching
        if (SpeedActions.#current_instance && SpeedActions.#current_instance !== instance) {
            SpeedActions.#current_instance.#target.classList.remove('sa-target-active', 'sta-relative');
            SpeedActions.pinned.toggle(false);
        }
        // console.error(instance.options);
        if (!SpeedActions.#is_visible || SpeedActions.#current_instance !== instance) {
            SpeedActions.#shown_at = performance.now();
        }
        SpeedActions.#current_instance = instance;
        if (instance.options.non_relative != true) {
            instance.#target.classList.add('sa-target-active', 'sta-relative');
        }

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

        if (SpeedActions.#pin_button === null) {
            SpeedActions.#pin_button = UiBuilder.createButton({
                icon_code: 'e6aa',
                hint: Locale.at('prevent auto-closing'),
                class: 'speed-actions-pin-btn',
                onClick: () => SpeedActions.pinned.toggle(),
                theme: 'text',
                anchor: "left",
            });
        }
        if (instance.options.unpinnable != true || SpeedActions.pinned.value) {
            container.appendChild(SpeedActions.#pin_button);
        }

        // Render hidden to measure container dimensions
        root.style.visibility = 'hidden';
        root.style.opacity = '';
        root.classList.add('sa-visible');

        const tr = instance.#target.getBoundingClientRect();
        const W = container.offsetWidth || 60;
        const H = container.offsetHeight || 40;
        const gap = 8;
        const pad_x = 10; //Math.max(W * 0.1, 10);
        const pad_y = 10; //Math.max(H * 0.1, 10);

        // Prefer instance.#side, fall back to the opposite side if insufficient space (unless side_strict)
        const can_fall_back = instance.options.side_strict !== true;
        let c_left, c_top;
        if (instance.#side === 'top' || instance.#side === 'bottom') {
            if (instance.#side === 'bottom') {
                c_top = tr.bottom + gap;
                if (can_fall_back && c_top + H > window.innerHeight - pad_y) {
                    c_top = tr.top - H - gap;
                }
            } else {
                c_top = tr.top - H - gap;
                if (can_fall_back && c_top < pad_y) {
                    c_top = tr.bottom + gap;
                }
            }
            // Horizontally center container on target, clamped to viewport
            c_left = tr.left + (tr.width / 2) - (W / 2);
            c_left = Math.max(pad_x, Math.min(c_left, window.innerWidth - W - pad_x));
        } else {
            if (instance.#side === 'right') {
                c_left = tr.right + gap;
                if (can_fall_back && c_left + W > window.innerWidth - pad_x) {
                    c_left = tr.left - W - gap;
                }
            } else {
                c_left = tr.left - W - gap;
                if (can_fall_back && c_left < pad_x) {
                    c_left = tr.right + gap;
                }
            }
            // Vertically center container on target, clamped to viewport
            c_top = tr.top + (tr.height / 2) - (H / 2);
            c_top = Math.max(pad_y, Math.min(c_top, window.innerHeight - H - pad_y));
        }

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
        container.style.right = `${c_left - safe_left}px`;
        // container.style.bottom = `${c_top - safe_top}px`;

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
            if (SpeedActions.pinned.value) {
                one.self_ref.style.opacity = '0.7';
                return;
            }
            SpeedActions.#hideNow();
        }, 100);
    }

    /**
     * closes the popup immediately, ignoring the pinned state
     */
    static #hideNow() {
        const one = SpeedActions.the_one_instance;
        if (SpeedActions.prevent_hiding) {
            clearTimeout(SpeedActions.prevent_hiding);
            SpeedActions.prevent_hiding = null;
        }
        if (!one || !SpeedActions.#is_visible) return;
        SpeedActions.#is_visible = false;
        SpeedActions.#current_instance.#target.classList.remove('sa-target-active');
        SpeedActions.#current_instance = null;
        one.self_ref.classList.remove('sa-visible');
    }

    /**
     * hides the popup now if this instance is the one currently shown (no-op otherwise)
     */
    hide() {
        if (SpeedActions.#current_instance === this) {
            SpeedActions.#hide();
        }
    }

    /**
     * @returns {boolean} true while the popup is shown for this instance
     */
    isVisible() {
        return SpeedActions.#is_visible && SpeedActions.#current_instance === this;
    }

    /**
     * shows the popup for this instance, or closes it right away (unpinning it) if it's already shown
     */
    toggle() {
        const owner = this;
        if (owner.isVisible()) {
            SpeedActions.pinned.toggle(false);
            SpeedActions.#hideNow();
        } else {
            SpeedActions.#show(owner);
        }
    }

    destroy(timeout_ms = 0) {
        this.#target?.removeEventListener('mouseenter', this.#onTargetEnter);
        this.#target?.removeEventListener('mouseleave', this.#onTargetLeave);
        this.#target?.removeEventListener('click', this.#onTargetClick);
        if (SpeedActions.#current_instance === this) {
            SpeedActions.#hide();
        }
        super.destroy(timeout_ms);
    }
}


//#START RESERVED AREA FOR UI_BUILDER
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
//#END RESERVED AREA FOR UI_BUILDER