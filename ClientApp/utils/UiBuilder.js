class UiBuilder {
    /**
     * Displays a transient toast notification anchored near the cursor (or centered if no event).
     * The notification removes itself after `timeout` ms. Clicking it closes it early and shows
     * a brief "calm down" follow-up unless the message is already that follow-up.
     *
     * @param {string} what - Text to display inside the notification.
     * @param {MouseEvent|null} [event=null] - Mouse event used to position the toast near the cursor.
     *   Pass `null` to center it on screen.
     * @param {number} [timeout=1800] - How long (ms) before the notification auto-dismisses.
     */
    static Notify(what, event = null, timeout = 1800) {
        const el = document.createElement("div");
        el.className = "the-notifica";
        const x = (event != null && event.clientX != null) ? (event.clientX) : (window.innerWidth / 2 - 150);
        const y = (event != null && event.clientY != null) ? (event.clientY) : (window.innerHeight / 2 - 50);
        setTimeout(() => {
            el.style.setProperty('left', `${Math.min(window.innerWidth - (el.clientWidth - 20), Math.max(20, x - (el.clientWidth / 2)))}px`);
            el.style.setProperty('top', `${Math.min(window.innerHeight - (el.clientHeight - 20), (Math.max(20, y - 40)))}px`);
            el.style.opacity = "1";
        }, 0);
        const close_on_click = (sevent) => {
            el.remove();
            el.removeEventListener("click", close_on_click);
            if (what != "oo stai calmo che mi stavo chiudendo da solo") {
                UiBuilder.Notify("oo stai calmo che mi stavo chiudendo da solo", sevent, 3000);
            }
        }
        setTimeout(() => {
            el.remove();
            el.removeEventListener("click", close_on_click);
        }, timeout);
        el.innerText = what;
        el.addEventListener("click", close_on_click);
        document.body.appendChild(el);
    }
    static wait100ms = (extra_ms = 100) => {
        return new Promise(resolve => {
            setTimeout(resolve, extra_ms); // small delay before continuing
        });
    }
    /**
     * 
     * @param {Object} options 
     * @param {Object} options.innertext 
     * @param {string} options.innertext.on 
     * @param {string} options.innertext.off 
     * @param {Function} options.setIsOn
     * @param {Function} options.onClick
     * @param {bool} [options.isOn] false
     * @param {string} [options.label]
     * @param {string} [options.theme] "mini"
     * 
     * @returns Element
     */
    static createToggle(options) {
        let outer_container;
        const container = document.createElement("div");
        outer_container = container;
        container.classList.add("the-switch-container");
        switch (options.theme) {
            case "mini":
                container.classList.add("the-mini-switch");
                break;
            case "xxl":
                container.classList.add("the-xxl-switch");
                break;
            default:
                break;
        }
        const circle = document.createElement("div");
        circle.classList.add("the-switch-circle");
        if (options.innerCircleIcon != undefined) {
            const img = document.createElement("img");
            img.src = `/Images/Icone2024/ui_2024/${options.innerCircleIcon}`;
            img.style = `width: 19px;position: absolute;left: 0;top: 0;bottom: 0;right: 0;margin: auto;`;
            circle.appendChild(img);
        }
        const text = document.createElement("div");
        text.classList.add("the-switch-text");
        container.appendChild(circle);
        container.appendChild(text);
        const setIsOn = (is_on = false) => {
            container.classList.toggle("the-switch-is-on", is_on);
            text.innerText = is_on ? options.innerText.on : options.innerText.off;
        };
        setIsOn(options.isOn);
        options.setIsOn = setIsOn;
        if (options.label != undefined) {
            const wrap = document.createElement("div");
            wrap.classList.add("whole-switch-container");
            const label = document.createElement("div");
            label.classList.add("tsc-label");
            wrap.appendChild(label);
            wrap.appendChild(container);
            label.innerText = options.label;
            wrap.addEventListener("click", (event) => {
                options.onClick(event);
            });
            outer_container = wrap;
        } else {
            container.addEventListener("click", (event) => {
                options.onClick(event);
            });
        }
        if (options.hint != undefined) {
            UiBuilder.addHint({
                hint: options.hint,
                target: outer_container,
                anchor: "top"
            });
        }
        return outer_container;
    }
    static destroyAnyInstancesOfModals() {
        const open_modals = document.querySelectorAll(`[id="template-modal-placeholder"]`);
        const ops = [];
        for (let i = 0; i < open_modals.length; i++) {
            const element = open_modals[i];
            ops.push(() => {
                element.self_ref.destroy();
            });
        }
        requestAnimationFrame(() => {
            for (let i = 0; i < ops.length; i++) {
                ops[i]();
            }
        })
    }
    static validateQuantityInput = (str) => {
        str = str.replaceAll(",", ".");
        const index_dot = str.indexOf(".");
        if (index_dot >= 0) {
            str = str.slice(0, index_dot);
        }
        if (str.length > 4) {
            if (str[0] == 0) {
                str = str.slice(1, 5);
            } else {
                str = str.slice(0, 4);
            }
        }
        let num = Number(str);
        if (isNaN(str)) {
            num = 0;
        }
        return num;
    }
    static used_set_array_ids_seeds = [];
    static newSetArrayOfIds(size, salt = 'ui-builder-ids') {
        if (size < 0) {
            throw new Error("index out of bounds");
        }
        const res = new Set();
        let new_seed = `${salt}-${Math.random()}`.replace(".", "+");
        while (UiBuilder.used_set_array_ids_seeds.indexOf(new_seed) >= 0 || document.getElementById(`${new_seed}@0`) != undefined) {
            new_seed = `${salt}-${Math.random()}`.replace(".", "+");
        }
        UiBuilder.used_set_array_ids_seeds.push(new_seed);
        let i = 0;
        while (res.size <= size) {
            res.add(`${new_seed}@${i}`);
            i++;
        }
        const arr_res = Array.from(res);
        res.clear();
        return arr_res;
    }
    static getSvgAttributeId() {
        const tmp = Math.random();
        const exist = document.querySelector(`[svgs_group_attribute="${tmp}"]`);
        if (exist != undefined) {
            return UiBuilder.getSvgAttributeId();
        } else {
            return tmp;
        }
    }
    static used_attribute_ids = [];
    static newAttributeId(tag) {
        const tmp = Math.random();
        const exist = document.querySelector(`[${tag}="${tmp}"]`);
        if (exist != undefined) {
            return UiBuilder.newAttributeId(tag);
        } else {
            if (UiBuilder.used_attribute_ids.indexOf(tmp) >= 0) {
                return UiBuilder.newAttributeId(tag);
            }
            UiBuilder.used_attribute_ids.push(tmp);
            return tmp;
        }
    }
    static used_ids = [];
    static newId(tag) {
        const tmp = `${Math.random()}`.replace(".", "_");
        const new_id = `${tag}_${tmp}`;
        const exist = document.getElementById(new_id);
        if (exist != undefined) {
            return UiBuilder.newAttributeId(tag);
        } else {
            if (UiBuilder.used_ids.indexOf(new_id) >= 0) {
                return UiBuilder.newAttributeId(tag);
            }
            UiBuilder.used_ids.push(new_id);
            return new_id;
        }
    }
    static escapeHTML(str) {
        return str.replace(/&(?!#34;|#38;|#39;|#60;|#62;|#10;|#13;|amp;)/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    static escapeXmlCharacters(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    }
    static parseHTMLToDisplay(str = "- - -", trust_on_error = false) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(str, "text/html");
        const plainText = doc.body.textContent;
        if (trust_on_error && `${plainText}`.trim().length == 0) {
            return str;
        }
        return plainText;
    }
    /**
     * 
     * @param {Element} element 
     */
    static checkOverflow(element) {
        setTimeout(() => {
            if (element == undefined || element.parentElement == undefined) {
                return;
            }
            const popup = element;
            if ((popup.offsetWidth + Number(popup.style.left.slice(0, -2))) > window.innerWidth) {
                const left = Math.max((window.innerWidth - popup.offsetWidth - 15), 1);
                popup.style.left = `${left}px`;
            }
            if ((popup.offsetHeight + Number(popup.style.top.slice(0, -2))) > window.innerHeight) {
                const top = Math.max((window.innerHeight - popup.offsetHeight - 15), 1);
                popup.style.top = `${top}px`;
            }
            setTimeout(() => {
                if (Number(popup.style.left.slice(0, -2)) < 0) {
                    popup.style.left = '1px';
                }
                if (Number(popup.style.top.slice(0, -2)) < 0) {
                    popup.style.top = '1px';
                }
            }, 0);
        }, 0);
    }
    /**
     * 
     * @param {Object} options 
     * @param {string} options.hint
     * @param {Element} options.target 
     * @param {Function} [options.conditionsMet]
     * @param {string} options.anchor top|left|right|bottom 
     */
    static addHint(options) {
        const target = options.target;
        const hint = options.hint ?? options.text;
        /*
        if (debug) {
            target.setAttribute("hint-present", options.anchor);
            // target.setAttribute("the-hint-present", hint);
        }
        */
        target['hint_builder_options'] = options;
        console.assert(target != undefined, "can't add hint to empty");
        if (hint != undefined) {
            target.addEventListener("mouseenter", (event) => {
                console.warn("mouseenter")
                if (options.conditionsMet != undefined) {
                    if (!options.conditionsMet()) {
                        return;
                    }
                }
                if (event.buttons == 0) {
                    if (window.custom_tooltip != undefined) {
                        window.custom_tooltip.show({ text: options.hint ?? hint, event: event, anchor: options.anchor });
                    }
                }
            });
            target.addEventListener("touchend", (event) => {
                if (options.conditionsMet != undefined) {
                    if (!options.conditionsMet()) {
                        return;
                    }
                }
                if (window.custom_tooltip != undefined) {
                    window.custom_tooltip.show({ text: options.hint ?? hint, event: event, anchor: options.anchor });
                }
            }, false);// Bubbling phase
            target.addEventListener("mouseup", (event) => {
                if (options.conditionsMet != undefined) {
                    if (!options.conditionsMet()) {
                        return;
                    }
                }
                if (window.custom_tooltip != undefined) {
                    window.custom_tooltip.show({ text: options.hint ?? hint, event: event, anchor: options.anchor });
                }
            }, false);// Bubbling phase
            target.addEventListener("mouseleave", () => {
                if (window.custom_tooltip != undefined) {
                    window.custom_tooltip.hide();
                }
            });
        }
    }
    /**
     * @param {Object} options 
     * @param {Function} options.onClick
     * @param {Function} [options.onRightClick]
     * @param {bool} [options.not_indexable]
     * @param {string} [options.hint]
     * @param {string} [options.icon] - Must be specified if `options.title` is undefined
     * @param {string} [options.icon_code] - Must be specified if `options.title` is undefined
     * @param {string} [options.title] - Must be specified if `options.icon` is undefined
     * @param {string} [options.class]
     * @param {string} [options.style] text
     * @param {string} [options.automationID] `automation-id` attribute
     * @param {number} [options.theme] null | 1
     * @param  {boolean} [options.auto_disable_on_click] if true, the button will be automatically disabled (by adding a "clicked" class) when clicked, and re-enabled after 1 second. Default is false.
     * @returns {Element}
     * @throws {Error} If both `options.title` and `options.icon` are undefined, or if neither `options.onClick` nor `options.onRightClick` are provided
     */
    static createButton(options) {
        const tmp = document.createElement("div");
        switch (options.theme) {
            case 2:
                tmp.classList.add("btn-wrapper");
                tmp.classList.add("shiny");
                break;
            case 1:
                tmp.classList.add("btn-wrapper");
                break;
            default:
                tmp.classList.add("twj-button");
                break;
        }
        //tmp.style = 'position:relative;'
        if (options.onClick != undefined || options.onRightClick != undefined) {
            tmp.addEventListener("mouseup", (event) => {
                if (event.button == 0 && options.onClick != undefined) {
                    if (options.auto_disable_on_click == true) {
                        tmp.classList.toggle("clicked", true);
                        setTimeout(() => {
                            tmp.classList.toggle("clicked", false);
                        }, 1000);
                    }
                    options.onClick(event);
                } else if (event.button == 2 && options.onRightClick != undefined) {
                    options.onRightClick(event);
                }
            });
            if (options.onClick != undefined) {
                tmp.onClick = () => { options.onClick(); };
            }
            tmp.reset = () => {
                tmp.classList.toggle("clicked", false);
            }
        } else {
            throw new Error("button can't be without a click event listener");
        }
        if (options.onRightClick != undefined) {
            tmp.addEventListener("contextmenu", (event) => {
                event.preventDefault();
                options.onRightClick(event);
            });
        }
        if (options.not_indexable != true) {
            tmp.setAttribute("tabindex", "0");
        }
        if (options.automationID != undefined) {
            tmp.setAttribute("automation-id", options.automationID)
        }
        if (options.title != undefined) {
            switch (options.theme) {
                case 2:
                case 1:
                    const tmp_container_title = document.createElement("div");
                    tmp_container_title.innerText = options.title;
                    tmp_container_title.classList.toggle("text", true);
                    tmp.prepend(tmp_container_title);
                    break;
                default:
                    tmp.innerText = options.title;
                    break;
            }
        }
        if (options.class != undefined) {
            tmp.classList.add(options.class);
        }
        if (options.style != undefined) {
            tmp.style = options.style;
        }
        if (options.icon != undefined) {
            const icon = document.createElement("img");
            icon.setAttribute("draggable", "false");
            icon.setAttribute("loading", "lazy");
            Icons.setSrcIcon(icon, options.icon);
            icon.onerror = () => {
                icon.onerror = undefined;
                icon.src = `${options.icon}`;
            }
            switch (options.theme) {
                case 2:
                case 1:
                    const tmp_container = document.createElement("div");
                    tmp_container.appendChild(icon);
                    tmp_container.classList.toggle("icon", true);
                    tmp.prepend(tmp_container);
                    break;
                default:
                    tmp.prepend(icon);
                    break;
            }
        } else if (options.icon_code != undefined) {
            tmp.classList.toggle("reversed");
            tmp.appendChild(Icons.create(options.icon_code));
        }
        if (options.icon == undefined && options.title == undefined && options.icon_code == undefined) {
            throw new Error("button can't be without a .title or an .icon");
        }
        if (options.hint != undefined) {
            if (options.target == undefined) {
                options.target = tmp;
                UiBuilder.addHint(options);//live hint
            } else {
                UiBuilder.addHint({
                    hint: options.hint,
                    target: tmp
                });
            }
        }
        tmp.self_ref = tmp;
        return tmp;
    }
    /**
     * 
     * @param {Object} options 
     * @param {Function} options.next 
     * @param {String} options.title 
     * @param {String} options.title_cancel
     * @param {String} options.title_confirm
     */
    static createSimpleTextInput(options) {
        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily: `'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif`
        });
        const modalContainer = document.createElement('div');
        Object.assign(modalContainer.style, {
            backgroundColor: '#fff',
            padding: '10px',
            paddingBottom: '0',
            paddingTop: '4px',
            borderRadius: '4px',
            maxWidth: '400px',
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column'
        });
        const title = document.createElement("div");
        title.innerText = options.title;
        title.style.paddingBottom = '4px';
        modalContainer.appendChild(title);
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = options.placeholder ?? '';
        input.addEventListener("keyup", (event) => {
            if (event.key == "Enter") {
                setTimeout(() => {
                    const mouseUpEvent = new MouseEvent('mouseup', {
                        bubbles: true,
                        cancelable: true,
                        button: 0
                    });
                    confirmButton.dispatchEvent(mouseUpEvent);
                }, 0);
            }
        });
        Object.assign(input.style, {
            width: '100%',
            padding: '4px',
            marginBottom: '4px',
            boxSizing: 'border-box',
        });
        const buttonsContainer = document.createElement('div');
        Object.assign(buttonsContainer.style, {
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
        });
        const cancelButton = UiBuilder.createButton({
            onClick: () => {
                container.remove();
                if (typeof options.onCancel === 'function') {
                    options.onCancel();
                }
            },
            title: options.title_cancel,
        });
        cancelButton.style.minWidth = '80px';
        const confirmButton = UiBuilder.createButton({
            onClick: () => {
                const value = input.value;
                container.remove();
                if (typeof options.next === 'function') {
                    options.next(value);
                }
            },
            title: options.title_confirm
        });
        confirmButton.style.minWidth = '80px';
        buttonsContainer.appendChild(cancelButton);
        buttonsContainer.appendChild(confirmButton);
        modalContainer.appendChild(input);
        modalContainer.appendChild(buttonsContainer);
        container.appendChild(modalContainer);
        document.body.appendChild(container);
        container.focus = () => {
            setTimeout(() => {
                input.focus();
            }, 0);
        }
        return container;
    }
    static cache_id = '1';

    static REGEX_NUMBERS_SEQUENCE = /[0-9]+/;
    static parseNumbersAnySeparator(list) {
        const regex = new RegExp(UiBuilder.REGEX_NUMBERS_SEQUENCE, 'g');
        const matches = list.match(regex);
        if (!matches) return null;

        const values = [];
        try {
            matches.forEach((match) => {
                values.push(parseInt(match, 10));
            });
        } catch (e) {
            return null;
        }
        return values.length < 1 ? null : values;
    }
    static capitalize(val) {
        return String(val).charAt(0).toUpperCase() + String(val).slice(1);
    }
    static createDropDownButtonSelector({ titles, next, onSelectionChange, label, direction_open = 'top', stealth = true, max_selections_height = '210px' }) {
        const container = document.createElement("div");
        container.className = "custom-dropdown-container";
        const arrow_down = document.createElement("img");
        Icons.setSrcIcon(arrow_down, "/keyboard_arrow_left.svg");
        arrow_down.className = "cdc-arrow-open";
        container.appendChild(arrow_down);

        // if (label) {
        //     const lb = document.createElement("label");
        //     lb.textContent = label;
        //     lb.className = "custom-dropdown-label";
        //     container.appendChild(lb);
        // }

        const dropdown = document.createElement("div");
        dropdown.className = "custom-dropdown";

        const selected = document.createElement("div");
        selected.className = "custom-dropdown-selected";
        const tmp_first = `${label ?? ''} ${titles[0]}`.trim();
        selected.textContent = `${tmp_first}`;
        if (!stealth) {
            selected.classList.add("cddown-selected-not-stealth");
        }

        const optionsList = document.createElement("div");
        optionsList.className = "custom-dropdown-options hidden";
        optionsList.style.maxHeight = max_selections_height;
        optionsList.classList.add(direction_open);
        titles.forEach((title, index) => {
            const option = document.createElement("div");
            option.className = "custom-dropdown-option";
            option.textContent = title;

            option.addEventListener("click", () => {
                const content_selected = (`${label ?? ''} ${title}`.trim());
                selected.textContent = `${content_selected}`;
                optionsList.classList.add("hidden");

                if (next && typeof next[index] === "function") {
                    next[index]();
                }

                if (typeof onSelectionChange === "function") {
                    onSelectionChange(index);
                }
            });

            optionsList.appendChild(option);
        });

        selected.addEventListener("click", () => {
            setTimeout(() => {
                if (optionsList.classList.toggle("hidden")) {
                    selected.classList.toggle(`dd-visible-${direction_open}`, false);
                } else {
                    selected.classList.toggle(`dd-visible-${direction_open}`, true);
                }
            }, 0);
        });

        dropdown.appendChild(selected);
        dropdown.appendChild(optionsList);
        container.appendChild(dropdown);

        // Close dropdown if clicked outside
        document.addEventListener("click", (e) => {
            if (!container.contains(e.target)) {
                optionsList.classList.add("hidden");
                selected.classList.toggle(`dd-visible-${direction_open}`, false);
            }
        });

        return container;
    }
    /**
    * Creates a custom dropdown component that supports multiple selections,
    * optional chained selection behavior, and callbacks for selection changes.
    * @param {Object} options
    * @param {Array<string>} options.titles
    *        List of option labels displayed in the dropdown.
    * @param {Array<Function>} [options.next]
    *        Optional array of callbacks, one per option. If provided,
    *        `next[i]()` is executed whenever option `i` changes state.
    * @param {boolean} [options.chained_selection=false]
    *        If true, selecting an item automatically selects all items between
    *        the first and last selected indices (range selection).
    * @param {string} [options.default_title='select']
    *        Placeholder text shown when no items or multiple items are selected.
    * @param {Function} [options.onSelectionStatusChange]
    *        Callback invoked whenever the selection state changes.
    *        Receives the `self_aware` object:
    *        {
    *          is_selected: boolean[],
    *          titles: string[],
    *          options: HTMLElement[],
    *          checkboxes: HTMLInputElement[]
    *        }
    * @param {'top'|'bottom'} [options.direction_open='top']
    *        Controls where the dropdown expands relative to the selected element.
    * @param {boolean} [options.stealth=true]
    *        If false, applies a visible style to the selected element.
    * @param {string} [options.max_selections_height='210px']
    *        Maximum height of the dropdown list before scrolling.
    * @returns {HTMLDivElement}
    *        A DOM element containing the fully interactive dropdown component.
    */
    static createDropDownMultipleSelections(
        {
            chained_selection = false,
            default_title = 'select',
            titles,
            next,
            onSelectionStatusChange,
            direction_open = 'top',
            stealth = true,
            max_selections_height = '210px',
            omit_rendering = false,
            onConfirm = undefined
        }
    ) {
        const container = document.createElement("div");
        container.className = "custom-dropdown-container";
        const arrow_down = document.createElement("img");
        Icons.setSrcIcon(arrow_down, "/keyboard_arrow_left.svg");
        arrow_down.className = "cdc-arrow-open";
        if (chained_selection) {
            // arrow_down.classList.add("twj-button");
        }
        container.appendChild(arrow_down);
        const dropdown = document.createElement("div");
        dropdown.className = "custom-dropdown";
        const selected = document.createElement("div");
        selected.className = "custom-dropdown-selected";
        const self_aware = {
            is_selected: [],
            titles: [],
            /**
             * @type Array<Element>
             */
            options: [],
            /**
             * @type Array<Element>
             */
            checkboxes: [],
            /**
             * @type HTMLElemetn
             */
            btns_container: null,
        }
        const tmp_first = `${default_title ?? ''} ${titles[0]}`.trim();
        selected.textContent = `${tmp_first}`;
        if (!stealth) {
            selected.classList.add("cddown-selected-not-stealth");
        }

        const optionsList = document.createElement("div");
        optionsList.className = "custom-dropdown-options hidden";
        optionsList.style.maxHeight = max_selections_height;
        optionsList.classList.add(direction_open);
        const toggle_all_option = document.createElement("div");
        toggle_all_option.className = "custom-dropdown-option";
        setTimeout(() => {
            toggle_all_option.textContent = "toggle all";
        }, 0);

        toggle_all_option.addEventListener("click", () => {
            const override_status = self_aware.is_selected.indexOf(true) < 0;
            titles.forEach((title, index) => {
                self_aware.is_selected[index] = override_status;
                requestAnimationFrame(() => {
                    self_aware.options[index].classList.toggle("dds-selected", override_status);
                    self_aware.checkboxes[index].checked = override_status;
                });
            });
            if (typeof onSelectionStatusChange === "function") {
                onSelectionStatusChange(self_aware);
            }
            const count_selected = self_aware.is_selected.filter(Boolean).length;
            if (count_selected >= 1) {
                selected.textContent = `${count_selected} ${("items selected")}`;
            } else {
                selected.textContent = `${default_title}`;
            }
        });
        if (onConfirm != undefined) {
            // optionsList.style.top = "calc(100% + 35px)";
            const btns_container = document.createElement("div");
            btns_container.className = "cm-dn-buttons hidden";
            const b = document.createElement("div");
            toggle_all_option.className = "";
            b.addEventListener("click", (event) => {
                const count_selected = self_aware.is_selected.filter(Boolean).length;
                if (count_selected >= 1) {
                    onConfirm();
                } else {
                    new Notify({
                        text: Locale.at("select a value first"),
                        event: event,
                        ms_timeout: 1500,
                        style: 3,
                        type: 1
                    });
                }
            });
            b.innerText = Locale.at("confirm");
            btns_container.appendChild(toggle_all_option);
            btns_container.appendChild(b);
            self_aware.btns_container = btns_container;
            dropdown.appendChild(btns_container);
        } else {
            optionsList.appendChild(toggle_all_option);
        }
        titles.forEach((title, index) => {
            const own_index = index;
            const default_is_selected = own_index == 0;
            self_aware.is_selected.push(default_is_selected);//first selected
            self_aware.titles.push(title);

            const option = document.createElement("div");
            self_aware.options.push(option);
            option.className = "custom-dropdown-option";
            option.textContent = title;
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.classList.add("cdo-mock-checkbox");
            checkbox.checked = default_is_selected;
            self_aware.checkboxes.push(checkbox);
            option.appendChild(checkbox);
            requestAnimationFrame(() => {
                option.classList.toggle("dds-selected", default_is_selected);//first selected
            });
            option.addEventListener("click", () => {
                const content_selected = (`${title}`.trim());
                const new_status = !self_aware.is_selected[own_index];
                checkbox.checked = new_status;
                self_aware.is_selected[own_index] = new_status;
                const count_selected = self_aware.is_selected.filter(Boolean).length;
                if (count_selected > 1) {
                    if (!omit_rendering) {
                        selected.textContent = `${count_selected} ${("items selected")}`;
                    }
                } else if (count_selected == 1) {
                    if (!omit_rendering) {
                        selected.textContent = `${content_selected}`;
                    }
                } else {
                    selected.textContent = `${default_title}`;
                }
                //optionsList.classList.add("hidden");
                if (new_status) {
                    requestAnimationFrame(() => {
                        option.classList.toggle("dds-selected", true);
                    });
                } else {
                    requestAnimationFrame(() => {
                        option.classList.toggle("dds-selected", false);
                    });
                }
                if (next && typeof next[own_index] === "function") {
                    next[own_index]();
                }
                if (chained_selection) {
                    if (new_status) {
                        requestAnimationFrame(() => {
                            const start = self_aware.is_selected.indexOf(true);
                            const end = self_aware.is_selected.lastIndexOf(true);
                            for (let i = start; i < end; i++) {
                                self_aware.is_selected[i] = new_status;
                                self_aware.options[i].classList.toggle("dds-selected", new_status);
                                self_aware.checkboxes[i].checked = new_status;
                            }
                            const count_selected = self_aware.is_selected.filter(Boolean).length;
                            if (count_selected >= 1) {
                                if (!omit_rendering) {
                                    selected.textContent = `${count_selected} ${("items selected")}`;
                                }
                            } else {
                                selected.textContent = `${default_title}`;
                            }
                        });
                    } else {
                        requestAnimationFrame(() => {
                            const start = self_aware.is_selected.indexOf(true);
                            let last_true = start;
                            while (self_aware.is_selected.length > last_true) {
                                if (self_aware.is_selected[last_true] == false) {
                                    break;
                                }
                                last_true++;
                            }
                            while (self_aware.is_selected.length > last_true) {
                                if (self_aware.is_selected[last_true]) {
                                    self_aware.is_selected[last_true] = false;
                                    self_aware.options[last_true].classList.toggle("dds-selected", false);
                                    self_aware.checkboxes[last_true].checked = false;
                                }
                                last_true++;
                            }
                            const count_selected = self_aware.is_selected.filter(Boolean).length;
                            if (count_selected >= 1) {
                                if (!omit_rendering) {
                                    selected.textContent = `${count_selected} ${"items selected"}`;
                                }
                            } else {
                                selected.textContent = `${default_title}`;
                            }
                        });
                    }
                }
                if (typeof onSelectionStatusChange === "function") {
                    setTimeout(() => {
                        onSelectionStatusChange(self_aware);
                    }, 0);
                }
            });

            optionsList.appendChild(option);
        });

        selected.addEventListener("click", () => {
            setTimeout(() => {
                if (optionsList.classList.toggle("hidden")) {
                    selected.classList.toggle(`dd-visible-${direction_open}`, false);
                    self_aware.btns_container?.classList.toggle("hidden", true);
                    // arrow_down.src = "/Images/Icone2024/ui_2024/keyboard_arrow_left.svg";
                    // arrow_down.style.rotate = "-90deg";
                } else {
                    selected.classList.toggle(`dd-visible-${direction_open}`, true);
                    self_aware.btns_container?.classList.toggle("hidden", false);
                    // arrow_down.src = "/Images/Icone2024/ui_2024/close_full_view.svg";
                    // arrow_down.style.rotate = "0deg";
                }
            }, 0);
        });

        dropdown.appendChild(selected);
        dropdown.appendChild(optionsList);
        container.appendChild(dropdown);

        // Close dropdown if clicked outside
        document.addEventListener("click", (e) => {
            if (!container.contains(e.target)) {
                optionsList.classList.add("hidden");
                self_aware.btns_container?.classList.add("hidden");
                selected.classList.toggle(`dd-visible-${direction_open}`, false);
            }
        });

        if (typeof onSelectionStatusChange === "function") {
            setTimeout(() => {
                onSelectionStatusChange(self_aware);
                if (!omit_rendering) {
                    requestAnimationFrame(() => {
                        selected.textContent = `${default_title} ${selected.textContent}`;
                    });
                }
            }, 0);
        }
        return container;
    }

    /**
     * 
     * @param {Object} args 
     * @param {string[]} args.titles 
     * @param {string[]} [args.hints]
     * @param {Element[]} [args.content] 
     * @param {string} [args.id] used to store open status in localStorage between pages if provided
     * @param {Function<{event,index}>[]} [args.onOpen] 
     * @returns Element
     */
    static createAccordion(args) {
        const { titles, hints, content = [], onOpen = [], id = null } = args;

        const accordion = document.createElement("div");
        accordion.classList.add("ui-accordion");
        accordion.content_container = [];

        // Initialize localStorage key if id is provided
        const storageKey = id ? `accordion_${id}` : null;
        let savedStates = null;

        if (storageKey) {
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved) {
                    savedStates = JSON.parse(saved);
                }
            } catch (e) {
                console.warn(`Failed to load accordion state from localStorage: ${e.message}`);
            }
        }

        const headers = [];

        titles.forEach((title, i) => {
            const section = document.createElement("div");
            section.classList.add("ui-accordion-section");

            const header = document.createElement("div");
            header.classList.add("ui-accordion-header");
            header.setAttribute("aria-expanded", "false");
            header.innerText = title;
            if (hints && hints[i]) {
                UiBuilder.addHint({ hint: hints[i], target: header });
            }

            const body = document.createElement("div");
            body.classList.add("ui-accordion-body");
            body.style.display = "none";

            if (content[i]) {
                body.appendChild(content[i]);
            }

            // Save container reference
            accordion.content_container[i] = body;

            // Restore saved state if available
            if (savedStates && savedStates[i]) {
                header.setAttribute("aria-expanded", "true");
                body.style.display = "";
            }

            headers.push(header);

            header.addEventListener("click", (event) => {
                const isOpen = header.getAttribute("aria-expanded") === "true";

                if (args.persistent == true) {
                } else {// Close all sections
                    accordion.querySelectorAll(".ui-accordion-header").forEach(btn => {
                        btn.setAttribute("aria-expanded", "false");
                    });
                    accordion.querySelectorAll(".ui-accordion-body").forEach(div => {
                        div.style.display = "none";
                    });
                }

                // Toggle this one
                if (!isOpen) {
                    header.setAttribute("aria-expanded", "true");
                    body.style.display = "";
                    if (onOpen[i]) {
                        onOpen[i]({ index: i, event });
                    }
                } else {
                    header.setAttribute("aria-expanded", "false");
                    body.style.display = "none";
                }

                // Save state to localStorage if id is provided
                if (storageKey) {
                    try {
                        const states = headers.map((h) => h.getAttribute("aria-expanded") === "true");
                        localStorage.setItem(storageKey, JSON.stringify(states));
                    } catch (e) {
                        console.warn(`Failed to save accordion state to localStorage: ${e.message}`);
                    }
                }
            });

            section.appendChild(header);
            section.appendChild(body);
            accordion.appendChild(section);
        });

        return accordion;
    }

    /**
     * 
     * @param {Object} args 
     * @param {string[]} args.titles 
     * @param {string[]} args.searchable_target_data 
     * @param {string[]} args.hints 
     * @param {Element[]} [args.content] 
     * @param {Function<{event,index}>[]} [args.onOpen] 
     * @returns Element
     */
    static createSearchableAccordion(args) {
        const { titles, searchable_target_data, hints, content = [], onOpen = [] } = args;

        const wrapper = document.createElement("div");

        const searchInput = document.createElement("input");
        searchInput.type = "text";
        try {
            searchInput.placeholder = `${("cerca")}...`;
        } catch (error) {
            searchInput.placeholder = "Search...";
        }
        searchInput.classList.add("ui-accordion-search");
        wrapper.appendChild(searchInput);

        const accordion = document.createElement("div");
        accordion.classList.add("ui-accordion");
        accordion.content_container = [];

        titles.forEach((title, i) => {
            const section = document.createElement("div");
            section.classList.add("ui-accordion-section");

            const header = document.createElement("div");
            header.classList.add("ui-accordion-header");
            header.setAttribute("aria-expanded", "false");
            header.innerText = title;
            if (hints[i]) {
                UiBuilder.addHint({ hint: hints[i], target: header, anchor: 'bottom' });
            }

            const body = document.createElement("div");
            body.classList.add("ui-accordion-body");
            body.style.display = "none";

            if (content[i]) {
                body.appendChild(content[i]);
            }

            accordion.content_container[i] = body;

            header.addEventListener("click", (event) => {
                const isOpen = header.getAttribute("aria-expanded") === "true";

                if (!args.persistent) {
                    accordion.querySelectorAll(".ui-accordion-header").forEach(btn => {
                        btn.setAttribute("aria-expanded", "false");
                    });
                    accordion.querySelectorAll(".ui-accordion-body").forEach(div => {
                        div.style.display = "none";
                    });
                }

                if (!isOpen) {
                    header.setAttribute("aria-expanded", "true");
                    body.style.display = "";
                    if (onOpen[i]) {
                        onOpen[i]({ index: i, event });
                    }
                } else {
                    header.setAttribute("aria-expanded", "false");
                    body.style.display = "none";
                }
            });

            section.appendChild(header);
            section.appendChild(body);
            section.dataset.search_me = searchable_target_data[i].toLowerCase();
            accordion.appendChild(section);
        });

        // Live search filter
        searchInput.addEventListener("input", () => {
            const queryWords = searchInput.value.toLowerCase().split(" ").filter(Boolean);
            accordion.querySelectorAll(".ui-accordion-section").forEach(section => {
                const str = section.dataset.search_me;
                const match = queryWords.every(word => str.includes(word));
                section.style.display = match ? "" : "none";
            });
        });
        wrapper.accordion = accordion;
        wrapper.appendChild(accordion);
        return wrapper;
    }
    /**
     * 
     * @param {Object} args 
     * @param {string[]} [args.title]
     * @param {string[]} [args.titles]
     * @param {string[]} [args.steps]
     * @param {boolean} [args.demo]
     * @returns 
     */
    static createLoader(args) {
        const container = document.createElement("div");
        container.className = "loader-container";

        const the_title = document.createElement("div");
        the_title.className = "loader-title";
        container.appendChild(the_title);

        // Handle single title
        if (args.title !== undefined) {
            the_title.innerText = args.title[0];
        }

        // Handle rotating titles
        else if (args.titles !== undefined && args.titles.length > 0) {
            let usedIndexes = new Set();



            const updateTitle = async () => {
                if (usedIndexes.size === args.titles.length) {
                    usedIndexes.clear(); // restart cycle
                }

                let nextIndex;
                do {
                    nextIndex = Math.floor(Math.random() * args.titles.length);
                } while (usedIndexes.has(nextIndex));

                usedIndexes.add(nextIndex);
                const nextText = `${args.titles[nextIndex]}...`;

                await Typewriter.deleteText(the_title);
                await Typewriter.typeText(the_title, nextText);
                setTimeout(async () => {
                    if (container.isActive != false) {
                        setTimeout(() => {
                            updateTitle();
                        }, 0);
                    }
                }, 1000);
            };
            updateTitle();
        }

        // Handle step-by-step titles
        else if (args.steps !== undefined && args.steps.length > 0) {
            let i = 0;
            the_title.innerText = args.steps[i];

            container.next = () => {
                i++;
                if (i >= args.steps.length) {
                    container.end();
                    return;
                }
                the_title.innerText = args.steps[i];
            };
        }
        container.end = () => {
            container.isActive = false;

            const rect = container.getBoundingClientRect();

            // Create the "worked, pheew" message
            const message = document.createElement("div");
            message.innerText = "worked, pheew";
            message.className = "loader-message";

            // Style and position
            Object.assign(message.style, {
                position: "fixed",
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                textAlign: "center",
                pointerEvents: "none",
                opacity: "1",
                transition: "transform 4s ease-out, opacity 4s ease-out",
                transform: "translateY(0px)",
                color: "#555",
                fontSize: "1.2rem",
                fontFamily: "'Segoe UI', sans-serif",
                zIndex: "9999"
            });
            if (args.demo == true) {
                document.body.appendChild(message);
            }

            requestAnimationFrame(() => {
                message.style.transform = "translateY(-100px)";
                message.style.opacity = "0";
            });

            // After message fades, display "bye"
            setTimeout(() => {
                const bye = document.createElement("div");
                bye.className = 'bye';
                bye.innerText = "bye";
                Object.assign(bye.style, {
                    left: `${rect.left}px`,
                    top: `${rect.top - 50}px`,
                    width: `${rect.width}px`,
                    position: "fixed",
                });

                if (args.demo == true) {
                    document.body.appendChild(bye);
                }
                setTimeout(() => {
                    bye.style.opacity = "0";
                }, 50);

                // setTimeout(() => bye.remove(), 1000);
                message.remove();
            }, 3600);

            container.remove();
        };


        return container;
    }
    static mockDialog({ text1, onConfirm, onClose = null, onDeny = null, prefer_selection = 1, onConfirmText = null, onDenyText = null, hideOnDeny = false }) {
        const self_aware = {
            bottom_sheet_instance: null
        };
        const container = document.createElement("div");
        Object.assign(container.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            alignContent: 'center',
            justifyContent: 'center',
            padding: '28px',
            paddingBottom: '20px'
        });
        const msg = document.createElement("span");
        msg.innerText = text1;
        msg.style.padding = "15px";
        container.appendChild(msg);
        const container_btns = document.createElement("div");
        Object.assign(container_btns.style, {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            alignContent: 'center',
            justifyContent: 'space-around',
            width: '100%',
        });
        container.appendChild(container_btns);
        const button_undo = UiBuilder.createButton({
            onClick: () => {
                try {
                    self_aware.bottom_sheet_instance.destroy();
                } catch (error) { }
                if (onDeny != undefined) {
                    onDeny();
                }
            },
            title: onDenyText ?? Locale.at("no"), style: "min-width:100px;"
            , icon: "undo.svg"
        });
        const button_confirm = UiBuilder.createButton({
            onClick: (event) => {
                setTimeout(() => {
                    try {
                        self_aware.bottom_sheet_instance.destroy();
                    } catch (error) { }
                    if (onConfirm != undefined) {
                        onConfirm(event);
                    }
                }, 0);
            },
            title: onConfirmText ?? Locale.at("yes"), style: "min-width:100px;"
            , icon: "check_circle.svg"
        });
        if (prefer_selection != undefined) {
            if (prefer_selection == 0) {
                button_undo.classList.toggle("prefer-this-action", true);
            } else {
                button_confirm.classList.toggle("prefer-this-action", true);
            }
        }
        if (!hideOnDeny) {
            container_btns.appendChild(button_undo);
        }
        container_btns.appendChild(button_confirm);
        /**
         * @type BottomSheet
         */
        const instance = new BottomSheet({
            element: container,
            onClose: () => {
                // if (typeof filters_list_el.onAnnulla === 'function') {
                //     filters_list_el.onAnnulla();
                // }
                if (onClose != undefined) {
                    onClose();
                }
            },
            centered: true
        });
        self_aware.bottom_sheet_instance = instance;
        return instance;
    }

    /**
    * 
    * @param {Object} param0 
    * @param {string[]} param0.titles
    * @param {Element[]} param0.content
    * @param {string} [param0.id_sync] selected index tabs are synched between pages/instances
    * @param {Function} [param0.override_selected_tab_index] ignore sync
    * @param {Function} [param0.onViewChange] callback
    * @param {bool} [param0.collapsed] don't select the tab
    * 
    * @returns {HTMLDivElement} container with interactive tabs
    */
    static createTabs({ titles, content, id_sync = '', onViewChange = undefined, override_selected_tab_index = null, collapsed = false, img_src, icons = [] }) {
        if (titles.length !== content.length || titles.length == 0) {
            console.assert(false, "Missing tab content or tab titles");
            return;
        }

        const container = document.createElement("div");
        container.classList.add("tabs-container");
        // container.style.width = "90%";
        container.style.fontFamily = "sans-serif";
        container.style.borderRadius = "2px";

        const state = {
            index_selected_tab: 0
        };

        // Create tabs header container
        const tabsHeader = document.createElement("div");
        tabsHeader.style.display = "flex";
        tabsHeader.style.borderBottom = "1px solid #aaa";

        // Create content container
        const contentContainer = document.createElement("div");
        contentContainer.style.padding = "7px";

        // Generate tab buttons
        titles.forEach((title, index) => {
            const tabButton = document.createElement("div");
            tabButton.classList.add("tab_button");
            const innertext = document.createElement("div");
            innertext.textContent = UiBuilder.parseHTMLToDisplay(title);;
            innertext.classList.toggle("tab-button-wrapper", true);
            tabButton.appendChild(innertext);
            tabButton.addEventListener("click", () => {
                state.index_selected_tab = index;
                updateTabs();
                /*
                * not called at creation time
                */
                if (onViewChange != undefined) {
                    onViewChange(state.index_selected_tab);
                }
            });
            const img_src = icons[index];
            if (img_src != undefined) {
                const img = document.createElement("img");
                img.src = `/Images/Icone2024/ui_2024/${img_src}`;
                innertext.prepend(img);
            }
            tabsHeader.appendChild(tabButton);
            contentContainer.appendChild(content[index]);
        });

        function updateTabs() {
            // Update tab button styles
            Array.from(tabsHeader.children).forEach((button, i) => {
                button.classList.toggle("the-chosen-one", i === state.index_selected_tab);
            });
            localStorage.setItem(`user-prefer-tab${id_sync}`, `${state.index_selected_tab}`);
            // Update content
            contentContainer.innerHTML = "";
            contentContainer.appendChild(content[state.index_selected_tab]);
        }

        container.identify = () => {
            return { index: state.index_selected_tab, content: content[state.index_selected_tab] };
        };

        container.appendChild(tabsHeader);
        container.appendChild(contentContainer);
        const user_preference = override_selected_tab_index ?? Number(localStorage.getItem(`user-prefer-tab${id_sync}`));
        if (!isNaN(user_preference)) {
            if (user_preference < titles.length && user_preference >= 0) {
                state.index_selected_tab = user_preference;
            }
        }
        if (!collapsed) {
            updateTabs();
        } else {
            contentContainer.innerHTML = "";
        }

        return container;
    }

    /**
     * @param {Element} [html_element_content]
     * @param {object} [options]
     * @param {string} [options.direction]  'horizontal' | 'vertical'
     * @param {Function} [options.onDestroy]
     * @param {Function} [options.id] used to store position between pages if null => none
     * @param {string} [options.style]
     * @returns {HTMLDivElement}
     */
    static createFloatingContainer(html_element_content, options) {
        const direction = options?.direction ?? 'horizontal';
        const onDestroy = options?.onDestroy ?? null;

        const container = document.createElement("div");
        container.className = `floating-container ${direction}`;
        if (options.style != undefined) {
            container.style = options.style;
        }
        // --- top bar ---
        const topBar = document.createElement("div");
        topBar.className = "floating-container-topbar";

        const knob = document.createElement("div");
        knob.className = "floating-container-knob";

        const knob_grip = document.createElement("span");
        knob_grip.className = "floating-container-knob-grip";
        knob.appendChild(knob_grip);

        const minimizeBtn = document.createElement("div");
        minimizeBtn.className = "floating-container-btn floating-container-minimize";
        minimizeBtn.type = "button";
        minimizeBtn.textContent = "−";

        const closeBtn = document.createElement("div");
        closeBtn.className = "floating-container-btn floating-container-close";
        closeBtn.type = "button";
        closeBtn.textContent = "×";

        topBar.appendChild(knob);
        topBar.appendChild(minimizeBtn);
        topBar.appendChild(closeBtn);

        if (html_element_content) {
            try { container.appendChild(html_element_content); } catch (_) { }
        }

        container.appendChild(topBar);

        // --- drag ---
        let isDragging = false;
        let offsetX = 0, offsetY = 0;
        let overflowCheckTimer = null;

        const scheduleOverflowCheck = () => {
            if (overflowCheckTimer) clearTimeout(overflowCheckTimer);
            overflowCheckTimer = setTimeout(() => {
                UiBuilder.checkOverflow(container);
            }, 1000);
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            container.style.left = `${e.clientX - offsetX}px`;
            container.style.top = `${e.clientY - offsetY}px`;
        };
        const onMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            knob.classList.remove("grabbing");
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            if (options?.id) {
                localStorage.setItem(
                    `floating-container:${options.id}`,
                    JSON.stringify({ left: container.style.left, top: container.style.top })
                );
            }
        };
        const onTouchMove = (e) => {
            if (!isDragging) return;
            const t = e.touches[0];
            container.style.left = `${t.clientX - offsetX}px`;
            container.style.top = `${t.clientY - offsetY}px`;
            e.preventDefault();
        };
        const onTouchEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            knob.classList.remove("grabbing");
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
            if (options?.id) {
                localStorage.setItem(
                    `floating-container:${options.id}`,
                    JSON.stringify({ left: container.style.left, top: container.style.top })
                );
            }
        };
        if (options?.id) {
            try {
                const saved = JSON.parse(localStorage.getItem(`floating-container:${options.id}`));
                if (saved?.left) container.style.left = saved.left;
                if (saved?.top) container.style.top = saved.top;
            } catch (_) { }
        }
        const onResizeWindow = () => {
            scheduleOverflowCheck();
        };

        window.addEventListener("resize", onResizeWindow);

        knob.addEventListener("mousedown", (e) => {
            const rect = container.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            isDragging = true;
            knob.classList.add("grabbing");
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
            e.preventDefault();
        });
        knob.addEventListener("touchstart", (e) => {
            const t = e.touches[0];
            const rect = container.getBoundingClientRect();
            offsetX = t.clientX - rect.left;
            offsetY = t.clientY - rect.top;
            isDragging = true;
            knob.classList.add("grabbing");
            document.addEventListener("touchmove", onTouchMove, { passive: false });
            document.addEventListener("touchend", onTouchEnd);
            e.preventDefault();
        }, { passive: false });

        // --- minimize ---
        let isMinimized = false;
        minimizeBtn.addEventListener("click", () => {
            isMinimized = !isMinimized;
            container.classList.toggle('is-minimized', isMinimized);
            minimizeBtn.textContent = isMinimized ? "□" : "−";
        });
        topBar.addEventListener("click", (event) => {
            if (event.detail == 2) {
                if (isMinimized) {
                    isMinimized = !isMinimized;
                    container.classList.toggle('is-minimized', isMinimized);
                    minimizeBtn.textContent = isMinimized ? "□" : "−";
                }
            }
        });

        // --- close ---
        closeBtn.addEventListener("click", () => {
            if (overflowCheckTimer) clearTimeout(overflowCheckTimer);
            window.removeEventListener("resize", onResizeWindow);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
            container.remove();
            if (typeof onDestroy === 'function') onDestroy();
        });

        document.body.appendChild(container);
        scheduleOverflowCheck();
        return container;
    }
    //#region "new implementation"

    /**
     * 
     * @param {Object} options 
     * @param {MouseEvent} options.event - The event to get mouse position
     * @param {String[]} options.title - Array of option titles
     * @param {Function[]} options.next - Array of callback functions corresponding to each option
     */
    static showDropDown(options) {
        const { event, title, next } = options;

        if (!event || !title || !next || title.length !== next.length) {
            console.error('Invalid options provided to showDropDown.');
            return;
        }

        // Remove existing dropdown if any
        const existingDropdown = document.getElementById('UiBuilderDropdown-instance');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        // Create dropdown container
        const dropdown = document.createElement('div');
        dropdown.id = 'UiBuilderDropdown-instance';
        // dropdown.style.position = 'absolute';
        // dropdown.style.background = '#1c1f29';
        // dropdown.style.color = '#ffffff';
        // dropdown.style.border = '1px solid #5a6178';
        // dropdown.style.borderRadius = '2px';
        // dropdown.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        // dropdown.style.zIndex = 99999999999999999999;
        // dropdown.style.padding = '4px 0';
        // dropdown.style.userSelect = 'none';

        // Create options
        title.forEach((t, index) => {
            const option = document.createElement('div');
            option.innerText = t;
            option.style.padding = '8px 16px';
            option.style.cursor = 'pointer';

            option.addEventListener('mouseenter', () => {
                option.style.background = '#313131';
            });
            option.addEventListener('mouseleave', () => {
                option.style.background = '';
            });

            option.addEventListener('click', () => {
                // Execute callback
                next[index] && next[index]();
                // Remove dropdown
                dropdown.remove();
            });

            dropdown.appendChild(option);
        });

        // Append to body
        document.body.appendChild(dropdown);

        // Position the dropdown at mouse position
        const { clientX, clientY } = event;
        const dropdownRect = dropdown.getBoundingClientRect();
        const { innerWidth, innerHeight } = window;

        let top = clientY;
        let left = clientX;

        // Check for overflow and adjust position if needed
        if (top + dropdownRect.height > innerHeight) {
            top = innerHeight - dropdownRect.height - 10; // 10px padding
        }
        if (left + dropdownRect.width > innerWidth) {
            left = innerWidth - dropdownRect.width - 10; // 10px padding
        }

        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${left}px`;

        // Optional: close dropdown on outside click
        const handleClickOutside = (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.remove();
                document.removeEventListener('click', handleClickOutside);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 0);
    }

    static ask({ title, description, event, onConfirm, onCancel }) {
        // Remove existing popup if any
        const existingPopup = document.querySelector('.uibuilder-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        // Create popup container
        const popup = document.createElement('div');
        popup.className = 'uibuilder-popup';

        // Title and description
        popup.innerHTML = `
            <strong>${title}</strong>
            <p>${description}</p>
            <button class="UiBuilderButton confirm-btn">Confirm</button>
            <button class="UiBuilderButton cancel-btn">Cancel</button>
        `;

        document.body.appendChild(popup);

        // Positioning with screen bounds check
        setTimeout(() => {
            const { clientX, clientY } = event;
            const popupRect = popup.getBoundingClientRect();
            let left = clientX;
            let top = clientY;

            if (left + popupRect.width > window.innerWidth) {
                left = window.innerWidth - popupRect.width - 10;
            }

            if (top + popupRect.height > window.innerHeight) {
                top = window.innerHeight - popupRect.height - 10;
            }

            popup.style.left = `${left}px`;
            popup.style.top = `${top}px`;

            // Event listeners
            popup.querySelector('.confirm-btn').addEventListener('click', () => {
                onConfirm && onConfirm();
                popup.remove();
            });

            popup.querySelector('.cancel-btn').addEventListener('click', () => {
                onCancel && onCancel();
                popup.remove();
            });
        }, 0);
    }
    //#endregion
}