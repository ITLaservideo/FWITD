/**
 * Presentational "nothing to show" placeholder - for empty lists, empty search results, or a
 * failed request (pass `action_text`/`onAction` wired to a retry). Sibling to `SkeletonLoader`:
 * mount a `SkeletonLoader` while a request is in flight, then swap it for either the real
 * content or an `EmptyState`, depending on the outcome. `UiBuilder.renderAsyncView` automates
 * exactly that handoff.
 * @version 1.0
 */
class EmptyState extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options
     * @param {string} [options.icon_code] Material Symbols codepoint (fonts.google.com/icons) -
     *   must exist in the embedded FrameworkIcons font subset; defaults to a generic glyph
     * @param {string} [options.title] bold headline; defaults to a generic "nothing here" message
     * @param {string} [options.text] supporting description line, shown under the title
     * @param {string} [options.action_text] label for the optional action button
     * @param {Function} [options.onAction] called when the action button is clicked; the button
     *   is omitted entirely when this is not provided
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
        icon: null,
        /**
         * @type HTMLElement
         */
        title: null,
        /**
         * @type HTMLElement
         */
        text: null,
        /**
         * @type HTMLElement
         */
        action_container: null,
    }
    #initialize(options) {
        const owner = this;
        if (options.icon_code != undefined) {
            owner.elements.icon.innerText = String.fromCodePoint(parseInt(options.icon_code, 16));
        }
        owner.elements.title.innerText = options.title ?? Locale.at("nothing to show here");
        if (options.text != undefined) {
            owner.elements.text.innerText = options.text;
        } else {
            owner.elements.text.remove();
        }
        if (options.onAction != undefined) {
            owner.elements.action_container.appendChild(UiBuilder.createButton({
                title: options.action_text ?? Locale.at("retry"),
                onClick: options.onAction,
            }));
        } else {
            owner.elements.action_container.remove();
        }
    }
}

//#START RESERVED AREA FOR UI_BUILDER
///*mock for the UIBuilder::live-watch-component uncomment to test it  */
// const mock_container = document.createElement("div");
// mock_container.style.display = "flex";
// mock_container.style.flexDirection = "column";
// mock_container.style.gap = "24px";
// mock_container.style.padding = "20px";
// document.body.appendChild(mock_container);

// // default - nothing to show yet
// const no_data = new EmptyState({
//     title: "No orders yet",
//     text: "Orders placed by customers will show up here.",
// });
// mock_container.appendChild(no_data.elementReference());

// // empty search results, no retry action
// const no_results = new EmptyState({
//     title: "No results",
//     text: "Try adjusting your filters or search terms.",
// });
// mock_container.appendChild(no_results.elementReference());

// // failed request, wired to a retry action
// const failed_request = new EmptyState({
//     icon_code: "e002", // error
//     title: "Something went wrong",
//     text: "Couldn't load the data - check your connection and try again.",
//     action_text: "retry",
//     onAction: () => console.log("retry clicked"),
// });
// mock_container.appendChild(failed_request.elementReference());
//#END RESERVED AREA FOR UI_BUILDER
