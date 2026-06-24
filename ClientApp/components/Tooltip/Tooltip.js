/**
 * @version 1.0
 */
class Tooltip {
    /**
     * @type Element
     */
    #self_ref;
    #main_text_element;
    //#main_arrow_element
    my_id;
    static #html_placeholder = null;
    #onClose = [];
    /**
     * it does prevent overflow
     * @param {Object} options 
     * @param {Function} [options.onReady]
     * @param {Number} [options.offset]
     */
    constructor(options) {
        if (options == undefined) {
            options = { not_defined: "not_defined" }
        }
        this.#initialize(options);
    }
    async #initialize(options) {
        this.#self_ref = (Tooltip.#html_placeholder).cloneNode(true);
        this.#main_text_element = this.#self_ref.getElementsByClassName("jctt-text")[0];
        const owner = this;
        //owner.#main_arrow_element = owner.#self_ref.getElementsByClassName("jctt-arrow")[0];
        if (options.offset != undefined) {
            owner.#offset = options.offset;
        }
        //initialize
        setTimeout(() => {
            owner.#self_ref.style['opacity'] = 0;
            owner.#addEventListeners(options);
            document.body.appendChild(owner.#self_ref);
        }, 0);
        setTimeout(() => {
            if (options.onReady != undefined) {
                options.onReady();
            }
        }, 0);
    }
    hide() {
        try {
            this.#self_ref.style['opacity'] = '';
            this.#self_ref.style['top'] = '0px';
        } catch (error) { }
    }
    /**
     * 
     * @param {Object} options 
     * @param {string} [options.text] 
     * @param {Function<Element>} [options.live_element] 
     * @param {Event} [options.event]
     * @param {string} [options.anchor] left|top|right|bottom 
     */
    show(options) {
        try {
            const owner = this;
            if (options.text != undefined && options.text.trim() != '') {
                if (options.text.length > 500) {
                    owner.#main_text_element.innerHTML = UiBuilder.parseHTMLToDisplay(`${options.text.substring(0, 500)}...`);
                } else {
                    owner.#main_text_element.innerHTML = UiBuilder.parseHTMLToDisplay(options.text);
                }
            } else {
                if (options.live_element != undefined) {
                    owner.#main_text_element.innerText = '';
                    owner.#main_text_element.appendChild(options.live_element());
                } else {
                    return;
                }
            }
            if (options.anchor != undefined) {
                owner.setAnchor(options.anchor);
            } else {
                owner.setAnchor("top");
            }
            if (options.offset != undefined) {
                owner.#offset = options.offset;
            } else {
                owner.#offset = 10;
            }
            if (options.event != undefined) {
                const target_pos = options.event.target.getBoundingClientRect();
                /*owner.#self_ref.style.left = options.event.clientX + window.scrollX;
                owner.#self_ref.style.top = options.event.clientY + window.scrollY;*/
                let tmp_top, tmp_left;
                switch (owner.#anchor) {
                    case "left":
                        tmp_top = Math.min(Math.max(target_pos.top + options.event.target.clientHeight / 2 - owner.#self_ref.clientHeight / 2 + window.scrollY, 5), window.innerHeight + window.scrollY - owner.#self_ref.clientHeight);
                        tmp_left = Math.min(Math.max(target_pos.left - owner.#self_ref.clientWidth - owner.#offset + window.scrollX, 5), window.innerWidth - owner.#self_ref.clientWidth - 30);
                        break;
                    case "top":
                    default:
                        tmp_top = Math.min(Math.max(target_pos.top - owner.#self_ref.clientHeight - owner.#offset + window.scrollY, 5), window.innerHeight + window.scrollY - owner.#self_ref.clientHeight);
                        tmp_left = Math.min(Math.max(target_pos.left + options.event.target.clientWidth / 2 - owner.#self_ref.clientWidth / 2 + window.scrollX, 5), window.innerWidth - owner.#self_ref.clientWidth - 30);
                        // owner.#self_ref.style.left = target_pos.left - owner.#self_ref.clientWidth;
                        break;
                    case "right":
                        tmp_top = Math.min(Math.max(target_pos.top + options.event.target.clientHeight / 2 - owner.#self_ref.clientHeight / 2 + window.scrollY, 5), window.innerHeight + window.scrollY - owner.#self_ref.clientHeight);
                        tmp_left = Math.min(Math.max(target_pos.left + options.event.target.clientWidth + owner.#offset + window.scrollX, 5), window.innerWidth - owner.#self_ref.clientWidth - 30);
                        break;
                    case "bottom":
                        tmp_top = Math.min(Math.max(target_pos.top + options.event.target.clientHeight + owner.#offset + window.scrollY, 5), window.innerHeight + window.scrollY - owner.#self_ref.clientHeight);
                        tmp_left = Math.max(target_pos.left + options.event.target.clientWidth / 2 - owner.#self_ref.clientWidth / 2 + window.scrollX, 5);
                        break;
                }
                owner.#self_ref.style.top = `${tmp_top}px`;
                owner.#self_ref.style.left = `${tmp_left}px`;
            }
            owner.#self_ref.style['opacity'] = '1';
            document.body.appendChild(owner.#self_ref);
        } catch (error) { }
    }
    #anchor = 'top';
    #offset = 10;
    /**
     * 
     * @param {string} anchor left|top|right|bottom 
     */
    setAnchor(anchor) {
        const owner = this;
        switch (anchor) {
            case "left":
                owner.#anchor = 'left';
                break;
            case "top":
            default:
                owner.#anchor = 'top';
                break;
            case "right":
                owner.#anchor = 'right';
                break;
            case "bottom":
            case "bot":
                owner.#anchor = 'bottom';
                break;
        }
    }
    /**
     * 
     * @param {Number} theme_n 
     */
    setTheme(theme_n) {
        const owner = this;
        owner.#self_ref.className = 'jctt-tooltip-template';
        if (Tooltip.#styles[theme_n] != undefined) {
            return owner.#self_ref.classList.toggle(Tooltip.#styles[theme_n]);
        } else {
            return false;
        }
    }
    static #styles = {
        0: ''
    }
    isVisible() {
        return this.#self_ref.style['opacity'] == 1;
    }
    #addEventListeners(options) {
        const owner = this;
        //event listeners
    }
    onComplete() {
        setTimeout(() => {
            if (this.#self_ref != undefined) {
                const elements = this.#self_ref.getElementsByClassName("disable-pointer-events");
                const don_t_forget_me = [];
                for (let i = 0; i < elements.length; i++) {
                    const element = elements[i];
                    don_t_forget_me.push(element);
                }
                for (let i = 0; i < don_t_forget_me.length; i++) {
                    don_t_forget_me[i].classList.remove("disable-pointer-events");
                }
            }
        }, 100);
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
     * @param {Node} clone 
     * @param {Number} timeout ms
     */
    static #executeDestroy(clone, timeout) {
        setTimeout(() => {
            if (clone != null) {
                clone.classList.add("unpop-from-below");
                setTimeout(() => {
                    clone.remove();
                }, timeout);
            } else {
                console.warn("tried to destroy a ToolTip already destroyed!");
            }
        }, timeout);
    }/**
     * 
     * @param {number} timeout_ms 0 by default
     */
    async destroy(timeout_ms = 0) {
        if (this.destroyed != undefined) {
            return;
        }
        this.destroyed = true;
        if (this.#self_ref != undefined) {
            Tooltip.#executeDestroy(this.#self_ref, timeout_ms);
        } else {
            setTimeout(() => {
                Tooltip.#executeDestroy(this.#self_ref, timeout_ms);
            }, 1500);
        }
        for (let i = 0; i < this.#onClose.length; i++) {
            setTimeout(() => {
                this.#onClose[i]();
            }, 0);
        }
    }
    static async load() {
        const tmp_div = document.createElement("div");
        tmp_div.innerHTML = policy.createHTML(`${injector_html}`);
        Tooltip.#html_placeholder = tmp_div.firstElementChild;
        document.body.addEventListener("touchend", (event) => {
            if (window.custom_tooltip != undefined) {
                window.custom_tooltip.hide();
            }
        }, true);// Capturing phase
        document.body.addEventListener("touchstart", (event) => {
            if (window.custom_tooltip != undefined) {
                window.custom_tooltip.hide();
            }
        }, true);// Capturing phase
        document.body.addEventListener("mousedown", (event) => {
            if (window.custom_tooltip != undefined) {
                window.custom_tooltip.hide();
            }
        }, true);// Capturing phase
        setTimeout(() => {
            window.custom_tooltip = new Tooltip();
        }, 0);
    }
}
Tooltip.load();