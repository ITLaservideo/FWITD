/**
 * @version 1.0
 */
class AndroidViewTasks extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        this.#initialize();
        this.#addEventListeners();
    }
    async #initialize() {
        const owner = this;
        //TODO initialize component here

        owner.elements = {
            filters: owner.self_ref.querySelector("[data-ref='filters']"),
            list: owner.self_ref.querySelector("[data-ref='list']"),
            emptyState: owner.self_ref.querySelector("[data-ref='emptyState']")
        };
        owner.tasks = [];
        owner.updateUI();
    }
    async #addEventListeners() {
        const owner = this;
        //TODO add event listeners for component here
    }
    // owner.self_ref;//access element reference here
    // owner.elementReference();//alternative way to access element reference
    // owner.destroy();//call destroy method when needed
    // owner.options;//access building options here
    

    /**
     * Add a task item
     * @param {Object} task 
     * @param {String} task.title
     * @param {String} task.description
     * @param {String} task.status - "current" | "pending" | "historic" | "info"
     */
    addTask(task) {
        const owner = this;
        const item = new TaskItem({
            title: task.title,
            description: task.description,
            status: task.status
        });

        owner.tasks.push(item);
        owner.elements.list.appendChild(item.elementReference());
        owner.updateUI();
    }

    updateUI() {
        const owner = this;
        const hasTasks = owner.tasks.length > 0;
        owner.elements.emptyState.style.display = hasTasks ? "none" : "block";
    }
}