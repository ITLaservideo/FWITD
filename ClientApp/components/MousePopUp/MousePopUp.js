/*
const InterfaceOptions = {
    reusable: false,
    title: '',
    action_titles: [],
    next: []
}
*/
/**
 * @version 1.0
 * @ignore css / html
 */
class MousePopUp {
    /**
     * @type Element
     */
    #self_ref;
    my_id;
    static #html_placeholder = null; // promise initialized on import
    #onClose = [];
    /**
     * @param {Object} options
     * @param {String[]}  options.action_titles
     * @param {Function[]} options.next
     * @param {Event} options.event
     * @param {Function[]} [options.onClose]
     * @param {Function} [options.onIgnore]
     * @param {string[]} [options.svgs] file_name.svg :: from ui_2024
     * @param {boolean} [options.reusable] (await mouse_pop_up_i).onComplete();
     * @param {String} [options.title]
     * @param {Function} [options.onReady]
     * @param {Element} [options.beforeSelectionsRow] insert an element
     * @param {Element} [options.afterTitleRow] insert an element
     * @param {string} [options.afterTitleImg] specify full image src
     * @param {Object} [options.toggles]
     * @param {Bool[]} [options.toggles.statuses]
     * @param {Number} [options.style] 0 | 1 | 2 | 4
     */
    constructor(options) {
        this.#initialize(options);
    }
    async #initialize(options) {
        this.#self_ref = (MousePopUp.#html_placeholder).cloneNode(true);
        const owner = this;
        /**
         * 
         * @param {Event} event 
         */
        const func_delete_me = (event) => {
            if (event.key == "Escape") {
                try {
                    document.body.removeEventListener("keyup", func_delete_me);
                    owner.destroy();
                    event.stopPropagation();
                } catch (error) {
                }
            }
        }
        document.body.addEventListener("keyup", func_delete_me);
        if (options.title != undefined) {
            owner.#self_ref.getElementsByClassName("template-title-placeholder")[0].innerText = UiBuilder.parseHTMLToDisplay(options.title);
        } else {
            owner.#self_ref.getElementsByClassName("template-title-placeholder")[0].innerText = "";
        }
        if (options.style != undefined) {
            owner.applyStyle(options.style);
        } else {
            owner.applyStyle(0);
        }
        if (!(options.iAmAwareThereAreNoSelections == true) && options.action_titles.length > options.next.length) {
            throw new Error("next[].length inferiore alle action_titles fornite");
        }
        if (options.onClose != undefined) {
            if (Array.isArray(options.onClose)) {
                for (let i = 0; i < options.onClose.length; i++) {
                    owner.#onClose.push(options.onClose[i]);
                }
            } else if (typeof options.onClose === 'function') {
                owner.#onClose.push(options.onClose);
            }
        }
        if (options.action_titles == undefined) {
            options.action_titles = [];
        }
        for (let i = 0; i < options.action_titles.length; i++) {
            const element = owner.#self_ref.getElementsByClassName("template-selection-placeholder")[0].cloneNode(true);
            // element.innerText = options.action_titles[i];
            element.getElementsByClassName("template-text")[0].innerText = options.action_titles[i];
            if (options.prefer_next != undefined) {
                if (i == options.prefer_next) {
                    element.classList.toggle("prefer-this-action", true);
                }
            }
            if (options.override_backgrounds_color != undefined) {
                if (options.override_backgrounds_color[i] != undefined) {
                    element.style['background'] = options.override_backgrounds_color[i];
                }
            }
            element.addEventListener("click", async (event) => {
                element.classList.add("disable-pointer-events");
                const promise_new_status = options.next[i](event);
                if (options.reusable != true) {
                    owner.destroy();
                } else {
                    if (options.toggles != undefined) {
                        try {
                            const new_status_on = await (promise_new_status);
                            if (new_status_on) {
                                element.getElementsByClassName("template-toggle")[0].classList.remove("is-off");
                            } else {
                                element.getElementsByClassName("template-toggle")[0].classList.add("is-off");
                            }
                        } catch (error) { console.warn(error); }
                    }
                }
                //call this.onComplete() aka when next has finished
                //remember to await newDynamicModule
                /*else {
                    setTimeout(() => {
                        element.classList.remove("disable-pointer-events");
                    }, 500);
                }*/
            });
            if (options.svgs != undefined && options.toggles == undefined) {
                try {
                    element.innerHTML = policy.createHTML(`<img loading="lazy" src="/Icons/${UiBuilder.escapeHTML(options.svgs[i])}" onerror="this.onerror=null; this.src='/Icons/touch_app.svg';" alt="image ${UiBuilder.escapeHTML(options.svgs[i].slice(0, options.svgs[i].length - 4))}"/>${UiBuilder.escapeHTML(element.innerText)}`);
                } catch { }
            } else if (options.toggles != undefined && options.toggles.statuses != undefined) {
                setTimeout(() => {
                    if (!options.toggles.statuses[i]) {
                        element.getElementsByClassName("template-toggle")[0].classList.add("is-off");
                    }
                    element.getElementsByClassName("template-toggle")[0].classList.remove("display-none-important");
                }, 0);
                if (options.svgs != undefined) {
                    const img = document.createElement("img");
                    img.src = `/Icons/${options.svgs[i]}`;
                    img.onerror = "this.onerror=null; this.src='/Icons/touch_app.svg';"
                    img.classList.add("icon_toggle");
                    element.appendChild(img);
                    element.firstElementChild.style.paddingLeft = "60px";
                }
            } else if (options.text_svgs != undefined && options.text_svgs[i] != undefined) {
                element.insertBefore(Icons.ezIcon(options.text_svgs[i]), element.firstElementChild);
            }
            owner.#self_ref.getElementsByClassName("template-operations-container")[0].appendChild(element);
            owner.#buttons.push(element);
        }
        const main_container = owner.#self_ref.getElementsByClassName("template-mouse-pop-up-container")[0];
        if (options.event == undefined) {
            options.event = { clientX: 20, clientY: 20 };
        }
        main_container.style.left = `${options.event.clientX}px`;// + window.scrollX;
        main_container.style.top = `${options.event.clientY}px`;// + window.scrollY;
        if (options.full_screen == true) {
            main_container.style.left = `${Math.min(options.event.clientX, 50)}px`;
            main_container.style.top = `${Math.min(options.event.clientY, 50)}px`;
            main_container.style.right = `${Math.min(options.event.clientX, 50)}px`;
            main_container.style.bottom = `${Math.min(options.event.clientY, 50)}px`;
            main_container.style.margin = 'auto';
            main_container.style['justifyContent'] = 'center';
            const button_close = owner.#self_ref.getElementsByClassName("button-close")[0];
            button_close.setAttribute("style", "width: 50px;height: 50px;background: black; color: white;");
            button_close.addEventListener("click", () => {
                owner.#self_ref.autoRemove();
            });
            owner.#self_ref.getElementsByClassName("template-operations-container")[0].style['paddingLeft'] = '55px';
            owner.#self_ref.getElementsByClassName("template-operations-container")[0].style['paddingRight'] = '55px';
        }
        if (options.horizontal_buttons == true) {
            owner.#self_ref.getElementsByClassName("template-operations-container")[0].style['flexDirection'] = 'row';
        }
        owner.#self_ref.getElementsByClassName("template-operations-container")[0].firstElementChild.remove();

