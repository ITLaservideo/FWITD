/**
 * @version 1.0
 * @example
 *       const dp = new DatePicker({});
 *       owner.self_ref.appendChild(dp.elementReference());
 */
class DatePicker extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     * @param {string} [options.width] - CSS width applied directly to `self_ref.style.width` (e.g. `"300px"`) - a bare number won't apply, since CSS requires a unit.
     * @param {string} [options.height] - CSS height applied directly to `self_ref.style.height` (e.g. `"400px"`) - same caveat as `options.width`.
     * @param {number} [options.offset_years] - How many years ahead of the current year the year-picker starts (then counts down 100 years). Defaults to whatever offset lands on the closest multiple of 10 (e.g. in 2026, defaults to 4, landing on 2030).
     * @param {boolean} [options.ignore_seconds] - If true, removes the entire hour/minute/second row (despite the name, not just seconds - this also removes the "fine giornata"/"inizio giornata"/"ora attuale" shortcuts).
     * @param {boolean} [options.floating=true] - If not `false`, `elementReference()` returns a read-only trigger input that opens the full picker in a centered `BottomSheet` on click, instead of rendering the picker inline.
     * @param {string} [options.placeholder] - Placeholder text for the floating trigger input; only used when `options.floating` isn't `false`.
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        this.#consumeOptions();
        this.#initialize();
        if (this.options.floating != false) {
            this.elementReference = this.#elementReferenceOverwritten;
        }
    }
    async #consumeOptions() {
        const options = this.options;
        if (options.width != undefined) {
            this.self_ref.style.width = options.width;
        }
        if (options.height != undefined) {
            this.self_ref.style.height = options.height;
        }
    }
    current_time = new Date();
    status = {
        /**
         * @type number
         */
        selected_day: this.current_time.getDate(),
        /**
         * @type number
         */
        selected_month: this.current_time.getMonth(),
        /**
         * @type number
         */
        selected_year: this.current_time.getFullYear(),
        /**
         * @type number
         */
        selected_hour: this.current_time.getHours(),
        /**
         * @type number
         */
        selected_minutes: this.current_time.getMinutes(),
        /**
         * @type number
         */
        selected_seconds: this.current_time.getSeconds(),
        selected_ms: 999
    }
    /**
     * store here the elements references of the html  
     * automatically gathers elements with attribute `fw-id=` after super()
     */
    elements = {
        /**
         * @type Element
         */
        self_ref: this.self_ref,

        /**
         * @type HTMLElement
         */
        "time-selections": null,

        /**
         * @type HTMLElement
         */
        "body-selections": null,

        /**
         * @type HTMLElement
         */
        "time-container-minutes": null,

        /**
         * @type HTMLElement
         */
        "timer1-text": null,
    }
    async #initialize() {
        const owner = this;
        if (owner.options.ignore_seconds == true) {
            owner.elements["time-selections"].remove();
        }
        owner.elements["month-text"].innerText = Locale.parseMonthConvertToReadable(this.status.selected_month);
        owner.elements["year-text"].innerText = (this.status.selected_year);
        owner.elements["timer1-text"].innerText = DatePicker.pad(this.status.selected_hour);
        owner.elements["timer2-text"].innerText = DatePicker.pad(this.status.selected_minutes);
        owner.elements["timer3-text"].innerText = DatePicker.pad(this.status.selected_seconds);
        owner.#makeItScorribile(owner.elements["time-container-hour"], "selected_hour", "timer1-text", 23);
        owner.#makeItScorribile(owner.elements["time-container-minutes"], "selected_minutes", "timer2-text", 59);
        owner.#makeItScorribile(owner.elements["time-container-seconds"], "selected_seconds", "timer3-text", 59);
        owner.#reGenerateDates();
        return;
    }
    /**
     * @param {Element} element_to_grab
     * @param {string} change_status_variable
     * @param {string} change_element_innertext
     * @param {number} max - upper clamp (inclusive) for `owner.status[change_status_variable]`; the lower clamp is always 0.
     */
    #makeItScorribile(element_to_grab, change_status_variable, change_element_innertext, max) {
        const owner = this;
        if (MovableUtil) {
            MovableUtil.trackMouse(element_to_grab, ({ x, y }) => {
                if (y > 0) {
                    owner.status[change_status_variable] = Math.min(Math.max((owner.status[change_status_variable]) + 1, 0), max);
                } else if (y < 0) {
                    owner.status[change_status_variable] = Math.min(Math.max((owner.status[change_status_variable]) - 1, 0), max);
                }
                owner.elements[change_element_innertext].innerText = DatePicker.pad(owner.status[change_status_variable]);
                // if (x > 0) {
                //     element_to_grab.value = Math.max(Number(element_to_grab.value) - 10, 0);
                // } else if (x < 0) {
                //     element_to_grab.value = Math.max(Number(element_to_grab.value) + 10, 0);
                // }
            }, undefined, 2);
        }
    }
    static pad(n) {
        return String(n).padStart(2, "0");
    }
    /**
     * @param {'iso'|'ddMMyyyy'|'ddMMyyyy_HHmmss'|'HHmmss_ddMMyyy'} [date_format='iso'] - `iso`: "yyyy-MM-ddTHH:mm:ss" | `ddMMyyyy`: "dd-MM-yyyy" | `ddMMyyyy_HHmmss`: "dd-MM-yyyy HH:mm:ss" | `HHmmss_ddMMyyy`: "HH:mm:ss dd-MM-yyyy"
     * @returns {string}
     */
    getDate(date_format = 'iso') {
        const yyyy = this.status.selected_year;
        const MM = DatePicker.pad(this.status.selected_month + 1);
        const dd = DatePicker.pad(this.status.selected_day);
        const HH = DatePicker.pad(this.status.selected_hour);
        const mm = DatePicker.pad(this.status.selected_minutes);
        const ss = DatePicker.pad(this.status.selected_seconds);

        switch (date_format) {
            case 'ddMMyyyy':
                // dd-MM-yyyy
                return `${dd}-${MM}-${yyyy}`;
            case 'ddMMyyyy_HHmmss':
                // dd-MM-yyyy HH:mm:ss
                return `${dd}-${MM}-${yyyy} ${HH}:${mm}:${ss}`;
            case 'HHmmss_ddMMyyy':
                // HH:mm:ss dd-MM-yyyy
                return `${HH}:${mm}:${ss} ${dd}-${MM}-${yyyy}`;
            case 'iso':
            default:
                // yyyy-MM-ddThh:mm:ss
                return `${yyyy}-${MM}-${dd}T${HH}:${mm}:${ss}`;
        }
    }

    //#region UiBuilder
    #reGenerateDates() {
        const owner = this;

        const container = document.createElement("div");
        container.classList.add("calendar-container");

        const year = owner.status.selected_year;
        const month = owner.status.selected_month;
        // Weekday labels (Mon–Sun)
        const weekdays = Locale.getShortWeekDays();
        for (const day of weekdays) {
            const header = document.createElement("div");
            header.classList.add("calendar-header");
            header.innerText = day;
            container.appendChild(header);
        }

        // Determine year + number of days in month
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Determine which weekday the month starts on (convert Sun=0 → Sun=6)
        let firstDay = new Date(year, month, 1).getDay();
        firstDay = firstDay === 0 ? 6 : firstDay - 1; // shift to Mon=0

        // Add empty cells before the first day
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement("div");
            empty.classList.add("calendar-date", "empty");
            container.appendChild(empty);
        }
        const today = new Date();
        // Create date cells
        for (let day = 1; day <= daysInMonth; day++) {
            const div_date = document.createElement("div");
            div_date.classList.add("calendar-date");
            div_date.innerText = day;
            if (today.getFullYear() == year && today.getMonth() == month && today.getDate() == day) {
                div_date.classList.toggle("today");
            }

            div_date.addEventListener("click", () => {
                owner.status.selected_day = day;
                if (owner.elements.instanceBottomSheet != undefined) {
                    owner.elements.instanceBottomSheet.destroy();
                    return;
                }
                const whole_container = owner.self_ref;
                whole_container.querySelectorAll(".selected-date").forEach(el => el.classList.remove("selected-date"));
                div_date.classList.add("selected-date");
            });
            container.appendChild(div_date);
        }
        owner.elements["body-selections"].innerText = "";
        owner.elements["body-selections"].appendChild(container);
        return container;
    }
    setInputText() {

    }
    //#endregion
    //#region FrameworkEventListeners
    async onClickTimer1Previous(event) {
        const owner = this.fwInstanceReference;
        owner.status.selected_hour = (owner.status.selected_hour + 1) % 24;   // wrap 23 → 0
        owner.elements["timer1-text"].innerText = DatePicker.pad(owner.status.selected_hour);
    }

    async onClickTimer1Next(event) {
        const owner = this.fwInstanceReference;
        owner.status.selected_hour = (owner.status.selected_hour - 1 + 24) % 24; // wrap 0 → 23
        owner.elements["timer1-text"].innerText = DatePicker.pad(owner.status.selected_hour);
    }

    async onClickTimer2Previous(event) {
        const owner = this.fwInstanceReference;
        owner.status.selected_minutes = (owner.status.selected_minutes + 1) % 60;   // wrap 59 → 0
        owner.elements["timer2-text"].innerText = DatePicker.pad(owner.status.selected_minutes);
    }

    async onClickTimer2Next(event) {
        const owner = this.fwInstanceReference;
        owner.status.selected_minutes = (owner.status.selected_minutes - 1 + 60) % 60; // wrap 0 → 59
        owner.elements["timer2-text"].innerText = DatePicker.pad(owner.status.selected_minutes);
    }

    async onClickTimer3Previous(event) {
        const owner = this.fwInstanceReference;
        owner.status.selected_seconds = (owner.status.selected_seconds + 1 + 60) % 60;
        owner.elements["timer3-text"].innerText = DatePicker.pad(owner.status.selected_seconds);
    }

    async onClickTimer3Next(event) {
        const owner = this.fwInstanceReference;
        owner.status.selected_seconds = (owner.status.selected_seconds - 1 + 60) % 60;
        owner.elements["timer3-text"].innerText = DatePicker.pad(owner.status.selected_seconds);
    }
    async onClickNextMonth(event) {
        /**
         * @type DatePicker
         */
        const owner = this.fwInstanceReference;
        owner.status.selected_month++;
        if (owner.status.selected_month > 11) {
            owner.status.selected_month = 0;
            owner.status.selected_year++;
            owner.elements["year-text"].innerText = (owner.status.selected_year);
        }
        owner.elements["month-text"].innerText = Locale.parseMonthConvertToReadable(owner.status.selected_month);
        owner.elements["body-selections"].innerText = "";
        owner.#reGenerateDates();
    }
    async onClickPreviousMonth(event) {
        const owner = this.fwInstanceReference;
        owner.status.selected_month--;
        if (owner.status.selected_month < 0) {
            owner.status.selected_month = 11;
            owner.status.selected_year--;
            owner.elements["year-text"].innerText = (owner.status.selected_year);
        }
        owner.elements["month-text"].innerText = Locale.parseMonthConvertToReadable(owner.status.selected_month);
        owner.#reGenerateDates();
    }
    #month_labels = undefined;
    async onClickMonthText(event) {
        /**
         * @type DatePicker
         */
        const owner = this.fwInstanceReference;
        if (owner.#month_labels == undefined) {
            owner.#month_labels = [];
            const months = Locale.getShortMonths();
            for (let i = 0; i < months.length; i++) {
                owner.#month_labels.push(`${i + 1} - ${months[i]}`);
            }
        }
        const next = [];
        for (let i = 0; i < owner.#month_labels.length; i++) {
            next.push(() => {
                owner.status.selected_month = i;
                owner.elements["month-text"].innerText = Locale.parseMonthConvertToReadable(owner.status.selected_month);
                owner.#reGenerateDates();
            });
        }
        new MousePopUp({
            action_titles: owner.#month_labels,
            next: next,
            event: event,
            style: 'multi-select',
            class: "dp-month-splitter"
        });
    }
    async onClickYearText(event) {
        /**
         * @type DatePicker
         */
        const owner = this.fwInstanceReference;
        const next = [];
        const action_titles = [];
        const coo = owner.elements["month-text"].getBoundingClientRect();
        const current_year = owner.current_time.getFullYear();
        // default: offset to whichever multiple of 10 is closest to the current year (e.g. 2026 -> 2030, offset 4)
        const offset_years = owner.options.offset_years ?? (Math.round(current_year / 10) * 10 - current_year);
        const start_year = current_year + offset_years;
        for (let i = start_year; i > start_year - 100; i--) {
            next.push(() => {
                owner.status.selected_year = i;
                owner.elements["year-text"].innerText = (owner.status.selected_year);
                owner.#reGenerateDates();
            });
            action_titles.push(i);
        }
        new MousePopUp({
            action_titles: action_titles,
            next: next,
            event: { clientX: coo.x, clientY: coo.y },
            style: 'multi-select',
            class: "dp-year-splitter"
        });
    }

    async onClickFineGiornata(event) {
        const owner = this.fwInstanceReference;
        owner.status.selected_hour = 23;
        owner.status.selected_minutes = 59;
        owner.status.selected_seconds = 59;
        owner.elements["timer1-text"].innerText = DatePicker.pad(owner.status.selected_hour);
        owner.elements["timer2-text"].innerText = DatePicker.pad(owner.status.selected_minutes);
        owner.elements["timer3-text"].innerText = DatePicker.pad(owner.status.selected_seconds);
    }
    async onClickInizioGiornata(event) {
        const owner = this.fwInstanceReference;
        owner.status.selected_hour = 0;
        owner.status.selected_minutes = 0;
        owner.status.selected_seconds = 0;
        owner.elements["timer1-text"].innerText = DatePicker.pad(owner.status.selected_hour);
        owner.elements["timer2-text"].innerText = DatePicker.pad(owner.status.selected_minutes);
        owner.elements["timer3-text"].innerText = DatePicker.pad(owner.status.selected_seconds);
    }
    async onClickOraCorrente(event) {
        const owner = this.fwInstanceReference;
        const now = new Date();
        owner.status.selected_hour = now.getHours();
        owner.status.selected_minutes = now.getMinutes();
        owner.status.selected_seconds = now.getSeconds();
        owner.elements["timer1-text"].innerText = DatePicker.pad(owner.status.selected_hour);
        owner.elements["timer2-text"].innerText = DatePicker.pad(owner.status.selected_minutes);
        owner.elements["timer3-text"].innerText = DatePicker.pad(owner.status.selected_seconds);
    }
    //#endregion
    //#region OverwrittenFunctions
    #elementReferenceOverwritten() {//when floating == true
        const owner = this;
        if (owner.elements.the_input_triggerer == undefined) {
            const the_input_triggerer = document.createElement("input");
            the_input_triggerer.setAttribute("type", "text");
            the_input_triggerer.setAttribute("tabindex", "-1");
            the_input_triggerer.readOnly = true;
            the_input_triggerer.placeholder = owner.options.placeholder ?? 'select date';
            the_input_triggerer.addEventListener("click", (eve) => {
                owner.elements.instanceBottomSheet = new BottomSheet({
                    element: owner.self_ref,
                    onClose: () => {
                        if (owner.options.ignore_seconds == true) {
                            the_input_triggerer.value = owner.getDate('ddMMyyyy');
                        } else {
                            the_input_triggerer.value = owner.getDate('HHmmss_ddMMyyy');
                        }
                    },
                    centered: true
                });
            });
            owner.elements.the_input_triggerer = the_input_triggerer;
        }
        return owner.elements.the_input_triggerer;
    }
    //#endregion
    // owner.self_ref;//access element reference here
    // owner.elementReference();//alternative way to access element reference
    // owner.destroy();//call destroy method when needed
    // owner.options;//access building options here
}

