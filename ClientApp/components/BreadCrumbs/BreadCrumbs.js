/**
 * @typedef {Object} BreadCrumbItem
 * @property {string} text - label shown for this crumb
 * @property {string} [icon_code] - Material Symbols codepoint (fonts.google.com/icons) shown before the text -
 *   must exist in the embedded FrameworkIcons font subset
 * @property {Function} [onClick] - called with the item when this crumb is activated; ignored on the last
 *   item, which is always rendered as the current, non-interactive page
 */
/**
 * Presentational trail of ancestor pages leading to the current one. The last entry in `items` is always
 * rendered as the non-interactive "current page" crumb, regardless of whether it has an `onClick`.
 * @version 1.0
 */
class BreadCrumbs extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options
     * @param {BreadCrumbItem[]} options.items - ordered path, from root to current page
     * @param {string} [options.separator_icon_code] - Material Symbols codepoint shown between crumbs;
     *   defaults to "chevron_right"
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        console.assert(Array.isArray(options.items), "BreadCrumbs requires an options.items array");
        this.#initialize();
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
        list: null,
    }
    #initialize() {
        const owner = this;
        owner.setItems(owner.options.items);
    }
    /**
     * replaces the whole crumb trail
     * @param {BreadCrumbItem[]} items - ordered path, from root to current page
     */
    setItems(items) {
        const owner = this;
        owner.elements.list.innerHTML = "";
        items.forEach((item, index) => {
            const is_last = index === items.length - 1;
            owner.elements.list.appendChild(owner.#buildCrumb(item, is_last));
            if (!is_last) {
                owner.elements.list.appendChild(owner.#buildSeparator());
            }
        });
    }
    /**
     * @param {BreadCrumbItem} item
     * @param {boolean} is_last
     */
    #buildCrumb(item, is_last) {
        const li = document.createElement("li");
        li.className = "breadcrumb-item";
        const is_clickable = !is_last && typeof item.onClick === "function";
        const crumb = document.createElement(is_clickable ? "button" : "span");
        crumb.className = "breadcrumb-crumb";
        if (is_clickable) {
            crumb.type = "button";
        }
        if (item.icon_code != undefined) {
            const icon = Icons.create(item.icon_code);
            icon.classList.add("breadcrumb-icon");
            crumb.appendChild(icon);
        }
        const text = document.createElement("span");
        text.className = "breadcrumb-text";
        text.innerText = item.text;
        crumb.appendChild(text);
        if (is_last) {
            li.setAttribute("aria-current", "page");
            crumb.classList.add("current");
        } else if (is_clickable) {
            crumb.addEventListener("click", () => item.onClick(item));
        } else {
            crumb.classList.add("disabled");
        }
        li.appendChild(crumb);
        return li;
    }
    /**
     * @returns {HTMLElement}
     */
    #buildSeparator() {
        const owner = this;
        const li = document.createElement("li");
        li.className = "breadcrumb-separator";
        li.setAttribute("aria-hidden", "true");
        li.appendChild(Icons.create(owner.options.separator_icon_code ?? "e5cc"));
        return li;
    }
}

//#START RESERVED AREA FOR UI_BUILDER
///*mock for the UIBuilder::live-watch-component uncomment to test it  */
// const mock_container = document.createElement("div");
// mock_container.style.padding = "20px";
// document.body.appendChild(mock_container);

// const trail = new BreadCrumbs({
//     items: [
//         { text: "Home", icon_code: "e88a", onClick: (item) => console.log("clicked", item.text) },
//         { text: "Settings", onClick: (item) => console.log("clicked", item.text) },
//         { text: "Profile" },
//     ],
// });
// mock_container.appendChild(trail.elementReference());
//#END RESERVED AREA FOR UI_BUILDER