        if (options.ops_as_last == true) {
            main_container.appendChild(owner.#self_ref.getElementsByClassName("template-operations-container")[0]);
        }
        const title_placeholder = owner.#self_ref.getElementsByClassName("template-title-placeholder")[0];
        if (options.reusable) {
            if (options.title == undefined || options.title.trim().length == 0) {
                title_placeholder.innerText = '-   -   -   -   -';
            }
        }
        if (options.full_screen != true) {
            owner.#self_ref.getElementsByClassName("button-close")[0].style = '';
            owner.#self_ref.getElementsByClassName("button-close")[0].addEventListener("click", () => {
                owner.destroy();
            });
        }
        owner.#self_ref.autoRemove = () => {
            if (options.onIgnore != undefined) {
                options.onIgnore();
            }
            owner.destroy();
        }
        if (options.afterTitleRow != undefined) {
            owner.#self_ref.getElementsByClassName("template-content-preview-placeholder")[0].appendChild(options.afterTitleRow);
        }
        if (options.beforeSelectionsRow != undefined) {
            title_placeholder.parentElement.insertBefore(options.beforeSelectionsRow, title_placeholder.nextElementSibling);
        }
        if (options.afterTitleImg != undefined) {
            owner.#self_ref.getElementsByClassName("template-content-preview-placeholder-image")[0].src = options.afterTitleImg;
            owner.#self_ref.getElementsByClassName("template-content-preview-placeholder-image")[0].classList.add("display-flex-important");
        }
        if (options.requireToBeMovable == true) {
            if (options.title == undefined || options.title.trim().length == 0) {
                title_placeholder.innerText = '-   -   -   -   -';
            }
            //MousePopUp.#makeItMovable(title_placeholder);
        }
        setTimeout(() => {
            owner.#addEventListeners();
            if (options.allowMultipleInstances == undefined || options.allowMultipleInstances == false) {
                const other_instances = document.getElementsByClassName("template-mouse-pop-up-static");
                for (let qr = 0; qr < other_instances.length; qr++) {
                    const element = other_instances[qr];
                    setTimeout(() => {
                        if (element.autoRemove != undefined) {
                            element.autoRemove();
                        } else {
                            setTimeout(() => {
                                element.remove();
                            }, 0);
                        }
                    }, 0);
                }
            }
            document.getElementsByTagName("body")[0].appendChild(owner.#self_ref);
            owner.checkOverflow();
        }, 0);
        setTimeout(() => {
            main_container.style['opacity'] = 1;
            if (options.onReady != undefined) {
                options.onReady();
            }
        }, 0);
    }
    checkOverflow() {
        const owner = this;
        setTimeout(() => {
            UiBuilder.checkOverflow(owner.#self_ref.getElementsByClassName("template-mouse-pop-up-container")[0]);
            // MousePopUp.checkOverflow(owner.#self_ref.getElementsByClassName("template-mouse-pop-up-container")[0]);
        }, 0);
    }
    // /**
    //  * 
    //  * @param {Element} element 
    //  */
    // static checkOverflow(element) {
    //     if (element == undefined || element.parentElement == undefined) {
    //         return;
    //     }
    //     const popup = element.getElementsByClassName("template-mouse-pop-up-container")[0];
    //     if ((popup.offsetWidth + Number(popup.style.left.slice(0, -2))) > window.innerWidth) {
    //         popup.style.left = `${window.innerWidth - popup.offsetWidth - 25}px`;
    //     }
    //     if ((popup.offsetHeight + Number(popup.style.top.slice(0, -2))) > window.innerHeight) {
    //         popup.style.top = `${window.innerHeight - popup.offsetHeight - 25}px`;
    //     }
    // }
    onComplete() {
        setTimeout(() => {
            if (this.#self_ref != undefined) {
                const elements = this.#self_ref.getElementsByClassName("disable-pointer-events");
                let don_t_forget_me = [];
                for (let i = 0; i < elements.length; i++) {
                    const element = elements[i];
                    don_t_forget_me.push(element);
                    element.classList.remove("disable-pointer-events");
                }
                for (let i = 0; i < don_t_forget_me.length; i++) {
                    const element = don_t_forget_me[i];
                    element.classList.remove("disable-pointer-events");
                }
            }
        }, 50);
    }
    #addEventListeners() {
        const owner = this;
        owner.#self_ref.getElementsByClassName("template-mouse-pop-up-closer")[0].addEventListener("mousedown", () => {
            owner.#self_ref.style.display = 'none';
            if (owner.#self_ref.autoRemove != undefined) {
                owner.#self_ref.autoRemove();
            } else {
                setTimeout(() => {
                    owner.destroy();
                }, 0);
            }
        });
        owner.#self_ref.addEventListener("wheel", () => {
            owner.#self_ref.style.display = 'none';
            if (owner.#self_ref.autoRemove != undefined) {
                owner.#self_ref.autoRemove();
            } else {
                setTimeout(() => {
                    owner.destroy();
                }, 0);
            }
        });
    }
    showButtons(arr_index = undefined) {
        const owner = this;
        if (arr_index != undefined) {
            if (Array.isArray(arr_index)) {
                for (let i = 0; i < arr_index.length; i++) {
                    const index = arr_index[i];
                    owner.#changeVisibilityButton(index, true)
                }
            } else {
                owner.#changeVisibilityButton(arr_index, true)
            }
        } else {
            owner.#changeVisibilityButton(Infinity, true)
        }
    }
    hideButtons(arr_index = undefined) {
        const owner = this;
        if (arr_index != undefined) {
            if (Array.isArray(arr_index)) {
                for (let i = 0; i < arr_index.length; i++) {
                    const index = arr_index[i];
                    owner.#changeVisibilityButton(index, false)
                }
            } else {
                owner.#changeVisibilityButton(arr_index, false)
            }
        } else {
            owner.#changeVisibilityButton(Infinity, false)
        }
    }
    #buttons = [];
    #changeVisibilityButton(index = Infinity, show = true) {
        const owner = this;
        if (index != Infinity) {
            if (index < owner.#buttons.length && index >= 0) {
                owner.#buttons[index].classList.toggle("display-none-important", !show);
            }
        } else {
            for (let i = 0; i < owner.#buttons.length; i++) {
                owner.#buttons[i].classList.toggle("display-none-important", !show);
            }
        }
    }
    applyStyle(num) {
        const container = this.#self_ref.getElementsByClassName("template-mouse-pop-up-container")[0];
        container.className = "template-mouse-pop-up-container";
        try {
            const styles = MousePopUp.#styles[Number(num)].split(" ");
            for (let s = 0; s < styles.length; s++) {
                container.classList.toggle(styles[s], true);
            }
        } catch (error) {
            container.classList.toggle(MousePopUp.#styles[0], true);
        }
    }
    static #styles = {
        0: 'style-alert',
        1: '',
        2: 'info-dispenser-no-actions',
        3: 'multiple-box-selection style-alert',
        4: 'ez'
    }
    /**
     * 
     * @param {MousePopUp} owner 
     * @returns Dict<Element>
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
                console.warn("tried to destroy a MousePopUp already destroyed!");
            }
        }, timeout);
    }/**
     * 
     * @param {number} timeout_ms 0 by default
     */
    destroy(timeout_ms = 0) {
        if (this.destroyed != undefined) {
            return;
        }
        this.destroyed = true;
        if (this.#self_ref != undefined) {
            MousePopUp.#executeDestroy(this.#self_ref, timeout_ms);
        } else {
            setTimeout(() => {
                MousePopUp.#executeDestroy(this.#self_ref, timeout_ms);
            }, 1500);
        }
        for (let i = 0; i < this.#onClose.length; i++) {
            setTimeout(() => {
                this.#onClose[i]();
            }, 0);
        }
    }
    static #disablePointerEvents(target) {
        target.classList.add("disable-pointer-events");
    }
    static #enablePointerEvents(target) {
        target.classList.remove("disable-pointer-events");
    }
    /**
     * 
     * @param {Element} element 
     */
    static #makeItMovable(element) {
        (async () => {
            if (window.MovableUtil == undefined) {
                const load_time = new Date();
                const cache_id = `v=${load_time.getDate()}${load_time.getMonth() + 1}${load_time.getFullYear()}`;
                const { default: tmp } = await import(`../../../utils/move_with_mouse.min.js?${cache_id}`);
                window.MovableUtil = tmp;
            }
            window.MovableUtil.makeItMovable(element, element.parentElement);
        })()
            .catch(error => {
                // Handle/report error
                console.error(error);
            });
    }
    static load() {
        const tmp_div = document.createElement("div");
        const text_html_localized = Locale.localizeHTML(`${injector_html}`);
        tmp_div.innerHTML = policy.createHTML(text_html_localized);
        MousePopUp.#html_placeholder = tmp_div.firstElementChild;
    }
}
MousePopUp.load();