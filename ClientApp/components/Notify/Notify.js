
/**
* @version 2.0
*/
class Notify extends FrameworkGC(`${injector_html}`) {
    /**
     * @type number
     */
    id_timeout_auto_destroy = null;
    /**
     * gap, in px, kept between consecutive stacked (non-event-positioned) notifications
     */
    static #stack_gap_px = 10;
    /**
     * currently-visible, bottom-left-stacked notifications, in stacking order (bottom-most first);
     * event-positioned notifications (near a click/cursor) are never added here since they don't stack
     * @type {Notify[]}
     */
    static #stacked_instances = [];
    /**
     * @param {object} options
     * @param {string} options.title
     * @param {string} options.text
     * @param {string} options.extra_data slightly visible
     * @param {number} options.type  0 ok | 1 warning | -1 error | question_mark_book
     * @param {Function} options.next
     * @param {number} options.ms_timeout
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
        generic_icon: null,
        /**
         * @type HTMLElement
         */
        close_svg: null,
    }
    static convertToPlain(html) {
        if (html == undefined) {
            return "";
        }
        const tempDivElement = document.createElement("div");
        tempDivElement.innerHTML = UiBuilder.escapeHTML(html);
        return tempDivElement.innerText;
    }
    #initialize(options) {
        const owner = this;
        const color = Notify.switchColor(options.type);
        const icon_code = Notify.switchIcon(options.type);
        owner.self_ref.style.borderColor = color;
        owner.self_ref.style.display = "flex";
        owner.self_ref.getElementsByClassName("function-svg")[0].style.background = color;
        owner.self_ref.getElementsByClassName("title")[0].innerText = Notify.convertToPlain(options.title);
        if (options.text != undefined) {
            owner.self_ref.getElementsByClassName("text")[0].innerText = Notify.convertToPlain(options.text);
        }
        owner.self_ref.getElementsByClassName("extra-data")[0].innerText = Notify.convertToPlain(options.extra_data);
        owner.elements.generic_icon.onClick = options.next;
        owner.elements.generic_icon.innerHTML = icon_code;
        let close_btn = owner.elements.close_svg;
        if (close_btn != undefined) {
            close_btn.onclick = () => {
                owner.destroy(0);
            };
        }
        owner.id_timeout_auto_destroy = window.setTimeout(() => {
            owner.destroy(0);
        }, options.ms_timeout);
        if (options.event != null || (window.consumables != undefined && window.consumables.event != undefined)) {
            let x = 0;
            let y = 0;
            try {
                x = options.event.clientX ?? 50;
                y = options.event.clientY ?? 50;
            } catch { }
            if (window.consumables != undefined && window.consumables.event != undefined) {
                x = window.consumables.event.clientX ?? 0;
                y = window.consumables.event.clientY ?? 0;
                window.consumables.event = undefined;
            }
            setTimeout(() => {
                owner.self_ref.style.cssText += ' bottom: unset !important;';
                owner.self_ref.style.cssText += ' opacity: 1 !important;';
                if (options.style == 3) {
                    owner.self_ref.style.setProperty('left', `${x - (owner.self_ref.clientWidth / 2)}px`);
                    owner.self_ref.style.setProperty('top', `${y - 40}px`);
                } else {
                    owner.self_ref.style.setProperty('left', `${x - 250}px`);
                    owner.self_ref.style.setProperty('top', `${y - 120}px`);
                }
                UiBuilder.checkOverflow(owner.self_ref);
            }, 0);
        } else {
            owner.#is_stacked = true;
            setTimeout(() => {
                owner.self_ref.style.cssText += ' opacity: 1 !important;';
            }, 0);
        }
        owner.applicaStili(options.style);
        requestAnimationFrame(() => {
            document.getElementsByTagName("body")[0].appendChild(owner.self_ref);
            if (owner.#is_stacked) {
                Notify.#addToStack(owner);
            }
        });
    }
    /**
     * @type {boolean}
     */
    #is_stacked = false;
    /**
     * this instance's own `bottom` offset (px, on top of the base 2%), recorded so a later
     * addition can stack above its actual top edge even after earlier removals left a gap
     * @type {number}
     */
    #stack_offset_px = 0;
    /**
     * finds the lowest free slot that fits `owner` - reusing a gap left behind by an earlier
     * removal when one is large enough, instead of always growing on top of everything - and
     * adds it to the stack there
     * @param {Notify} owner
     */
    static #addToStack(owner) {
        const height = owner.self_ref.offsetHeight;
        const occupied = [...Notify.#stacked_instances].sort((a, b) => a.#stack_offset_px - b.#stack_offset_px);
        let candidate = 0;
        for (const other of occupied) {
            if (candidate + height + Notify.#stack_gap_px <= other.#stack_offset_px) {
                break; // gap before `other` is big enough, use it
            }
            candidate = other.#stack_offset_px + other.self_ref.offsetHeight + Notify.#stack_gap_px;
        }
        owner.#stack_offset_px = candidate;
        owner.self_ref.style.setProperty('bottom', `calc(2% + ${candidate}px)`);
        Notify.#stacked_instances.push(owner);
    }
    /**
     * removes `owner` from the stack, if present. The remaining notifications keep their
     * current position (no reflow) - only future ones will stack around the new gap.
     * @param {Notify} owner
     */
    static #removeFromStack(owner) {
        const index = Notify.#stacked_instances.indexOf(owner);
        if (index === -1) {
            return;
        }
        Notify.#stacked_instances.splice(index, 1);
    }
    applicaStili(num) {
        const owner = this;
        switch (num) {
            case 3:
                owner.self_ref.classList.toggle("typ3-3", true)
                break;
            case 21:
                owner.self_ref.classList.toggle("typ3-21", true)
                break;
            default:
                break;
        }
    }
    /**
     * @param {number} timeout_ms 0 by default - how long to let the close animation play before actual removal
     */
    destroy(timeout_ms = 0) {
        const owner = this;
        owner.cancelAutoDestroy();
        Notify.#removeFromStack(owner);
        owner.self_ref.classList.add("unpop-from-below");
        super.destroy(Math.max(timeout_ms, 300));
    }
    cancelAutoDestroy() {
        const owner = this;
        if (owner.id_timeout_auto_destroy != null) {
            window.clearTimeout(owner.id_timeout_auto_destroy);
            owner.id_timeout_auto_destroy = null;
        }
    }
    static switchColor(num) {
        switch (num) {
            case 0:
                return "#2bde3f";
            case 1:
                return "#ffc007";
            case -1:
                return "#e42636";
            default:
                return "#1d72f3";
        }
    }
    static switchIcon(num) {
        switch (num) {
            case 0:
                return "&#xe5ca;";
            // return "check.svg";
            case 1:
                return "&#xf7ac;";
            // return "chat_error.svg";
            case -1:
                return "&#xe002;";
            // return "warning.svg";
            default:
                return "&#xe88e;";
            // return "question_mark_book.svg";
        }
    }
    /**
     * clicking the notification pins it: cancels the auto-destroy timer and shows a pin icon so
     * it stays on screen until the user closes it manually
     * @param {Event} event
     */
    cancelAutoClose(event) {
        /**
         * @type HTMLElement
         */
        const element_with_this_event = this;
        /**
         * @type Notify
         */
        const owner = element_with_this_event.fwInstanceReference;
        if (owner.id_timeout_auto_destroy == null) {
            return; // already pinned (or already closing) - nothing to do
        }
        owner.cancelAutoDestroy();
        const pinned_icon = Icons.create("e6aa");
        pinned_icon.style = "position: absolute;right: 2px;top: 2px;rotate: 24deg;"
        pinned_icon.classList.add("notify-pinned-icon");
        owner.self_ref.appendChild(pinned_icon);
        owner.elements.close_svg.style = "font-size: 27px;padding: 18px;opacity: 1;display: flex;";
    }
}


