/**
 * @version 1.0
 */
class ExportDataButton extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options
     * @param {string} [options.label]
     * @param {() => (HTMLElement|Promise<HTMLElement>)} [options.getWhatToPrint] - returns the element to print in isolation (opens the native print dialog)
     * @param {() => (HTMLElement|{element:HTMLElement,filename?:string}|Promise<any>)} [options.getWhatToPDF] - returns the element (or `{element, filename}`) to rasterize into a downloaded PDF
     * @param {() => (Array<Object>|Array<Array>|{rows:Array,sheetName?:string,filename?:string}|Promise<any>)} [options.getWhatToExcel] - returns the rows (or `{rows, sheetName, filename}`) to write into a downloaded .xlsx
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
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
    }
    /** @type {SpeedActions} */
    #speedActions = null;
    /** milliseconds elements.self_ref stays disabled after a button is clicked, to prevent double-triggering an export while it's in flight */
    static #DISABLE_MS = 3000;

    async #initialize() {
        const owner = this;
        const createButtons = [];
        if (owner.options.getWhatToPrint != undefined) {
            createButtons.push({ hint: Locale.at("print or save as PDF"), anchor: "left", icon: "print.svg", onClick: owner.#runAction(() => owner.#print(owner.options.getWhatToPrint)) });
        }
        if (owner.options.getWhatToPDF != undefined) {
            createButtons.push({ hint: Locale.at("export PDF"), anchor: "left", icon: "pdf-file.svg", onClick: owner.#runAction(() => owner.#exportPDF(owner.options.getWhatToPDF)) });
        }
        if (owner.options.getWhatToExcel != undefined) {
            createButtons.push({ hint: Locale.at("export EXCEL"), anchor: "left", icon: "excel.svg", onClick: owner.#runAction(() => owner.#exportExcel(owner.options.getWhatToExcel)) });
        }
        if (owner.options.getWhatToPrint == undefined && owner.options.getWhatToPDF == undefined && owner.options.getWhatToExcel == undefined) {
            createButtons.push({ hint: Locale.at("print or save as PDF"), anchor: "left", icon: "print.svg", onClick: owner.#runAction(() => ExportDataButton.printWholePage()) });
        }
        owner.#speedActions = new SpeedActions({
            target: owner.self_ref,
            createButtons: createButtons,
            side: "right",
            unpinnable: true,
            label: owner.options.label,
            onReady: () => console.log('SpeedActions ready'),
        });
    }
    /**
     * Wraps a button's action: closes the SpeedActions popup, disables elements.self_ref
     * for {@link ExportDataButton.#DISABLE_MS} to prevent double-clicks, then runs `action`.
     * @param {Function} action
     */
    #runAction(action) {
        const owner = this;
        return () => {
            owner.#speedActions?.hide();
            owner.elements.self_ref.classList.add("clicked");
            setTimeout(() => owner.elements.self_ref.classList.remove("clicked"), ExportDataButton.#DISABLE_MS);
            setTimeout(() => {
                action();
            }, 150);
        };
    }
    // owner.self_ref;//access element reference here
    // owner.elementReference();//alternative way to access element reference
    // owner.destroy();//call destroy method when needed
    // owner.options;//access building options here

    /**
     * Opens the native print dialog for the whole current page.
     */
    static printWholePage() {
        window.print();
    }

    /**
     * Clears `overflow`/`max-height` (element + descendants) while `fn` runs, so a scrollable
     * container (e.g. a card capped at `max-height:80vh; overflow:auto`) doesn't get clipped to
     * whatever was visible/scrolled at click time when printed or rasterized. Restores the
     * original inline styles afterward - only relevant while actually printing/PDF-ing.
     * @param {HTMLElement} element
     * @param {() => any} fn
     */
    async #withFullContentVisible(element, fn) {
        const affected = [element, ...element.querySelectorAll("*")].filter((el) => {
            const style = getComputedStyle(el);
            return style.overflow !== "visible" || style.maxHeight !== "none";
        });
        const saved = affected.map((el) => ({ el, overflow: el.style.overflow, maxHeight: el.style.maxHeight }));
        affected.forEach((el) => {
            el.style.setProperty("overflow", "visible", "important");
            el.style.setProperty("max-height", "none", "important");
        });
        try {
            return await fn();
        } finally {
            saved.forEach(({ el, overflow, maxHeight }) => {
                el.style.overflow = overflow;
                el.style.maxHeight = maxHeight;
            });
        }
    }

    /**
     * Prints `getWhatToPrint()`'s element in isolation, via a hidden iframe cloned with the page's
     * current stylesheets, so the dashboard behind it is left untouched.
     * @param {Function} getWhatToPrint
     */
    async #print(getWhatToPrint) {
        const element = await getWhatToPrint();
        console.assert(element instanceof HTMLElement, "getWhatToPrint must return an HTMLElement");

        const html = await this.#withFullContentVisible(element, () => element.outerHTML);

        const frame = document.createElement("iframe");
        frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
        document.body.appendChild(frame);

        const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']")).map(n => n.outerHTML).join("");
        const frame_doc = frame.contentWindow.document;
        frame_doc.open();
        frame_doc.write(`<!DOCTYPE html><html><head><title>${document.title}</title>${styles}</head><body>${html}</body></html>`);
        frame_doc.close();

        frame.contentWindow.addEventListener("afterprint", () => frame.remove());
        setTimeout(() => {
            frame.contentWindow.focus();
            frame.contentWindow.print();
        }, 250);// let the cloned stylesheets/fonts settle before printing
    }

    /**
     * Rasterizes `getWhatToPDF()`'s element (via html2canvas) into a one-page PDF and downloads it.
     * @param {Function} getWhatToPDF
     */
    async #exportPDF(getWhatToPDF) {
        const result = await getWhatToPDF();
        const element = result instanceof HTMLElement ? result : result?.element;
        const filename = (result instanceof HTMLElement ? undefined : result?.filename) ?? "export.pdf";
        console.assert(element instanceof HTMLElement, "getWhatToPDF must return an HTMLElement or {element, filename}");

        const canvas = await this.#withFullContentVisible(element, () => html2canvas(element, { scale: 2 }));
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: canvas.width > canvas.height ? "landscape" : "portrait",
            unit: "px",
            format: [canvas.width, canvas.height],
        });
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save(filename);
    }

    /**
     * Writes `getWhatToExcel()`'s rows into a downloaded .xlsx workbook.
     * @param {Function} getWhatToExcel
     */
    async #exportExcel(getWhatToExcel) {
        const result = await getWhatToExcel();
        const rows = Array.isArray(result) ? result : result?.rows;
        const sheetName = (Array.isArray(result) ? undefined : result?.sheetName) ?? "Sheet1";
        const filename = (Array.isArray(result) ? undefined : result?.filename) ?? "export.xlsx";
        console.assert(Array.isArray(rows), "getWhatToExcel must return an array of rows or {rows, sheetName, filename}");

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        XLSX.writeFile(workbook, filename);
    }
}


//#START RESERVED AREA FOR UI_BUILDER
// setTimeout(() => {
//     const ss = new ExportDataButton({});
//     document.body.appendChild(ss.elementReference());
// }, 0);
//#END RESERVED AREA FOR UI_BUILDER
