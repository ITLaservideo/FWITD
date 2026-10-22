/**
 * Two read-only sliders showing how much of the working day (08:30 → 17:30) and of the working week
 * (Monday 08:30 → Friday 17:30) has elapsed, counting only working hours (08:30-12:30, 13:30-17:30).
 * The day slider is split in one track per slot (morning / afternoon), each as wide as the slot,
 * the week slider in one track per working day.
 * Hovering each slider shows the percentage via addHint.
 * On startup a modal asks at what time the working day ends, which replaces 17:30.
 * Clicking the gap between morning and afternoon (as wide as the lunch break) opens a modal to change the lunch break, which replaces 12:30-13:30.
 * Above the sliders an encouragement text changes every time the day progress crosses a whole percent
 * (morning texts before the afternoon slot starts, afternoon texts after); clicking it shows the next one.
 * Clicking a day of the week slider opens a modal with a "work day" toggle: days off don't count in the week (and today off counts as the weekend).
 * The `HOLIDAYS` are days off by default (the toggle can turn them back into working days).
 * @version 1.5
 */
class DCSVAC extends FrameworkGC(`${injector_html}`) {
    /**
     * working time slots of a day, as [start, end] minutes from midnight
     */
    static WORK_SLOTS = [[8 * 60 + 30, 12 * 60 + 30], [13 * 60 + 30, 17 * 60 + 30]];
    static WORK_DAYS = 5;// Monday..Friday
    static REFRESH_MS = 5000;
    static STORAGE_KEY_END_MINUTE = "dai-che-si-va-a-casa-end-minute";
    static STORAGE_KEY_LUNCH = "dai-che-si-va-a-casa-lunch";
    // the value predates `HOLIDAYS`, when every toggled day was a day off
    static STORAGE_KEY_DAYS_TOGGLED = "dai-che-si-va-a-casa-days-off";
    /**
     * default lunch break: between the two `WORK_SLOTS`, as [start, end] minutes from midnight
     */
    static DEFAULT_LUNCH = [DCSVAC.WORK_SLOTS[0][1], DCSVAC.WORK_SLOTS[1][0]];
    /**
     * holidays falling on a working day, days off by default: `dateKey` → name
     * @type {Object<string, string>}
     */
    static HOLIDAYS = {
        "2026-12-08": "Immacolata Concezione",
        "2026-12-25": "Natale",
        "2027-01-01": "Capodanno",
        "2027-01-06": "Epifania",
        "2027-03-29": "Lunedì dell'Angelo (Pasquetta)",
        "2027-06-02": "Festa della Repubblica",
        "2027-10-04": "San Francesco d'Assisi",
        "2027-11-01": "Ognissanti",
        "2027-12-08": "Immacolata Concezione",
        "2028-01-06": "Epifania",
        "2028-04-17": "Lunedì dell'Angelo (Pasquetta)",
        "2028-04-25": "Festa della Liberazione",
        "2028-05-01": "Festa dei Lavoratori",
        "2028-06-02": "Festa della Repubblica",
        "2028-08-15": "Ferragosto / Assunzione",
        "2028-10-04": "San Francesco d'Assisi",
        "2028-11-01": "Ognissanti",
        "2028-12-08": "Immacolata Concezione",
        "2028-12-25": "Natale",
        "2028-12-26": "Santo Stefano",
        "2029-01-01": "Capodanno",
        "2029-04-02": "Lunedì dell'Angelo (Pasquetta)",
        "2029-04-25": "Festa della Liberazione",
        "2029-05-01": "Festa dei Lavoratori",
        "2029-08-15": "Ferragosto / Assunzione",
        "2029-10-04": "San Francesco d'Assisi",
        "2029-11-01": "Ognissanti",
        "2029-12-25": "Natale",
        "2029-12-26": "Santo Stefano",
        "2030-01-01": "Capodanno",
        "2030-04-22": "Lunedì dell'Angelo (Pasquetta)",
        "2030-04-25": "Festa della Liberazione",
        "2030-05-01": "Festa dei Lavoratori",
        "2030-08-15": "Ferragosto / Assunzione",
        "2030-10-04": "San Francesco d'Assisi",
        "2030-11-01": "Ognissanti",
        "2030-12-25": "Natale",
        "2030-12-26": "Santo Stefano",
        "2031-01-01": "Capodanno",
        "2031-01-06": "Epifania",
        "2031-04-14": "Lunedì dell'Angelo (Pasquetta)",
        "2031-04-25": "Festa della Liberazione",
        "2031-05-01": "Festa dei Lavoratori",
        "2031-06-02": "Festa della Repubblica",
        "2031-08-15": "Ferragosto / Assunzione",
        "2031-12-08": "Immacolata Concezione",
        "2031-12-25": "Natale",
        "2031-12-26": "Santo Stefano",
        "2032-01-01": "Capodanno",
        "2032-01-06": "Epifania",
        "2032-03-29": "Lunedì dell'Angelo (Pasquetta)",
        "2032-06-02": "Festa della Repubblica",
        "2032-10-04": "San Francesco d'Assisi",
        "2032-11-01": "Ognissanti",
        "2032-12-08": "Immacolata Concezione",
        "2033-01-06": "Epifania",
        "2033-04-18": "Lunedì dell'Angelo (Pasquetta)",
        "2033-04-25": "Festa della Liberazione",
        "2033-06-02": "Festa della Repubblica",
        "2033-08-15": "Ferragosto / Assunzione",
        "2033-10-04": "San Francesco d'Assisi",
        "2033-11-01": "Ognissanti",
        "2033-12-08": "Immacolata Concezione",
        "2033-12-26": "Santo Stefano",
        "2034-01-06": "Epifania",
        "2034-04-10": "Lunedì dell'Angelo (Pasquetta)",
        "2034-04-25": "Festa della Liberazione",
        "2034-05-01": "Festa dei Lavoratori",
        "2034-06-02": "Festa della Repubblica",
        "2034-08-15": "Ferragosto / Assunzione",
        "2034-10-04": "San Francesco d'Assisi",
        "2034-11-01": "Ognissanti",
        "2034-12-08": "Immacolata Concezione",
        "2034-12-25": "Natale",
        "2034-12-26": "Santo Stefano",
        "2035-01-01": "Capodanno",
        "2035-03-26": "Lunedì dell'Angelo (Pasquetta)",
        "2035-04-25": "Festa della Liberazione",
        "2035-05-01": "Festa dei Lavoratori",
        "2035-08-15": "Ferragosto / Assunzione",
        "2035-10-04": "San Francesco d'Assisi",
        "2035-11-01": "Ognissanti",
        "2035-12-25": "Natale",
        "2035-12-26": "Santo Stefano",
        "2036-01-01": "Capodanno",
        "2036-04-14": "Lunedì dell'Angelo (Pasquetta)",
        "2036-04-25": "Festa della Liberazione",
        "2036-05-01": "Festa dei Lavoratori",
        "2036-06-02": "Festa della Repubblica",
        "2036-08-15": "Ferragosto / Assunzione",
    };
    /**
     * @param {Object} options
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
        /** @type HTMLElement */
        container: null,
        /** @type HTMLElement */
        day_bar: null,
        /** @type HTMLElement */
        day_segments: null,
        /** @type HTMLElement */
        day_thumb: null,
        /** @type HTMLElement */
        day_explained: null,
        /** @type HTMLElement */
        week_bar: null,
        /** @type HTMLElement */
        week_segments: null,
        /** @type HTMLElement */
        week_thumb: null,
        /** @type HTMLElement */
        week_explained: null,
        /** @type HTMLElement */
        encouragement_bar: null,
        /** @type HTMLElement */
        encouragement_text: null,
    }
    #refresh_interval = null;
    /**
     * `${type}:${whole percent}` of the day when the encouragement was last changed, null to force a change
     * @type {string|null}
     */
    #encouragement_key = null;
    /**
     * texts still to show per type (`#encouragementType`), shuffled: popped one at a time and refilled when empty, so no text repeats until all are shown
     * @type {Object<string, Array<string>>}
     */
    #encouragement_bags = {};
    /**
     * end of the working day, minutes from midnight (asked to the user on startup, defaults to the last confirmed value)
     */
    #end_minute = DCSVAC.savedEndMinute() ?? DCSVAC.WORK_SLOTS.at(-1)[1];
    /**
     * lunch break, [start, end] minutes from midnight (changed by clicking the gap in the day slider, defaults to the last confirmed value)
     * @type {[number, number]}
     */
    #lunch = DCSVAC.savedLunch() ?? DCSVAC.DEFAULT_LUNCH;
    /**
     * working days toggled by clicking a day in the week slider, as `dateKey`s:
     * a toggled holiday is a working day, any other toggled day is a day off (see `#isDayOff`)
     * @type {Set<string>}
     */
    #days_toggled = DCSVAC.savedDaysToggled();
    async #initialize() {
        const owner = this;
        owner.#refresh();
        owner.#refresh_interval = setInterval(() => owner.#refresh(), DCSVAC.REFRESH_MS);
        owner.elements.encouragement_text.addEventListener("click", () => owner.#nextEncouragement(owner.#encouragementType(new Date())));
        owner.#askEndHour();
    }
    /**
     * opens a modal with an hour/minutes DatePicker asking at what time the working day ends
     */
    #askEndHour() {
        const owner = this;
        owner.#askTime("A che ora finisci di lavorare?", { time_only: true, value: DCSVAC.minuteToDate(owner.#end_minute) },
            picker => localStorage.setItem(DCSVAC.STORAGE_KEY_END_MINUTE, `${DCSVAC.pickedMinute(picker)}`),
            picker => {
                owner.#end_minute = DCSVAC.pickedMinute(picker);
                owner.#refresh();
            });
    }
    /**
     * opens a modal with an hour/minutes interval DatePicker to change the lunch break; applied and saved only on OK
     */
    #askLunch() {
        const owner = this;
        owner.#askTime("Pausa pranzo", {
            time_only: true,
            is_time_intervall: true,
            value: DCSVAC.minuteToDate(owner.#lunch[0]),
            value_end: DCSVAC.minuteToDate(owner.#lunch[1]),
        }, picker => {
            owner.#lunch = [DCSVAC.pickedMinute(picker), DCSVAC.pickedMinute(picker, true)];
            localStorage.setItem(DCSVAC.STORAGE_KEY_LUNCH, owner.#lunch.join("-"));
            owner.#encouragement_key = null;
            owner.#refresh();
        });
    }
    /**
     * opens a modal with a "work day" toggle for a day of the current week; applied and saved at every toggle
     * @param {number} day - 0 = Monday .. `WORK_DAYS` - 1
     */
    #askWorkDay(day) {
        const owner = this;
        const date = DCSVAC.weekDates(new Date())[day];
        const key = DCSVAC.dateKey(date);
        const content = document.createElement("div");
        content.className = "dcsvac-ask";
        const title = document.createElement("div");
        title.className = "dcsvac-ask-title";
        title.innerText = DCSVAC.formatDay(date);
        const toggle_options = {
            innerText: { on: "sì", off: "no" },
            isOn: !owner.#isDayOff(date),
            label: "Giorno lavorativo",
            onClick: (event, options) => {
                options.setIsOn(options.isOn = !options.isOn);
                if (owner.#days_toggled.has(key)) {
                    owner.#days_toggled.delete(key);
                } else {
                    owner.#days_toggled.add(key);
                }
                owner.#saveDaysToggled();
                owner.#refresh();
            },
        };
        content.append(title, UiBuilder.createToggle(toggle_options));
        new BottomSheet({ element: content, centered: true });
    }
    /**
     * saves `#days_toggled`, dropping the ones before the current week (they can't be toggled anymore)
     */
    #saveDaysToggled() {
        const week_start = DCSVAC.dateKey(DCSVAC.weekDates(new Date())[0]);
        const keys = [...this.#days_toggled].filter(key => key >= week_start);
        this.#days_toggled = new Set(keys);
        localStorage.setItem(DCSVAC.STORAGE_KEY_DAYS_TOGGLED, keys.join(","));
    }
    /**
     * modal with a title, a DatePicker and an OK button (Enter on the picker's last field = OK)
     * @param {string} title_text
     * @param {Object} picker_options - DatePicker options (`floating` and `onLastInputEnter` are set here)
     * @param {(picker: DatePicker) => void} onOk - on OK, before closing
     * @param {(picker: DatePicker) => void} [onClose] - on any close (after `onOk` when closed by OK)
     */
    #askTime(title_text, picker_options, onOk, onClose) {
        const button_ok = document.createElement("div");
        const picker = new DatePicker({ ...picker_options, floating: false, onLastInputEnter: () => button_ok.click() });
        const content = document.createElement("div");
        content.className = "dcsvac-ask";
        const title = document.createElement("div");
        title.className = "dcsvac-ask-title";
        title.innerText = title_text;
        button_ok.className = "ez-button dcsvac-ask-ok";
        button_ok.innerText = "OK";
        content.append(title, picker.elementReference(), button_ok);

        const sheet = new BottomSheet({
            element: content,
            centered: true,
            onClose: () => onClose?.(picker),
        });
        button_ok.addEventListener("click", () => {
            onOk(picker);
            sheet.destroy();
        });
    }
    /**
     * @param {DatePicker} picker - a `time_only` one
     * @param {boolean} [end=false] - the end of the interval (`is_time_intervall`)
     * @returns {number} the picked time, minutes from midnight
     */
    static pickedMinute(picker, end = false) {
        const suffix = end ? "_end" : "";
        return picker.status[`selected_hour${suffix}`] * 60 + picker.status[`selected_minutes${suffix}`];
    }
    /**
     * @param {number} minute - minutes from midnight
     * @returns {Date} today at that time
     */
    static minuteToDate(minute) {
        const date = new Date();
        date.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
        return date;
    }
    /**
     * @param {number} minute - minutes from midnight
     * @returns {string} "HH:mm"
     */
    static formatMinute(minute) {
        return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    }
    /**
     * @returns {number|null} last end of the working day confirmed by the user (minutes from midnight), null if missing/invalid
     */
    static savedEndMinute() {
        const saved = localStorage.getItem(DCSVAC.STORAGE_KEY_END_MINUTE);
        const minute = Number(saved);
        return saved?.trim() && Number.isInteger(minute) && minute >= 0 && minute < 24 * 60 ? minute : null;
    }
    /**
     * @returns {[number, number]|null} last lunch break confirmed by the user ([start, end] minutes from midnight), null if missing/invalid
     */
    static savedLunch() {
        const [start, end] = (localStorage.getItem(DCSVAC.STORAGE_KEY_LUNCH) ?? "").split("-").map(part => part.trim() == "" ? NaN : Number(part));
        return Number.isInteger(start) && Number.isInteger(end) && start >= 0 && start <= end && end < 24 * 60 ? [start, end] : null;
    }
    /**
     * @returns {Set<string>} days toggled by the user (`dateKey`s), invalid entries skipped
     */
    static savedDaysToggled() {
        const keys = (localStorage.getItem(DCSVAC.STORAGE_KEY_DAYS_TOGGLED) ?? "").split(",").map(key => key.trim());
        return new Set(keys.filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key)));
    }
    /**
     * @param {Date} date
     * @returns {string} e.g. "martedì 8 dicembre", followed by the holiday name if it's one of `HOLIDAYS`
     */
    static formatDay(date) {
        const holiday = DCSVAC.HOLIDAYS[DCSVAC.dateKey(date)];
        const day = date.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
        return holiday != null ? `${day} (${holiday})` : day;
    }
    /**
     * @param {Date} date
     * @returns {string} local "YYYY-MM-DD" (sortable as string)
     */
    static dateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }
    /**
     * @param {Date} now
     * @returns {Array<Date>} the working days (Monday..) of `now`'s week, at midnight
     */
    static weekDates(now) {
        return Array.from({ length: DCSVAC.WORK_DAYS }, (_, day) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - DCSVAC.weekDay(now) + day));
    }
    /**
     * @param {Date} now
     * @returns {Array<boolean>} per working day of `now`'s week (0 = Monday), whether it's a day off
     */
    #weekDaysOff(now) {
        return DCSVAC.weekDates(now).map(date => this.#isDayOff(date));
    }
    /**
     * @param {Date} date - a working day (Monday..Friday)
     * @returns {boolean} a holiday not toggled, or another day toggled
     */
    #isDayOff(date) {
        const key = DCSVAC.dateKey(date);
        return (DCSVAC.HOLIDAYS[key] != null) != this.#days_toggled.has(key);
    }
    #refresh() {
        const owner = this;
        const now = new Date();
        const week_day = DCSVAC.weekDay(now);
        const days_off = owner.#weekDaysOff(now);
        const is_day_off = week_day >= DCSVAC.WORK_DAYS || days_off[week_day];
        const day_progress = DCSVAC.workDayProgress(now, owner.#end_minute, owner.#lunch, days_off[week_day]);
        const week_progress = DCSVAC.workWeekProgress(now, owner.#end_minute, owner.#lunch, days_off);
        owner.#refreshEncouragement(now, day_progress.percent);

        const slots = DCSVAC.daySlots(owner.#end_minute, owner.#lunch).filter(([start, end]) => end > start);
        const minute_of_day = DCSVAC.minuteOfDay(now);
        // day: one track per slot, full on the weekend / a day off; the gap between them is the lunch break
        const [lunch_start, lunch_end] = owner.#lunch;
        owner.#refreshSegments(owner.elements.day_segments, owner.elements.day_thumb,
            slots.map(([start, end]) => end - start),
            slots.map(slot => is_day_off ? 1 : DCSVAC.slotElapsed(minute_of_day, slot) / (slot[1] - slot[0])),
            {
                widths: slots.slice(1).map(() => lunch_end - lunch_start),
                hint: `pausa pranzo ${DCSVAC.formatMinute(lunch_start)}-${DCSVAC.formatMinute(lunch_end)}: clicca per cambiarla`,
                onClick: () => owner.#askLunch(),
            });
        owner.#refreshBar(owner.elements.day_bar, owner.elements.day_explained,
            day_progress, is_day_off ? `oggi non si lavora! 😎` : `100% — giornata finita! 🌇`);

        // week: one track per working day, the past ones full, today's as the day progress, the days off empty (clickable to toggle them)
        const days = Array.from({ length: DCSVAC.WORK_DAYS }, (_, day) => day);
        const week_dates = DCSVAC.weekDates(now);
        owner.#refreshSegments(owner.elements.week_segments, owner.elements.week_thumb,
            days.map(() => 1),
            days.map(day => days_off[day] ? 0 : day < week_day ? 1 : day > week_day ? 0 : day_progress.percent / 100),
            null,
            {
                off: days_off,
                hints: days.map(day => `${DCSVAC.formatDay(week_dates[day])}: `
                    + `${days_off[day] ? "non lavorativo" : "lavorativo"} — clicca per cambiare`),
                onClick: day => owner.#askWorkDay(day),
            });
        owner.#refreshBar(owner.elements.week_bar, owner.elements.week_explained, week_progress, `100% — si va a casa! 🏠`);
    }
    /**
     * split slider: one track per entry of `widths` (flex-grow, e.g. minutes), each filled with its own fraction,
     * with a transparent `.dcsvac-gap` between consecutive tracks;
     * the thumb sits in the last track already started (so during the lunch break it stays at the end of the morning).
     * Without entries (e.g. a day ending before 08:30) shows a single full track
     * @param {HTMLElement} container - `.dcsvac-segments`
     * @param {HTMLElement} thumb
     * @param {Array<number>} widths
     * @param {Array<number>} fractions - 0..1, one per width
     * @param {Object} [gaps] - makes the gaps clickable
     * @param {Array<number>} gaps.widths - flex-grow of each gap, in the same unit as `widths`
     * @param {string} gaps.hint - hint of the gaps (UiBuilder hint)
     * @param {Function} gaps.onClick - only read when the tracks are (re)built
     * @param {Object} [track_options] - makes the tracks clickable
     * @param {Array<boolean>} track_options.off - per track, shown as off (`.dcsvac-track-off`)
     * @param {Array<string>} track_options.hints - per track (UiBuilder hint)
     * @param {(index: number) => void} track_options.onClick - only read when the tracks are (re)built
     */
    #refreshSegments(container, thumb, widths, fractions, gaps = null, track_options = null) {
        if (widths.length == 0) {
            widths = [1];
            fractions = [1];
        }
        let tracks = [...container.querySelectorAll(":scope > .dcsvac-track")];
        if (tracks.length != widths.length) {
            container.querySelectorAll(":scope > .dcsvac-track, :scope > .dcsvac-gap").forEach(element => element.remove());
            tracks = widths.map((_, i) => {
                if (i > 0) {
                    const gap = document.createElement("div");
                    gap.className = "dcsvac-gap";
                    if (gaps != null) {
                        gap.classList.add("dcsvac-gap-clickable");
                        gap.addEventListener("click", gaps.onClick);
                    }
                    container.appendChild(gap);
                }
                const track = document.createElement("div");
                track.className = "dcsvac-track";
                if (track_options != null) {
                    track.classList.add("dcsvac-track-clickable");
                    track.addEventListener("click", () => track_options.onClick(i));
                }
                const fill = document.createElement("div");
                fill.className = "dcsvac-fill";
                track.appendChild(fill);
                container.appendChild(track);
                return track;
            });
        }
        tracks.forEach((track, i) => {
            track.style.flex = `${widths[i]} 1 0`;
            track.firstElementChild.style.width = `${fractions[i] * 100}%`;
            if (track_options != null) {
                track.classList.toggle("dcsvac-track-off", track_options.off[i] == true);
                UiBuilder.addOrUpdateHint({ target: track, hint: track_options.hints[i], anchor: "top" });
            }
        });
        if (gaps != null) {
            container.querySelectorAll(":scope > .dcsvac-gap").forEach((gap, i) => {
                gap.style.flexGrow = `${gaps.widths[i] ?? 0}`;
                UiBuilder.addOrUpdateHint({ target: gap, hint: gaps.hint, anchor: "top" });
            });
        }

        const current = Math.max(fractions.findLastIndex(fraction => fraction > 0), 0);
        if (thumb.parentElement != tracks[current]) {
            tracks[current].appendChild(thumb);
        }
        thumb.style.left = `${fractions[current] * 100}%`;
    }
    /**
     * changes the encouragement text whenever the day progress crosses a whole percent (or morning turns into afternoon);
     * hidden once the day is over (or on the weekend)
     * @param {Date} now
     * @param {number} day_percent
     */
    #refreshEncouragement(now, day_percent) {
        const owner = this;
        const done = day_percent >= 100;
        owner.elements.encouragement_bar.style.display = done ? "none" : "";
        if (done) {
            owner.#encouragement_key = null;
            return;
        }
        const type = owner.#encouragementType(now);
        const key = `${type}:${Math.floor(day_percent)}`;
        if (key == owner.#encouragement_key) return;
        owner.#encouragement_key = key;
        owner.#nextEncouragement(type);
    }
    /**
     * @param {Date} now
     * @returns {string} "morning" before the afternoon slot starts, "afternoon" after;
     *   with a "_before_day_off" suffix when tomorrow is not a working day (weekend or day off)
     */
    #encouragementType(now) {
        const minute_of_day = now.getHours() * 60 + now.getMinutes();
        const tomorrow = DCSVAC.weekDay(now) + 1;
        const before_day_off = tomorrow >= DCSVAC.WORK_DAYS || this.#weekDaysOff(now)[tomorrow];
        return `${minute_of_day < this.#lunch[1] ? "morning" : "afternoon"}${before_day_off ? "_before_day_off" : ""}`;
    }
    /**
     * shows the next encouragement text of `type` (with fade-in), refilling its shuffled bag when empty
     * @param {string} type - from `#encouragementType`
     */
    #nextEncouragement(type) {
        const owner = this;
        const bag = owner.#encouragement_bags[type] ??= [];
        if (bag.length == 0) {
            const [slot, before_day_off] = type.split("_before_day_off");
            bag.push(...DCSVACEncouragements[slot], ...DCSVACEncouragements.jokes, ...DCSVACEncouragements.challenges, ...DCSVACEncouragements.flexes, ...DCSVACEncouragements.comandamenti,
                ...(before_day_off != null ? DCSVACEncouragements.before_day_off : []));
            for (let i = bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [bag[i], bag[j]] = [bag[j], bag[i]];
            }
        }
        const text = owner.elements.encouragement_text;
        text.textContent = bag.pop();
        // restart the fade-in animation
        text.classList.remove("dcsvac-encouragement-fade");
        void text.offsetWidth;
        text.classList.add("dcsvac-encouragement-fade");
    }
    /**
     * updates one slider's done state, text and hint from a progress (fill and thumb are set by the caller)
     * @param {HTMLElement} bar
     * @param {HTMLElement} explained
     * @param {{percent: number, remaining_minutes: number}} progress
     * @param {string} done_text - text shown when the progress reaches 100%
     */
    #refreshBar(bar, explained, { percent, remaining_minutes }, done_text) {
        bar.classList.toggle("dcsvac-done", percent >= 100);

        const hours = Math.floor(remaining_minutes / 60);
        const minutes = Math.floor(remaining_minutes % 60);
        const hint = percent >= 100
            ? done_text
            : `${percent.toFixed(2)}% — mancano ${hours}h ${String(minutes).padStart(2, "0")}m lavorative`;
        explained.textContent = hint;
        UiBuilder.addOrUpdateHint({ target: bar, anchor: "bottom" });
    }
    /**
     * @param {Date} now
     * @returns {number} 0 = Monday .. 6 = Sunday
     */
    static weekDay(now) {
        return (now.getDay() + 6) % 7;
    }
    /**
     * `WORK_SLOTS` with the lunch break and the end of the working day applied
     * @param {number} end_minute - end of the working day (minutes from midnight): replaces the end of the last slot, and cuts off any slot after it
     * @param {[number, number]} [lunch] - lunch break ([start, end] minutes from midnight): ends the morning and starts the afternoon
     * @returns {Array<[number, number]>}
     */
    static daySlots(end_minute, lunch = DCSVAC.DEFAULT_LUNCH) {
        const work_slots = [[DCSVAC.WORK_SLOTS[0][0], lunch[0]], [lunch[1], DCSVAC.WORK_SLOTS[1][1]]];
        const last = work_slots.length - 1;
        return work_slots.map(([start, end], i) => [start, Math.max(start, Math.min(i == last ? end_minute : end, end_minute))]);
    }
    /**
     * working minutes elapsed today at `now` (ignores the week day)
     * @param {Date} now
     * @param {Array<[number, number]>} slots - from `daySlots`
     * @returns {number}
     */
    static elapsedToday(now, slots) {
        const minute_of_day = DCSVAC.minuteOfDay(now);
        return slots.reduce((acc, slot) => acc + DCSVAC.slotElapsed(minute_of_day, slot), 0);
    }
    /**
     * @param {Date} now
     * @returns {number} minutes from midnight, with the seconds as fraction
     */
    static minuteOfDay(now) {
        return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    }
    /**
     * @param {number} minute_of_day - from `minuteOfDay`
     * @param {[number, number]} slot - [start, end] minutes from midnight
     * @returns {number} minutes of `slot` elapsed at `minute_of_day` (0 before it starts, its length after it ends)
     */
    static slotElapsed(minute_of_day, [start, end]) {
        return Math.min(Math.max(minute_of_day - start, 0), end - start);
    }
    /**
     * Fraction of the working day elapsed at `now`, counting only `WORK_SLOTS`.
     * Before 08:30 → 0%, after the end of the day, on the weekend or on a day off → 100%.
     * @param {Date} now
     * @param {number} [end_minute] - end of the working day (minutes from midnight), see `daySlots`
     * @param {[number, number]} [lunch] - lunch break, see `daySlots`
     * @param {boolean} [is_day_off=false] - today is a day off
     * @returns {{percent: number, remaining_minutes: number}}
     */
    static workDayProgress(now, end_minute = DCSVAC.WORK_SLOTS.at(-1)[1], lunch = DCSVAC.DEFAULT_LUNCH, is_day_off = false) {
        const slots = DCSVAC.daySlots(end_minute, lunch);
        const total = slots.reduce((acc, [start, end]) => acc + (end - start), 0);
        const elapsed = is_day_off || DCSVAC.weekDay(now) >= DCSVAC.WORK_DAYS ? total : DCSVAC.elapsedToday(now, slots);
        return { percent: total > 0 ? elapsed / total * 100 : 100, remaining_minutes: total - elapsed };
    }
    /**
     * Fraction of the working week elapsed at `now`, counting only `WORK_SLOTS` on Monday..Friday.
     * Before Monday 08:30 → 0%, from Friday's end of day through the weekend → 100%. Days off don't count.
     * @param {Date} now
     * @param {number} [end_minute] - end of the working day (minutes from midnight), see `daySlots`
     * @param {[number, number]} [lunch] - lunch break, see `daySlots`
     * @param {Array<boolean>} [days_off] - per working day (0 = Monday), whether it's a day off
     * @returns {{percent: number, remaining_minutes: number}}
     */
    static workWeekProgress(now, end_minute = DCSVAC.WORK_SLOTS.at(-1)[1], lunch = DCSVAC.DEFAULT_LUNCH, days_off = []) {
        const slots = DCSVAC.daySlots(end_minute, lunch);
        const minutes_per_day = slots.reduce((acc, [start, end]) => acc + (end - start), 0);
        const work_days = Array.from({ length: DCSVAC.WORK_DAYS }, (_, day) => day).filter(day => !days_off[day]);
        const total = minutes_per_day * work_days.length;
        const week_day = DCSVAC.weekDay(now);
        const elapsed = week_day >= DCSVAC.WORK_DAYS
            ? total
            : work_days.reduce((acc, day) => acc + (day < week_day ? minutes_per_day : day == week_day ? DCSVAC.elapsedToday(now, slots) : 0), 0);
        return { percent: total > 0 ? elapsed / total * 100 : 100, remaining_minutes: total - elapsed };
    }

    destroy(timeout_ms = 0) {
        clearInterval(this.#refresh_interval);
        window.custom_tooltip?.hide();
        super.destroy(timeout_ms);
    }
}


//#START RESERVED AREA FOR UI_BUILDER
// setTimeout(() => {
//     const ss = new DCSVAC({});
//     document.body.appendChild(ss.elementReference());
// }, 0);
//#END RESERVED AREA FOR UI_BUILDER