//#START RESERVED AREA FOR UI_BUILDER
// const mock_titles = ["Operazione completata", "Attenzione", "Errore di rete", "Nuovo aggiornamento disponibile", "Salvataggio riuscito"];
// const mock_texts = ["Tutto è andato a buon fine.", "Controlla i dati inseriti.", "Impossibile contattare il server.", "Riprova tra qualche minuto.", undefined];
// const mock_types = [0, 1, -1, 2]; // 0 ok, 1 warning, -1 error, anything else -> question_mark_book
// const mock_styles = [0, 3, 21];
// function spawnRandomNotify() {
//     const type = mock_types[Math.floor(Math.random() * mock_types.length)];
//     new Notify({
//         title: mock_titles[Math.floor(Math.random() * mock_titles.length)],
//         text: mock_texts[Math.floor(Math.random() * mock_texts.length)],
//         extra_data: Math.random() > 0.5 ? `#${Math.floor(Math.random() * 9000 + 1000)}` : undefined,
//         type: type,
//         next: () => console.log("notify clicked"),
//         ms_timeout: 1500 + Math.random() * 4000,
//         style: mock_styles[Math.floor(Math.random() * mock_styles.length)],
//     });
// }
// for (let i = 0; i < 18; i++) {
//     try {
//         setTimeout(spawnRandomNotify, i * 800);
//     } catch (error) {
//         console.error("wtf:", error.message);
//     }
// }

//#END RESERVED AREA FOR UI_BUILDER