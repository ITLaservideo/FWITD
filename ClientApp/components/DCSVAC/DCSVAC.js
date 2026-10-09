/**
 * Two read-only sliders showing how much of the working day (08:30 → 17:30) and of the working week
 * (Monday 08:30 → Friday 17:30) has elapsed, counting only working hours (08:30-12:30, 13:30-17:30).
 * Hovering each slider shows the percentage via addHint.
 * On startup a modal asks at what time the working day ends, which replaces 17:30.
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
        day_fill: null,
        /** @type HTMLElement */
        day_thumb: null,
        /** @type HTMLElement */
        day_explained: null,
        /** @type HTMLElement */
        week_bar: null,
        /** @type HTMLElement */
        week_fill: null,
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
        const initial = new Date();
        initial.setHours(Math.floor(owner.#end_minute / 60), owner.#end_minute % 60, 0, 0);
        const picker = new DatePicker({ floating: false, time_only: true, value: initial });

        const content = document.createElement("div");
        content.className = "dcsvac-ask";
        const title = document.createElement("div");
        title.className = "dcsvac-ask-title";
        title.innerText = "A che ora finisci di lavorare?";
        const button_ok = document.createElement("div");
        button_ok.className = "ez-button dcsvac-ask-ok";
        button_ok.innerText = "OK";
        content.append(title, picker.elementReference(), button_ok);

        const sheet = new BottomSheet({
            element: content,
            centered: true,
            onClose: () => {
                owner.#end_minute = picker.status.selected_hour * 60 + picker.status.selected_minutes;
                owner.#refresh();
            },
        });
        button_ok.addEventListener("click", () => {
            localStorage.setItem(DCSVAC.STORAGE_KEY_END_MINUTE, `${picker.status.selected_hour * 60 + picker.status.selected_minutes}`);
            sheet.destroy();
        });
    }
    /**
     * @returns {number|null} last end of the working day confirmed by the user (minutes from midnight), null if missing/invalid
     */
    static savedEndMinute() {
        const saved = localStorage.getItem(DCSVAC.STORAGE_KEY_END_MINUTE);
        const minute = Number(saved);
        return saved?.trim() && Number.isInteger(minute) && minute >= 0 && minute < 24 * 60 ? minute : null;
    }
    #refresh() {
        const owner = this;
        const now = new Date();
        const is_weekend = DCSVAC.weekDay(now) >= DCSVAC.WORK_DAYS;
        const day_progress = DCSVAC.workDayProgress(now, owner.#end_minute);
        owner.#refreshEncouragement(now, day_progress.percent);
        owner.#refreshBar(owner.elements.day_bar, owner.elements.day_fill, owner.elements.day_thumb, owner.elements.day_explained,
            day_progress, is_weekend ? `oggi non si lavora! 😎` : `100% — giornata finita! 🌇`);
        owner.#refreshBar(owner.elements.week_bar, owner.elements.week_fill, owner.elements.week_thumb, owner.elements.week_explained,
            DCSVAC.workWeekProgress(now, owner.#end_minute), `100% — si va a casa! 🏠`);
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
        const type = minute_of_day < DCSVAC.WORK_SLOTS[1][0] ? "morning" : "afternoon";
        const key = `${type}:${Math.floor(day_percent)}`;
        if (key == owner.#encouragement_key) return;
        owner.#encouragement_key = key;

        const bag = owner.#encouragement_bags[type];
        if (bag.length == 0) {
            bag.push(...DCSVACEncouragements[type], ...DCSVACEncouragements.jokes);
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
     * updates one slider (fill, thumb, text and hint) from a progress
     * @param {HTMLElement} bar
     * @param {HTMLElement} fill
     * @param {HTMLElement} thumb
     * @param {HTMLElement} explained
     * @param {{percent: number, remaining_minutes: number}} progress
     * @param {string} done_text - text shown when the progress reaches 100%
     */
    #refreshBar(bar, fill, thumb, explained, { percent, remaining_minutes }, done_text) {
        fill.style.width = `${percent}%`;
        thumb.style.left = `${percent}%`;
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
     * `WORK_SLOTS` with the end of the working day applied
     * @param {number} end_minute - end of the working day (minutes from midnight): replaces the end of the last slot, and cuts off any slot after it
     * @returns {Array<[number, number]>}
     */
    static daySlots(end_minute) {
        const last = DCSVAC.WORK_SLOTS.length - 1;
        return DCSVAC.WORK_SLOTS.map(([start, end], i) => [start, Math.max(start, Math.min(i == last ? end_minute : end, end_minute))]);
    }
    /**
     * working minutes elapsed today at `now` (ignores the week day)
     * @param {Date} now
     * @param {Array<[number, number]>} slots - from `daySlots`
     * @returns {number}
     */
    static elapsedToday(now, slots) {
        const minute_of_day = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
        return slots.reduce((acc, [start, end]) => acc + Math.min(Math.max(minute_of_day - start, 0), end - start), 0);
    }
    /**
     * Fraction of the working day elapsed at `now`, counting only `WORK_SLOTS`.
     * Before 08:30 → 0%, after the end of the day or on the weekend → 100%.
     * @param {Date} now
     * @param {number} [end_minute] - end of the working day (minutes from midnight), see `daySlots`
     * @returns {{percent: number, remaining_minutes: number}}
     */
    static workDayProgress(now, end_minute = DCSVAC.WORK_SLOTS.at(-1)[1]) {
        const slots = DCSVAC.daySlots(end_minute);
        const total = slots.reduce((acc, [start, end]) => acc + (end - start), 0);
        const elapsed = DCSVAC.weekDay(now) >= DCSVAC.WORK_DAYS ? total : DCSVAC.elapsedToday(now, slots);
        return { percent: total > 0 ? elapsed / total * 100 : 100, remaining_minutes: total - elapsed };
    }
    /**
     * Fraction of the working week elapsed at `now`, counting only `WORK_SLOTS` on Monday..Friday.
     * Before Monday 08:30 → 0%, from Friday's end of day through the weekend → 100%.
     * @param {Date} now
     * @param {number} [end_minute] - end of the working day (minutes from midnight), see `daySlots`
     * @returns {{percent: number, remaining_minutes: number}}
     */
    static workWeekProgress(now, end_minute = DCSVAC.WORK_SLOTS.at(-1)[1]) {
        const slots = DCSVAC.daySlots(end_minute);
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
