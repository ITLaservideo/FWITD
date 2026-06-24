
/**
 * @version 1.0
 */
class Insight {
    /**
     * @type Element
     */
    #self_ref;
    #main_text_element;
    #main_overlay_focus_area;
    //#main_arrow_element
    my_id;
    static #html_placeholder = null;
    #onClose = [];
    /**
     * it does not prevent overflow
     * @param {Object} options 
     * @param {Function} [options.onReady]
     * @param {Number} [options.offset]
     * @param {boolean} [options.preventDefault]
     */
    constructor(options) {
        if (options == undefined) {
            options = { not_defined: "not_defined" }
        }
        this.#initialize(options);
    }
    async #initialize(options) {
        this.#self_ref = (Insight.#html_placeholder).cloneNode(true);
        this.#main_text_element = this.#self_ref.getElementsByClassName("insight-text")[0];
        const owner = this;
        //owner.#main_arrow_element = owner.#self_ref.getElementsByClassName("jctt-arrow")[0];
        if (options.offset != undefined) {
            owner.#offset = options.offset;
        }
        //initialize
        setTimeout(() => {
            owner.#addEventListeners(options);
            document.body.appendChild(owner.#self_ref);
        }, 0);
        setTimeout(() => {
            //owner.#self_ref.style['opacity'] = 1;
            if (options.onReady != undefined) {
                options.onReady();
            }
        }, 0);
    }
    #singleShotOnClose = undefined;
    hide(force = false) {
        try {
            this.#self_ref.style['opacity'] = '';
            this.#self_ref.style['pointerEvents'] = 'none';
            const remove_all = document.getElementsByClassName("svg-overlay-focusing-area");
            const to_remove = [];
            for (let index = 0; index < remove_all.length; index++) {
                const element = remove_all[index];
                to_remove.push(element);
            }
            requestAnimationFrame(() => {
                for (let i = 0; i < to_remove.length; i++) {
                    to_remove[i].remove();
                }
            });
        } catch (error) {

        }
        this.#status.visible = false;
        if (this.#singleShotOnClose != undefined && !force) {
            this.#singleShotOnClose();
            this.#singleShotOnClose = undefined;
        }
        return true;
    }
    #status = {
        visible: false,
        /**
         * @type BottomSheet
         */
        dialog_end_tutorial_visible: undefined
    }
    /**
     * 
     * @param {Object} options 
     * @param {Element} options.target
     * @param {string} [options.text] 
     * @param {string} [options.style] 
     * @param {string} [options.style.width] 
     * @param {string} [options.style.height] 
     * @param {string} [options.anchor] left|top|right|bottom 
     * @param {Number} [options.padding]
     */
    async show(options) {
        const owner = this;
        try {
            if (options.target.tagName == undefined) {
                console.error("not provided an element to the insight");
                return;
            }
            if (options.text != undefined) {
                owner.#main_text_element.firstElementChild.innerHTML = UiBuilder.escapeHTML(options.text);
            }
            if (options.padding != undefined) {
                owner.#padding = options.padding;
            }
            //owner.#self_ref.style['borderRadius'] = options.style['borderRadius'];
            owner.setAnchor(options.anchor, options.target);
            if (options.singleShotOnClose != undefined) {
                owner.#singleShotOnClose = options.singleShotOnClose;
            }
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.classList.add("svg-overlay-focusing-area");
            svg.style = "z-index: 99999999999999999999999999;position: fixed;top: 0px;left: 0px;width: 100%;height: 100%;pointer-events: none;";
            svg.setAttribute("viewBox", `0 0 ${window.innerWidth} ${window.innerHeight}`);
            //svg.setAttribute("xmlSpace", "preserve");
            svg.setAttribute("preserveAspectRatio", "xMinYMin slice");
            //svg.setAttribute("version", "1.1");
            //svg.setAttribute("xmlnsXlink", "http://www.w3.org/1999/xlink");
            const path = document.createElementNS('http://www.w3.org/2000/svg', "path");
            const drawing_path = Insight.drawAroundTarget(options.target, owner.#padding);
            if (drawing_path == null) {
                console.warn("the target is not in the dom");
                return;
            }
            path.setAttribute("d", drawing_path);
            path.setAttribute('style', 'fill: #0000004a');
            svg.appendChild(path);
            requestAnimationFrame(() => {
                document.body.appendChild(svg);
                document.body.appendChild(owner.#self_ref);
                owner.#self_ref.style['opacity'] = '1';
                owner.#self_ref.style['pointerEvents'] = '';
                this.#status.visible = true;
            });
        } catch (error) { console.warn(error) }
    }
    #padding = 4;
    #anchor = 'top';
    #offset = 10;
    /**
     * 
     * @param {string} anchor left|top|right|bottom 
     */
    async setAnchor(anchor, target) {
        const owner = this;
        setTimeout(() => {
            owner.#main_text_element.className = "insight-text";
            //owner.#main_arrow_element.className = 'jctt-arrow';
            const target_pos = target.getBoundingClientRect();
            switch (anchor) {
                case "left":
                    owner.#main_text_element.classList.toggle("isgt-left", true);
                    owner.#anchor = 'left';
                    owner.#self_ref.style['height'] = `${target.offsetHeight}px`;
                    owner.#self_ref.style['width'] = 0;
                    owner.#self_ref.style.left = `${target_pos.left - owner.#padding + window.scrollX}px`;
                    owner.#self_ref.style.top = `${target_pos.top + window.scrollY}px`;
                    break;
                case "top":
                default:
                    owner.#main_text_element.classList.toggle("isgt-top", true);
                    owner.#anchor = 'top';
                    owner.#self_ref.style['height'] = 0;
                    owner.#self_ref.style['width'] = `${target.offsetWidth}px`;
                    owner.#self_ref.style.left = `${target_pos.left + window.scrollX}px`;
                    owner.#self_ref.style.top = `${target_pos.top - owner.#padding + window.scrollY}px`;
                    break;
                case "right":
                    owner.#main_text_element.classList.toggle("isgt-right", true);
                    owner.#anchor = 'right';
                    owner.#self_ref.style['height'] = `${target.offsetHeight}px`;
                    owner.#self_ref.style['width'] = 0;
                    owner.#self_ref.style.top = `${target_pos.top + window.scrollY}px`;
                    owner.#self_ref.style['left'] = `${owner.#padding + target_pos.right + window.scrollX}px`;
                    break;
                case "bottom":
                    owner.#main_text_element.classList.toggle("isgt-bottom", true);
                    owner.#anchor = 'bottom';
                    owner.#self_ref.style['height'] = 0;
                    owner.#self_ref.style['width'] = `${target.offsetWidth}px`;
                    owner.#self_ref.style.left = `${target_pos.left + window.scrollX}px`;
                    owner.#self_ref.style['top'] = `${target_pos.bottom + owner.#padding + window.scrollY}px`;
                    break;
            }
        }, 0);
    }
    /**
     * 
     * @param {Number} theme_n 
     */
    setTheme(theme_n) {
        const owner = this;
        owner.#self_ref.className = 'jctt-Insight-template';
        if (Insight.#styles[theme_n] != undefined) {
            return owner.#self_ref.classList.toggle(Insight.#styles[theme_n]);
        } else {
            return false;
        }
    }
    static #styles = {
        0: ''
    }
    static drawAroundTarget(target, padding = 4) {
        const target_pos = target.getBoundingClientRect();
        console.warn(target_pos)
        const x1 = target_pos.left - padding;
        const y1 = target_pos.top - padding;
        const width = target.offsetWidth + 2 * padding;
        const height = target.offsetHeight + 2 * padding;
        const cornerRadius = 4;
        const pathData = [
            `M${window.innerWidth},0L0,0L0,${window.innerHeight}L${window.innerWidth},${window.innerHeight}L${window.innerWidth},0Z`,
            `M${x1},${y1}`,
            `h${width - cornerRadius}`,
            `a${cornerRadius},${cornerRadius} 0 0 1 ${cornerRadius},${cornerRadius}`,
            `v${height - 2 * cornerRadius}`,
            `a${cornerRadius},${cornerRadius} 0 0 1 -${cornerRadius},${cornerRadius}`,
            `h-${width - 2 * cornerRadius}`,
            `a${cornerRadius},${cornerRadius} 0 0 1 -${cornerRadius},-${cornerRadius}`,
            `v-${height - 2 * cornerRadius}`,
            `a${cornerRadius},${cornerRadius} 0 0 1 ${cornerRadius},-${cornerRadius}`,
            `z`
        ].join(' ');
        return pathData;
    }
    #addEventListeners(options) {
        const owner = this;
        if (options.preventDefault == true) {
            return;
        }
        document.body.addEventListener("click", (event) => {//default hide
            console.warn(event.target);
            /**
             * @type Element
             */
            const the_target = event.target;
            if (the_target == undefined || owner.#status.dialog_end_tutorial_visible != undefined) {
                return;
            }
            if (the_target == owner.#self_ref || the_target.parentElement == owner.#self_ref || the_target.parentElement?.parentElement == owner.#self_ref) {
                owner.hide();
            } else {
                if (owner.#status.visible && owner.#status.dialog_end_tutorial_visible == undefined) {
                    owner.#status.dialog_end_tutorial_visible = UiBuilder.mockDialog({
                        text1: `${Locale.at("exit tutorial")}`,
                        onConfirm: () => {
                            console.warn("onConfirm");
                            setTimeout(() => {
                                owner.#status.dialog_end_tutorial_visible = undefined;
                                owner.hide(true);
                            }, 0);
                        },
                        onDeny: () => {
                            console.warn("onDeny");
                            setTimeout(() => {
                                owner.#status.dialog_end_tutorial_visible = undefined;
                            }, 0);
                        },
                        onClose: () => {
                            console.warn("onClose");
                            setTimeout(() => {
                                owner.#status.dialog_end_tutorial_visible = undefined;
                            }, 0);
                        },
                        prefer_selection: 0
                    });
                }
            }
        });
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
                console.warn("tried to destroy a Insight already destroyed!");
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
            Insight.#executeDestroy(this.#self_ref, timeout_ms);
        } else {
            setTimeout(() => {
                Insight.#executeDestroy(this.#self_ref, timeout_ms);
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
        const text_html_localized = Locale.localizeHTML(`${injector_html}`);
        tmp_div.innerHTML = policy.createHTML(text_html_localized);
        Insight.#html_placeholder = tmp_div.firstElementChild;
    }
    static getInstance() {
        /**
         * @type Insight
         */
        let insight = window.insight_component;
        if (insight == undefined) {
            insight = new Insight();
            window.insight_component = insight;
        }
        return insight;
    }
}
Insight.load();
window.insight_component = new Insight();