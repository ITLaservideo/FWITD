/**
 * @version 1.0
 */
class TaskItem extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        this.#initialize();
        this.#addEventListeners();
        if (typeof this.options.onReady === "function") {
            this.options.onReady();
        }
    }
    async #initialize() {
        const owner = this;
        //TODO initialize component here

        owner.elements = {
            title: owner.self_ref.querySelector("[data-ref='title']"),
            description: owner.self_ref.querySelector("[data-ref='description']"),
            status: owner.self_ref.querySelector("[data-ref='status']")
        };

        owner.elements.title.textContent = owner.options.title || "Untitled";
        owner.elements.description.textContent = owner.options.description || "";

        owner.elements.classList.add(`status-${owner.options.status}`);
        return;
    }
    async #addEventListeners() {
        const owner = this;
        //TODO add event listeners for component here
    }
    // owner.self_ref;//access element reference here
    // owner.elementReference();//alternative way to access element reference
    // owner.destroy();//call destroy method when needed
    // owner.options;//access building options here
}