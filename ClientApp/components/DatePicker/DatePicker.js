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
     * @param {number} [options.width] 
     * @param {number} [options.height] 
     * @param {number} [options.offset_years=2] how many years to display before current year
     * @param {boolean} [options.ignore_seconds] 
     * @param {boolean} [options.floating=true]
     * @param {string} [options.placeholder]
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
        self_ref: this.self_ref
    }
    async #initialize() {
        const owner = this;
        if (owner.options.ignore_seconds == true) {
            owner.elements["time-selections"].remove();
        }
        owner.elements["month-text"].innerText = Locale.parseMonthConvertToReadable(this.status.selected_month);
        owner.elements["year-text"].innerText = (this.status.selected_year);
        owner.elements["timer1-text"].innerText = (this.status.selected_hour);
        owner.elements["timer2-text"].innerText = (this.status.selected_minutes);
        owner.elements["timer3-text"].innerText = (this.status.selected_seconds);
        owner.#makeItScorribile(owner.elements["time-container-hour"], "selected_hour", "timer1-text");
        owner.#makeItScorribile(owner.elements["time-container-minutes"], "selected_minutes", "timer2-text");
        owner.#makeItScorribile(owner.elements["time-container-seconds"], "selected_seconds", "timer3-text");
        owner.#reGenerateDates();
        return;
    }
    #makeItScorribile(element_to_grab, change_status_variable, change_element_innertext) {
        const owner = this;
        if (MovableUtil) {
            MovableUtil.trackMouse(element_to_grab, ({ x, y }) => {
                if (y > 0) {
                    owner.status[change_status_variable] = Math.max((owner.status[change_status_variable]) + 1, 0);
                } else if (y < 0) {
                    owner.status[change_status_variable] = Math.max((owner.status[change_status_variable]) - 1, 0);
                }
                owner.elements[change_element_innertext].innerText = owner.status[change_status_variable];
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
    getDate(date_format = enumDateFormats.iso) {
        const yyyy = this.status.selected_year;
        const MM = DatePicker.pad(this.status.selected_month + 1);
        const dd = DatePicker.pad(this.status.selected_day);
        const HH = DatePicker.pad(this.status.selected_hour);
        const mm = DatePicker.pad(this.status.selected_minutes);
        const ss = DatePicker.pad(this.status.selected_seconds);

        switch (date_format) {
            case enumDateFormats.ddMMyyyy:
                // dd-MM-yyyy
                return `${dd}-${MM}-${yyyy}`;
            case enumDateFormats.ddMMyyyy_HHmmss:
                // dd-MM-yyyy HH:mm:ss
                return `${dd}-${MM}-${yyyy} ${HH}:${mm}:${ss}`;
            case enumDateFormats.HHmmss_ddMMyyy:
                // HH:mm:ss dd-MM-yyyy
                return `${HH}:${mm}:${ss} ${dd}-${MM}-${yyyy}`;
            case enumDateFormats.iso:
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
        owner.elements["timer1-text"].innerText = owner.status.selected_hour;
    }

    async onClickTimer1Next(event) {
        const owner = this.fwInstanceReference;
        owner.status.selected_hour = (owner.status.selected_hour - 1 + 24) % 24; // wrap 0 → 23
        owner.elements["timer1-text"].innerText = owner.status.selected_hour;
    }

    async onClickTimer2Previous(event) {
        const owner = this.fwInstanceReference;
        owner.status.selected_minutes = (owner.status.selected_minutes + 1) % 60;   // wrap 59 → 0
        owner.elements["timer2-text"].innerText = owner.status.selected_minutes;
    }

    async onClickTimer2Next(event) {
        const owner = this.fwInstanceReference;
        owner.status.selected_minutes = (owner.status.selected_minutes - 1 + 60) % 60; // wrap 0 → 59
        owner.elements["timer2-text"].innerText = owner.status.selected_minutes;
    }

    async onClickTimer3Previous(event) {
        const owner = this.fwInstanceReference;
        owner.status.selected_seconds = (owner.status.selected_seconds + 1 + 60) % 60;
        owner.elements["timer3-text"].innerText = owner.status.selected_seconds;
    }

    async onClickTimer3Next(event) {
        const owner = this.fwInstanceReference;
        owner.status.selected_seconds = (owner.status.selected_seconds - 1 + 60) % 60;
        owner.elements["timer3-text"].innerText = owner.status.selected_seconds;
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
    async onClickMonthText(event) {
        const owner = this.fwInstanceReference;
        const next = [];
        for (let i = 0; i < Locale.getShortMonths().length; i++) {
            next.push(() => {
                owner.status.selected_month = i;
                owner.elements["month-text"].innerText = Locale.parseMonthConvertToReadable(owner.status.selected_month);
                owner.#reGenerateDates();
            });
        }
        new MousePopUp({
            action_titles: Locale.getShortMonths(),
            next: next,
            event: event,
            style: 3
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
        for (let i = (owner.current_time.getFullYear() + (owner.options.offset_years ?? 2)); i > (owner.current_time.getFullYear() + (owner.options.offset_years ?? 2) - 100); i--) {
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
            style: 3
        });
    }

    async onClickFineGiornata(event) {
        const owner = this.fwInstanceReference;
        owner.status.selected_hour = 23;
        owner.status.selected_minutes = 59;
        owner.status.selected_seconds = 59;
        owner.elements["timer1-text"].innerText = owner.status.selected_hour;
        owner.elements["timer2-text"].innerText = owner.status.selected_minutes;
        owner.elements["timer3-text"].innerText = owner.status.selected_seconds;
    }
    async onClickInizioGiornata(event) {
        const owner = this.fwInstanceReference;
        owner.status.selected_hour = 0;
        owner.status.selected_minutes = 0;
        owner.status.selected_seconds = 0;
        owner.elements["timer1-text"].innerText = owner.status.selected_hour;
        owner.elements["timer2-text"].innerText = owner.status.selected_minutes;
        owner.elements["timer3-text"].innerText = owner.status.selected_seconds;
    }
    async onClickOraCorrente(event) {
        const owner = this.fwInstanceReference;
        const now = new Date();
        owner.status.selected_hour = now.getHours();
        owner.status.selected_minutes = now.getMinutes();
        owner.status.selected_seconds = now.getSeconds();
        owner.elements["timer1-text"].innerText = owner.status.selected_hour;
        owner.elements["timer2-text"].innerText = owner.status.selected_minutes;
        owner.elements["timer3-text"].innerText = owner.status.selected_seconds;
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
                            the_input_triggerer.value = owner.getDate(enumDateFormats.ddMMyyyy);
                        } else {
                            the_input_triggerer.value = owner.getDate(enumDateFormats.HHmmss_ddMMyyy);
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

const enumDateFormats = Object.freeze({
    iso: 0,//yyyy-MM-ddThh:mm:ss
    ddMMyyyy: 1,//yyyy-MM-dd
    ddMMyyyy_HHmmss: 2,//yyyy-MM-dd HH:mm:ss //24H format
    HHmmss_ddMMyyy: 3,//24h format HH:mm:ss dd-MM-yyyy
});