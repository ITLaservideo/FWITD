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
     * @param {boolean} [options.time_only] - If true, shows only the hour and minutes selectors (hides seconds, the day shortcuts and the whole calendar). Read the result from `status.selected_hour` / `status.selected_minutes`.
     * @param {boolean} [options.floating=true] - If not `false`, `elementReference()` returns a read-only trigger input that opens the full picker in a centered `BottomSheet` on click, instead of rendering the picker inline.
     * @param {string} [options.placeholder] - Placeholder text for the floating trigger input; only used when `options.floating` isn't `false`.
     * @param {string} [options.label] - Label rendered above the floating trigger input; only used when `options.floating` isn't `false`.
     * @param {Date|string} [options.value] - Initial date/time; defaults to now. Also pre-fills the floating trigger input's displayed text.
     * @param {boolean} [options.is_time_intervall] - If true, selects an interval: two tabs on top ("inizio" / "fine", each showing its value) pick which end the rest of the picker edits,
     * the calendar highlights the range, the first day clicked sets the start and moves on to the end. The end never goes before the start: the end being edited pushes the other one.
     * The end is stored in `status` with the `_end` suffix (`selected_day_end`, ..., `selected_seconds_end`); read it with `getDate(format, true)`.
     * @param {Date|string} [options.value_end] - Initial end of the interval (only with `is_time_intervall`); defaults to `options.value`.
     * @param {Function} [options.onChange] - callback(iso_date_string, datepicker_instance), invoked whenever the floating picker's `BottomSheet` closes after a selection.
     * @param {Function} [options.onLastInputEnter] - callback(iso_date_string, datepicker_instance), invoked when Enter is pressed in the last visible text field (e.g. minutes with `time_only`), after its value has been applied.
     * With `is_time_intervall`, Enter there on the start moves on to the end instead, so it's invoked only from the end.
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
        if (options.value != undefined) {
            const initial = options.value instanceof Date ? options.value : new Date(options.value);
            if (!isNaN(initial.getTime())) {
                this.current_time = initial;
                this.#setStatus(initial, "");
                this.#setStatus(initial, "_end");
            }
        }
        if (options.value_end != undefined) {
            const initial_end = options.value_end instanceof Date ? options.value_end : new Date(options.value_end);
            if (!isNaN(initial_end.getTime())) {
                this.#setStatus(initial_end, "_end");
            }
        }
    }
    /**
     * @param {Date} date
     * @param {""|"_end"} suffix - start or end of the interval
     */
    #setStatus(date, suffix) {
        this.status[`selected_day${suffix}`] = date.getDate();
        this.status[`selected_month${suffix}`] = date.getMonth();
        this.status[`selected_year${suffix}`] = date.getFullYear();
        this.status[`selected_hour${suffix}`] = date.getHours();
        this.status[`selected_minutes${suffix}`] = date.getMinutes();
        this.status[`selected_seconds${suffix}`] = date.getSeconds();
    }
    /**
     * @param {""|"_end"} suffix - start or end of the interval
     * @returns {Date}
     */
    #statusDate(suffix) {
        const status = this.status;
        return new Date(status[`selected_year${suffix}`], status[`selected_month${suffix}`], status[`selected_day${suffix}`],
            status[`selected_hour${suffix}`], status[`selected_minutes${suffix}`], status[`selected_seconds${suffix}`]);
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
        selected_ms: 999,
        // end of the interval (options.is_time_intervall), same meaning as the ones above
        /** @type number */
        selected_day_end: this.current_time.getDate(),
        /** @type number */
        selected_month_end: this.current_time.getMonth(),
        /** @type number */
        selected_year_end: this.current_time.getFullYear(),
        /** @type number */
        selected_hour_end: this.current_time.getHours(),
        /** @type number */
        selected_minutes_end: this.current_time.getMinutes(),
        /** @type number */
        selected_seconds_end: this.current_time.getSeconds(),
    }
    /**
     * with `is_time_intervall`, true while the end of the interval is being edited
     */
    #editing_end = false;
    /**
     * `status` as seen by the editing UI (fields, timers, calendar, shortcuts): while editing the end,
     * every `selected_*` key is redirected to its `_end` twin
     */
    #edited = new Proxy(this.status, {
        get: (status, key) => status[this.#editedKey(key)],
        set: (status, key, value) => {
            status[this.#editedKey(key)] = value;
            return true;
        },
    });
    #editedKey(key) {
        return this.#editing_end && `${String(key)}_end` in this.status ? `${String(key)}_end` : key;
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

        /** @type HTMLInputElement */
        "input-day": null,
        /** @type HTMLInputElement */
        "input-month": null,
        /** @type HTMLInputElement */
        "input-year": null,
        /** @type HTMLInputElement */
        "input-hour": null,
        /** @type HTMLInputElement */
        "input-minutes": null,
        /** @type HTMLInputElement */
        "input-seconds": null,
        /** @type HTMLElement */
        "fields-time": null,
        /** @type HTMLElement */
        "interval-edges": null,
        /** @type HTMLElement */
        "edge-start": null,
        /** @type HTMLElement */
        "edge-end": null,
        /** @type HTMLElement */
        "edge-start-text": null,
        /** @type HTMLElement */
        "edge-end-text": null,
    }
    async #initialize() {
        const owner = this;
        if (owner.options.ignore_seconds == true) {
            owner.elements["time-selections"].remove();
        }
        if (owner.options.time_only == true) {
            owner.self_ref.classList.add("dp-time-only");
        }
        if (owner.options.is_time_intervall != true) {
            owner.elements["interval-edges"].remove();
        }
        owner.#makeItScorribile(owner.elements["time-container-hour"], "selected_hour", "timer1-text", 23);
        owner.#makeItScorribile(owner.elements["time-container-minutes"], "selected_minutes", "timer2-text", 59);
        owner.#makeItScorribile(owner.elements["time-container-seconds"], "selected_seconds", "timer3-text", 59);
        owner.#refreshEdited();
        owner.#wireFieldInputs();
        return;
    }
    /**
     * syncs everything showing the edited value: month/year header, timers, calendar and text fields
     */
    #refreshEdited() {
        const owner = this;
        owner.elements["month-text"].innerText = Locale.parseMonthConvertToReadable(owner.#edited.selected_month);
        owner.elements["year-text"].innerText = (owner.#edited.selected_year);
        owner.elements["timer1-text"].innerText = DatePicker.pad(owner.#edited.selected_hour);
        owner.elements["timer2-text"].innerText = DatePicker.pad(owner.#edited.selected_minutes);
        owner.elements["timer3-text"].innerText = DatePicker.pad(owner.#edited.selected_seconds);
        owner.#reGenerateDates();
        owner.#refreshFields();
    }
    //#region Interval
    /**
     * switches which end of the interval the picker edits
     * @param {boolean} editing_end
     */
    #setEditingEnd(editing_end) {
        const owner = this;
        owner.#editing_end = editing_end;
        owner.elements["edge-start"].classList.toggle("dp-interval-edge-active", !editing_end);
        owner.elements["edge-end"].classList.toggle("dp-interval-edge-active", editing_end);
        owner.#refreshEdited();
    }
    /**
     * from the start to the end of the interval, focusing the end's first text field (to keep typing)
     */
    #goToEnd() {
        const owner = this;
        owner.#setEditingEnd(true);
        owner.#fields.map(field => owner.elements[field.input]).find(DatePicker.#isShown)?.focus();
    }
    /**
     * the end of the interval never goes before the start: the end being edited pushes the other one
     */
    #keepIntervalOrder() {
        const owner = this;
        if (owner.#statusDate("_end") >= owner.#statusDate("")) {
            return;
        }
        owner.#setStatus(owner.#statusDate(owner.#editing_end ? "_end" : ""), owner.#editing_end ? "" : "_end");
    }
    /**
     * tabs text and calendar range (start, days in between, end) of the shown month
     */
    #refreshInterval() {
        const owner = this;
        const format = owner.#displayFormat();
        owner.elements["edge-start-text"].innerText = owner.getDate(format);
        owner.elements["edge-end-text"].innerText = owner.getDate(format, true);

        const day_start = DatePicker.#dayStamp(owner.#statusDate(""));
        const day_end = DatePicker.#dayStamp(owner.#statusDate("_end"));
        const cells = owner.elements["body-selections"].querySelectorAll(".calendar-date:not(.empty)");
        cells.forEach((cell, i) => {
            const day = DatePicker.#dayStamp(new Date(owner.#edited.selected_year, owner.#edited.selected_month, i + 1));
            cell.classList.toggle("selected-date", day == day_start || day == day_end);
            cell.classList.toggle("range-start", day == day_start);
            cell.classList.toggle("range-end", day == day_end);
            cell.classList.toggle("in-range", day > day_start && day < day_end);
        });
    }
    static #dayStamp(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    }
    static #isShown(element) {
        return element.isConnected && element.offsetParent != null;
    }
    async onClickEdgeStart(event) {
        const owner = this.fwInstanceReference;
        owner.#setEditingEnd(false);
    }
    async onClickEdgeEnd(event) {
        const owner = this.fwInstanceReference;
        owner.#setEditingEnd(true);
    }
    //#endregion
    /**
     * one entry per text field: which `status` key it edits, its valid range (as typed) and, for the time ones, the timer label to keep in sync
     */
    #fields = [
        { input: "input-day", key: "selected_day", min: 1, max: () => new Date(this.#edited.selected_year, this.#edited.selected_month + 1, 0).getDate(), date: true },
        { input: "input-month", key: "selected_month", min: 1, max: () => 12, offset: 1, date: true },
        { input: "input-year", key: "selected_year", min: 1, max: () => 9999, date: true },
        { input: "input-hour", key: "selected_hour", min: 0, max: () => 23, text: "timer1-text" },
        { input: "input-minutes", key: "selected_minutes", min: 0, max: () => 59, text: "timer2-text" },
        { input: "input-seconds", key: "selected_seconds", min: 0, max: () => 59, text: "timer3-text" },
    ];
    /**
     * each text field applies what's typed on change, Enter, blur and 1s after the last keyup;
     * Enter on the last visible field also calls `options.onLastInputEnter`.
     * While typing, an out-of-range value is marked with `dp-field-invalid`.
     * On focus the caret goes to the start: from there typing replaces the whole value and backspace clears it.
     * The mouse wheel over a field steps its value by 1 (up = +1), forced into the field's range like a typed value
     */
    #wireFieldInputs() {
        const owner = this;
        if (owner.options.ignore_seconds == true) {
            owner.elements["fields-time"].remove();
        }
        owner.#refreshFields();
        for (const field of owner.#fields) {
            const input = owner.elements[field.input];
            let debounce_timer_id = null;
            const apply = () => {
                clearTimeout(debounce_timer_id);
                debounce_timer_id = null;
                owner.#applyField(field);
            };
            input.addEventListener("change", apply);
            input.addEventListener("blur", apply);
            const clear = () => {
                clearTimeout(debounce_timer_id);
                input.value = "";
                input.classList.add("dp-field-invalid");
            };
            // caret at the start (no selection): backspace clears the field, typing replaces it
            const clearIfCaretAtStart = () => {
                if (input.selectionStart == 0 && input.selectionEnd == 0 && input.value != "") {
                    clear();
                }
            };
            input.addEventListener("focus", () => {
                // deferred: a click places the caret after the focus event
                setTimeout(() => input.setSelectionRange(0, 0), 0);
            });
            input.addEventListener("dblclick", () => {// double click/tap: clear to retype, applied on the next key, change or blur
                clear();
                input.focus();
            });
            input.addEventListener("keydown", (event) => {
                if (event.key == "Enter") {
                    event.preventDefault();
                    apply();
                    if (owner.#nextVisibleInput(field) != null) {
                        return;
                    }
                    if (owner.options.is_time_intervall == true && !owner.#editing_end) {
                        owner.#goToEnd();
                    } else {
                        owner.options.onLastInputEnter?.(owner.getDate('iso'), owner);
                    }
                } else if (event.key == "Backspace" || (event.key.length == 1 && !event.ctrlKey && !event.metaKey && !event.altKey)) {
                    // on keydown, before maxlength can block the typed character
                    clearIfCaretAtStart();
                }
            });
            input.addEventListener("beforeinput", (event) => {// virtual keyboards (key "Unidentified") and paste
                if (event.inputType.startsWith("insert") || event.inputType == "deleteContentBackward") {
                    clearIfCaretAtStart();
                }
            });
            input.addEventListener("input", (event) => {
                // field filled up by the user: move to the next visible one (the blur applies this one);
                // the last one of the interval's start moves on to the end (applied first, the end's values replace the text)
                if (event.inputType.startsWith("insert") && input.maxLength > 0 && input.value.length >= input.maxLength) {
                    if (owner.#nextVisibleInput(field) == null && owner.options.is_time_intervall == true && !owner.#editing_end) {
                        apply();
                        owner.#goToEnd();
                    } else {
                        owner.#focusNextField(field);
                    }
                }
            });
            input.addEventListener("wheel", (event) => {// wheel up/down: +1/-1 on what's shown (or typed), applied right away
                if (event.deltaY == 0) {
                    return;
                }
                event.preventDefault();
                const typed = owner.#parseField(field, input.value.trim());
                const current = isNaN(typed) ? owner.#edited[field.key] + (field.offset ?? 0) : typed;
                input.value = `${current + (event.deltaY < 0 ? 1 : -1)}`;
                apply();
            }, { passive: false });
            input.addEventListener("keyup", () => {
                clearTimeout(debounce_timer_id);
                // live feedback only: applying always lands on a valid value
                input.classList.toggle("dp-field-invalid", !owner.#isInRange(field, owner.#parseField(field, input.value.trim())));
                if (input.value.trim() == "") {// cleared to retype: wait for the next key, change or blur
                    return;
                }
                debounce_timer_id = setTimeout(apply, DatePicker.FIELD_DEBOUNCE_MS);
            });
        }
    }
    static FIELD_DEBOUNCE_MS = 1000;
    /**
     * @returns {HTMLInputElement|undefined} the first field after `field` that's still shown (`ignore_seconds` removes the time ones, `time_only` hides the date ones and the seconds), undefined if `field` is the last one
     */
    #nextVisibleInput(field) {
        const owner = this;
        return owner.#fields.slice(owner.#fields.indexOf(field) + 1)
            .map(next_field => owner.elements[next_field.input])
            .find(DatePicker.#isShown);
    }
    #focusNextField(field) {
        this.#nextVisibleInput(field)?.focus();
    }
    #formatField(field) {
        const value = this.#edited[field.key] + (field.offset ?? 0);
        return field.key == "selected_year" ? `${value}` : DatePicker.pad(value);
    }
    /**
     * after the month or year changes: clamps the day to the new month's length (e.g. 31 → February) and syncs the text fields
     */
    #onMonthOrYearChanged() {
        const owner = this;
        const days_in_month = new Date(owner.#edited.selected_year, owner.#edited.selected_month + 1, 0).getDate();
        owner.#edited.selected_day = Math.min(owner.#edited.selected_day, days_in_month);
        owner.#refreshFields();
    }
    /**
     * syncs the text fields after any change of the edited value;
     * with `is_time_intervall` first keeps the end after the start, then also syncs the tabs and the calendar range
     */
    #refreshFields() {
        const owner = this;
        const is_interval = owner.options.is_time_intervall == true;
        if (is_interval) {
            owner.#keepIntervalOrder();
        }
        for (const field of owner.#fields) {
            const input = owner.elements[field.input];
            input.value = owner.#formatField(field);
            input.classList.remove("dp-field-invalid");
        }
        if (is_interval) {
            owner.#refreshInterval();
        }
    }
    /**
     * @returns {number} the number made by the typed digits, ignoring anything else (as typed, e.g. month 1..12), `NaN` if there are no digits.
     * The month also accepts (part of) its name, see `parseMonthName`
     */
    #parseField(field, text) {
        const digits = text.replace(/\D/g, "");
        if (digits == "" && field.key == "selected_month") {
            return DatePicker.parseMonthName(text);
        }
        let value = digits == "" ? NaN : Number(digits);
        if (field.key == "selected_year" && digits.length <= 2) {
            value += 2000;
        }
        return value;
    }
    /**
     * matches the typed letters (anything else is ignored) against `Locale.getShortMonths()`, case-insensitive:
     * the first month that starts with them, otherwise the first one that contains them
     * @example "j" → 1 (Jan), "ju" → 6 (Jun), "jul" → 7, ";j" → 1
     * @param {string} text
     * @returns {number} the month as typed (1..12), `NaN` if there are no letters or no month matches
     */
    static parseMonthName(text) {
        const letters = text.replace(/[^\p{L}]/gu, "").toLocaleLowerCase();
        if (letters == "") {
            return NaN;
        }
        const months = Locale.getShortMonths().map(month => month.toLocaleLowerCase());
        let index = months.findIndex(month => month.startsWith(letters));
        if (index < 0) {
            index = months.findIndex(month => month.includes(letters));
        }
        return index < 0 ? NaN : index + 1;
    }
    #isInRange(field, value) {
        return !isNaN(value) && value >= field.min && value <= field.max();
    }
    /**
     * applies the typed number to the picker, forced into the field's range: not a number → min, too small → min, too big → max
     */
    #applyField(field) {
        const owner = this;
        const input = owner.elements[field.input];
        const text = input.value.trim();
        if (text == owner.#formatField(field)) {// change/Enter/blur fire together: handle it once
            input.classList.remove("dp-field-invalid");
            return;
        }
        const value = owner.#parseField(field, text);
        owner.#edited[field.key] = (isNaN(value) ? field.min : Math.min(Math.max(value, field.min), field.max())) - (field.offset ?? 0);
        if (field.date == true) {
            // e.g. 31 → February: clamp the day to the new month's length
            const days_in_month = new Date(owner.#edited.selected_year, owner.#edited.selected_month + 1, 0).getDate();
            owner.#edited.selected_day = Math.min(owner.#edited.selected_day, days_in_month);
            owner.elements["month-text"].innerText = Locale.parseMonthConvertToReadable(owner.#edited.selected_month);
            owner.elements["year-text"].innerText = (owner.#edited.selected_year);
            const calendar = owner.#reGenerateDates();
            calendar.querySelectorAll(".calendar-date:not(.empty)")[owner.#edited.selected_day - 1]?.classList.add("selected-date");
        } else {
            owner.elements[field.text].innerText = DatePicker.pad(owner.#edited[field.key]);
        }
        owner.#refreshFields();
    }
    /**
     * @param {Element} element_to_grab
     * @param {string} change_status_variable
     * @param {string} change_element_innertext
     * @param {number} max - upper clamp (inclusive) for `owner.#edited[change_status_variable]`; the lower clamp is always 0.
     */
    #makeItScorribile(element_to_grab, change_status_variable, change_element_innertext, max) {
        const owner = this;
        if (typeof MovableUtil !== "undefined") {
            MovableUtil.trackMouse(element_to_grab, ({ x, y }) => {
                if (y > 0) {
                    owner.#edited[change_status_variable] = Math.min(Math.max((owner.#edited[change_status_variable]) + 1, 0), max);
                } else if (y < 0) {
                    owner.#edited[change_status_variable] = Math.min(Math.max((owner.#edited[change_status_variable]) - 1, 0), max);
                }
                owner.elements[change_element_innertext].innerText = DatePicker.pad(owner.#edited[change_status_variable]);
                owner.#refreshFields();
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
     * @param {'iso'|'ddMMyyyy'|'ddMMyyyy_HHmmss'|'HHmmss_ddMMyyy'|'HHmm'} [date_format='iso'] - `iso`: "yyyy-MM-ddTHH:mm:ss" | `ddMMyyyy`: "dd-MM-yyyy" | `ddMMyyyy_HHmmss`: "dd-MM-yyyy HH:mm:ss" | `HHmmss_ddMMyyy`: "HH:mm:ss dd-MM-yyyy" | `HHmm`: "HH:mm"
     * @param {boolean} [end=false] - with `is_time_intervall`, the end of the interval instead of the start
     * @returns {string}
     */
    getDate(date_format = 'iso', end = false) {
        const suffix = end ? "_end" : "";
        const yyyy = this.status[`selected_year${suffix}`];
        const MM = DatePicker.pad(this.status[`selected_month${suffix}`] + 1);
        const dd = DatePicker.pad(this.status[`selected_day${suffix}`]);
        const HH = DatePicker.pad(this.status[`selected_hour${suffix}`]);
        const mm = DatePicker.pad(this.status[`selected_minutes${suffix}`]);
        const ss = DatePicker.pad(this.status[`selected_seconds${suffix}`]);

        switch (date_format) {
            case 'HHmm':
                // HH:mm
                return `${HH}:${mm}`;
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
    /**
     * @returns {'HHmm'|'ddMMyyyy'|'HHmmss_ddMMyyy'} the `getDate` format matching what the picker shows (floating input, interval tabs)
     */
    #displayFormat() {
        const options = this.options;
        return options.time_only == true ? 'HHmm' : options.ignore_seconds == true ? 'ddMMyyyy' : 'HHmmss_ddMMyyy';
    }
    /**
     * @returns {string} text of the floating trigger input: the date, or "start → end" with `is_time_intervall`
     */
    #displayText() {
        const format = this.#displayFormat();
        return this.options.is_time_intervall == true ? `${this.getDate(format)} → ${this.getDate(format, true)}` : this.getDate(format);
    }

    //#region UiBuilder
    #reGenerateDates() {
        const owner = this;

        const container = document.createElement("div");
        container.classList.add("calendar-container");

        const year = owner.#edited.selected_year;
        const month = owner.#edited.selected_month;
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
                owner.#edited.selected_day = day;
                owner.#refreshFields();
                if (owner.options.is_time_intervall == true && !owner.#editing_end) {
                    // first click: a new range from this day, the end restarts from it too (keeping its time) and is picked by the next click
                    owner.status.selected_day_end = owner.status.selected_day;
                    owner.status.selected_month_end = owner.status.selected_month;
                    owner.status.selected_year_end = owner.status.selected_year;
                    owner.#setEditingEnd(true);
                    return;
                }
                if (owner.elements.instanceBottomSheet != undefined) {
                    owner.elements.instanceBottomSheet.destroy();
                    return;
                }
                if (owner.options.is_time_intervall == true) {// range already marked by #refreshFields
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
        owner.#edited.selected_hour = (owner.#edited.selected_hour + 1) % 24;   // wrap 23 → 0
        owner.elements["timer1-text"].innerText = DatePicker.pad(owner.#edited.selected_hour);
        owner.#refreshFields();
    }

    async onClickTimer1Next(event) {
        const owner = this.fwInstanceReference;
        owner.#edited.selected_hour = (owner.#edited.selected_hour - 1 + 24) % 24; // wrap 0 → 23
        owner.elements["timer1-text"].innerText = DatePicker.pad(owner.#edited.selected_hour);
        owner.#refreshFields();
    }

    async onClickTimer2Previous(event) {
        const owner = this.fwInstanceReference;
        owner.#edited.selected_minutes = (owner.#edited.selected_minutes + 1) % 60;   // wrap 59 → 0
        owner.elements["timer2-text"].innerText = DatePicker.pad(owner.#edited.selected_minutes);
        owner.#refreshFields();
    }

    async onClickTimer2Next(event) {
        const owner = this.fwInstanceReference;
        owner.#edited.selected_minutes = (owner.#edited.selected_minutes - 1 + 60) % 60; // wrap 0 → 59
        owner.elements["timer2-text"].innerText = DatePicker.pad(owner.#edited.selected_minutes);
        owner.#refreshFields();
    }

    async onClickTimer3Previous(event) {
        const owner = this.fwInstanceReference;
        owner.#edited.selected_seconds = (owner.#edited.selected_seconds + 1 + 60) % 60;
        owner.elements["timer3-text"].innerText = DatePicker.pad(owner.#edited.selected_seconds);
        owner.#refreshFields();
    }

    async onClickTimer3Next(event) {
        const owner = this.fwInstanceReference;
        owner.#edited.selected_seconds = (owner.#edited.selected_seconds - 1 + 60) % 60;
        owner.elements["timer3-text"].innerText = DatePicker.pad(owner.#edited.selected_seconds);
        owner.#refreshFields();
    }
    async onClickNextMonth(event) {
        /**
         * @type DatePicker
         */
        const owner = this.fwInstanceReference;
        owner.#edited.selected_month++;
        if (owner.#edited.selected_month > 11) {
            owner.#edited.selected_month = 0;
            owner.#edited.selected_year++;
            owner.elements["year-text"].innerText = (owner.#edited.selected_year);
        }
        owner.elements["month-text"].innerText = Locale.parseMonthConvertToReadable(owner.#edited.selected_month);
        owner.elements["body-selections"].innerText = "";
        owner.#reGenerateDates();
        owner.#onMonthOrYearChanged();
    }
    async onClickPreviousMonth(event) {
        const owner = this.fwInstanceReference;
        owner.#edited.selected_month--;
        if (owner.#edited.selected_month < 0) {
            owner.#edited.selected_month = 11;
            owner.#edited.selected_year--;
            owner.elements["year-text"].innerText = (owner.#edited.selected_year);
        }
        owner.elements["month-text"].innerText = Locale.parseMonthConvertToReadable(owner.#edited.selected_month);
        owner.#reGenerateDates();
        owner.#onMonthOrYearChanged();
    }
    /**
     * rows of the month selector: season icon + its 3 months (0 = January), starting from December
     */
    static SEASONS = [
        { icon: "f166", name: "inverno", months: [11, 0, 1] },
        { icon: "eb4c", name: "primavera", months: [2, 3, 4] },
        { icon: "eb3e", name: "estate", months: [5, 6, 7] },
        { icon: "f8ca", name: "autunno", months: [8, 9, 10] },
    ];
    async onClickMonthText(event) {
        /**
         * @type DatePicker
         */
        const owner = this.fwInstanceReference;
        const months = Locale.getShortMonths();
        const today = new Date();
        /** @type MousePopUp */
        let popup = null;

        const grid = document.createElement("div");
        grid.className = "dp-month-selector";
        for (const season of DatePicker.SEASONS) {
            const icon = Icons.create(season.icon);
            grid.appendChild(icon);
            for (const month of season.months) {
                const cell = document.createElement("div");
                cell.className = "dp-month-cell";
                cell.innerText = `${month + 1} - ${months[month]}`;
                cell.classList.toggle("selected-month", month == owner.#edited.selected_month);
                cell.classList.toggle("today", month == today.getMonth() && owner.#edited.selected_year == today.getFullYear());
                cell.addEventListener("click", () => {
                    owner.#edited.selected_month = month;
                    owner.elements["month-text"].innerText = Locale.parseMonthConvertToReadable(owner.#edited.selected_month);
                    owner.#reGenerateDates();
                    owner.#onMonthOrYearChanged();
                    popup.destroy();
                });
                grid.appendChild(cell);
            }
        }
        popup = new MousePopUp({
            action_titles: [],
            next: [],
            iAmAwareThereAreNoSelections: true,
            beforeSelectionsRow: grid,
            event: event,
            style: 'multi-select',
        });
    }
    async onClickYearText(event) {
        /**
         * @type DatePicker
         */
        const owner = this.fwInstanceReference;
        const next = [];
        const action_titles = [];
        const backgrounds = [];
        const coo = owner.elements["month-text"].getBoundingClientRect();
        const current_year = owner.current_time.getFullYear();
        // default: offset to whichever multiple of 10 is closest to the current year (e.g. 2026 -> 2030, offset 4)
        const offset_years = owner.options.offset_years ?? (Math.round(current_year / 10) * 10 - current_year);
        const start_year = current_year + offset_years;
        // wide screens: 10 years per row, each row in ascending order (rows still descend, e.g. 2021..2030 / 2011..2020)
        const is_grid = window.innerWidth > 600;
        const years = [];
        for (let i = start_year; i > start_year - 100; i--) {
            years.push(i);
        }
        if (is_grid) {
            for (let row = 0; row < years.length; row += 10) {
                years.splice(row, 10, ...years.slice(row, row + 10).reverse());
            }
        }
        for (const i of years) {
            next.push(() => {
                owner.#edited.selected_year = i;
                owner.elements["year-text"].innerText = (owner.#edited.selected_year);
                owner.#reGenerateDates();
                owner.#onMonthOrYearChanged();
            });
            action_titles.push(i);
            // highlights the start of each decade
            backgrounds.push(i % 10 == 0 ? "var(--vscode-list-inactiveSelectionBackground)" : undefined);
        }
        new MousePopUp({
            action_titles: action_titles,
            next: next,
            override_backgrounds_color: backgrounds,
            event: { clientX: coo.x, clientY: coo.y },
            style: 'multi-select',
            // 10 years per row only on wide screens, otherwise the default list
            class: is_grid ? "dp-year-splitter" : undefined
        });
    }

    async onClickFineGiornata(event) {
        const owner = this.fwInstanceReference;
        owner.#edited.selected_hour = 23;
        owner.#edited.selected_minutes = 59;
        owner.#edited.selected_seconds = 59;
        owner.elements["timer1-text"].innerText = DatePicker.pad(owner.#edited.selected_hour);
        owner.elements["timer2-text"].innerText = DatePicker.pad(owner.#edited.selected_minutes);
        owner.elements["timer3-text"].innerText = DatePicker.pad(owner.#edited.selected_seconds);
        owner.#refreshFields();
    }
    async onClickInizioGiornata(event) {
        const owner = this.fwInstanceReference;
        owner.#edited.selected_hour = 0;
        owner.#edited.selected_minutes = 0;
        owner.#edited.selected_seconds = 0;
        owner.elements["timer1-text"].innerText = DatePicker.pad(owner.#edited.selected_hour);
        owner.elements["timer2-text"].innerText = DatePicker.pad(owner.#edited.selected_minutes);
        owner.elements["timer3-text"].innerText = DatePicker.pad(owner.#edited.selected_seconds);
        owner.#refreshFields();
    }
    async onClickOraCorrente(event) {
        const owner = this.fwInstanceReference;
        const now = new Date();
        owner.#edited.selected_hour = now.getHours();
        owner.#edited.selected_minutes = now.getMinutes();
        owner.#edited.selected_seconds = now.getSeconds();
        owner.elements["timer1-text"].innerText = DatePicker.pad(owner.#edited.selected_hour);
        owner.elements["timer2-text"].innerText = DatePicker.pad(owner.#edited.selected_minutes);
        owner.elements["timer3-text"].innerText = DatePicker.pad(owner.#edited.selected_seconds);
        owner.#refreshFields();
    }
    //#endregion
    //#region OverwrittenFunctions
    #elementReferenceOverwritten() {//when floating == true
        const owner = this;
        if (owner.elements.the_input_triggerer_wrap == undefined) {
            const wrap = document.createElement("div");
            wrap.className = "dp-triggerer-wrap";

            if (owner.options.label != undefined) {
                const label = document.createElement("div");
                label.className = "dp-triggerer-label";
                label.innerText = owner.options.label;
                wrap.appendChild(label);
            }

            const the_input = document.createElement("input");
            the_input.setAttribute("type", "text");
            the_input.setAttribute("tabindex", "-1");
            the_input.readOnly = true;
            the_input.placeholder = owner.options.placeholder ?? 'select date';
            the_input.style = "width: -webkit-fill-available;";
            if (owner.options.value != undefined) {
                the_input.value = owner.#displayText();
            }
            wrap.addEventListener("click", (eve) => {
                if (owner.options.is_time_intervall == true) {// every opening starts from the start of the interval
                    owner.#setEditingEnd(false);
                }
                owner.elements.instanceBottomSheet = new BottomSheet({
                    element: owner.self_ref,
                    onClose: () => {
                        the_input.value = owner.#displayText();
                        owner.options.onChange?.(owner.getDate('iso'), owner);
                    },
                    centered: true
                });
            });
            wrap.appendChild(the_input);

            owner.elements.the_input = the_input;
            owner.elements.the_input_triggerer_wrap = wrap;
        }
        return owner.elements.the_input_triggerer_wrap;
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
//     mock_container.style.gridTemplateRows = "repeat(3, auto)";
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
//         },
//         {
//             title: "7) Flottante con label",
//             options: { placeholder: "Seleziona una data", label: "Data di consegna" },
//             test: "Osserva il componente appena creato, senza cliccare nulla.",
//             expect: "Sopra il campo di sola lettura compare l'etichetta \"Data di consegna\"; il resto del comportamento (click -> BottomSheet) è identico alla variante 2."
//         },
//         {
//             title: "8) time only",
//             options: { floating: false, time_only: true, value: new Date() },
//             test: "Time picker",
//             expect: ""
//         },
//         {
//             title: "9) is_time_intervall",
//             options: { floating: false, is_time_intervall: true, value_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
//             test: "Clicca un giorno, poi un altro giorno dopo; passa tra le schede \"inizio\"/\"fine\" e cambia l'ora; prova a mettere la fine prima dell'inizio.",
//             expect: "Il primo click fissa l'inizio e passa a \"fine\", il secondo la fine; i giorni in mezzo sono evidenziati. Le schede mostrano entrambi i valori; la fine non va mai prima dell'inizio (quello modificato spinge l'altro)."
//         },
//         {
//             title: "10) is_time_intervall + time_only",
//             options: { floating: false, is_time_intervall: true, time_only: true, value: new Date(new Date().setHours(8, 30, 0, 0)), value_end: new Date(new Date().setHours(17, 30, 0, 0)) },
//             test: "Scrivi l'ora e i minuti di inizio (o premi Invio sui minuti), poi quelli di fine; passa tra le schede \"inizio\"/\"fine\" e trascina ore/minuti; prova a mettere la fine prima dell'inizio (es. inizio 18:00).",
//             expect: "Si vedono solo le schede (\"inizio 08:30\" → \"fine 17:30\") e ore/minuti, niente calendario. Riempiti i minuti di inizio (o con Invio) il fuoco passa alle ore di fine; le schede si aggiornano mentre modifichi. La fine non va mai prima dell'inizio: inizio 18:00 porta anche la fine a 18:00."
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