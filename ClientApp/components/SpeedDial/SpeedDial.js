
/**
 * @version 1.0
 */
class SpeedDial {
    /**
     * @type Element
     */
    #self_ref;
    /**
     * @type Element
     */
    static #html_placeholder = null;
    /**
     * store onClose callbacks
     * @type {Array<Function>}
     */
    #onClose = [];
    /**
     * @param {Object} options
     * @param {Element} options.target - required, element that toggles the speed dial open/closed on click
     * @param {"top"|"bot"|"left"|"left-middle"|"right"|"right-middle"|"around"} [options.anchor="top"] - where the selections fan out relative to `target`
     * @param {Array<Object>} options.selections - required, one entry per fan-out button
     * @param {Function} options.selections[].onClick - required, callback(event) invoked when this selection is clicked
     * @param {string} [options.selections[].hint] - hover hint text; required unless `text` is given
     * @param {string} [options.selections[].text] - label text shown on the button; required unless `hint` is given
     * @param {string} [options.selections[].icon] - image file name loaded from `/Icons/`
     * @param {string} [options.selections[].icon_code] - font icon code point (e.g. `"e88e"`), used when `icon` is not set
     * @param {number} [options.min_width_selections] - min-width (px) applied to every selection button
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        this.#self_ref = (SpeedDial.#html_placeholder).cloneNode(true);
        this.#initialize(options);
        //this.#addEventListeners(options);
        this.#finalize(options);
    }
    async #initialize(options) {
        const owner = this;
        owner.#self_ref.addEventListener("mouseup", (event) => {
            setTimeout(() => {
                owner.#close();
            }, 0);
        })
        const main_container = this.#self_ref.getElementsByClassName("sdt-selection-template")[0];
        owner.#main_container = main_container;
        owner.#glass_container = this.#self_ref.getElementsByClassName("sdt-glass-like")[0];
        console.assert(owner.#main_container != undefined, "missing main container");
        owner.#main_container.addEventListener("mouseleave", (event) => {
            owner.#close();
        });
        owner.#updateUi(options);
    }
    // async #addEventListeners(options) {
    //     const owner = this;
    //     //add event listeners for component here
    // }
    #close() {
        this.#triggerSD({}, false);
    }
    /**
     * @type Element
     */
    triggerer;
    #selection_template
    /**
     * 
     */
    anchor = 'top';
    #show_tweaks = {
        /**
         * @type number
         */
        offset_Y: 0,
        /**
         * @type number
         */
        offset_X: 0
    }
    /**
     * 
     * @param {Object} options 
     */
    // Arrow-function field so removeEventListener works with the same reference
    #onTriggererClick = (event) => {
        //this.triggerer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.#triggerSD(event);
    };
    #updateUi(options) {
        const owner = this;
        owner.triggerer = options.target;
        console.assert(options.target != undefined, "missing target for the speed dial");
        owner.triggerer.addEventListener("click", owner.#onTriggererClick);
        owner.#selection_template = owner.#self_ref.getElementsByClassName("sdt-template-button")[0];
        switch (options.anchor) {
            case "bot":
                owner.anchor = "bot";
                owner.#self_ref.classList.toggle("sdts-bottom", true);
                owner.#selection_template.style["marginTop"] = "40px";
                break;
            case "left":
                owner.anchor = "left";
                owner.#self_ref.classList.toggle("sdts-left", true);
                owner.#selection_template.style["marginLeft"] = "-40px";
                break;
            case "left-middle":
                owner.anchor = "left-middle";
                owner.#self_ref.classList.toggle("sdts-left", true);
                owner.#selection_template.style["marginLeft"] = "-40px";
                owner.#show_tweaks.offset_Y = -50;
                owner.#show_tweaks.offset_X = 10;
                break;
            case "right":
                owner.anchor = "right";
                owner.#self_ref.classList.toggle("sdts-right", true);
                owner.#selection_template.style["marginRight"] = "-40px";
                break;
            case "right-middle":
                owner.anchor = "right-middle";
                owner.#self_ref.classList.toggle("sdts-right", true);
                owner.#selection_template.style["marginRight"] = "-40px";
                owner.#show_tweaks.offset_Y = 50;
                owner.#show_tweaks.offset_X = 10;
                break;
            case "around":
                owner.anchor = "around";
                owner.#self_ref.classList.toggle("sdts-around", true);
                break;
            case "top":
            default:
                owner.anchor = "top";
                owner.#self_ref.classList.toggle("sdts-top", true);
                owner.#selection_template.style["marginTop"] = "-40px";
                break;
        }
        owner.#selection_template.parentElement.removeChild(owner.#selection_template);
        for (let i = 0; i < options.selections.length; i++) {
            const selection_builder = options.selections[i];
            const selection_i = owner.#selection_template.cloneNode(true);
            if (options.min_width_selections != undefined) {
                selection_i.style["minWidth"] = `${options.min_width_selections}px`;
            }
            console.assert(selection_builder.onClick != undefined, "selections requires a `onClick` function");
            selection_i.addEventListener("click", (event) => {
                // owner.#triggerSD(event, false);
                setTimeout(() => {
                    selection_builder.onClick(event);
                }, 0);
            });
            if (selection_builder.hint != undefined) {
                let hint_anchor = "left";
                switch (options.anchor) {
                    case "left-middle":
                    case "left":
                    case "right-middle":
                    case "right":
                    case "around":
                        hint_anchor = "top";
                        break;
                    case "bot":
                    case "top":
                    default:
                        break;
                }
                UiBuilder.addHint({
                    target: selection_i,
                    hint: selection_builder.hint,
                    anchor: hint_anchor
                });
            }
            if (selection_builder.text != undefined) {
                const text_element = selection_i.getElementsByClassName("sdt-text-template")[0];
                text_element.innerText = selection_builder.text;
                text_element.classList.toggle("display-none-important", false);
            }
            console.assert(selection_builder.text != undefined || selection_builder.hint != undefined, "selections requires a `hint` or a `text`");
            const el_icon = selection_i.getElementsByClassName("sdt-icon")[0];
            if (selection_builder.icon != undefined) {
                el_icon.src = `/Icons/${selection_builder.icon}`;
            } else if (selection_builder.icon_code != undefined) {
                el_icon.innerHTML = `&#x${selection_builder.icon_code};`;
            } else {
                if (selection_builder.text != undefined && selection_builder.hint != undefined) {
                    el_icon.classList.toggle("display-none-important");
                }
            }
            if (owner.#glass_container != undefined) {
                owner.#glass_container.appendChild(selection_i);
            } else {
                owner.#main_container.appendChild(selection_i);
            }
            owner.#selections.push(selection_i);
        }
    }
    #selections = [];
    #options_are_visible = false;
    /**
     * @type Element
     */
    #main_container;
    #glass_container;
    #triggerSD(event, bypass_and_do_show = null) {
        const owner = this;
        const show = bypass_and_do_show != null ? bypass_and_do_show : !owner.#options_are_visible;
        if (show) {
            owner.#glass_container.classList.toggle("disable-pointer-events", false);
            owner.#options_are_visible = true;
            document.body.appendChild(owner.#self_ref);
            switch (owner.anchor) {
                case "bot":
                    owner.#main_container.style.left = `${event.clientX - 20}px`;
                    owner.#main_container.style.bottom = `${window.innerHeight - (event.clientY + 20)}px`;
                    break;
                case "left":
                    owner.#main_container.style.left = `${event.clientX - 20}px`;
                    owner.#main_container.style.top = `${event.clientY + window.scrollY - 20}px`;
                    break;
                case "left-middle":
                    owner.#main_container.style.left = `${event.clientX - 20 + owner.#show_tweaks.offset_X}px`;
                    owner.#main_container.style.top = `${event.clientY + window.scrollY - 20 + owner.#show_tweaks.offset_Y}px`;
                    break;
                case "right-middle":
                    owner.#main_container.style.right = `${window.innerWidth - (event.clientX + 50) + owner.#show_tweaks.offset_X}px`;
                    owner.#main_container.style.top = `${event.clientY + window.scrollY - owner.#main_container.offsetHeight + 20 + owner.#show_tweaks.offset_Y}px`;
                    break;
                case "right":
                    owner.#main_container.style.right = `${window.innerWidth - (event.clientX + 50)}px`;
                    owner.#main_container.style.top = `${event.clientY + window.scrollY - owner.#main_container.offsetHeight + 20}px`;
                    break;
                case "around":
                    owner.#main_container.style.left = `${event.clientX - owner.#main_container.offsetWidth / 2}px`;
                    owner.#main_container.style.top = `${event.clientY + window.scrollY - 20}px`;
                    break;
                case "top":
                default:
                    owner.#main_container.style.left = `${event.clientX - 20}px`;
                    owner.#main_container.style.top = `${event.clientY + window.scrollY - 20}px`;
                    break;
            }
            setTimeout(() => {
                setTimeout(() => {
                    // const total_gap = owner.#selections.length * 50;
                    // const gap = total_gap / owner.#selections.length;
                    // const midIndex = Math.floor(owner.#selections.length / 2);
                    const total_gap = owner.#selections.length * 15; // Defines the total gap available
                    const midIndex = Math.floor(owner.#selections.length / 2); // Find the midpoint
                    const maxMargin = total_gap / 2; // Maximum margin at the center point
                    for (let i = 0; i < owner.#selections.length; i++) {
                        switch (owner.anchor) {
                            case "left-middle":
                            case "left":
                                owner.#selections[i].style.removeProperty("margin-left");
                                break;
                            case "around":
                                owner.#selections[i].style.removeProperty("margin-right");
                                owner.#selections[i].style.removeProperty("margin-left");

                                const distanceFromMid = Math.abs(midIndex - i);
                                owner.#selections[i].style["marginTop"] = `${maxMargin * (1 - (distanceFromMid / midIndex) ** 2)}px`;
                                // owner.#selections[i].style["marginTop"] = `${gap * (midIndex - distanceFromMid)}`;
                                break;
                            case "right":
                            case "right-middle":
                                owner.#selections[i].style.removeProperty("margin-right");
                                break;
                            case "bot":
                            case "top":
                            default:
                                owner.#selections[i].style.removeProperty("margin-top");
                                // owner.#selections[i].style.removeProperty("margin-bottom");
                                break;
                        }
                        owner.#selections[i].style["opacity"] = '1';
                    }
                    // setTimeout(() => {
                    //     UiBuilder.checkOverflow(owner.#main_container);
                    // }, 100);
                    // setTimeout(() => {
                    //     /**
                    //      * @type Element
                    //      */
                    //     (owner.#selections[0]).firstElementChild
                    //         .scrollIntoView({ behavior: 'smooth', block: 'center' });
                    //     (owner.#selections[0]).firstElementChild.style.border = "1px solid red"
                    // }, 0);
                }, 0);
                // MousePopUp.checkOverflow(owner.#self_ref.getElementsByClassName("template-mouse-pop-up-container")[0]);
            }, 0);
        } else {
            owner.#glass_container.classList.toggle("disable-pointer-events", true);
            if (owner.#options_are_visible) {
                for (let i = 0; i < owner.#selections.length; i++) {
                    switch (owner.anchor) {
                        case "bot":
                            owner.#selections[i].style["marginTop"] = "40px";
                            break;
                        case "left":
                        case "left-middle":
                            owner.#selections[i].style["marginLeft"] = "-40px";
                            break;
                        case "right":
                        case "right-middle":
                            owner.#selections[i].style["marginRight"] = "-40px";
                            break;
                        case "around":
                            owner.#selections[i].style.removeProperty("margin-top");
                            break;
                        case "top":
                        default:
                            owner.#selections[i].style["marginTop"] = "-40px";
                            break;
                    }
                    owner.#selections[i].style["opacity"] = '0.5';
                }
                setTimeout(() => {
                    document.body.removeChild(owner.#self_ref);
                    if (window.custom_tooltip != undefined) {
                        setTimeout(() => {
                            window.custom_tooltip.hide();
                        }, 0);
                    }
                }, 50);
                owner.#options_are_visible = false;
            }
        }
    }
    /////////////////////////////////////////////////////////////////////////
    // START BOILERPLATE METHODS
    #finalize(options) {
        const owner = this;
        if (options.onClose != undefined && typeof options.onClose === "function") {
            owner.#onClose.push(options.onClose);
        } else if (options.onClose != undefined && Array.isArray(options.onClose)) {
            for (let i = 0; i < options.onClose.length; i++) {
                if (typeof options.onClose[i] === "function") {
                    owner.#onClose.push(options.onClose[i]);
                }
            }
        }
        setTimeout(() => {
            //owner.#self_ref.style['opacity'] = 1;
            if (options.onReady != undefined) {
                options.onReady();
            }
        }, 0);
    }
    /**
     * 
     * @returns Element
     */
    elementReference() {
        return this.#self_ref;
    }
    /**
     * 
     * @param {number} timeout_ms 0 by default
     */
    async destroy(timeout_ms = 0) {
        this.triggerer?.removeEventListener("click", this.#onTriggererClick);
        setTimeout(() => {
            this.#self_ref.remove();
        }, timeout_ms);
        for (let i = 0; i < this.#onClose.length; i++) {
            setTimeout(() => {
                this.#onClose[i]();
            }, 0);
        }
    }
    static async load() {
        const tmp_div = document.createElement("div");
        const text_html_localized = Locale.localizeHTML(`${injector_html}`);
        tmp_div.innerHTML = policy.createHTML(text_html_localized);
        SpeedDial.#html_placeholder = tmp_div.firstElementChild;
    }
    // END BOILERPLATE METHODS
    /////////////////////////////////////////////////////////////////////////
}
SpeedDial.load();


/*
        //example
        new SpeedDial({
            target: target, //element add onClickEventListener
            anchor: "left",//top, bot, left, right, around
            selections: [
                {
                    onClick: (event) => {
                    },
                    hint: "more info",
                    icon_code: "e88e"
                },
                {
                    onClick: (event) => {
                    },
                    hint: "more info", //default icon
                },
                {
                    onClick: (event) => {
                    },
                    hint: "more info",
                    text: "action1" //no icon at all if ((icon || icon_code)=undefined)
                }
            ]
        });
*/