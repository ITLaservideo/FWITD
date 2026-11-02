/**
 * One-time-code input: a row of single-digit boxes with auto-advance, Backspace/←/→ navigation,
 * and paste/multi-digit insert distribution across the boxes.
 * Server-agnostic: it only collects the code and hands it to `options.onSubmit` - what to do with
 * it (which endpoint, what happens on success) is entirely up to the caller.
 * @version 2.0
 */
class OTPComponent extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options
     * @param {(code: string) => (void|boolean|Promise<void|boolean>)} [options.onSubmit] called with the
     *   complete code when the last box is filled, a full code is pasted, or Enter is pressed - at most
     *   once per distinct code. Return/resolve `false` (or throw) to reject it: the boxes are cleared
     *   and the same code can be submitted again.
     * @param {number} [options.length=6] number of digits
     * @param {string} [options.title] label shown above the boxes; defaults to a generic prompt
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        this.#initialize(options);
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
        title: null,
        /**
         * @type HTMLElement
         */
        container_otps_inputs: null,
    }
    #length = 6;
    #keysPressed = {};
    /**
     * codes already handed to `onSubmit`, so the same code isn't submitted twice
     * @type {Set<string>}
     */
    #submitted = new Set();
    #initialize(options) {
        const owner = this;
        owner.#length = Math.max(1, Math.trunc(Number(options.length ?? 6)) || 6);
        owner.elements.title.innerText = options.title ?? Locale.at("enter the OTP code");
        for (let i = 0; i < owner.#length; i++) {
            const input = document.createElement("input");
            input.type = "text";
            input.maxLength = 1;
            input.inputMode = "numeric";
            // same wiring the framework generates for (keydown)="..." etc.: `this` is the element
            input.fwInstanceReference = owner;
            input.addEventListener("keydown", owner.onKeyDown);
            input.addEventListener("keyup", owner.onKeyUp);
            input.addEventListener("paste", owner.onPaste);
            input.addEventListener("beforeinput", owner.onBeforeInput);
            owner.elements.container_otps_inputs.appendChild(input);
        }
    }
    /**
     * the digits currently typed (may be shorter than `length` / contain gaps)
     * @returns {string}
     */
    get value() {
        return Array.from(this.elements.container_otps_inputs.children, (input) => input.value).join('');
    }
    /**
     * empties every box, forgets the already-submitted codes, and focuses the first box
     */
    clear() {
        const owner = this;
        owner.#submitted.clear();
        owner.#fill(owner.elements.container_otps_inputs.firstElementChild, '');
    }
    /**
     * writes `digits` starting at `input`, empties the boxes after them, then focuses the next box -
     * or, when the last box got filled, submits
     * @param {HTMLInputElement} input
     * @param {string} digits
     */
    #fill(input, digits) {
        let runner = input;
        let last_filled = input;
        for (const digit of digits) {
            if (runner == undefined) {
                break;
            }
            runner.value = digit;
            last_filled = runner;
            runner = runner.nextElementSibling;
        }
        for (let rest = runner; rest != undefined; rest = rest.nextElementSibling) {
            rest.value = '';
        }
        if (runner == undefined) {//last box filled
            last_filled.focus();
            this.submit();
        } else {
            runner.focus();
        }
    }
    //#region Framework Event Listeners
    /**
     *
     * @param {InputEvent} event
     */
    onBeforeInput(event) {
        /**
         * @type HTMLInputElement
         */
        const element_with_this_event = this;
        /**
         * @type OTPComponent
         */
        const owner = element_with_this_event.fwInstanceReference;
        const the_key = event.data;
        if (the_key == undefined || the_key.length == 0) {
            return;
        }
        owner.#keysPressed[the_key] = true;
        const digits = the_key.replace(/[^0-9]/g, '');
        // let the browser apply the insertion first, then overwrite it (preventDefault is unreliable for Android IMEs).
        // a multi-digit insert (e.g. an Android keyboard clipboard suggestion) is spread over the following boxes
        requestAnimationFrame(() => {
            owner.#fill(element_with_this_event, digits.length > 1 ? digits : digits.slice(-1));
        });
    }
    /**
     *
     * @param {KeyboardEvent} event
     */
    onKeyDown(event) {
        /**
         * @type HTMLInputElement
         */
        const element_with_this_event = this;
        /**
         * @type OTPComponent
         */
        const owner = element_with_this_event.fwInstanceReference;
        if (owner.#keysPressed[event.key]) {
            // Key is already being handled, ignore
            return;
        }
        if (event.key == 'Backspace') {
            element_with_this_event.value = '';
            element_with_this_event.previousElementSibling?.focus();
            for (let runner = element_with_this_event.nextElementSibling; runner != undefined; runner = runner.nextElementSibling) {
                runner.value = '';
            }
        } else if (event.key == 'Enter') {
            owner.#keysPressed[event.key] = true;
            owner.submit();
        } else if (event.key == "ArrowLeft") {
            element_with_this_event.previousElementSibling?.focus();
        } else if (event.key == "ArrowRight") {
            element_with_this_event.nextElementSibling?.focus();
        }
    }
    /**
     *
     * @param {KeyboardEvent} event
     * @android event.key works only for ['Enter', 'Backspace']
     */
    onKeyUp(event) {
        const owner = this.fwInstanceReference;
        owner.#keysPressed[event.key] = false;
    }
    /**
     *
     * @param {ClipboardEvent} event
     */
    onPaste(event) {
        event.preventDefault();
        /**
         * @type OTPComponent
         */
        const owner = this.fwInstanceReference;
        const pasted = (() => { try { return (event.clipboardData || window.clipboardData).getData("text"); } catch (error) { return ''; } })();
        const digits = pasted.replace(/[^0-9]/g, '').slice(0, owner.#length);
        owner.#fill(owner.elements.container_otps_inputs.firstElementChild, digits);
    }
    //#endregion
    /**
     * hands the code to `options.onSubmit` if it's complete and wasn't submitted yet
     */
    async submit() {
        const owner = this;
        const code = owner.value;
        if (!new RegExp(`^[0-9]{${owner.#length}}$`).test(code) || owner.#submitted.has(code)) {
            return;
        }
        owner.#submitted.add(code);
        let accepted;
        try {
            accepted = await owner.options.onSubmit?.(code);
        } catch (error) {
            console.error(error);
            accepted = false;
        }
        if (accepted === false) {
            owner.#submitted.delete(code);
            owner.#fill(owner.elements.container_otps_inputs.firstElementChild, '');
        }
    }
}

//#START RESERVED AREA FOR UI_BUILDER
// const the_test = setTimeout(() => {
//     const ss = new OTPComponent({ onSubmit: (code) => console.log(code) });
//     document.body.appendChild(ss.elementReference());
// }, 0);
//#END RESERVED AREA FOR UI_BUILDER
