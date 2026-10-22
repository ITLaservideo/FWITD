class Locale {
    static lang = (window.__LOCALE_LANG__ ?? 'en');
    static data = (window.__LOCALES__ ?? {})[Locale.lang] ?? {};

    static at = Object.assign(
        key => Locale.data[key] ?? key,   // the function
        Locale.data                       // the properties
    );

    static applyAll() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = Locale.at(el.dataset.i18n);
        });
    }

    static setLang(lang, force = false) {
        const all = window.__LOCALES__ ?? {};
        if (!all[lang] && !force) { return; }
        Locale.lang = lang;
        Locale.data = all[lang] ?? {};
        document.documentElement.lang = lang;
        Locale.applyAll();
    }
    /**
     * 
     * @param {string} html 
     * @returns 
     */
    static localizeHTML(html) {
        html = html.replace(/{{(.*?)}}/g, (match, key) => { return Locale.at(key); });
        return html;
    }
    /**
     * 
     * @param {string|number|Date} date 0-11
     */
    static parseMonthConvertToReadable(date) {
        const index_month = date instanceof Date ? date.getMonth()
            : ((`${date}`.match(/\d+/g)?.map(Number) || [0])[0]);
        if (index_month < 0 || index_month > 11) {
            return "unknown month";
        }
        return Locale.getShortMonths()[index_month];
    }
    /**
     * 
     * @param {Date} date 
     * @param {Object} [options] 
     * @param {number} [options.tipo] di formato
     *          - `0`: 01-Gen-2024
     *          - `1`: 01-Gen-2024 06:07
     *          - `2`: 01-Gen-2024 06:05:08
     *          - `3`: 24-06-2025 12:58:00
     *          - `100` : 2024-01-01T05:03
     *          - `101` : 2024-01-01T05:03:00
     */
    static parseDateConvertToReadable(date, options = undefined) {
        if (date == undefined) {
            console.warn("no specified date");
        }
        if (options != undefined) {
            switch (options.tipo) {
                case 101: //2024-01-01T05:03:01
                    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T` +
                        `${String(date.getHours()).padStart(2, "0")}:` +
                        `${String(date.getMinutes()).padStart(2, "0")}:` +
                        `${String(date.getSeconds()).padStart(2, "0")}`;
                case 100: //2024-01-01T05:03
                    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T` +
                        `${String(date.getHours()).padStart(2, "0")}:` +
                        `${String(date.getMinutes()).padStart(2, "0")}`;
                case 3: //24-06-2025 12:58:00
                    return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()} ` +
                        `${String(date.getHours()).padStart(2, "0")}:` +
                        `${String(date.getMinutes()).padStart(2, "0")}:` +
                        `${String(date.getSeconds()).padStart(2, "0")}`;
                case 2: //01-Gen-2024 06:05:08
                    return `${String(date.getDate()).padStart(2, "0")}-${Locale.parseMonthConvertToReadable(date)}-${date.getFullYear()} ` +
                        `${String(date.getHours()).padStart(2, "0")}:` +
                        `${String(date.getMinutes()).padStart(2, "0")}:` +
                        `${String(date.getSeconds()).padStart(2, "0")}`;
                case 1: //01-Gen-2024 06:07
                    return `${String(date.getDate()).padStart(2, "0")}-${Locale.parseMonthConvertToReadable(date)}-${date.getFullYear()} ` +
                        `${String(date.getHours()).padStart(2, "0")}:` +
                        `${String(date.getMinutes()).padStart(2, "0")}`;
                case 0: //01-Gen-2024
                default:
                    return `${String(date.getDate()).padStart(2, "0")}-${Locale.parseMonthConvertToReadable(date)}-${date.getFullYear()}`;
            }
        }
        return `${String(date.getDate()).padStart(2, "0")}-${Locale.parseMonthConvertToReadable(date)}-${date.getFullYear()}`;
    }
    /**
     * 
     * @param {string} str_date - ISO date string (e.g., "2025-08-21T06:36:30")
     * @param {Object} options
     * @param {string} options.str_locale - 'it' | 'gb' | 'uk' | 'us'
     * @param {Number} [options.tipo=0] - 0: {day, month, year}, 1: +{hours, minutes}, 2: +{seconds}
     * @returns {string} - Formatted date string
     */
    static localizeDate(str_date, options = { str_locale: 'it', tipo: 0 }) {
        const { str_locale = 'it', tipo = 0 } = options;
        const date = new Date(str_date);

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        let datePart;
        switch (str_locale.toLowerCase()) {
            case 'us':
                datePart = `${month}-${day}-${year}`;
                break;
            case 'gb':
            case 'uk':
            case 'it':
            default:
                datePart = `${day}-${month}-${year}`;
                break;
        }

        let timePart = '';
        if (tipo >= 1) {
            timePart = ` ${hours}:${minutes}`;
            if (tipo === 2) {
                timePart += `:${seconds}`;
            }
        }

        return datePart + timePart;
    }
    /**
     * 
     * @param {Date} now 
     * @returns 
     */
    static toIsoDate(now) {
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    }
    /**
     * Elapsed time between two dates as text: `hh:mm:ss`, prefixed by days/years only when there are
     * any (e.g. `03:04:05`, `2d 03:04:05`, `1y 2d 03:04:05`); a negative span counts as 0.
     * The `y`/`d` suffixes go through `Locale.at`. (`Utils.logTimespan` in the legacy UiBuilder)
     * @param {Date|number} start_date
     * @param {Date|number} end_date
     * @returns {string}
     */
    static formatTimespan(start_date, end_date) {
        let diff = Math.max(0, end_date - start_date);
        const ms_second = 1000;
        const ms_minute = 60 * ms_second;
        const ms_hour = 60 * ms_minute;
        const ms_day = 24 * ms_hour;
        const ms_year = 365 * ms_day;
        const take = (unit) => {
            const amount = Math.floor(diff / unit);
            diff -= amount * unit;
            return amount;
        };
        const years = take(ms_year);
        const days = take(ms_day);
        const pad = (n) => `${n}`.padStart(2, '0');
        const parts = [];
        if (years > 0) parts.push(`${years}${Locale.at('y')}`);
        if (days > 0) parts.push(`${days}${Locale.at('d')}`);
        parts.push(`${pad(take(ms_hour))}:${pad(take(ms_minute))}:${pad(take(ms_second))}`);
        return parts.join(' ');
    }
    static getShortWeekDays() {
        if (this.weekdays == undefined) {
            this.weekdays = [Locale.at("Mon"), Locale.at("Tue"), Locale.at("Wed"), Locale.at("Thu"), Locale.at("Fri"), Locale.at("Sat"), Locale.at("Sun")];
        }
        return this.weekdays;
    }
    static getShortMonths() {
        if (this.months == undefined) {
            this.months = [Locale.at("Jan"), Locale.at("Feb"), Locale.at("Mar"), Locale.at("Apr"), Locale.at("May"), Locale.at("Jun"), Locale.at("Jul"), Locale.at("Aug"), Locale.at("Sep"), Locale.at("Oct"), Locale.at("Nov"), Locale.at("Dec")];
        }
        return this.months;
    }
}
