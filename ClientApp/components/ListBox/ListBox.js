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

//     // one card per ListBox option (or small group of related behaviors), each with a
//     // "cosa testare / cosa aspettarsi" note under the component
//     const mock_variants = [
//         {
//             title: "1) Base con item iniziali",
//             options: { title: "Elenco", items: ["Primo elemento", "Secondo elemento", "Terzo elemento"] },
//             test: "Osserva il componente appena creato, senza cliccare nulla.",
//             expect: "Il titolo \"Elenco\" compare nell'header; i tre elementi passati in `items` sono già visibili nella lista, nell'ordine dato."
//         },
//         {
//             title: "2) Size (width/height/minItemHeight)",
//             options: { title: "Dimensioni", Size: { width: "220px", height: "160px", minItemHeight: "36px" }, items: ["Riga alta 36px"] },
//             test: "Osserva le dimensioni del riquadro e l'altezza/font della riga.",
//             expect: "Il componente è largo 220px e alto 160px; la riga è alta almeno 36px e il suo font è stato derivato automaticamente da `minItemHeight` (via `#deriveFontSizeFromHeight`, ~22px)."
//         },
//         {
//             title: "3) Size.fontSize esplicito",
//             options: { title: "Font fisso", Size: { minItemHeight: "36px", fontSize: "10px" }, items: ["Font 10px nonostante minItemHeight"] },
//             test: "Confronta il font di questa card con quello della card 2.",
//             expect: "Pur avendo lo stesso `minItemHeight` della card 2, il font resta a 10px: `Size.fontSize`, quando presente, ha sempre la precedenza sul font derivato."
//         },
//         {
//             title: "4) Item con stile custom + autoScroll",
//             options: { title: "Stile + scroll", Size: { height: "140px" } },
//             test: "Clicca ripetutamente \"aggiungi elemento colorato\" sotto il componente.",
//             expect: "Ogni click aggiunge una riga con colore/sfondo diversi (via il 2° argomento di `addItem`); la lista scrolla automaticamente per mostrare sempre l'ultimo elemento aggiunto (autoScroll è true di default)."
//         },
//         {
//             title: "5) autoScroll:false",
//             options: { title: "Senza auto-scroll", autoScroll: false, Size: { height: "140px" } },
//             test: "Clicca ripetutamente \"aggiungi elemento\" sotto il componente finché la lista trabocca.",
//             expect: "A differenza della card 4, la vista NON segue l'ultimo elemento aggiunto: bisogna scrollare manualmente per vederlo."
//         },
//         {
//             title: "6) onItemClick",
//             options: { title: "Click item", items: ["Clicca qui", "O qui", "O anche qui"] },
//             test: "Clicca uno degli elementi della lista.",
//             expect: "Il riquadro sotto il componente mostra il testo dell'elemento appena cliccato, confermando che `onItemClick(item_element)` riceve l'elemento DOM cliccato."
//         },
//         {
//             title: "7) clearItems (bottone header)",
//             options: { title: "Svuota", items: ["A", "B", "C", "D"] },
//             test: "Passa il mouse sull'icona in alto a destra dell'header (hint) e poi cliccala.",
//             expect: "Appare il tooltip \"clear\"; al click tutti gli elementi vengono rimossi e la lista resta vuota."
//         },
//         {
//             title: "8) removeLastItem()",
//             options: { title: "Rimuovi ultimo", items: ["Uno", "Due", "Tre"] },
//             test: "Clicca \"rimuovi ultimo\" sotto il componente e guarda la console.",
//             expect: "GAP NOTO: `removeLastItem()` referenzia `owner` senza averlo mai dichiarato (manca `const owner = this;`), quindi lancia `ReferenceError: owner is not defined` invece di rimuovere l'ultima riga."
//         }
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

//         const lb = new ListBox(variant.options);
//         slot.appendChild(lb.elementReference());

//         if (i === 3) {
//             // colored-item + autoScroll demo (card 4)
//             let counter = 0;
//             const colors = [
//                 { color: "#fff", backgroundColor: "#c0392b" },
//                 { color: "#000", backgroundColor: "#f1c40f" },
//                 { color: "#fff", backgroundColor: "#27ae60" },
//             ];
//             const add_btn = document.createElement("button");
//             add_btn.textContent = "aggiungi elemento colorato";
//             add_btn.addEventListener("click", () => {
//                 counter++;
//                 lb.addItem(`Elemento colorato #${counter}`, colors[counter % colors.length]);
//             });
//             slot.appendChild(add_btn);
//         }

//         if (i === 4) {
//             // plain add-item demo, to show the lack of auto-scroll (card 5)
//             let counter = 0;
//             const add_btn = document.createElement("button");
//             add_btn.textContent = "aggiungi elemento";
//             add_btn.addEventListener("click", () => {
//                 counter++;
//                 lb.addItem(`Elemento #${counter}`);
//             });
//             slot.appendChild(add_btn);
//         }

//         if (i === 5) {
//             // onItemClick readout (card 6) - `owner.options` keeps the same reference passed to
//             // the constructor and is read dynamically on every click, so wiring the callback here
//             // (after construction, once `readout` exists) still works
//             const readout = document.createElement("div");
//             readout.style.fontSize = "11px";
//             readout.style.opacity = "0.85";
//             readout.textContent = "(nessun click ancora)";
//             variant.options.onItemClick = (item_element) => {
//                 readout.textContent = `Cliccato: "${item_element.textContent}"`;
//             };
//             slot.appendChild(readout);
//         }

//         if (i === 7) {
//             // removeLastItem() demo (card 8) - see the "GAP NOTO" note above
//             const remove_btn = document.createElement("button");
//             remove_btn.textContent = "rimuovi ultimo";
//             remove_btn.addEventListener("click", () => lb.removeLastItem());
//             slot.appendChild(remove_btn);
//         }

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