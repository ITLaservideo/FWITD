/**
 * @version 2.0
 */
class FrameworkTestComponent extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        this.#initialize(options);
        this.#addEventListeners(options);
        this.test();
    }
    async #initialize(options) {
        const owner = this;
        //TODO initialize component here
    }
    async #addEventListeners(options) {
        const owner = this;
        //TODO add event listeners for component here
    }
    async test() {
        const btn = UiBuilder.createButton({
            title: "Test Button",
            onClick: () => {
                alert("Button Clicked!");
            }
        });
        this.self_ref.appendChild(btn);
        const list_icons = this.self_ref.querySelector('.list-icons');
        const from = 61202;
        const to = from + 10;
        for (let i = from; i < to; i++) {
            try {
                const decimal_i = i.toString(16).padStart(4, '0');
                const wrapper = document.createElement('div');
                wrapper.classList.add('card');
                wrapper.style = "width: fit-content;height: fit-content;min-width: unset;min-height: unset;border: 1px solid;padding: 4px;";
                const text_character_code = document.createElement('div');
                text_character_code.innerText = `&#x${decimal_i};`;
                text_character_code.style.userSelect = 'all';
                wrapper.appendChild(text_character_code);
                wrapper.appendChild(FrameworkTestComponent.ezIcon(decimal_i));
                list_icons.appendChild(wrapper);
            } catch (error) {
                break;
            }
        }
    }
    static ezIcon(code_point) {
        const icon_character_code = document.createElement('div');
        icon_character_code.classList.add('f-icon');
        const char = String.fromCodePoint(parseInt(code_point, 16));
        icon_character_code.setAttribute('data-icon', char);
        return icon_character_code;
    }

}
setTimeout(() => {
    if (window.the_main_app == undefined) {
        const tmp = new FrameworkTestComponent({});
        document.body.appendChild(tmp.self_ref);
    }
}, 0);