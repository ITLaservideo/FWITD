/**
 * on-screen touch keyboard overlay; ported from the pre-FrameworkGC `Keyboard` implementation onto the
 * shared component base. Behavior is kept faithful to the original except where noted below.
 * @version 2.0
 */
class KeyBoard extends FrameworkGC(`${injector_html}`) {
    /**
     * cached lookup of the `suppress-os-keyboard` meta flag; when true this component builds its
     * elements/listeners but does not attach itself to the document (the OS's own keyboard is used instead)
     * @type {boolean}
     */
    static #suppress_os_keyboard = null;
    /**
     * only one keyboard should ever be visible at a time; the original implementation detected a
     * pre-existing instance via `document.getElementById("tkb-component")` and silently built a
     * detached, non-functional clone when one was found - opening a second input while the keyboard
     * was already open left the user with a keyboard that didn't do anything. This tracks the live
     * instance instead, so opening a new one now cleanly replaces the old one.
     * @type {KeyBoard}
     */
    static #current_instance = null;
    /**
     * @type {HTMLInputElement}
     */
    input_target = undefined;
    /**
     * @type {Function}
     */
    onConfirmClick = undefined;
    /**
     * @type {boolean}
     */
    is_num_pad = false;
    /**
     * @param {Object} options
     * @param {HTMLInputElement} options.input_target - element whose `.value` this keyboard edits; if it exposes a `validateInput(str)` method, it's used to sanitize every keystroke before it's committed
     * @param {string} [options.label] - caption shown above the preview field; the label is removed entirely when omitted
     * @param {boolean} [options.disable_symbols] - hides the "switch to symbols" key
     * @param {boolean} [options.only_numbers] - collapses the layout down to a compact numeric pad
     * @param {Function} [options.onConfirmClick] - called instead of dispatching a synthetic Enter keydown when "Conferma" is pressed
     * @param {Function} [options.onClickOutside] - called when the user taps the dimmed backdrop outside the keyboard itself
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        if (KeyBoard.#current_instance != null) {
            KeyBoard.#current_instance.destroy(0);
        }
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        console.assert(options?.input_target != undefined, "KeyBoard requires options.input_target");
        KeyBoard.#current_instance = this;
        document.body.classList.add("user-select-none-important");
        this.#getElements();
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
        /**
         * @type HTMLElement
         */
        label: null,
        /**
         * @type HTMLElement
         */
        containerTrueKeyboard: null,
        /**
         * @type HTMLElement
         */
        previewInput: null,
        /**
         * @type HTMLImageElement
         */
        lockCase: null,
        /**
         * @type HTMLElement
         */
        backspace: null,
        /**
         * @type HTMLElement
         */
        confirm: null,
        /**
         * @type HTMLElement
         */
        spazio: null,
        /**
         * @type HTMLElement
         */
        symbols: null,
    }
    #getElements() {
        const owner = this;
        owner.elements.label = owner.self_ref.getElementsByClassName("tkb-label")[0];
        owner.elements.containerTrueKeyboard = owner.self_ref.getElementsByClassName("tkb-container")[0];
        owner.elements.previewInput = owner.self_ref.querySelector("#preview-input");
        owner.elements.previewInput.addEventListener("click", () => {
            owner.updatePreview("");
        });
        owner.elements.lockCase = owner.self_ref.querySelector("#tkb-lock-case");
        owner.elements.backspace = owner.self_ref.querySelector("#tkb-backspace").parentElement;
        owner.elements.confirm = owner.self_ref.querySelector("#tkb-conferma");
        owner.elements.spazio = owner.self_ref.querySelector("#tkb-spazio");
        owner.elements.symbols = owner.self_ref.querySelector("#tkb-symbols");
    }
    #initialize() {
        const owner = this;
        if (KeyBoard.#suppress_os_keyboard == null) {
            KeyBoard.#suppress_os_keyboard = document.querySelector("[name~=suppress-os-keyboard][content]")?.content == "true";
        }
        owner.updateInputTarget(owner.options);
        owner.updateUi(owner.options);
        if (!KeyBoard.#suppress_os_keyboard) {
            document.body.appendChild(owner.self_ref);
        }
        requestAnimationFrame(() => {
            owner.self_ref.style.opacity = 1;
        });
    }
    /**
     * reconfigures the layout for the given options; safe to call again on an already-shown keyboard
     * @param {Object} options
     */
    updateUi(options) {
        const owner = this;
        const symbols = owner.elements.symbols;
        const space_button = owner.elements.spazio;
        if (options.disable_symbols) {
            symbols.parentElement.classList.add("display-none-important");
        }
        if (options.only_numbers) {
            owner.is_num_pad = true;
            const rows = owner.self_ref.getElementsByClassName("bis0");
            const uppercase_button = owner.self_ref.getElementsByClassName("tkb-line3")[0].children[0];
            const symbols_toggle_key = owner.self_ref.getElementsByClassName("tkb-line4")[0].children[1];
            symbols_toggle_key.style.display = "none";
            uppercase_button.style.display = "none";
            space_button.style.display = "none";
            symbols.parentElement.classList.add("display-none-important");
            const line0 = owner.self_ref.getElementsByClassName("tkb-line0")[0];
            line0.lastElementChild.style = "margin-left: auto;margin-right: 37px;";
            owner.self_ref.getElementsByClassName("tkb-line3")[0].prepend(line0.lastElementChild);
            for (let i = 0; i < rows.length; i++) {
                rows[i].style.display = "none";
            }
            line0.classList.add("display-none-important");
            const bis2_rows = owner.self_ref.getElementsByClassName("bis2");
            for (let i = 0; i < bis2_rows.length; i++) {
                bis2_rows[i].classList.add("display-flex-important");
            }
            owner.elements.containerTrueKeyboard.style.cssText = "opacity: 1;width: 300px;left: calc(100vw - 50vw - 150px);";
        }
    }
    #addEventListeners() {
        const owner = this;
        const self_aware = {
            case_state: 0, //0 lowercase, 1 uppercase once, 2 uppercase always
        };
        const spans = owner.elements.containerTrueKeyboard.getElementsByTagName("span");

        owner.self_ref.addEventListener("mousedown", (event) => {
            if (event.target == event.currentTarget) {
                setTimeout(() => {
                    owner.destroy();
                    if (typeof owner.options.onClickOutside === "function") {
                        owner.options.onClickOutside();
                    }
                }, 0);
            }
        });

        const onUppercaseStatusChanged = () => {
            requestAnimationFrame(() => {
                switch (self_aware.case_state) {
                    case 2:
                        owner.elements.lockCase.innerHTML = "&#xf7de;";
                        owner.elements.lockCase.parentElement.classList.toggle("enhance-selected", true);
                        // owner.elements.lockCase.src = "/Images/Icone2024/ui_2024/up-arrow-caps-up-always.svg";
                        break;
                    case 1:
                        owner.elements.lockCase.innerHTML = "&#xe318;";
                        owner.elements.lockCase.parentElement.classList.toggle("enhance-selected", true);
                        // owner.elements.lockCase.src = "/Images/Icone2024/ui_2024/up-arrow-caps-up.svg";
                        break;
                    case 0:
                    default:
                        owner.elements.lockCase.innerHTML = "&#xe318;";
                        owner.elements.lockCase.parentElement.classList.toggle("enhance-selected", false);
                        // owner.elements.lockCase.src = "/Images/Icone2024/ui_2024/up-arrow-caps-no.svg";
                        break;
                }
                for (let i = 0; i < spans.length; i++) {
                    const key = spans[i];
                    if (key.firstElementChild != undefined || key.id != '') {
                        continue;
                    }
                    key.innerText = self_aware.case_state > 0 ? key.innerText.toUpperCase() : key.innerText.toLowerCase();
                }
            });
        };
        onUppercaseStatusChanged();

        for (let i = 0; i < spans.length; i++) {
            const key = spans[i];
            if (key.firstElementChild != undefined || key.id != '') {
                continue;
            }
            if (key.innerText == '.') {
                key.addEventListener("mousedown", (event) => {
                    if (event.button != 0) {
                        return;
                    }
                    if (!owner.is_num_pad || owner.input_target.value.indexOf(".") == -1) {
                        owner.updatePreview(`${owner.input_target.value}${key.innerText}`);
                    }
                    setTimeout(() => {
                        owner.input_target.focus();
                    }, 0);
                });
            } else {
                key.addEventListener("mousedown", (event) => {
                    if (event.button != 0) {
                        return;
                    }
                    owner.updatePreview(`${owner.input_target.value}${key.innerText}`);
                    setTimeout(() => {
                        if (self_aware.case_state == 1) {
                            self_aware.case_state = 0;
                            onUppercaseStatusChanged();
                        }
                        owner.input_target.focus();
                    }, 0);
                });
            }
        }

        owner.elements.backspace.addEventListener("mousedown", (event) => {
            if (event.button != 0) {
                return;
            }
            owner.updatePreview(owner.input_target.value.slice(0, -1));
            setTimeout(() => {
                owner.input_target.focus();
            }, 0);
        });

        owner.elements.confirm.addEventListener("mousedown", (event) => {
            if (event.button != 0) {
                return;
            }
            if (typeof owner.onConfirmClick === "function") {
                owner.onConfirmClick(event);
            } else {
                owner.input_target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', clientX: event.clientX, clientY: event.clientY }));
            }
            setTimeout(() => {
                owner.destroy();
            }, 0);
        });

        owner.elements.spazio.addEventListener("mousedown", (event) => {
            if (event.button != 0) {
                return;
            }
            owner.updatePreview(`${owner.input_target.value} `);
            setTimeout(() => {
                owner.input_target.focus();
            }, 0);
        });

        owner.elements.lockCase.parentElement.addEventListener("click", () => {
            self_aware.case_state = (self_aware.case_state + 1) % 3;
            onUppercaseStatusChanged();
            setTimeout(() => {
                owner.input_target.focus();
            }, 0);
        });

        owner.elements.symbols.parentElement.addEventListener("mousedown", (event) => {
            if (event.button != 0) {
                return;
            }
            const bis0 = owner.self_ref.getElementsByClassName("bis0");
            for (let i = 0; i < bis0.length; i++) {
                bis0[i].classList.toggle("display-none-important");
            }
            const bis1 = owner.self_ref.getElementsByClassName("bis1");
            for (let i = 0; i < bis1.length; i++) {
                bis1[i].classList.toggle("display-flex-important");
            }
            setTimeout(() => {
                owner.input_target.focus();
            }, 0);
        });
    }
    /**
     * forwards to the currently-open instance's updateInputTarget, if any - lets external code
     * (which has no access to the private #current_instance field) retarget the open keyboard
     * without having to hold onto the instance itself
     * @param {Object} args
     * @param {HTMLInputElement} args.input_target
     * @param {string} [args.label]
     * @param {Function} [args.onConfirmClick]
     */
    static updateInputTarget(args) {
        KeyBoard.#current_instance?.updateInputTarget(args);
    }
    /**
     * (re)targets this keyboard at a different input without closing it, e.g. when the user
     * taps the next field in a form while the keyboard is already open.
     * @param {Object} args
     * @param {HTMLInputElement} args.input_target
     * @param {string} [args.label]
     * @param {Function} [args.onConfirmClick]
     */
    updateInputTarget(args) {
        const owner = this;
        if (args.label == undefined) {
            owner.elements.label.remove();
        } else {
            owner.elements.label.innerText = args.label;
            owner.elements.containerTrueKeyboard.prepend(owner.elements.label);
        }
        owner.input_target = args.input_target;
        owner.elements.previewInput.innerText = args.input_target.value;
        if (args.onConfirmClick != undefined) {
            owner.onConfirmClick = args.onConfirmClick;
        }
    }
    /**
     * @param {string} str
     */
    updatePreview(str) {
        const owner = this;
        setTimeout(() => {
            if (typeof owner.input_target.validateInput === "function") {
                str = owner.input_target.validateInput(str);
            }
            owner.elements.previewInput.innerText = str;
            owner.input_target.value = str;
        }, 0);
    }
    /**
     * called by the input's owner once it's done consuming the confirmed value, to re-enable
     * anything it disabled (via the "disable-pointer-events" class) while this keyboard was open
     */
    onComplete() {
        const owner = this;
        setTimeout(() => {
            const elements = Array.from(owner.self_ref.getElementsByClassName("disable-pointer-events"));
            elements.forEach((el) => el.classList.remove("disable-pointer-events"));
        }, 100);
    }
    /**
     * @param {number} timeout_ms 0 by default
     */
    destroy(timeout_ms = 0) {
        if (KeyBoard.#current_instance === this) {
            KeyBoard.#current_instance = null;
            document.body.classList.remove("user-select-none-important");
        }
        this.self_ref.classList.add("tkb-closing");
        super.destroy(Math.max(timeout_ms, 250));
    }
    // owner.self_ref;//access element reference here
    // owner.elementReference();//alternative way to access element reference
    // owner.destroy();//call destroy method when needed
    // owner.options;//access building options here
}


//#START RESERVED AREA FOR UI_BUILDER
// const input = document.createElement("input");
// input.placeholder = "some placeholder";
// document.body.appendChild(input);
// let sswitch = true;
// input.addEventListener("focus", async () => {
//     const exist_keyboard = document.getElementById("tkb-component");
//     if (exist_keyboard != undefined) {
//         KeyBoard.updateInputTarget({ input_target: input, label: input.placeholder });
//         return;
//     } else {
//         const keyboard_i = new KeyBoard({
//             input_target: input,
//             only_numbers: (() => { sswitch = !sswitch; return sswitch; })(),
//             onClickOutside: () => {
//                 input.dispatchEvent(new Event("keyup"));
//             },
//             onConfirmClick: () => {
//                 setTimeout(() => {
//                     keyboard_i.destroy();
//                 }, 0);
//                 input.dispatchEvent(new Event("keyup"));
//             },
//             label: input.placeholder
//         });
//     }
// });
//#END RESERVED AREA FOR UI_BUILDER