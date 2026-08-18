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
     * geometry, in px, of each `.the-switch-container` theme variant, transcribed from
     * `styles.css` (`.the-switch-container`/`.the-mini-switch`/`.the-xxl-switch`) - used to
     * decide how wide the switch needs to be to fit `options.innerText.on`/`.off` without the
     * text rendering underneath `.the-switch-circle` (that circle has `z-index: 1`, the text
     * doesn't, so whenever the text is too wide for the container's fixed CSS width the circle
     * visually covers part of it instead of the two ever wrapping/overflowing visibly)
     */
    static #switch_theme_metrics = {
        default: { circle_px: 25, base_width_px: 70 },
        mini: { circle_px: 20, base_width_px: 61 },
        xxl: { circle_px: 40, base_width_px: 122 },
    };
    /**
     * Renders `text` off-screen with `.the-switch-text`'s own class (so it picks up the same
     * font as the real switch label) to measure its natural width - independent of the switch's
     * own layout, which is exactly the fixed-width box this measurement is used to grow past.
     * @param {string} text
     * @returns {number} width, in px
     */
    static #measureSwitchTextWidth(text) {
        const probe = document.createElement("span");
        probe.className = "the-switch-text";
        probe.style.cssText = "position:fixed;visibility:hidden;left:-9999px;top:-9999px;white-space:pre;width:auto;";
        probe.innerText = text;
        document.body.appendChild(probe);
        const width = probe.getBoundingClientRect().width;
        probe.remove();
        return width;
    }
    /**
     * @param {Object} options
     * @param {Object} options.innerText
     * @param {string} options.innerText.on
     * @param {string} options.innerText.off
     * @param {Function} options.onClick
     * @param {bool} [options.isOn=false]
     * @param {string} [options.label] renders a separate clickable text label to the left of the switch
     * @param {"mini"|"xxl"} [options.theme] default (no value) is the normal-sized switch
     * @param {string} [options.innerCircleIcon] icon file name (as passed to `Icons`-less raw `<img>` src, under `/Images/Icone2024/ui_2024/`) shown inside the sliding circle
     * @param {string} [options.hint] hover hint, wired via `addHint`
     * @param {"top"|"left"|"right"|"bottom"} [options.anchor] hint anchor, used with `options.hint`
     *
     * @returns {HTMLDivElement} also gains an `options.setIsOn(is_on)` function (assigned onto the
     *   `options` object passed in, not onto the returned element) that updates the switch's
     *   state/label programmatically after creation - keep a reference to the same `options`
     *   object to call it later, e.g. `options.setIsOn(true)`.
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
        const theme_metrics = UiBuilder.#switch_theme_metrics[options.theme] ?? UiBuilder.#switch_theme_metrics.default;
        const widest_label_px = Math.max(
            UiBuilder.#measureSwitchTextWidth(options.innerText.on),
            UiBuilder.#measureSwitchTextWidth(options.innerText.off)
        );
        const circle_margin_px = 3; // `.the-switch-circle`'s own `margin-left`
        const text_margin_px = 10; // `.the-switch-text`'s own `margin-left`/`margin-right`
        const gap_buffer_px = 6; // breathing room between the circle and the text
        const required_width_px = Math.ceil(widest_label_px) + theme_metrics.circle_px + circle_margin_px + text_margin_px + gap_buffer_px;
        if (required_width_px > theme_metrics.base_width_px) {
            container.style.width = `${required_width_px}px`;
            container.style.minWidth = `${required_width_px}px`;
            container.style.maxWidth = `${required_width_px}px`;
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
                anchor: options.anchor ?? "top"
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
     * Attaches hover/touch/click listeners to target that show a tooltip via window.custom_tooltip.
     * Calling this again on the same target stacks a duplicate set of listeners — use addOrUpdateHint instead.
     * @param {Object} options
     * @param {string} options.hint
     * @param {Element} options.target
     * @param {Function} [options.conditionsMet]
     * @param {"top"|"left"|"right"|"bottom"} options.anchor
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
     * Adds a hint to target via addHint, or if one is already attached, updates its
     * hint/anchor/conditionsMet in place. Safe to call repeatedly on the same target
     * without stacking duplicate listeners.
     * @param {Object} options
     * @param {string} options.hint
     * @param {Element} options.target
     * @param {Function} [options.conditionsMet]
     * @param {"top"|"left"|"right"|"bottom"} options.anchor
     */
    static addOrUpdateHint(options) {
        const target = options.target;
        const existing = target['hint_builder_options'];
        if (existing != undefined) {
            Object.assign(existing, options);
            return;
        }
        UiBuilder.addHint(options);
    }
    /**
     * @param {Object} options
     * @param {Function} [options.onClick]
     * @param {Function} [options.onRightClick]
     * @param {boolean} [options.not_indexable]
     * @param {string} [options.hint]
     * @param {Element} [options.target] Hint anchor target; defaults to the created button when `options.hint` is set
     * @param {"top"|"left"|"right"|"bottom"} [options.anchor] Hint anchor position, used together with `options.hint`
     * @param {string} [options.icon] Must be specified if `options.title` is undefined
     * @param {string} [options.icon_code] Must be specified if `options.title` is undefined
     * @param {string} [options.title] Must be specified if `options.icon` is undefined
     * @param {string} [options.class]
     * @param {string} [options.style] text
     * @param {string} [options.automationID] `automation-id` attribute
     * @param {1|2} [options.theme] 2 shiny
     * @param {boolean} [options.auto_disable_on_click=false] If true, the button will be automatically disabled (by adding a "clicked" class) when clicked, and re-enabled after 1 second.
     * @returns {HTMLDivElement}
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
            tmp.classList.add(...options.class.split(" ").filter(Boolean));
        }
        if (options.style != undefined) {
            tmp.style = options.style;
        }
        if (options.icon != undefined) {
            const icon = document.createElement("img");
            icon.setAttribute("draggable", "false");
            icon.setAttribute("loading", "lazy");
            icon.style.width = "18px";
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
            if (options.title != undefined) {
                tmp.classList.toggle("reversed");
            }
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
                    target: tmp,
                    anchor: options.anchor,
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
    static createDropDownButtonSelector({ titles, next, onSelectionChange, label, direction_open = 'top', stealth = true, max_selections_height = '210px', icon_code = undefined }) {
        const container = document.createElement("div");
        container.className = "custom-dropdown-container";

        if (icon_code) {
            const leftIcon = Icons.create(icon_code);
            leftIcon.classList.add("cdc-icon-left");
            container.classList.add("has-left-icon");
            container.appendChild(leftIcon);
        }

        const arrow_down = Icons.create('e313');
        arrow_down.classList.add("cdc-arrow-open");
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
        document.addEventListener("click", function onDocumentClick(e) {
            if (!document.body.contains(container)) {
                // container was discarded without ever being explicitly torn down
                // (this builder has no destroy hook) - self-unregister so this
                // closure doesn't keep listening (and keep the whole subtree alive) forever
                document.removeEventListener("click", onDocumentClick);
                return;
            }
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
        document.addEventListener("click", function onDocumentClick(e) {
            if (!document.body.contains(container)) {
                // container was discarded without ever being explicitly torn down
                // (this builder has no destroy hook) - self-unregister so this
                // closure doesn't keep listening (and keep the whole subtree alive) forever
                document.removeEventListener("click", onDocumentClick);
                return;
            }
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
            if (hints && hints[i]) {
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
                if (undefined == str) {
                    return;
                }
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
    /**
     * Renders any JSON-serializable value as a two-column key/value grid, recursing into
     * nested objects/arrays as sub-grids. Keys starting with "_" are skipped, matching the
     * convention used elsewhere for internal/private fields.
     * @param {*} data
     * @param {Object} [options]
     * @param {Object<string,string>} [options.propStyles] maps a property key to an inline
     *   style string applied to that key's value cell (and its key cell), at any nesting level.
     * @param {Object<string,Object>} [options.propHint] maps a property key to hint options
     *   (as accepted by {@link UiBuilder.addHint}, minus `target`) applied to that key's key cell,
     *   at any nesting level.
     * @returns {HTMLElement}
     */
    static previewJSON(data, options = {}) {
        const { propStyles, propHint } = options;
        const container = document.createElement("div");
        container.className = "auto-grid";
        if (data == null || typeof data !== "object" || data instanceof Date) {
            container.classList.add("auto-grid-empty");
            container.innerText = data == null ? "-" : String(data);
            return container;
        }
        const entries = Array.isArray(data)
            ? data.map((value, index) => [String(index), value])
            : Object.entries(data).filter(([key]) => !key.startsWith("_"));
        if (entries.length === 0) {
            container.classList.add("auto-grid-empty");
            container.innerText = "-";
            return container;
        }
        for (const [key, value] of entries) {
            const style = propStyles?.[key];
            const row_key = document.createElement("div");
            row_key.className = "auto-grid-key";
            row_key.innerText = key;
            if (style != undefined) {
                row_key.style.cssText += style;
            }
            const hint = propHint?.[key];
            if (hint != undefined) {
                UiBuilder.addHint({ ...hint, target: row_key });
            }
            container.appendChild(row_key);
            const row_value = document.createElement("div");
            row_value.className = "auto-grid-value";
            // if (style != undefined) {
            //     row_value.style.cssText += style;
            // }
            if (value != null && typeof value === "object" && !(value instanceof Date)) {
                row_value.appendChild(UiBuilder.previewJSON(value, options));
            } else {
                row_value.innerText = value == null ? "-" : String(value);
            }
            container.appendChild(row_value);
        }
        return container;
    }
    /**
     * @param {Object} options
     * @param {string} [options.text1] message shown above `body`/the buttons - required unless `body` is given
     * @param {Function} options.onConfirm called (with the click event) once confirmed, after the sheet closes
     * @param {Function} [options.onClose] called whenever the sheet closes, including cancel/dismiss
     * @param {Function} [options.onDeny] called once denied, after the sheet closes
     * @param {number} [options.prefer_selection] 0 highlights the deny button as the preferred action, anything else highlights confirm
     * @param {string} [options.onConfirmText] overrides the confirm button's label
     * @param {string} [options.onDenyText] overrides the deny button's label
     * @param {boolean} [options.hideOnDeny] hides the deny button entirely
     * @param {HTMLElement} [options.body] optional element inserted between the message and the buttons
     */
    static mockDialog({ text1 = null, onConfirm, onClose = null, onDeny = null, prefer_selection = 1, onConfirmText = null, onDenyText = null, hideOnDeny = false, body = null }) {
        const self_aware = {
            bottom_sheet_instance: null
        };
        const container = document.createElement("div");
        Object.assign(container.style, {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxHeight: '80vh',
            boxSizing: 'border-box',
            padding: '28px',
            paddingBottom: '20px'
        });
        // title + body: scrollable together, shrinks to make room for the always-visible buttons row below
        const scrollable = document.createElement("div");
        Object.assign(scrollable.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            alignContent: 'center',
            justifyContent: 'flex-start',
            width: '100%',
            flex: '1 1 auto',
            minHeight: '0',
            overflowY: 'auto',
            padding: "1px",
        });
        container.appendChild(scrollable);
        if (text1 != null) {
            const msg = document.createElement("span");
            msg.innerText = text1;
            msg.style.padding = "15px";
            scrollable.appendChild(msg);
        }
        if (body != null) {
            scrollable.appendChild(body);
        }
        const container_btns = document.createElement("div");
        Object.assign(container_btns.style, {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            alignContent: 'center',
            justifyContent: 'space-around',
            width: '100%',
            flexShrink: '0',
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
     * @param {string} [options.id] used to store position between pages in localStorage; omit for no persistence
     * @param {string} [options.style]
     * @returns {HTMLDivElement}
     */
    static createFloatingContainer(html_element_content, options = {}) {
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
        const selfDestroy = () => {
            if (overflowCheckTimer) clearTimeout(overflowCheckTimer);
            window.removeEventListener("resize", onResizeWindow);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
            document.body.removeEventListener("keyup", onKeyUp);
            if (typeof SpaHistory !== "undefined") {
                SpaHistory.popState(backHandler);
            }
            container.remove();
            if (typeof onDestroy === 'function') onDestroy();
        };
        const onKeyUp = (e) => {
            if (e.key === "Escape") selfDestroy();
        };
        const backHandler = () => {
            selfDestroy();
        };
        closeBtn.addEventListener("click", selfDestroy);
        document.body.addEventListener("keyup", onKeyUp);
        if (typeof SpaHistory !== "undefined") {
            SpaHistory.pushState(backHandler);
        }

        document.body.appendChild(container);
        scheduleOverflowCheck();
        return container;
    }
    //#region "new implementation"

    /**
     * @type {(e: MouseEvent) => void}
     */
    static #activeDropDownCloseHandler = null;
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
        if (UiBuilder.#activeDropDownCloseHandler) {
            // the previous dropdown was just force-removed above without going through
            // its own handleClickOutside cleanup - unregister it too, otherwise repeated
            // calls before an outside click ever fires stack up dangling listeners
            document.removeEventListener('click', UiBuilder.#activeDropDownCloseHandler);
            UiBuilder.#activeDropDownCloseHandler = null;
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
                if (UiBuilder.#activeDropDownCloseHandler) {
                    document.removeEventListener('click', UiBuilder.#activeDropDownCloseHandler);
                    UiBuilder.#activeDropDownCloseHandler = null;
                }
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
                UiBuilder.#activeDropDownCloseHandler = null;
            }
        };
        UiBuilder.#activeDropDownCloseHandler = handleClickOutside;
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
    /**
     * @type {{element:HTMLDivElement,scroll_owner:(Element|Window),onScroll:Function,scrollToTop:Function}|null}
     */
    static #scroll_to_top = null;
    /**
     * Creates (once) a floating "scroll to top" button, fixed to the bottom-right of the
     * viewport and appended to `document.body`. It becomes visible only while `target`'s scroll
     * position is greater than 0, and scrolls `target` back to the top when clicked.
     * Calling this again never creates a second button - it retargets the existing one to
     * `options.target`, re-checks its scroll position, and re-appends it to `document.body` so it
     * ends up as the last child (on top of anything appended to body afterwards).
     *
     * `document.body`/`document.documentElement` (whole-page scrolling) is special-cased: the
     * browser never fires `scroll` on the body/html element itself - it fires on `window` - and
     * `body.scrollTo()` doesn't move the page either, so that case is routed through `window`.
     * @param {Object} [options]
     * @param {Element} [options.target] element whose scroll position is watched/scrolled to 0; defaults to `document.body`
     * @returns {HTMLDivElement}
     */
    static createScrollToTop(options = {}) {
        const target = options.target ?? document.body;
        const is_whole_page = target === document.body || target === document.documentElement;
        const scroll_owner = is_whole_page ? window : target;
        let instance = UiBuilder.#scroll_to_top;
        if (instance == null) {
            const element = UiBuilder.createButton({
                icon_code: "e316",
                class: "scroll-to-top-btn",
                onClick: () => {
                    UiBuilder.#scroll_to_top.scrollToTop();
                },
            });
            instance = { element, scroll_owner: null, onScroll: null, scrollToTop: null };
            UiBuilder.#scroll_to_top = instance;
        } else {
            instance.scroll_owner.removeEventListener("scroll", instance.onScroll);
        }
        instance.scroll_owner = scroll_owner;
        instance.scrollToTop = () => scroll_owner.scrollTo({ top: 0, behavior: "smooth" });
        instance.onScroll = () => {
            const scroll_top = is_whole_page ? document.scrollingElement.scrollTop : target.scrollTop;
            instance.element.classList.toggle("visible", scroll_top > 0);
        };
        scroll_owner.addEventListener("scroll", instance.onScroll);
        instance.onScroll();
        document.body.appendChild(instance.element);
        return instance.element;
    }
    /**
     * A small status pill (e.g. a job/order status column, a count next to a nav item).
     * @param {string} text
     * @param {Object} [options]
     * @param {"neutral"|"info"|"success"|"warning"|"danger"} [options.color="neutral"]
     * @param {string} [options.hint] optional hover hint, wired via `addHint`
     * @param {"top"|"left"|"right"|"bottom"} [options.anchor] hint anchor, used with `options.hint`
     * @returns {HTMLSpanElement}
     */
    static createBadge(text, options = {}) {
        const badge = document.createElement("span");
        badge.className = `ui-badge ui-badge-${options.color ?? "neutral"}`;
        badge.innerText = text;
        if (options.hint != undefined) {
            UiBuilder.addHint({ hint: options.hint, target: badge, anchor: options.anchor ?? "top" });
        }
        return badge;
    }
    /**
     * A debounced search box - fires `options.onSearch(query)` `options.debounce_ms` after typing
     * stops, instead of on every keystroke.
     * @param {Object} options
     * @param {(query: string) => void} options.onSearch
     * @param {number} [options.debounce_ms=250]
     * @param {string} [options.placeholder]
     * @returns {HTMLInputElement}
     */
    static createSearchInput(options) {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "ui-search-input";
        input.placeholder = options.placeholder ?? Locale.at("cerca");
        let debounce_timer_id = null;
        input.addEventListener("input", () => {
            if (debounce_timer_id != null) {
                clearTimeout(debounce_timer_id);
            }
            debounce_timer_id = setTimeout(() => {
                options.onSearch(input.value);
            }, options.debounce_ms ?? 250);
        });
        return input;
    }
    /**
     * A single "label + control" settings row (iOS/Android settings-list style).
     * @param {Object} options
     * @param {string} options.label
     * @param {string} [options.description] smaller line shown under the label
     * @param {Element} options.control typically a `createToggle`/`createButton`/`<input>` result
     * @param {Function} [options.onClick] makes the whole row clickable, in addition to `control`
     * @returns {HTMLDivElement}
     */
    static createSettingsRow(options) {
        const row = document.createElement("div");
        row.className = "settings-row";
        const text_container = document.createElement("div");
        text_container.className = "settings-row-text";
        const label = document.createElement("div");
        label.className = "settings-row-label";
        label.innerText = options.label;
        text_container.appendChild(label);
        if (options.description != undefined) {
            const description = document.createElement("div");
            description.className = "settings-row-description";
            description.innerText = options.description;
            text_container.appendChild(description);
        }
        row.appendChild(text_container);
        const control_container = document.createElement("div");
        control_container.className = "settings-row-control";
        control_container.appendChild(options.control);
        row.appendChild(control_container);
        if (options.onClick != undefined) {
            row.classList.add("settings-row-clickable");
            row.addEventListener("click", options.onClick);
        }
        return row;
    }
    /**
     * Groups `createSettingsRow` results under an optional title.
     * @param {Object} options
     * @param {string} [options.title]
     * @param {Element[]} options.rows typically `createSettingsRow(...)` results
     * @returns {HTMLDivElement}
     */
    static createSettingsGroup(options) {
        const group = document.createElement("div");
        group.className = "settings-group";
        if (options.title != undefined) {
            const title = document.createElement("div");
            title.className = "settings-group-title";
            title.innerText = options.title;
            group.appendChild(title);
        }
        const list = document.createElement("div");
        list.className = "settings-group-list";
        options.rows.forEach(row => list.appendChild(row));
        group.appendChild(list);
        return group;
    }
    /**
     * Like `createButton`, but `options.onClick` may return a Promise: the button auto-disables
     * (shows a spinner via the `ui-loading` class) while it's pending, and shows an error `Notify`
     * toast if it rejects - removing the repetitive "disable -> await Lobby.post -> re-enable,
     * catch errors" boilerplate that shows up around most server-round-trip buttons.
     * @param {Object} options same as `createButton`, plus:
     * @param {(event: MouseEvent) => Promise<any>} options.onClick
     * @param {string} [options.error_text] overrides the default error toast text
     * @returns {HTMLDivElement}
     */
    static createAsyncButton(options) {
        const { onClick, error_text, ...button_options } = options;
        const button = UiBuilder.createButton({
            ...button_options,
            onClick: async (event) => {
                if (button.classList.contains("ui-loading")) {
                    return;
                }
                button.classList.add("ui-loading");
                try {
                    await onClick(event);
                } catch (error) {
                    console.error(error);
                    new Notify({
                        text: error_text ?? Locale.at("something went wrong"),
                        event: event,
                        type: -1,
                    });
                } finally {
                    button.classList.remove("ui-loading");
                }
            },
        });
        return button;
    }
    /**
    * 
    * @param {Object} options
    * @param {string} [options.id] assigned as the chart container's element id; also used as the
    *   localStorage key to remember the regression trend's on/off state and blend amount across
    *   chart re-creations (e.g. page reloads) - omit for no persistence
    * @param {string} [options.title]
    * @param {string} [options.title_volume]
    * @param {string} [options.title_linear]
    * @param {'linear'|'dotted'|'dots'} [options.type] linear|dotted|dots
    * @param {Object} options.data
    * @param {Array<number>} options.data.linear
    * @param {Array<number>} options.data.volume
    * @param {Array<Date>} options.data.axys_x
    */
    static createChart(options) {
        if (options.data.linear.length == 0 && options.data.volume.length == 0) {
            return new EmptyState({
                icon_code: "f804",
                title: Locale.at("No Data"),
                // action_text: Locale.at("retry"),
                // onAction: () => run(),
            }).elementReference();
        }
        const container = document.createElement("div");
        if (options.id) {
            container.id = options.id;
        }
        container.style.marginLeft = "auto";
        container.style.marginRight = "auto";
        container.style.position = "relative";
        // Validate input
        const { volume, linear, axys_x } = options.data;

        // Theme colors: canvas drawing can't inherit CSS, so pull the vars_vscode_dark.css
        // custom properties directly - fillStyle/strokeStyle accept any CSS color string
        const root_style = getComputedStyle(document.documentElement);
        const theme_var = (name, fallback) => root_style.getPropertyValue(name)?.trim() || fallback;
        const color_line = theme_var("--vscode-chart-line", "#0077cc");
        const color_axis = theme_var("--vscode-chart-axis", "#000");
        const color_guide = theme_var("--vscode-chart-guide", "rgba(0, 0, 0, 0.2)");
        const color_text = theme_var("--vscode-charts-foreground", "#000");
        const color_volume = theme_var("--vscode-charts-green", "#66cc66");
        const color_trend = theme_var("--vscode-charts-purple", "#b180d7");
        const font_family = theme_var("--vscode-font-family", "Arial, sans-serif");

        if (axys_x !== undefined) {
            const refLength = volume.length ?? linear.length;
            if (axys_x.length !== refLength) {
                throw new Error("Data Mismatch: axys_x length does not match other data arrays");
            }
        }

        const canvas = document.createElement("canvas");
        container.appendChild(canvas);
        const ctx = canvas.getContext("2d");

        const width = 600;
        const height = 400;
        canvas.width = width;
        canvas.height = height;

        const padding = 50;
        const chartHeight = height - padding * 2;
        const chartWidth = width - padding * 2;
        const pointCount = volume?.length ?? linear?.length;
        const xLabels = axys_x ?? Array.from({ length: pointCount }, (_, i) => i);

        const getMax = arr => Math.max(...arr);
        const getMin = arr => Math.min(...arr);

        // Determine combined max for scaling - recomputed on each render() from whichever
        // dataset(s) are currently toggled on, so hiding one rescales the other to fill the chart
        const maxLinear = linear ? getMax(linear) : 0;
        const maxVolume = volume ? getMax(volume) : 0;
        let overallMax = Math.max(maxLinear, maxVolume, 1); // prevent division by zero

        // Scale functions
        const scaleX = i => padding + (i / (pointCount - 1)) * chartWidth;
        const scaleY = val => height - padding - (val / overallMax) * chartHeight;

        // Geometry for the click-to-label toggle below: candidate placements around a point,
        // tried in this order until one's (rotated) bounding box clears both adjacent line
        // segments, so the label doesn't get drawn on top of the line it's describing
        const label_angle = -30 * Math.PI / 180;
        const label_directions = [
            { dx: 0, dy: -1 }, // top
            { dx: 0, dy: 1 }, // bottom
            { dx: -1, dy: 0 }, // left
            { dx: 1, dy: 0 }, // right
            { dx: Math.SQRT1_2, dy: -Math.SQRT1_2 }, // top-right
            { dx: Math.SQRT1_2, dy: Math.SQRT1_2 }, // bottom-right
            { dx: -Math.SQRT1_2, dy: -Math.SQRT1_2 }, // top-left
            { dx: -Math.SQRT1_2, dy: Math.SQRT1_2 }, // bottom-left
        ];
        const segments_intersect = (p1, p2, p3, p4) => {
            const ccw = (a, b, c) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
            return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
        };
        const point_in_rect = (point, corners) => {
            let sign = null;
            for (let k = 0; k < corners.length; k++) {
                const a = corners[k];
                const b = corners[(k + 1) % corners.length];
                const side = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x) > 0;
                if (sign === null) sign = side;
                else if (sign !== side) return false;
            }
            return true;
        };
        const rect_intersects_segment = (corners, p1, p2) => {
            for (let k = 0; k < corners.length; k++) {
                if (segments_intersect(corners[k], corners[(k + 1) % corners.length], p1, p2)) return true;
            }
            return point_in_rect(p1, corners) || point_in_rect(p2, corners);
        };
        const rotated_label_corners = (anchor_x, anchor_y, half_w, half_h) => {
            const cos_a = Math.cos(label_angle), sin_a = Math.sin(label_angle);
            return [
                { x: -half_w, y: -half_h },
                { x: half_w, y: -half_h },
                { x: half_w, y: half_h },
                { x: -half_w, y: half_h },
            ].map(({ x, y }) => ({
                x: anchor_x + x * cos_a - y * sin_a,
                y: anchor_y + x * sin_a + y * cos_a,
            }));
        };

        const offstet = 0;
        const barWidth = volume ? Math.min((chartWidth / pointCount) * 0.7, 30) : 0; // 70% width for bars

        // legend geometry - computed once since the labels/font are static; reused both by
        // render() below and by the click-to-toggle overlays created after it
        const legend_baseline_y = padding - 25;
        const legend_margin = 15;
        const legend_gap_after_swatch = 5;
        const legend_gap_between_groups = 15;
        const legend_swatch_size = 15;

        ctx.font = `bold 12px ${font_family}`;
        const volume_label = options.title_volume ?? "volume";
        const line_label = options.title_linear ?? "value";
        const volume_label_width = ctx.measureText(volume_label).width;
        const line_label_width = ctx.measureText(line_label).width;

        const line_label_x = width - legend_margin - line_label_width;
        const line_swatch_end_x = line_label_x - legend_gap_after_swatch;
        const line_swatch_start_x = line_swatch_end_x - legend_swatch_size;
        const volume_label_x = line_swatch_start_x - legend_gap_between_groups - volume_label_width;
        const volume_swatch_end_x = volume_label_x - legend_gap_after_swatch;
        const volume_swatch_start_x = volume_swatch_end_x - legend_swatch_size;

        // toggled by clicking the legend swatches below
        let show_linear = true;
        let show_volume = true;

        // Trend on/off + blend amount, remembered across chart re-creations via localStorage
        // when options.id is provided (see options.id doc above)
        const trend_storage_key = options.id ? `chart-trend:${options.id}` : null;
        let saved_trend_state = null;
        if (trend_storage_key) {
            try {
                saved_trend_state = JSON.parse(localStorage.getItem(trend_storage_key));
            } catch (e) {
                console.warn(`Failed to load chart trend state from localStorage: ${e.message}`);
            }
        }
        const save_trend_state = () => {
            if (!trend_storage_key) return;
            try {
                localStorage.setItem(trend_storage_key, JSON.stringify({ show_trend, regression_blend }));
            } catch (e) {
                console.warn(`Failed to save chart trend state to localStorage: ${e.message}`);
            }
        };

        // toggled by the footer toggle below
        let show_trend = saved_trend_state?.show_trend ?? false;
        // 0 (pure linear trend) - 1 (pure LOWESS curve), driven by the footer slider below
        let regression_blend = saved_trend_state?.regression_blend ?? 0;

        // Same algorithm as ChartBase.blendedRegressionLine (components/GeneralChart/lib), but
        // duplicated locally rather than called directly: JSProvider.cs's per-page bundler only
        // pulls a component's JS in when the *page's own* script mentions that component by name,
        // so a page that calls UiBuilder.createChart() without also using GeneralChart would never
        // get ChartBase bundled in, throwing "ChartBase is not defined" at runtime.
        const linear_regression_line = (data) => {
            const known_points = data
                .map((value, index) => (value == null ? null : [index, value]))
                .filter((point) => point != null);
            if (known_points.length < 2) {
                return data.map(() => null);
            }
            const n = known_points.length;
            const sum_x = known_points.reduce((sum, [x]) => sum + x, 0);
            const sum_y = known_points.reduce((sum, [, y]) => sum + y, 0);
            const sum_xy = known_points.reduce((sum, [x, y]) => sum + x * y, 0);
            const sum_xx = known_points.reduce((sum, [x]) => sum + x * x, 0);
            const denominator = n * sum_xx - sum_x * sum_x;
            const slope = denominator === 0 ? 0 : (n * sum_xy - sum_x * sum_y) / denominator;
            const intercept = (sum_y - slope * sum_x) / n;
            return data.map((value, index) => (value == null ? null : slope * index + intercept));
        };
        const lowess_regression_line = (data, bandwidth = 0.3) => {
            const known_points = data
                .map((value, index) => (value == null ? null : [index, value]))
                .filter((point) => point != null);
            const result = data.map(() => null);
            if (known_points.length < 2) {
                return result;
            }
            const n = known_points.length;
            const window_size = Math.min(n, Math.max(2, Math.round(bandwidth * n)));
            known_points.forEach(([x0]) => {
                const distances = known_points.map(([x]) => Math.abs(x - x0));
                const max_distance = [...distances].sort((a, b) => a - b)[window_size - 1] || 1e-9;
                let sum_w = 0, sum_wx = 0, sum_wy = 0, sum_wxy = 0, sum_wxx = 0;
                known_points.forEach(([x, y], index) => {
                    const u = distances[index] / max_distance;
                    const weight = u >= 1 ? 0 : Math.pow(1 - Math.pow(u, 3), 3); // tricube kernel
                    sum_w += weight;
                    sum_wx += weight * x;
                    sum_wy += weight * y;
                    sum_wxy += weight * x * y;
                    sum_wxx += weight * x * x;
                });
                const denominator = sum_w * sum_wxx - sum_wx * sum_wx;
                if (denominator === 0) {
                    result[x0] = sum_wy / sum_w;
                    return;
                }
                const slope = (sum_w * sum_wxy - sum_wx * sum_wy) / denominator;
                const intercept = (sum_wy - slope * sum_wx) / sum_w;
                result[x0] = slope * x0 + intercept;
            });
            return result;
        };
        const blended_regression_line = (data, blend) => {
            const linear_line = linear_regression_line(data);
            if (blend <= 0) return linear_line;
            const lowess_line = lowess_regression_line(data);
            if (blend >= 1) return lowess_line;
            return linear_line.map((linear_value, index) => {
                const lowess_value = lowess_line[index];
                return linear_value == null || lowess_value == null
                    ? null
                    : linear_value * (1 - blend) + lowess_value * blend;
            });
        };

        function render() {
            overallMax = Math.max(show_linear ? maxLinear : 0, show_volume ? maxVolume : 0, 1);

            ctx.clearRect(0, 0, width, height);

            ctx.strokeStyle = color_axis;
            ctx.lineWidth = 1;

            // Y-axis gridlines + value labels - shown whenever *any* dataset is visible, scaled
            // to overallMax (which already reflects whichever one that is), not tied to `linear`
            // specifically - otherwise toggling the line off would take the axis with it
            if ((linear && show_linear) || (volume && show_volume)) {
                // Draw dashed horizontal lines at a "nice" step (1/2/5 x10^n) sized off the data's
                // own range, so sparse gridlines don't disappear when overallMax < 100 and dense
                // ones don't clutter the chart when overallMax is in the thousands
                const target_line_count = 10;
                const rough_step = overallMax / target_line_count;
                const step_magnitude = Math.pow(10, Math.floor(Math.log10(rough_step)));
                const step_normalized = rough_step / step_magnitude;
                const nice_step_normalized = step_normalized <= 1 ? 1 : step_normalized <= 2 ? 2 : step_normalized <= 5 ? 5 : 10;
                const step = nice_step_normalized * step_magnitude;
                const numberOfLines = Math.floor(overallMax / step);

                ctx.strokeStyle = color_guide;
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]); // dashed pattern

                for (let i = 1; i <= numberOfLines; i++) {
                    const yVal = i * step;
                    const yPos = scaleY(yVal);

                    // Draw dashed line
                    ctx.beginPath();
                    ctx.moveTo(padding - offstet, yPos);
                    ctx.lineTo(width - padding + offstet, yPos);
                    ctx.stroke();

                    // Draw label on the left side
                    ctx.font = `10px ${font_family}`;
                    ctx.fillStyle = color_text;
                    ctx.setLineDash([]); // reset dash for text

                    const labelText = `${yVal.toString()}` + (show_linear ? ' €' : ' ');
                    const textWidth = ctx.measureText(labelText).width;

                    ctx.fillText(
                        labelText,
                        padding - textWidth - 15 - offstet, // slightly left of y-axis
                        yPos + 3 // slight vertical adjustment
                    );

                    // Reset dash pattern for next line
                    ctx.setLineDash([5, 5]);
                }

                // Reset dash style after drawing
                ctx.setLineDash([]);
            }
            if (linear && show_linear) {
                ctx.beginPath();
                ctx.strokeStyle = color_line;

                ctx.lineWidth = 1;
                if (options.type === "linear" || !options.type) {
                    // Default linear line
                    ctx.beginPath();
                    linear.forEach((val, i) => {
                        const x = scaleX(i);
                        const y = scaleY(val);
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    });
                    ctx.stroke();
                } else if (options.type === "dotted") {
                    // Dotted line + bigger dots
                    ctx.beginPath();
                    ctx.setLineDash([6, 6]); // dashed pattern
                    linear.forEach((val, i) => {
                        const x = scaleX(i);
                        const y = scaleY(val);
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    });
                    ctx.stroke();
                    ctx.setLineDash([]); // reset

                    // Draw bigger dots at each coordinate
                    ctx.fillStyle = color_line;
                    linear.forEach((val, i) => {
                        const x = scaleX(i);
                        const y = scaleY(val);
                        ctx.beginPath();
                        ctx.arc(x, y, 4, 0, 2 * Math.PI); // radius 4px
                        ctx.fill();
                    });
                } else if (options.type === "dots") {
                    // Only dots, no connecting lines
                    ctx.fillStyle = color_line;
                    linear.forEach((val, i) => {
                        const x = scaleX(i);
                        const y = scaleY(val);
                        ctx.beginPath();
                        ctx.arc(x, y, 3, 0, 2 * Math.PI); // radius 3px
                        ctx.fill();
                    });
                }
                ctx.stroke();

                // Blended linear-regression/LOWESS trend overlay, controlled by the footer slider
                // and footer checkbox
                if (show_trend) {
                    const regression_values = blended_regression_line(linear, regression_blend);
                    ctx.beginPath();
                    ctx.strokeStyle = color_trend;
                    ctx.lineWidth = 2;
                    let trend_started = false;
                    regression_values.forEach((val, i) => {
                        if (val == null) return;
                        const x = scaleX(i);
                        const y = scaleY(val);
                        if (!trend_started) {
                            ctx.moveTo(x, y);
                            trend_started = true;
                        } else {
                            ctx.lineTo(x, y);
                        }
                    });
                    ctx.stroke();
                    ctx.lineWidth = 1;
                }
            }
            if (volume) {
                // X-axis date labels always drawn (they describe the shared x axis, not the bars
                // themselves) - only the bars are gated on show_volume

                // With many points the per-point spacing can be narrower than a label, so labels
                // start overlapping - thin them out to roughly one per `label_stride` points based
                // on how wide a day-number label actually is versus the space each point gets
                ctx.font = `10px ${font_family}`;
                const sample_label_width = ctx.measureText("22").width; // representative 2-digit day
                const min_label_gap = 4;
                const point_spacing = chartWidth / pointCount;
                const label_stride = Math.max(1, Math.ceil((sample_label_width + min_label_gap) / point_spacing));

                volume.forEach((vol, i) => {
                    const x = scaleX(i);

                    if (show_volume) {
                        const y = scaleY(vol);
                        const heightBar = height - padding - y; // height of the bar
                        ctx.fillStyle = color_volume;
                        ctx.fillRect(
                            x - barWidth / 2,
                            y,
                            barWidth,
                            heightBar
                        );
                    }

                    // Skip this label if it falls between strides, unless it's the last point
                    // (so the label row never trails off with an empty gap at the end)
                    if (i % label_stride !== 0 && i !== pointCount - 1) return;

                    // Prepare label for x-axis (either from axys_x or index)
                    const label = `${xLabels[i].getDate()}`;

                    const date = xLabels[i]; // assuming xLabels contains Date objects
                    if (date instanceof Date && date.getDay() === 0) { // getDay() === 0 for Sunday
                        ctx.font = `bold 12px ${font_family}`; // bold font for Sundays
                    } else {
                        ctx.font = `10px ${font_family}`;
                    }
                    ctx.fillStyle = color_text;

                    // Measure text width to center it
                    const textWidth = ctx.measureText(label).width;

                    // Draw label centered under the bar
                    ctx.fillText(
                        label,
                        (x - textWidth / 2),
                        height - padding + 12 // position below x-axis line
                    );
                });

                ctx.fillStyle = color_text;
                ctx.font = `10px ${font_family}`;
                const format_month_year = date => `${date.getMonth() + 1}/${date.getFullYear()}`;

                // One "M/YYYY" label per month, placed under that month's first data point
                // (the very first point always counts, even mid-month, so the chart never opens
                // without a month label)
                xLabels.forEach((date, i) => {
                    if (!(date instanceof Date)) return;
                    if (i !== 0 && date.getDate() !== 1) return;

                    const label_month_year = format_month_year(date);
                    const textWidth = ctx.measureText(label_month_year).width;

                    ctx.fillText(
                        label_month_year,
                        (scaleX(i)) - offstet + 3,
                        height - padding + 25 // position below x-axis line
                    );
                });
            }

            //draw title chart
            ctx.fillStyle = color_text;
            ctx.font = `bold 16px ${font_family}`;
            const titolo_chart = options.title ?? "chart";
            ctx.fillText(
                titolo_chart,
                15,
                padding - 25// position below x-axis line
            );

            // legend, right-aligned on the same horizontal line as the title - dimmed when its
            // dataset is toggled off
            ctx.font = `bold 12px ${font_family}`;

            //legend volume
            ctx.globalAlpha = show_volume ? 1 : 0.35;
            ctx.fillStyle = color_volume;
            ctx.fillRect(
                volume_swatch_start_x,
                legend_baseline_y - 11,
                legend_swatch_size,
                legend_swatch_size
            );
            ctx.fillStyle = color_text;
            ctx.fillText(volume_label, volume_label_x, legend_baseline_y);
            ctx.globalAlpha = 1;

            //legend line
            ctx.globalAlpha = show_linear ? 1 : 0.35;
            ctx.strokeStyle = color_line;
            ctx.beginPath();
            ctx.moveTo(line_swatch_start_x, legend_baseline_y - 4);
            ctx.lineTo(line_swatch_end_x, legend_baseline_y - 4);
            ctx.stroke();
            ctx.fillStyle = color_text;
            ctx.fillText(line_label, line_label_x, legend_baseline_y);
            ctx.globalAlpha = 1;

            ctx.strokeStyle = color_axis;
            ctx.lineWidth = 1;

            // // Y-axis
            // ctx.beginPath();
            // ctx.moveTo(padding - offstet, padding);
            // ctx.lineTo(padding - offstet, height - padding);
            // ctx.stroke();

            // // X-axis
            // ctx.beginPath();
            // ctx.moveTo(padding - offstet, height - padding);
            // ctx.lineTo(width - padding + offstet, height - padding);
            // ctx.stroke();
        }
        render();

        // per-index value-label visibility, so a double-click can show/hide every label at once
        // instead of only the one under the cursor. Labels are redrawn from scratch on every
        // change (full render() + replay the visible set) rather than patched in place with
        // getImageData/putImageData - with points this close together, neighboring labels'
        // bounding boxes can overlap, and restoring one's "before" pixels then leaves residue
        // from (or erases part of) whichever label was drawn over that same area afterwards
        const visible_labels = new Set();
        let all_labels_shown = false;

        // every label shares the same rotation, so un-rotating a candidate anchor by -label_angle
        // turns its bounding box into an axis-aligned rect in that "label space" - two labels'
        // boxes then overlap in real space iff their label-space AABBs overlap, which is far
        // simpler than a general rotated-rect intersection test
        const to_label_space = (x, y) => {
            const cos_a = Math.cos(-label_angle), sin_a = Math.sin(-label_angle);
            return { x: x * cos_a - y * sin_a, y: x * sin_a + y * cos_a };
        };
        const rects_overlap = (a, b) => !(a.max_x < b.min_x || b.max_x < a.min_x || a.max_y < b.min_y || b.max_y < a.min_y);

        const compute_label_placement = (i, placed_rects) => {
            const point_x = scaleX(i);
            const point_y = scaleY(linear[i]);
            const prev_point = i > 0 ? { x: scaleX(i - 1), y: scaleY(linear[i - 1]) } : null;
            const next_point = i < linear.length - 1 ? { x: scaleX(i + 1), y: scaleY(linear[i + 1]) } : null;

            const text_value = `${linear[i]}`;
            ctx.font = `10px ${font_family}`;
            const half_w = ctx.measureText(text_value).width / 2 + 4;
            const half_h = 10; // ~half line height + padding
            const gap = 16; // distance from the point to the label's center

            const rect_at = (anchor_x, anchor_y) => {
                const center = to_label_space(anchor_x, anchor_y);
                return { min_x: center.x - half_w, max_x: center.x + half_w, min_y: center.y - half_h, max_y: center.y + half_h };
            };

            for (const direction of label_directions) {
                const anchor_x = point_x + direction.dx * gap;
                const anchor_y = point_y + direction.dy * gap;
                const corners = rotated_label_corners(anchor_x, anchor_y, half_w, half_h);
                const rect = rect_at(anchor_x, anchor_y);
                const blocked =
                    (prev_point && rect_intersects_segment(corners, prev_point, { x: point_x, y: point_y })) ||
                    (next_point && rect_intersects_segment(corners, { x: point_x, y: point_y }, next_point)) ||
                    placed_rects.some(other => rects_overlap(rect, other));
                if (!blocked) return { anchor_x, anchor_y, text_value, rect };
            }
            // every position collides (e.g. a steep V around this point, or other visible labels
            // crowding all 8 spots) - fall back to top
            const anchor_x = point_x + label_directions[0].dx * gap;
            const anchor_y = point_y + label_directions[0].dy * gap;
            return { anchor_x, anchor_y, text_value, rect: rect_at(anchor_x, anchor_y) };
        };
        const draw_label = (i, placed_rects) => {
            const placement = compute_label_placement(i, placed_rects);
            placed_rects.push(placement.rect);
            ctx.save();
            ctx.font = `10px ${font_family}`;
            ctx.translate(placement.anchor_x, placement.anchor_y);
            ctx.rotate(label_angle);
            ctx.fillStyle = color_text;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(placement.text_value, 0, 0);
            ctx.restore();
        };
        const redraw_labels = () => {
            render();
            // placed in Set insertion order, so a label's spot never moves just because a later
            // one was added - only later labels adjust to dodge the earlier, already-fixed ones
            const placed_rects = [];
            visible_labels.forEach(i => draw_label(i, placed_rects));
        };
        const show_label = (i) => {
            if (!linear || visible_labels.has(i)) return;
            visible_labels.add(i);
            redraw_labels();
        };
        const hide_label = (i) => {
            if (!visible_labels.has(i)) return;
            visible_labels.delete(i);
            redraw_labels();
        };
        const toggle_all_labels = () => {
            all_labels_shown = !all_labels_shown;
            visible_labels.clear();
            if (all_labels_shown) {
                for (let i = 0; i < pointCount; i++) visible_labels.add(i);
            }
            redraw_labels();
        };

        // one-time hint/click overlays for each bar's index - kept outside render() so toggling
        // a legend item doesn't tear down and recreate these listeners on every click
        if (volume) {
            volume.forEach((vol, i) => {
                const x = scaleX(i);
                const date = xLabels[i]; // assuming xLabels contains Date objects

                // Create invisible overlay div for hint
                const invisible_drawn_bar = document.createElement("div");
                invisible_drawn_bar.style.position = "absolute";
                invisible_drawn_bar.style.background = "transparent"; // invisible
                // invisible_drawn_bar.style.outline = "1px solid red"; // debug
                invisible_drawn_bar.style.left = `${canvas.offsetLeft + (x - barWidth / 2) + offstet}px`;
                invisible_drawn_bar.style.top = `${canvas.offsetTop + 40}px`;
                invisible_drawn_bar.style.width = `${barWidth}px`;
                invisible_drawn_bar.style.height = `${canvas.height - 70}px`;
                container.appendChild(invisible_drawn_bar);
                if (linear) {
                    // click toggles just this point's value label; double-click toggles every
                    // point's label at once (the two clicks that make up the dblclick also fire
                    // as clicks first, so this point briefly flips on/off before "toggle all" runs)
                    invisible_drawn_bar.addEventListener("click", () => {
                        visible_labels.has(i) ? hide_label(i) : show_label(i);
                    });
                    invisible_drawn_bar.addEventListener("dblclick", () => toggle_all_labels());
                }
                if (date instanceof Date) {
                    const the_hint = `${Locale.parseDateConvertToReadable(date)}\n${options.title_linear} ${linear[i]}\n${options.title_volume} ${vol}`;
                    UiBuilder.addHint({
                        hint: the_hint,
                        target: invisible_drawn_bar,
                        anchor: "right",
                    });
                }
            });
        }

        // legend click overlays - toggle the corresponding dataset's visibility and re-render
        const make_legend_toggle = (start_x, end_x, top_y, bottom_y, toggle) => {
            const overlay = document.createElement("div");
            overlay.style.position = "absolute";
            overlay.style.cursor = "pointer";
            overlay.style.background = "transparent";
            overlay.style.left = `${canvas.offsetLeft + start_x}px`;
            overlay.style.top = `${canvas.offsetTop + top_y}px`;
            overlay.style.width = `${end_x - start_x}px`;
            overlay.style.height = `${bottom_y - top_y}px`;
            overlay.addEventListener("click", () => {
                toggle();
                redraw_labels(); // repaints via render() and replays any still-visible value labels
            });
            container.appendChild(overlay);
        };
        if (volume) {
            make_legend_toggle(
                volume_swatch_start_x, volume_label_x + volume_label_width,
                legend_baseline_y - 11, legend_baseline_y + 8,
                () => { show_volume = !show_volume; }
            );
        }
        if (linear) {
            make_legend_toggle(
                line_swatch_start_x, line_label_x + line_label_width,
                legend_baseline_y - 11, legend_baseline_y + 8,
                () => { show_linear = !show_linear; }
            );
        }

        // footer: slider blending the trend overlay from a straight linear-regression line to a
        // full LOWESS curve, per ChartBase.blendedRegressionLine
        if (linear) {
            const footer = document.createElement("div");
            footer.style.display = "flex";
            footer.style.alignItems = "center";
            footer.style.gap = "8px";
            footer.style.padding = "6px 15px 0";
            footer.style.fontFamily = "var(--vscode-font-family)";
            footer.style.fontSize = "12px";
            footer.style.color = "var(--vscode-descriptionForeground)";

            const trend_toggle_options = {
                label: Locale.at("Regression"),
                innerText: { on: "on", off: "off" },
                isOn: show_trend,
                theme: "mini",
                onClick: () => {
                    show_trend = !show_trend;
                    trend_toggle_options.setIsOn(show_trend);
                    update_trend_controls_enabled();
                    save_trend_state();
                    redraw_labels(); // repaints via render() and replays any still-visible value labels
                },
            };
            footer.appendChild(UiBuilder.createToggle(trend_toggle_options));

            const blend_slider = document.createElement("input");
            blend_slider.type = "range";
            blend_slider.min = "0";
            blend_slider.max = "1";
            blend_slider.step = "0.01";
            blend_slider.value = `${regression_blend}`;
            blend_slider.style.flex = "1";
            footer.appendChild(blend_slider);

            const blend_readout = document.createElement("span");
            blend_readout.style.minWidth = "100px";
            blend_readout.style.textAlign = "right";
            const update_blend_readout = () => {
                blend_readout.innerText = regression_blend <= 0
                    ? Locale.at("Linear")
                    : regression_blend >= 1
                        ? Locale.at("LOWESS")
                        : `${Math.round(regression_blend * 100)}% ${Locale.at("LOWESS")}`;
            };
            update_blend_readout();
            footer.appendChild(blend_readout);

            const update_trend_controls_enabled = () => {
                blend_slider.disabled = !show_trend;
                blend_slider.style.opacity = show_trend ? "1" : "0.4";
                blend_readout.style.opacity = show_trend ? "1" : "0.4";
            };
            update_trend_controls_enabled();

            blend_slider.addEventListener("input", () => {
                regression_blend = parseFloat(blend_slider.value);
                update_blend_readout();
                save_trend_state();
                redraw_labels(); // repaints via render() and replays any still-visible value labels
            });

            container.appendChild(footer);
        }

        return container;
    }
    /**
     * Standard "fetch -> loading/empty/error/content" lifecycle for a container: shows a
     * `SkeletonLoader` while `options.promise_factory()` is pending, then swaps it for either the
     * result of `options.render(data)`, an `EmptyState` (when `options.isEmpty(data)` says so), or
     * an `EmptyState` wired to retry (on rejection). Replaces the manual loading/empty/error
     * juggling most fetch-driven views otherwise repeat by hand.
     * @param {Element} container cleared and populated in place
     * @param {Object} options
     * @param {() => Promise<any>} options.promise_factory called once, and again on retry
     * @param {(data: any) => (Element|void)} options.render builds the real content; if it
     *   returns an Element, that element is appended into `container` - otherwise `render` is
     *   assumed to have already populated `container` itself
     * @param {(data: any) => boolean} [options.isEmpty] defaults to null/undefined/empty-array
     * @param {Object} [options.skeleton] forwarded to `new SkeletonLoader(...)`
     * @param {Object} [options.empty] forwarded to `new EmptyState(...)` for the empty case
     * @param {Object} [options.error] forwarded to `new EmptyState(...)` for the error case,
     *   overriding its default retry-wired `onAction`/icon/title
     * @returns {Promise<void>}
     */
    static async renderAsyncView(container, options) {
        const {
            promise_factory,
            render,
            isEmpty = (data) => data == null || (Array.isArray(data) && data.length === 0),
            skeleton = {},
            empty = {},
            error = {},
        } = options;
        const run = async () => {
            container.innerHTML = "";
            const loader = new SkeletonLoader(skeleton);
            container.appendChild(loader.elementReference());
            try {
                const data = await promise_factory();
                loader.destroy();
                container.innerHTML = "";
                if (isEmpty(data)) {
                    const empty_state = new EmptyState(empty);
                    container.appendChild(empty_state.elementReference());
                    return;
                }
                const result = render(data);
                if (result instanceof Element) {
                    container.appendChild(result);
                }
            } catch (error_thrown) {
                console.error(error_thrown);
                loader.destroy();
                container.innerHTML = "";
                const error_state = new EmptyState({
                    icon_code: "e002",
                    title: Locale.at("something went wrong"),
                    action_text: Locale.at("retry"),
                    onAction: () => run(),
                    ...error,
                });
                container.appendChild(error_state.elementReference());
            }
        };
        await run();
    }
    //#endregion
    static toUInt = (str) => {
        if (str === null || str === undefined || str === '') {
            return 0;
        }
        try {
            return Math.min(Math.max(Number(`${str}`.match(/[0-9]+/)?.at(0)), 0), 9999999999);
        } catch (error) {
            return '';
        }
    }
}