//#START RESERVED AREA FOR UI_BUILDER
///*mock for the UIBuilder::live-watch-component uncomment to test it  */
// setTimeout(() => {
//     const mock_container = document.createElement("div");
//     mock_container.style.display = "grid";
//     mock_container.style.gridTemplateColumns = "repeat(3, 1fr)";
//     mock_container.style.gridTemplateRows = "repeat(2, auto)";
//     mock_container.style.gap = "16px";
//     mock_container.style.padding = "20px";
//     document.body.appendChild(mock_container);

//     // one card per DatePicker option (or small group of related behaviors), each with a
//     // "cosa testare / cosa aspettarsi" note under the component
//     const mock_variants = [
//         {
//             title: "1) Incorporato (floating:false)",
//             options: { floating: false },
//             test: "Osserva il componente appena creato, senza cliccare nulla; guarda anche il riquadro sotto, che mostra dp.getDate() in tempo reale.",
//             expect: "Il calendario e il selettore orario sono visibili direttamente in pagina, senza alcun campo di input da cliccare; il riquadro sotto si aggiorna man mano che cambi giorno/ora."
//         },
//         {
//             title: "2) Flottante (default) con placeholder",
//             options: { placeholder: "Seleziona una data" },
//             test: "Clicca il campo di testo (di sola lettura).",
//             expect: "Si apre una BottomSheet centrata col calendario completo; scegli un giorno e chiudila: il campo si riempie con la data formattata \"HH:mm:ss dd-MM-yyyy\"."
//         },
//         {
//             title: "3) ignore_seconds:true",
//             options: { floating: false, ignore_seconds: true },
//             test: "Guarda l'area sopra il calendario, dove normalmente ci sono ore/minuti/secondi e le scorciatoie.",
//             expect: "GAP NOTO: nonostante il nome, l'opzione rimuove l'intera riga ore/minuti/secondi (incluse \"fine giornata\"/\"inizio giornata\"/\"ora attuale\"), non solo i secondi - verifica se è il comportamento voluto."
//         },
//         {
//             title: "4) offset_years personalizzato",
//             options: { floating: false, offset_years: 4 },
//             test: "Clicca sull'anno per aprire il selettore.",
//             expect: "La lista parte dall'anno corrente (non +2 come nel default) e scende per 99 anni, confermando che offset_years sposta il punto di partenza."
//         },
//         {
//             title: "5) Selettore mese/anno",
//             options: { floating: false },
//             test: "Clicca sul nome del mese, poi sull'anno.",
//             expect: "Si apre un popup MousePopUp (stile 'multi-select') con l'elenco dei mesi o degli anni; selezionandone uno il calendario visualizzato si aggiorna di conseguenza."
//         },
//         {
//             title: "6) Trascina ora/minuti/secondi + scorciatoie",
//             options: { floating: false },
//             test: "Trascina verticalmente su ore/minuti/secondi (su = aumenta, giù = diminuisce); poi clicca \"fine giornata\", \"inizio giornata\", \"ora attuale\".",
//             expect: "Il valore trascinato cambia in tempo reale entro i suoi limiti (0-23/0-59/0-59); i tre bottoni impostano rispettivamente 23:59:59, 00:00:00 e l'ora corrente di sistema."
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

//         const dp = new DatePicker(variant.options);
//         slot.appendChild(dp.elementReference());

//         if (i === 0) {
//             // live readout of every getDate() format, to catch a formatting regression at a glance
//             const readout = document.createElement("pre");
//             readout.style.fontSize = "11px";
//             readout.style.margin = "0";
//             setInterval(() => {
//                 readout.textContent =
//                     `iso: ${dp.getDate('iso')}\n` +
//                     `ddMMyyyy: ${dp.getDate('ddMMyyyy')}\n` +
//                     `ddMMyyyy_HHmmss: ${dp.getDate('ddMMyyyy_HHmmss')}\n` +
//                     `HHmmss_ddMMyyy: ${dp.getDate('HHmmss_ddMMyyy')}\n` +
//                     Locale.toIsoDate(new Date());
//             }, 250);
//             slot.appendChild(readout);
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