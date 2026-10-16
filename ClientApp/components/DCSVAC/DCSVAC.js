/**
 * Two read-only sliders showing how much of the working day (08:30 → 17:30) and of the working week
 * (Monday 08:30 → Friday 17:30) has elapsed, counting only working hours (08:30-12:30, 13:30-17:30).
 * The day slider is split in one track per slot (morning / afternoon), each as wide as the slot,
 * the week slider in one track per working day.
 * Hovering each slider shows the percentage via addHint.
 * On startup a modal asks at what time the working day ends, which replaces 17:30.
 * Clicking the gap between morning and afternoon (as wide as the lunch break) opens a modal to change the lunch break, which replaces 12:30-13:30.
 * Above the sliders an encouragement text changes every time the day progress crosses a whole percent
 * (morning texts before the afternoon slot starts, afternoon texts after).
 * @version 1.2
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
    /**
     * default lunch break: between the two `WORK_SLOTS`, as [start, end] minutes from midnight
     */
    static DEFAULT_LUNCH = [DCSVAC.WORK_SLOTS[0][1], DCSVAC.WORK_SLOTS[1][0]];
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
     * texts still to show per type, shuffled: popped one at a time and refilled when empty, so no text repeats until all are shown
     * @type {{morning: Array<string>, afternoon: Array<string>}}
     */
    #encouragement_bags = { morning: [], afternoon: [] };
    /**
     * end of the working day, minutes from midnight (asked to the user on startup, defaults to the last confirmed value)
     */
    #end_minute = DCSVAC.savedEndMinute() ?? DCSVAC.WORK_SLOTS.at(-1)[1];
    /**
     * lunch break, [start, end] minutes from midnight (changed by clicking the gap in the day slider, defaults to the last confirmed value)
     * @type {[number, number]}
     */
    #lunch = DCSVAC.savedLunch() ?? DCSVAC.DEFAULT_LUNCH;
    async #initialize() {
        const owner = this;
        owner.#refresh();
        owner.#refresh_interval = setInterval(() => owner.#refresh(), DCSVAC.REFRESH_MS);
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
    #refresh() {
        const owner = this;
        const now = new Date();
        const is_weekend = DCSVAC.weekDay(now) >= DCSVAC.WORK_DAYS;
        const day_progress = DCSVAC.workDayProgress(now, owner.#end_minute, owner.#lunch);
        const week_progress = DCSVAC.workWeekProgress(now, owner.#end_minute, owner.#lunch);
        owner.#refreshEncouragement(now, day_progress.percent);

        const slots = DCSVAC.daySlots(owner.#end_minute, owner.#lunch).filter(([start, end]) => end > start);
        const minute_of_day = DCSVAC.minuteOfDay(now);
        // day: one track per slot, full on the weekend; the gap between them is the lunch break
        const [lunch_start, lunch_end] = owner.#lunch;
        owner.#refreshSegments(owner.elements.day_segments, owner.elements.day_thumb,
            slots.map(([start, end]) => end - start),
            slots.map(slot => is_weekend ? 1 : DCSVAC.slotElapsed(minute_of_day, slot) / (slot[1] - slot[0])),
            {
                widths: slots.slice(1).map(() => lunch_end - lunch_start),
                hint: `pausa pranzo ${DCSVAC.formatMinute(lunch_start)}-${DCSVAC.formatMinute(lunch_end)}: clicca per cambiarla`,
                onClick: () => owner.#askLunch(),
            });
        owner.#refreshBar(owner.elements.day_bar, owner.elements.day_explained,
            day_progress, is_weekend ? `oggi non si lavora! 😎` : `100% — giornata finita! 🌇`);

        // week: one track per working day, the past ones full, today's as the day progress
        const week_day = DCSVAC.weekDay(now);
        const days = Array.from({ length: DCSVAC.WORK_DAYS }, (_, day) => day);
        owner.#refreshSegments(owner.elements.week_segments, owner.elements.week_thumb,
            days.map(() => 1),
            days.map(day => day < week_day ? 1 : day > week_day ? 0 : day_progress.percent / 100));
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
     */
    #refreshSegments(container, thumb, widths, fractions, gaps = null) {
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
        const minute_of_day = now.getHours() * 60 + now.getMinutes();
        const type = minute_of_day < this.#lunch[1] ? "morning" : "afternoon";
        const key = `${type}:${Math.floor(day_percent)}`;
        if (key == owner.#encouragement_key) return;
        owner.#encouragement_key = key;

        const bag = owner.#encouragement_bags[type];
        if (bag.length == 0) {
            bag.push(...DCSVACEncouragements[type], ...DCSVACEncouragements.jokes, ...DCSVACEncouragements.challenges, ...DCSVACEncouragements.flexes, ...DCSVACEncouragements.comandamenti);
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
     * Before 08:30 → 0%, after the end of the day or on the weekend → 100%.
     * @param {Date} now
     * @param {number} [end_minute] - end of the working day (minutes from midnight), see `daySlots`
     * @param {[number, number]} [lunch] - lunch break, see `daySlots`
     * @returns {{percent: number, remaining_minutes: number}}
     */
    static workDayProgress(now, end_minute = DCSVAC.WORK_SLOTS.at(-1)[1], lunch = DCSVAC.DEFAULT_LUNCH) {
        const slots = DCSVAC.daySlots(end_minute, lunch);
        const total = slots.reduce((acc, [start, end]) => acc + (end - start), 0);
        const elapsed = DCSVAC.weekDay(now) >= DCSVAC.WORK_DAYS ? total : DCSVAC.elapsedToday(now, slots);
        return { percent: total > 0 ? elapsed / total * 100 : 100, remaining_minutes: total - elapsed };
    }
    /**
     * Fraction of the working week elapsed at `now`, counting only `WORK_SLOTS` on Monday..Friday.
     * Before Monday 08:30 → 0%, from Friday's end of day through the weekend → 100%.
     * @param {Date} now
     * @param {number} [end_minute] - end of the working day (minutes from midnight), see `daySlots`
     * @param {[number, number]} [lunch] - lunch break, see `daySlots`
     * @returns {{percent: number, remaining_minutes: number}}
     */
    static workWeekProgress(now, end_minute = DCSVAC.WORK_SLOTS.at(-1)[1], lunch = DCSVAC.DEFAULT_LUNCH) {
        const slots = DCSVAC.daySlots(end_minute, lunch);
        const minutes_per_day = slots.reduce((acc, [start, end]) => acc + (end - start), 0);
        const total = minutes_per_day * DCSVAC.WORK_DAYS;
        const week_day = DCSVAC.weekDay(now);
        const elapsed = week_day >= DCSVAC.WORK_DAYS
            ? total
            : week_day * minutes_per_day + DCSVAC.elapsedToday(now, slots);
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
