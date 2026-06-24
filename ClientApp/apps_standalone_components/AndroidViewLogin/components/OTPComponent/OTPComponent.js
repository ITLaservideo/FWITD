/**
 * @version 1.0
 */
class OTPComponent extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        if (typeof this.options.onReady === "function") {
            this.options.onReady();
        }
        // this.#createDebugger();
    }
    // #createDebugger() {
    //     const owner = this;
    //     const listbox = new ListBox({
    //         autoScroll: true,
    //         Size: {
    //             width: "80vw",
    //             height: "80vh",
    //         }
    //     });
    //     const el_input = document.createElement("input");
    //     el_input.type = "text";
    //     owner.self_ref.appendChild(el_input);
    //     el_input.addEventListener("beforeinput", (e) => {
    //         setTimeout(() => {
    //             e.target.value = `${e.target.value}`.toUpperCase();
    //         }, 0);
    //         listbox.addItem(e.data);
    //     }, false);//bubling
    //     owner.listbox = listbox;
    //     setTimeout(() => {
    //         owner.self_ref.parentElement.appendChild(listbox.elementReference());
    //     }, 0);
    // }
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
        container_otps_inputs: null,
    }
    #keysPressed = {};
    //#region Framework Event Listeners
    /**
     * 
     * @param {InputEvent} event 
     */
    async onBeforeInput(event) {
        console.error(event);
        /**
         * @type HTMLElement
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
        const regex = /^[0-9]{1}$/;
        requestAnimationFrame(() => {
            try {//purge input to last single number
                const all_numbers = /[0-9]/g;
                const all_matches = the_key.matchAll(all_numbers).toArray();
                element_with_this_event.value = `${(all_matches[all_matches.length - 1][0] ?? '')}`;
            } catch (error) {
                element_with_this_event.value = '';
            }
            if (the_key.match(regex)) {//it's a number
                if (element_with_this_event.nextElementSibling == undefined) {//last otp
                    owner.postOtp();
                    return;
                }
                element_with_this_event.nextElementSibling.focus();//go to next otp
            } else {
                element_with_this_event.value = "";
            }
        });
        let runner = element_with_this_event.nextElementSibling;
        while (runner != undefined) {
            runner.value = '';
            runner = runner.nextElementSibling;
        }
    }
    /**
     * 
     * @param {KeyboardEvent} event 
     */
    async onKeyDown(event) {
        /**
         * @type HTMLElement
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
            let runner = element_with_this_event.nextElementSibling;
            while (runner != undefined) {
                runner.value = '';
                runner = runner.nextElementSibling;
            }
        } else if (event.key == 'Enter') {
            owner.#keysPressed[event.key] = true;
            owner.postOtp();
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
    async onKeyUp(event) {
        const owner = this.fwInstanceReference;
        owner.#keysPressed[event.key] = false;//1564984
        ////owner.listbox?.addItem(`keyUp: {${JSON.stringify(event)}}`);
        ////owner.listbox?.addItem(`keyUp bubbles: {${JSON.stringify(event.bubbles)}}`);
        //owner.listbox?.addItem(`keyUp cancelable: {${JSON.stringify(event.cancelable)}}`);
        //owner.listbox?.addItem(`keyUp code: {${JSON.stringify(event.code)}}`);
        //owner.listbox?.addItem(`keyUp composed: {${JSON.stringify(event.composed)}}`);
        //owner.listbox?.addItem(`keyUp defaultPrevented: {${JSON.stringify(event.defaultPrevented)}}`);
        //owner.listbox?.addItem(`keyUp key: {${JSON.stringify(event.key)}}`);
        //owner.listbox?.addItem(`keyUp keyCode: {${JSON.stringify(event.keyCode)}}`);
        ////owner.listbox?.addItem(`keyUp sourceCapabilities: {${JSON.stringify(event.sourceCapabilities)}}`);
        ////owner.listbox?.addItem(`keyUp srcElement: {${JSON.stringify(event.srcElement)}}`);
        ////owner.listbox?.addItem(`keyUp target: {${JSON.stringify(event.target)}}`);
        //owner.listbox?.addItem(`keyUp timeStamp: {${JSON.stringify(event.timeStamp)}}`);
        //owner.listbox?.addItem(`keyUp type: {${JSON.stringify(event.type)}}`);
        //owner.listbox?.addItem(`keyUp view: {${JSON.stringify(event.view)}}`);
        //owner.listbox?.addItem(`keyUp which: {${JSON.stringify(event.which)}}`);
    }
    /**
     * 
     * @param {ClipboardEvent} event 
     */
    onPaste(event) {
        event.preventDefault();

        /**
         * @type HTMLElement
         */
        const element_with_this_event = this;
        /**
         * @type OTPComponent
         */
        const owner = element_with_this_event.fwInstanceReference;
        /**
         * @type String
         */
        const the = (() => { try { return (event.clipboardData || window.clipboardData).getData("text").match(/[0-9]{6}/)[0]; } catch (error) { return ''; } })();
        for (let i = 0; i < owner.elements.container_otps_inputs.children.length; i++) {
            const input_element = owner.elements.container_otps_inputs.children[i];
            input_element.value = the.at(i) ?? '';
        }
    }
    #alreadyPosted = {}
    //#endregion
    postOtp() {
        const owner = this;
        let otp = '';
        let runner = owner.elements.container_otps_inputs.firstElementChild;
        const misure = runner.getBoundingClientRect();
        while (runner != undefined) {
            otp += `${Number(runner.value)}`;
            runner = runner.nextElementSibling;
        }
        if (!otp.match(/[0-9]{6}/)) {
            return;
        }
        if (owner.#alreadyPosted[`${otp}`] != undefined) {
            return;
        }
        owner.#alreadyPosted[`${otp}`] = otp;
        new Notify({
            text: `${Locale.at("otp inviato")} ${otp}`,
            event: { clientX: misure.x - 30, clientY: misure.y + 100 },
            ms_timeout: 2000,
            style: 3,
            type: 1
        });
        if (owner.listbox != undefined) {
            owner.listbox.addItem(`input otp: ${otp}`);//debugging
        } else {
            Lobby.post({ prompt: 19, data: otp }, (rsp) => {
                new Notify({
                    text: `${Locale.at("otp checkato")}`,
                    event: { clientX: misure.x, clientY: misure.y + 150 },
                    ms_timeout: 2000,
                    style: 3,
                    type: 0
                });
                setTimeout(async () => {
                    await new Promise((resolve) => {
                        Lobby.post({ prompt: 14/*open the app*/ }, (rsp) => {
                            resolve();
                            //owner.elements.button_login.classList.toggle("clicked", false);
                        });
                    });
                }, 500);
            });
        }
    }
}
// for UiBuilder
// const the_test = setTimeout(() => {
//     const ss = new OTPComponent({});
//     document.body.appendChild(ss.elementReference());
// }, 0);