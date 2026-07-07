/**
 * @version 1.0
 */
class ListBox extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - FrameworkGC::callback(s) to be called on destroy
     * @param {Function} [options.onReady] - FrameworkGC::callback to be called when component is ready
     * @param {Array<Element|string>} [options.items] - initial items to add to the list
     * @param {Object} [options.Size] - size of the ListBox
     * @param {number|string} [options.Size.width] - width of the ListBox
     * @param {number|string} [options.Size.height] - height of the ListBox
     * @param {number|string} [options.Size.minItemHeight] - height of each item in the ListBox; when a pixel value is given and `fontSize` is omitted, the item font size is derived from it
     * @param {number|string} [options.Size.maxItemHeight] - maximum height of each item in the ListBox
     * @param {number|string} [options.Size.fontSize] - font size of each item in the ListBox; overrides the size derived from `minItemHeight`
     * @param {boolean} [options.autoScroll] - enable auto scroll when adding items
     * @param {string} [options.title] - title of the ListBox
     * @param {Function} [options.onItemClick] - callback when an item is clicked, receives (item_element)
     */
    constructor(options) {
        super(options);
        this.#initialize();
        this.#addEventListeners();
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
        clear_button: null,

        /**
         * @type HTMLElement
         */
        list_container: null,
    }
    async #initialize() {
        const owner = this;

        const root = owner.self_ref;

        // Apply title
        if (owner.options.title) {
            root.querySelector(".listbox-title").textContent = owner.options.title;
        }

        // Apply size
        if (owner.options.Size) {
            if (owner.options.Size.width) root.style.width = owner.options.Size.width;
            if (owner.options.Size.height) root.style.height = owner.options.Size.height;
        }

        // Add initial items
        if (Array.isArray(owner.options.items)) {
            owner.options.items.forEach(item => owner.addItem(item));
        }

        // Auto-scroll flag
        owner.autoScroll = owner.options.autoScroll ?? true;
        UiBuilder.addHint({ hint: Locale.at("clear"), target: this.elements.clear_button })
    }

    async #addEventListeners() {
        const owner = this;
        const list_container = owner.self_ref.querySelector(".list-container");

        // Example: click event for items
        list_container.addEventListener("click", (ev) => {
            const item = ev.target.closest(".list-item");
            if (!item) return;

            // Custom event hook
            if (typeof owner.options.onItemClick === "function") {
                owner.options.onItemClick(item);
            }
        });
    }
    /**
     * derives a comfortable font size from a pixel item height (e.g. "18px" -> "11px");
     * returns null when `height` isn't a plain px/number value (e.g. "1.2em", "auto")
     * @param {number|string} height
     * @returns {string|null}
     */
    #deriveFontSizeFromHeight(height) {
        const match = `${height}`.match(/^(-?[\d.]+)(px)?$/);
        if (!match) {
            return null;
        }
        const height_px = parseFloat(match[1]);
        if (isNaN(height_px)) {
            return null;
        }
        const font_size_px = Math.min(20, Math.max(9, Math.round(height_px * 0.6)));
        return `${font_size_px}px`;
    }
    /**
     *
     * @param {Element|string} item_content
     * @param {Object} style
     * @param {string} style.color
     * @param {string} style.backgroundColor
     */
    addItem(item_content, style = {}) {
        const owner = this;
        const item_element = document.createElement("div");
        item_element.classList.add("list-item");


        if (owner.options.Size?.minItemHeight) {
            item_element.style.minHeight = owner.options.Size.minItemHeight;
        }
        if (owner.options.Size?.maxItemHeight) {
            item_element.style.maxHeight = owner.options.Size.maxItemHeight;
        }
        if (owner.options.Size?.fontSize) {
            item_element.style.fontSize = owner.options.Size.fontSize;
        } else if (owner.options.Size?.minItemHeight) {
            const derived_font_size = owner.#deriveFontSizeFromHeight(owner.options.Size.minItemHeight);
            if (derived_font_size) {
                item_element.style.fontSize = derived_font_size;
            }
        }
        if (style != undefined) {
            if (style.color) {
                item_element.style.color = style.color;
            }
            if (style.backgroundColor) {
                item_element.style.backgroundColor = style.backgroundColor;
            }
        }
        if (typeof item_content === "string") {
            item_element.textContent = item_content;
        } else {
            item_element.appendChild(item_content);
        }

        owner.elements.list_container.appendChild(item_element);

        if (owner.autoScroll) {
            owner.elements.list_container.scrollTop = owner.elements.list_container.scrollHeight;
        }
    }
    removeLastItem() {
        if (owner.elements.list_container.children.length > 0) {
            owner.elements.list_container.removeChild(owner.elements.list_container.lastElementChild);
        }
    }
    //#region FrameworkEventListeners
    //@note private methods do not work :: they get mangled
    clearItems() {
        /**
         * @type HTMLElement
         */
        const element_with_this_event = this;
        /**
         * @type ComponentTemplate
         */
        const owner = element_with_this_event.fwInstanceReference;
        owner.elements.list_container.innerHTML = "";
    }
    //#endregion
}
