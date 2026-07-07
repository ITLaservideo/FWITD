/**
 * @typedef {Object} WizardStep
 * @property {string} title - label shown in the header bar
 * @property {HTMLElement} content - element rendered in the content area while this step is active
 * @property {boolean} [freeRoam] - if true, the user can jump forward to the NEXT step by clicking its header title (without calling onComplete first)
 * @property {boolean} [freeUndo] - if true, the user can jump back to the PREVIOUS step by clicking its header title
 * @property {Function} [onComplete] - set by WizardStepper; call it from within `content` to advance to the next step (or finish, on the last step)
 * @property {Function} [onUndo] - set by WizardStepper; call it from within `content` to go back to the previous step
 */
/**
 * @version 1.0
 */
class WizardStepper extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options
     * @param {WizardStep[]} options.steps
     * @param {Function} [options.onIndexChanged] - called with the new step index whenever the visible step changes
     * @param {Function} [options.onFinish] - called once, after onComplete() is invoked on the last step
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        console.assert(Array.isArray(options.steps) && options.steps.length > 0, "WizardStepper requires a non-empty options.steps array");
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
        headerBar: null,
        /**
         * @type HTMLElement
         */
        contentArea: null,
    }
    #currentStepIndex = 0;
    #initialize() {
        const owner = this;
        owner.options.steps.forEach((step, index) => {
            const titleEl = document.createElement("div");
            titleEl.className = "step-title";
            titleEl.textContent = step.title;
            titleEl.dataset.index = `${index}`;
            titleEl.addEventListener("click", () => owner.#onTitleClick(index));
            owner.elements.headerBar.appendChild(titleEl);
        });
        owner.#showStep(0);
    }
    /**
     * only lets the user jump to the step immediately before/after the one currently shown,
     * and only when that step explicitly opted into it via `freeRoam`/`freeUndo`
     * @param {number} clickedIndex
     */
    #onTitleClick(clickedIndex) {
        const owner = this;
        if (Math.abs(clickedIndex - owner.#currentStepIndex) !== 1) {
            return;
        }
        const currentStep = owner.options.steps[owner.#currentStepIndex];
        if (clickedIndex > owner.#currentStepIndex && currentStep.freeRoam === true) {
            owner.#showStep(clickedIndex);
        } else if (clickedIndex < owner.#currentStepIndex && currentStep.freeUndo === true) {
            owner.#showStep(clickedIndex);
        }
    }
    /**
     * @param {number} index
     */
    #updateHeader(index) {
        const owner = this;
        const current_step = owner.options.steps[index];
        owner.elements.headerBar.querySelectorAll(".step-title").forEach((el, i) => {
            el.classList.toggle("active", i === index);
            el.classList.toggle("completed", i < index);
            const is_clickable = (i === index + 1 && current_step.freeRoam === true)
                || (i === index - 1 && current_step.freeUndo === true);
            el.classList.toggle("clickable", is_clickable);
        });
    }
    /**
     * @param {number} index
     */
    #showStep(index) {
        const owner = this;
        const step = owner.options.steps[index];
        if (step == undefined) {
            return;
        }
        owner.#currentStepIndex = index;
        owner.elements.contentArea.replaceChildren(step.content);
        owner.#updateHeader(index);
        step.onComplete = () => {
            const next_index = owner.#currentStepIndex + 1;
            if (owner.options.steps[next_index] == undefined) {
                if (typeof owner.options.onFinish === "function") {
                    owner.options.onFinish();
                }
                owner.destroy();
                return true;
            }
            owner.#showStep(next_index);
            return true;
        };
        step.onUndo = () => {
            if (owner.#currentStepIndex > 0) {
                owner.#showStep(owner.#currentStepIndex - 1);
            }
        };
        if (typeof owner.options.onIndexChanged === "function") {
            owner.options.onIndexChanged(index);
        }
    }
    // owner.self_ref;//access element reference here
    // owner.elementReference();//alternative way to access element reference
    // owner.destroy();//call destroy method when needed
    // owner.options;//access building options here
}

//#START RESERVED AREA FOR UI_BUILDER
// /**
//  * builds a throwaway mock step body: a label plus Back/Next buttons wired to
//  * the step's own onUndo/onComplete (assigned by WizardStepper once it's shown)
//  * @param {string} label
//  * @param {Object} step
//  * @param {boolean} [is_last]
//  */
// function createMockStepContent(label, step, is_last = false) {
//     const el = document.createElement("div");
//     el.style.display = "flex";
//     el.style.flexDirection = "column";
//     el.style.gap = "12px";

//     const p = document.createElement("p");
//     p.textContent = `${label} step content`;
//     el.appendChild(p);

//     const btn_row = document.createElement("div");
//     btn_row.style.display = "flex";
//     btn_row.style.gap = "8px";

//     const back_btn = UiBuilder.createButton({
//         title: "Back",
//         onClick: () => step.onUndo?.(),
//     });
//     btn_row.appendChild(back_btn);

//     const next_btn = UiBuilder.createButton({
//         title: is_last ? "Finish" : "Next",
//         onClick: () => step.onComplete?.(),
//     });
//     btn_row.appendChild(next_btn);

//     el.appendChild(btn_row);
//     return el;
// }
// const step_account = { title: "Account", freeUndo: true };
// const step_details = { title: "Details", freeRoam: true, freeUndo: true };
// const step_confirm = { title: "Confirm" };
// step_account.content = createMockStepContent("Account", step_account);
// step_details.content = createMockStepContent("Details", step_details);
// step_confirm.content = createMockStepContent("Confirm", step_confirm, true);

// const wizard = new WizardStepper({
//     steps: [step_account, step_details, step_confirm],
//     onFinish: () => console.log("wizard complete"),
// });
// document.body.appendChild(wizard.elementReference());

//#END RESERVED AREA FOR UI_BUILDER