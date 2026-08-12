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
            createButtons.push({ hint: Locale.at("print or save as PDF"), anchor: "left", icon_code: "e8ad", onClick: owner.#runAction(() => owner.#print(owner.options.getWhatToPrint)) });
        }
        if (owner.options.getWhatToPDF != undefined) {
            createButtons.push({ hint: Locale.at("export PDF"), anchor: "left", icon: "pdf-file.svg", onClick: owner.#runAction(() => owner.#exportPDF(owner.options.getWhatToPDF)) });
        }
        if (owner.options.getWhatToExcel != undefined) {
            createButtons.push({ hint: Locale.at("export EXCEL"), anchor: "left", icon: "excel.svg", onClick: owner.#runAction(() => owner.#exportExcel(owner.options.getWhatToExcel)) });
        }
        if (owner.options.getWhatToPrint == undefined && owner.options.getWhatToPDF == undefined && owner.options.getWhatToExcel == undefined) {
            createButtons.push({ hint: Locale.at("print or save as PDF"), anchor: "left", icon_code: "e8ad", onClick: owner.#runAction(() => ExportDataButton.printWholePage()) });
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
        } catch (se) {
            console.error(se)
        }
        finally {
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
        const canvas = await this.#withFullContentVisible(element, () => window.html2canvas(element, { scale: 2 }));
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
///*mock for the UIBuilder::live-watch-component uncomment to test it  */
// setTimeout(() => {
//     const mock_container = document.createElement("div");
//     mock_container.style.display = "grid";
//     mock_container.style.gridTemplateColumns = "repeat(3, 1fr)";
//     mock_container.style.gridTemplateRows = "repeat(3, auto)";
//     mock_container.style.gap = "16px";
//     mock_container.style.padding = "20px";
//     document.body.appendChild(mock_container);

//     // mock data reused by the Excel variants and by the printable/PDF-able report below
//     const mock_excel_rows = [
//         { Nome: "Mario Rossi", Ruolo: "Tecnico", Ore: 8 },
//         { Nome: "Luca Bianchi", Ruolo: "Magazziniere", Ore: 6.5 },
//         { Nome: "Anna Verdi", Ruolo: "Autista", Ore: 7.25 },
//     ];

//     // small printable/PDF-able report (title + table of `mock_excel_rows`) used by several
//     // variants below, so print/PDF output has something recognizable to check against;
//     // `scrollable` clips it to a short `max-height:auto`, to test `#withFullContentVisible`
//     const createMockReport = (scrollable = false) => {
//         const report = document.createElement("div");
//         report.style.padding = "12px";
//         report.style.background = "#fff";
//         report.style.color = "#000";
//         if (scrollable) {
//             report.style.maxHeight = "80px";
//             report.style.overflow = "auto";
//         }
//         const title = document.createElement("h3");
//         title.textContent = "Report ore lavorate";
//         title.style.margin = "0 0 8px";
//         report.appendChild(title);

//         const table = document.createElement("table");
//         table.style.borderCollapse = "collapse";
//         table.style.width = "100%";
//         const header_row = document.createElement("tr");
//         Object.keys(mock_excel_rows[0]).forEach((key) => {
//             const th = document.createElement("th");
//             th.textContent = key;
//             th.style.border = "1px solid #999";
//             th.style.padding = "4px 8px";
//             header_row.appendChild(th);
//         });
//         table.appendChild(header_row);
//         mock_excel_rows.forEach((row) => {
//             const tr = document.createElement("tr");
//             Object.values(row).forEach((value) => {
//                 const td = document.createElement("td");
//                 td.textContent = value;
//                 td.style.border = "1px solid #999";
//                 td.style.padding = "4px 8px";
//                 tr.appendChild(td);
//             });
//             table.appendChild(tr);
//         });
//         report.appendChild(table);
//         return report;
//     };

//     // one card per exported combination (or small group of related behaviors), each with a
//     // "cosa testare / cosa aspettarsi" note under the component
//     const mock_variants = [
//         {
//             title: "1) getWhatToPrint",
//             options: { label: "Stampa", getWhatToPrint: () => createMockReport() },
//             test: "Clicca il bottone: si apre lo SpeedActions con un solo pulsante (stampante); cliccalo.",
//             expect: "Si apre la finestra di stampa nativa del browser, mostrando SOLO il report mock (titolo + tabella), non il resto della pagina."
//         },
//         {
//             title: "2) getWhatToPrint asincrono",
//             options: { label: "Stampa (async)", getWhatToPrint: () => new Promise((resolve) => setTimeout(() => resolve(createMockReport()), 400)) },
//             test: "Clicca il pulsante e attendi ~400ms prima che succeda qualcosa.",
//             expect: "Dopo il ritardo si apre comunque la finestra di stampa nativa: `getWhatToPrint` può restituire una Promise, non solo un elemento sincrono."
//         },
//         {
//             title: "3) getWhatToPDF (elemento semplice)",
//             options: { label: "PDF", getWhatToPDF: () => createMockReport() },
//             test: "Clicca il bottone poi l'icona PDF.",
//             expect: "Dopo ~150ms viene scaricato un file \"export.pdf\" (nome di default) con lo screenshot del report mock."
//         },
//         {
//             title: "4) getWhatToPDF ({element, filename})",
//             options: { label: "PDF (nome custom)", getWhatToPDF: () => ({ element: createMockReport(), filename: "report-ore.pdf" }) },
//             test: "Clicca il bottone poi l'icona PDF e guarda il nome del file scaricato.",
//             expect: "Il file scaricato si chiama \"report-ore.pdf\" invece del default \"export.pdf\": `filename` viene rispettato."
//         },
//         {
//             title: "5) getWhatToPDF con contenuto scrollabile",
//             options: { label: "PDF (scroll)", getWhatToPDF: () => createMockReport(true) },
//             test: "Clicca il bottone poi l'icona PDF; il report mock qui è ritagliato in pagina (`max-height:80px; overflow:auto`).",
//             expect: "Il PDF scaricato mostra TUTTA la tabella (tutte le righe), non solo la porzione visibile/scrollata: `#withFullContentVisible` neutralizza overflow/max-height durante l'esportazione."
//         },
//         {
//             title: "6) getWhatToExcel (array semplice)",
//             options: { label: "Excel", getWhatToExcel: () => mock_excel_rows },
//             test: "Clicca il bottone poi l'icona Excel.",
//             expect: "Viene scaricato \"export.xlsx\" (foglio di default \"Sheet1\") con le 3 righe di `mock_excel_rows` e le colonne Nome/Ruolo/Ore."
//         },
//         {
//             title: "7) getWhatToExcel ({rows, sheetName, filename})",
//             options: { label: "Excel (nome custom)", getWhatToExcel: () => ({ rows: mock_excel_rows, sheetName: "Ore", filename: "ore-lavorate.xlsx" }) },
//             test: "Clicca il bottone poi l'icona Excel e apri il file scaricato.",
//             expect: "Il file si chiama \"ore-lavorate.xlsx\" e il foglio al suo interno si chiama \"Ore\" invece del default \"Sheet1\"."
//         },
//         {
//             title: "8) Tutti e tre insieme",
//             options: {
//                 label: "Esporta",
//                 getWhatToPrint: () => createMockReport(),
//                 getWhatToPDF: () => createMockReport(),
//                 getWhatToExcel: () => mock_excel_rows,
//             },
//             test: "Clicca il bottone.",
//             expect: "Lo SpeedActions mostra TRE pulsanti (stampa, PDF, Excel) invece di uno solo; ognuno esegue la propria azione in modo indipendente."
//         },
//         {
//             title: "9) Nessuna opzione (fallback)",
//             options: {},
//             test: "Clicca il bottone.",
//             expect: "Compare comunque un pulsante (icona stampante): senza nessuna `getWhatTo*`, il componente ricade su `ExportDataButton.printWholePage()`, che stampa l'intera pagina invece di un elemento isolato."
//         },
//     ];

//     for (let i = 0; i < mock_variants.length; i++) {
//         const variant = mock_variants[i];
//         const row = Math.floor(i / 3) + 1;
//         const col = (i % 3) + 1;
//         const slot = document.createElement("div");
//         slot.style.gridArea = `${row} / ${col} / ${row + 1} / ${col + 1}`;
//         slot.style.display = "flex";
//         slot.style.flexDirection = "column";
//         slot.style.gap = "6px";
//         slot.style.border = "1px solid #ccc";
//         slot.style.borderRadius = "6px";
//         slot.style.padding = "10px";
//         mock_container.appendChild(slot);

//         const label = document.createElement("div");
//         label.style.fontWeight = "600";
//         label.textContent = variant.title;
//         slot.appendChild(label);

//         const edb = new ExportDataButton(variant.options);
//         slot.appendChild(edb.elementReference());

//         const instructions = document.createElement("div");
//         instructions.style.fontSize = "12px";
//         instructions.style.opacity = "0.85";
//         instructions.style.borderTop = "1px dashed #999";
//         instructions.style.paddingTop = "4px";
//         instructions.innerHTML = `<b>Testare:</b> ${variant.test}<br><b>Aspettarsi:</b> ${variant.expect}`;
//         slot.appendChild(instructions);
//     }
// }, 0);
//#END RESERVED AREA FOR UI_BUILDER
