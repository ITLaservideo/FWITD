
/**
 * @version 1.1
 * @ignore css / html
 */
class Notify {
    /**
     * @type Node
     */
    #self_ref;
    /**
     * @type number
     */
    id_timeout_auto_destroy = null;
    static #max_retries = 300; //100 -> 150seconds
    static #html_placeholder = null;
    /**
     * @param {object} options
     * @param {string} options.title 
     * @param {string} options.text 
     * @param {string} options.extra_data slightly visible
     * @param {number} options.type  0 ok | 1 warning | -1 error | question_mark_book
     * @param {Function} options.next 
     * @param {number} options.ms_timeout 
     */
    constructor(options) {
        this.#initialize(options);
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
        this.#self_ref = (Notify.#html_placeholder).cloneNode(true);
        const color = Notify.switchColor(options.type);
        const icon = Notify.switchIcon(options.type);
        const owner = this;
        this.#self_ref.style.borderColor = color;
        this.#self_ref.style.display = "flex";
        this.#self_ref.getElementsByClassName("function-svg")[0].style.background = color;
        this.#self_ref.getElementsByClassName("title")[0].innerText = Notify.convertToPlain(options.title);
        if (options.text != undefined) {
            this.#self_ref.getElementsByClassName("text")[0].innerText = Notify.convertToPlain(options.text);
        }
        this.#self_ref.getElementsByClassName("extra-data")[0].innerText = Notify.convertToPlain(options.extra_data);
        let img = this.#self_ref.getElementsByTagName("img")[0];
        img.src = img.src.replace("check.svg", icon);
        img.onclick = options.next;
        this.id_timeout_auto_destroy = Notify.#destroy(this, this.#self_ref, options.ms_timeout);
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
                this.#self_ref.style.cssText += ' bottom: unset !important;';
                owner.#self_ref.style.cssText += ' opacity: 1 !important;';
                if (options.style == 3) {
                    this.#self_ref.style.setProperty('left', `${x - (this.#self_ref.clientWidth / 2)}px`);
                    this.#self_ref.style.setProperty('top', `${y - 40}px`);
                } else {
                    this.#self_ref.style.setProperty('left', `${x - 250}px`);
                    this.#self_ref.style.setProperty('top', `${y - 120}px`);
                }
                UiBuilder.checkOverflow(owner.#self_ref);
            }, 0);
        } else {
            setTimeout(() => {
                owner.#self_ref.style.cssText += ' opacity: 1 !important;';
            }, 0);
        }
        this.applicaStili(options.style);
        requestAnimationFrame(() => {
            document.getElementsByTagName("body")[0].appendChild(this.#self_ref);
        });
    }
    applicaStili(num) {
        switch (num) {
            case 3:
                this.#self_ref.classList.toggle("typ3-3", true)
                break;
            default:
                break;
        }
    }
    /**
     * 
     * @param {Notify} notifica 
     * @param {string} timeoutf
     */
    static #destroy(notifica, clone, timeout) {
        return window.setTimeout(() => {
            if (clone != null) {
                clone.classList.add("unpop-from-below");
                setTimeout(() => {
                    clone.remove();
                }, timeout);
            } else {
                if (Notify.#html_placeholder == undefined) {
                    if (Notify.#max_retries > 0) {
                        notifica.cancelAutoDestroy(); //it's executing now what u gonna cancel???
                        setTimeout(() => {
                            Notify.#destroy(notifica, notifica.#self_ref, timeout);
                        }, 100);
                    }
                }
            }
        }, timeout);
    }/**
     * 
     * @param {number} timeout_ms 0 by default
     */
    destroy(timeout_ms = 0) {
        this.cancelAutoDestroy();
        this.id_timeout_auto_destroy = Notify.#destroy(this, this.#self_ref, timeout_ms);
    }
    cancelAutoDestroy() {
        if (this.id_timeout_auto_destroy != null) {
            window.clearTimeout(this.id_timeout_auto_destroy);
            this.id_timeout_auto_destroy = null;
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
                return "check.svg";
            case 1:
                return "chat_error.svg";
            case -1:
                return "warning.svg";
            default:
                return "question_mark_book.svg";
        }
    }
    static load() {
        const tmp_div = document.createElement("div");
        tmp_div.innerHTML = policy.createHTML(`${injector_html}`);
        Notify.#html_placeholder = tmp_div.firstElementChild;
    }
}
Notify.load();