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
     * @param {number|string} [options.Size.minItemHeight] - height of each item in the ListBox
     * @param {number|string} [options.Size.maxItemHeight] - maximum height of each item in the ListBox
     * @param {number|string} [options.Size.fontSize] - font size of each item in the ListBox
     * @param {boolean} [options.autoScroll] - enable auto scroll when adding items
     * @param {string} [options.title] - title of the ListBox
     * @param {Function} [options.onItemClick] - callback when an item is clicked, receives (item_element)
     */
    constructor(options) {
        super(options);
        this.#initialize();
        this.#addEventListeners();
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

        // Call ready callback
        if (typeof owner.options.onReady === "function") {
            owner.options.onReady();
        }
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
     * 
     * @param {Element|string} item_content 
     * @param {Object} style
     * @param {string} style.color
     * @param {string} style.backgroundColor
     * @param
     */
    addItem(item_content, style = {}) {
        const owner = this;
        const list_container = owner.self_ref.getElementsByClassName("list-container")[0];
        const item_element = document.createElement("div");
        item_element.classList.add("list-item");


        if (owner.options.Size.minItemHeight) {
            item_element.style.minHeight = owner.options.Size.minItemHeight;
        }
        if (owner.options.Size.maxItemHeight) {
            item_element.style.maxHeight = owner.options.Size.maxItemHeight;
        }
        if (owner.options.Size.fontSize) {
            item_element.style.fontSize = owner.options.Size.fontSize;
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

        list_container.appendChild(item_element);

        if (owner.autoScroll) {
            list_container.scrollTop = list_container.scrollHeight;
        }
    }

    clearItems() {
        const owner = this;
        const list_container = owner.self_ref.getElementsByClassName("list-container")[0];
        list_container.innerHTML = "";
    }
    removeLastItem() {
        const owner = this;
        const list_container = owner.self_ref.getElementsByClassName("list-container")[0];
        if (list_container.children.length > 0) {
            list_container.removeChild(list_container.lastElementChild);
        }
    }
}
