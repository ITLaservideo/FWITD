/**
 * Drop (or browse) an Excel/CSV file, pick a date column plus one or more gains and/or expenses
 * columns, get a line chart over time: total gains, total expenses and (when both are picked) net.
 * Selected columns are summed per row, and rows sharing the same day are summed into a single point.
 * When the gains rows carry a time of day (in the date column itself, or in an optional time column),
 * an "average gross revenue - weekday × hour" heatmap is drawn below the chart, see `#drawHeatmap`.
 *
 * Parsing uses SheetJS (global `XLSX`, bundled from `utils/external_libs/` by `JSProvider` because
 * this file references it); the chart is a `GeneralChart` and "Show table" uses a `Table2`, which this
 * component does NOT bundle by itself - the hosting page's script must mention both
 * (e.g. a `//keep GeneralChart Table2` comment) so `JSProvider` loads them.
 * @version 1.0
 */
class DataCruncher extends FrameworkGC(`${injector_html}`) {
    static accepted_extensions = ["xlsx", "xls", "xlsm", "xlsb", "ods", "csv"];
    /** plain-text formats: parsed with `raw` so SheetJS doesn't reinterpret `dd/mm/yyyy` strings as US `m/d/y` dates */
    static text_extensions = ["csv"];
    static date_header_hint = /date|data|giorno|day|time|period|mese|month/i;
    static gains_header_hint = /gain|guadagn|profit|utile|ricav|revenue|income|importo|amount|total|valore|value/i;
    static expenses_header_hint = /expens|spes|cost|uscit|outflow|debit|addebit|pagament|payment/i;
    /** header match only (no fallback): any decimal number would parse as a time of day */
    static time_header_hint = /\b(ora|orario|time|hour|hora)\b/i;
    /** horizontal space per day of the `UiBuilder.createChart` daily chart */
    static #DAILY_CHART_PX_PER_DAY = 6;
    /** heatmap scale, low -> high: neutral grey warming into dark blue */
    static heatmap_ramp = ["#e3e3e0", "#cfd2d6", "#b8c1cd", "#9db0c6", "#7f9cbe", "#5f86b4", "#4270a6", "#2a5a96", "#184680", "#0d366b"]; // theme-aware: light ramp, picked by #isDarkTheme
    /**
     * same grey -> blue scale stepped for a dark theme: the grey is dimmed toward the surface, and the
     * top stops at a mid-dark blue, since navy would sink back into a dark background
     */
    static heatmap_ramp_dark = ["#3a3a38", "#373d46", "#344254", "#304763", "#2c4c73", "#285184", "#245895", "#2160aa", "#256abf"]; // theme-aware: dark ramp, picked by #isDarkTheme
    /**
     * Exclusion rule operators. `text` ones compare the cell as shown in Excel (formatted, trimmed,
     * case-insensitive), `number` ones the cell parsed with `#parseNumber` - a cell that isn't a
     * number never matches those, so it is not excluded.
     * @type {Array<{id: string, label: string, kind: "text"|"number"|"none", test: (cell: any, value: any) => boolean}>}
     */
    static filter_operators = [
        { id: "contains", label: "contains", kind: "text", test: (cell, value) => cell.includes(value) },
        { id: "not_contains", label: "does not contain", kind: "text", test: (cell, value) => !cell.includes(value) },
        { id: "is", label: "is", kind: "text", test: (cell, value) => cell === value },
        { id: "empty", label: "is empty", kind: "none", test: (cell) => cell === "" },
        { id: "lt", label: "<", kind: "number", test: (cell, value) => cell < value },
        { id: "le", label: "≤", kind: "number", test: (cell, value) => cell <= value },
        { id: "gt", label: ">", kind: "number", test: (cell, value) => cell > value },
        { id: "ge", label: "≥", kind: "number", test: (cell, value) => cell >= value },
        { id: "eq", label: "=", kind: "number", test: (cell, value) => cell === value },
        { id: "ne", label: "≠", kind: "number", test: (cell, value) => cell !== value },
    ];
    /**
     * @param {Object} options
     * @param {File} [options.file] - file to load right away, as if it had been dropped
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        this.#initialize();
        this.#addEventListeners();
    }
    /**
     * store here the elements references of the html
     * automatically gathers elements with attribute ` fw-id="xxx" ` after super()
     */
    elements = {
        /** @type HTMLElement */
        self_ref: this.self_ref,
        /** @type HTMLElement */
        drop_zone: null,
        /** @type HTMLElement */
        file_name: null,
        /** @type HTMLInputElement */
        file_input: null,
        /** @type HTMLElement */
        columns_panel: null,
        /** @type HTMLElement */
        column_list: null,
        /** @type HTMLElement */
        sheet_row: null,
        /** @type HTMLSelectElement */
        select_sheet: null,
        /** @type HTMLSelectElement */
        select_date: null,
        /** @type HTMLSelectElement */
        select_time: null,
        /** @type HTMLElement */
        gains_slot: null,
        /** @type HTMLElement */
        expenses_slot: null,
        /** @type HTMLElement */
        button_container: null,
        /** @type HTMLElement */
        filter_list: null,
        /** @type HTMLElement */
        add_filter_container: null,
        /** @type HTMLElement */
        status: null,
        /** @type HTMLElement */
        chart_container: null,
        /** @type HTMLElement */
        heatmap_container: null,
    }
    /** @type {any} SheetJS workbook of the last loaded file */
    #workbook = null;
    /** @type {{headers: string[], rows: any[][], text_rows: string[][], preview_rows: string[][]}|null} */
    #table = null;
    /** @type {Array<{row_el: HTMLElement, column_select: HTMLSelectElement, operator_select: HTMLSelectElement, value_input: HTMLInputElement}>} exclusion rules, in UI order */
    #filters = [];
    /** @type {GeneralChart|null} */
    #chart = null;
    /** @type {Table2|null} table of the selected sheet, shown in `#table_floater` */
    #sheet_table = null;
    /** @type {HTMLElement|null} `UiBuilder.createFloatingContainer` hosting `#sheet_table` */
    #table_floater = null;
    /** a file dropped anywhere outside the drop zone would make WebView2 navigate away to it */
    #preventNavigation = (e) => e.preventDefault();
    /** @type {HTMLElement|null} `UiBuilder.createDropDownMultipleSelections` of the gains columns */
    #gains_picker = null;
    /** @type {HTMLElement|null} `UiBuilder.createDropDownMultipleSelections` of the expenses columns */
    #expenses_picker = null;

    async #initialize() {
        const owner = this;
        owner.elements.button_container.appendChild(UiBuilder.createButton({
            title: "Create chart",
            icon_code: "e6e1",
            onClick: () => owner.#drawChart(),
        }));
        owner.elements.button_container.appendChild(UiBuilder.createButton({
            title: "Show table",
            icon_code: "e8ef",
            onClick: () => owner.#showSheetTable(),
        }));
        owner.elements.add_filter_container.appendChild(UiBuilder.createButton({
            title: "Add exclusion",
            icon_code: "e145",
            onClick: () => owner.#addFilter(),
        }));
        if (owner.options?.file != null) {
            owner.#loadFile(owner.options.file);
        }
    }
    async #addEventListeners() {
        const owner = this;
        const drop_zone = owner.elements.drop_zone;
        window.addEventListener("dragover", owner.#preventNavigation);
        window.addEventListener("drop", owner.#preventNavigation);

        drop_zone.addEventListener("click", () => owner.elements.file_input.click());
        drop_zone.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                owner.elements.file_input.click();
            }
        });
        owner.elements.file_input.addEventListener("change", () => {
            const file = owner.elements.file_input.files?.[0];
            owner.elements.file_input.value = ""; // so picking the same file again still fires `change`
            if (file != null) {
                owner.#loadFile(file);
            }
        });

        // the whole component is a drop target, the drop zone just shows the highlight
        const self_ref = owner.elements.self_ref;
        self_ref.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            drop_zone.classList.add("dc-dragging");
        });
        self_ref.addEventListener("dragleave", (e) => {
            if (!self_ref.contains(e.relatedTarget)) {
                drop_zone.classList.remove("dc-dragging");
            }
        });
        self_ref.addEventListener("drop", (e) => {
            e.preventDefault();
            drop_zone.classList.remove("dc-dragging");
            const file = e.dataTransfer?.files?.[0];
            if (file != null) {
                owner.#loadFile(file);
            }
        });

        owner.elements.select_sheet.addEventListener("change", () => owner.#showSheet(owner.elements.select_sheet.value));
        owner.elements.select_date.addEventListener("change", () => owner.#highlightSelectedColumns());
        owner.elements.select_time.addEventListener("change", () => owner.#highlightSelectedColumns());
    }

    /**
     * @param {File} file
     */
    async #loadFile(file) {
        const owner = this;
        const extension = (file.name.split(".").pop() ?? "").toLowerCase();
        if (!DataCruncher.accepted_extensions.includes(extension)) {
            UiBuilder.Notify(`Not an Excel file: ${file.name}`);
            return;
        }
        owner.elements.file_name.textContent = file.name;
        owner.#destroyChart();
        try {
            const buffer = await file.arrayBuffer();
            owner.#workbook = XLSX.read(buffer, {
                type: "array",
                raw: DataCruncher.text_extensions.includes(extension),
            });
        } catch (e) {
            console.error(e);
            owner.#workbook = null;
            owner.elements.columns_panel.hidden = true;
            UiBuilder.Notify(`Could not read ${file.name}`);
            return;
        }
        const sheet_names = owner.#workbook.SheetNames;
        const select_sheet = owner.elements.select_sheet;
        select_sheet.replaceChildren(...sheet_names.map((name) => new Option(name, name)));
        owner.elements.sheet_row.hidden = sheet_names.length < 2;
        // start from the first sheet that actually has something in it
        const first_filled = sheet_names.find((name) => owner.#workbook.Sheets[name]?.["!ref"] != null) ?? sheet_names[0];
        select_sheet.value = first_filled;
        owner.#showSheet(first_filled);
    }
    /**
     * @param {string} sheet_name
     */
    #showSheet(sheet_name) {
        const owner = this;
        owner.#destroyChart();
        owner.#table = DataCruncher.#readTable(owner.#workbook.Sheets[sheet_name]);
        owner.elements.columns_panel.hidden = false;
        // rules point at columns of the previous sheet
        owner.#filters = [];
        owner.elements.filter_list.replaceChildren();
        if (owner.#table == null) {
            owner.elements.column_list.replaceChildren();
            owner.elements.select_date.replaceChildren();
            owner.elements.select_time.replaceChildren();
            owner.#setColumnPickers([], [], []);
            owner.#setStatus("This sheet is empty.", true);
            return;
        }
        const { headers, rows, preview_rows } = owner.#table;
        owner.elements.column_list.replaceChildren(...headers.map((header, index) => {
            const chip = document.createElement("div");
            chip.className = "dc-column-chip";
            chip.dataset.column = `${index}`;
            const letter = document.createElement("span");
            letter.className = "dc-column-letter";
            letter.textContent = XLSX.utils.encode_col(index);
            const name = document.createElement("span");
            name.className = "dc-column-name";
            name.textContent = header;
            chip.append(letter, name);
            const sample = preview_rows.map((row) => row[index]).find((value) => value != null && value !== "");
            if (sample != null) {
                const sample_el = document.createElement("span");
                sample_el.className = "dc-column-sample";
                sample_el.textContent = `e.g. ${sample}`;
                chip.appendChild(sample_el);
            }
            chip.title = header;
            return chip;
        }));

        const buildOptions = (empty_label) => [
            new Option(empty_label, ""),
            ...headers.map((header, index) => new Option(`${XLSX.utils.encode_col(index)} · ${header}`, `${index}`)),
        ];
        owner.elements.select_date.replaceChildren(...buildOptions("- select -"));
        owner.elements.select_time.replaceChildren(...buildOptions("- none, use the date column -"));
        const guessed_date = DataCruncher.#guessColumn(headers, rows, DataCruncher.date_header_hint, DataCruncher.#looksLikeDate, [], true);
        const guessed_gains = DataCruncher.#guessColumn(headers, rows, DataCruncher.gains_header_hint, DataCruncher.#parseNumber, [guessed_date], true);
        // header match only: any numeric column would pass the fallback, and a wrong guess would silently skew the net
        const guessed_expenses = DataCruncher.#guessColumn(headers, rows, DataCruncher.expenses_header_hint, DataCruncher.#parseNumber, [guessed_date, guessed_gains], false);
        const guessed_time = DataCruncher.#guessColumn(headers, rows, DataCruncher.time_header_hint, (value) => DataCruncher.#parseHour(value, true), [guessed_date, guessed_gains, guessed_expenses], false);
        owner.elements.select_date.value = guessed_date >= 0 ? `${guessed_date}` : "";
        owner.elements.select_time.value = guessed_time >= 0 ? `${guessed_time}` : "";
        owner.#setColumnPickers(headers, guessed_gains >= 0 ? [guessed_gains] : [], guessed_expenses >= 0 ? [guessed_expenses] : []);
        owner.#highlightSelectedColumns();
        owner.#setStatus(`${headers.length} columns, ${rows.length} rows. Select the date column and the gains and/or expenses columns, then create the chart.`);
    }
    /**
     * @param {string[]} headers
     * @param {number[]} gains_indices - initially selected gains columns
     * @param {number[]} expenses_indices - initially selected expenses columns
     */
    #setColumnPickers(headers, gains_indices, expenses_indices) {
        const owner = this;
        const onChange = () => owner.#highlightSelectedColumns();
        owner.#gains_picker = DataCruncher.#createColumnPicker(headers, gains_indices, onChange);
        owner.#expenses_picker = DataCruncher.#createColumnPicker(headers, expenses_indices, onChange);
        owner.elements.gains_slot.replaceChildren(owner.#gains_picker);
        owner.elements.expenses_slot.replaceChildren(owner.#expenses_picker);
    }
    /**
     * Appends an empty "exclude rows where <column> <operator> <value>" rule.
     */
    #addFilter() {
        const owner = this;
        if (owner.#table == null) {
            UiBuilder.Notify("Drop an Excel file first");
            return;
        }
        const row_el = document.createElement("div");
        row_el.className = "dc-filter";
        const column_select = document.createElement("select");
        column_select.replaceChildren(...owner.#table.headers.map((header, index) => new Option(`${XLSX.utils.encode_col(index)} · ${header}`, `${index}`)));
        const operator_select = document.createElement("select");
        operator_select.replaceChildren(...DataCruncher.filter_operators.map((operator) => new Option(operator.label, operator.id)));
        const value_input = document.createElement("input");
        value_input.type = "text";
        value_input.placeholder = "value";
        const updateValueInput = () => {
            const kind = DataCruncher.filter_operators.find((operator) => operator.id === operator_select.value).kind;
            value_input.hidden = kind === "none";
            value_input.inputMode = kind === "number" ? "decimal" : "text";
        };
        operator_select.addEventListener("change", updateValueInput);
        updateValueInput();
        const filter = { row_el, column_select, operator_select, value_input };
        const remove_button = UiBuilder.createButton({
            icon_code: "e5cd",
            hint: "Remove",
            onClick: () => {
                owner.#filters = owner.#filters.filter((other) => other !== filter);
                row_el.remove();
            },
        });
        row_el.append(column_select, operator_select, value_input, remove_button);
        owner.#filters.push(filter);
        owner.elements.filter_list.appendChild(row_el);
        value_input.focus();
    }
    /**
     * Turns the exclusion rules into row predicates.
     * @returns {{predicates: Array<(row_index: number) => boolean>, error: string|null}}
     */
    #compileFilters() {
        const owner = this;
        const { rows, text_rows } = owner.#table;
        const predicates = [];
        for (const [position, filter] of owner.#filters.entries()) {
            const column_index = Number(filter.column_select.value);
            const operator = DataCruncher.filter_operators.find((operator) => operator.id === filter.operator_select.value);
            const raw_value = filter.value_input.value.trim();
            if (operator.kind === "number") {
                const value = DataCruncher.#parseNumber(raw_value);
                if (value == null) {
                    return { predicates: [], error: `Exclusion ${position + 1}: "${raw_value}" is not a number.` };
                }
                predicates.push((row_index) => {
                    const cell = DataCruncher.#parseNumber(rows[row_index][column_index]);
                    return cell != null && operator.test(cell, value);
                });
            } else {
                if (operator.kind === "text" && raw_value === "") {
                    return { predicates: [], error: `Exclusion ${position + 1}: enter the text to look for.` };
                }
                const value = raw_value.toLowerCase();
                predicates.push((row_index) => operator.test(`${text_rows[row_index][column_index] ?? ""}`.trim().toLowerCase(), value));
            }
        }
        return { predicates, error: null };
    }
    #highlightSelectedColumns() {
        const owner = this;
        const date_index = owner.elements.select_date.value;
        const time_index = owner.elements.select_time.value;
        const gains_indices = DataCruncher.#getPickerValues(owner.#gains_picker);
        const expenses_indices = DataCruncher.#getPickerValues(owner.#expenses_picker);
        owner.elements.column_list.querySelectorAll(".dc-column-chip").forEach((chip) => {
            const index = Number(chip.dataset.column);
            chip.classList.toggle("dc-role-date", chip.dataset.column === date_index);
            chip.classList.toggle("dc-role-time", chip.dataset.column === time_index);
            chip.classList.toggle("dc-role-gains", gains_indices.includes(index));
            chip.classList.toggle("dc-role-expenses", expenses_indices.includes(index));
        });
    }
    #drawChart() {
        const owner = this;
        if (owner.#table == null) {
            UiBuilder.Notify("Drop an Excel file first");
            return;
        }
        const date_value = owner.elements.select_date.value;
        const gains_indices = DataCruncher.#getPickerValues(owner.#gains_picker);
        const expenses_indices = DataCruncher.#getPickerValues(owner.#expenses_picker);
        if (date_value === "" || (gains_indices.length === 0 && expenses_indices.length === 0)) {
            owner.#setStatus("Select a date column and at least one gains or expenses column.", true);
            return;
        }
        const date_index = Number(date_value);
        if (gains_indices.includes(date_index) || expenses_indices.includes(date_index)) {
            owner.#setStatus("The date column can't also be a gains or expenses column.", true);
            return;
        }
        if (gains_indices.some((index) => expenses_indices.includes(index))) {
            owner.#setStatus("A column can't be both a gains and an expenses column.", true);
            return;
        }
        const time_value = owner.elements.select_time.value;
        const time_index = time_value === "" ? date_index : Number(time_value);
        if (gains_indices.includes(time_index) || expenses_indices.includes(time_index)) {
            owner.#setStatus("The time column can't also be a gains or expenses column.", true);
            return;
        }
        /**
         * sums the given columns of a row, `null` when none of them holds a number
         * @param {boolean} absolute - expenses are exported as negatives as often as positives
         */
        const sumColumns = (row, indices, absolute) => {
            let total = null;
            for (const index of indices) {
                const value = DataCruncher.#parseNumber(row[index]);
                if (value != null) {
                    total = (total ?? 0) + (absolute ? Math.abs(value) : value);
                }
            }
            return total;
        };
        /** @type {Map<number, {gains: number, expenses: number, rows: number}>} local-midnight timestamp -> summed values and how many rows went into them */
        const totals_by_day = new Map();
        const { predicates, error } = owner.#compileFilters();
        if (error != null) {
            owner.#setStatus(error, true);
            return;
        }
        /** gains summed per `weekday * 24 + hour` (weekday 0 = Monday), for `#drawHeatmap` */
        const heatmap_sums = new Float64Array(7 * 24);
        const heatmap = { rows: 0, no_time: 0, first_day: Infinity, last_day: -Infinity };
        let skipped = 0;
        let excluded = 0;
        for (const [row_index, row] of owner.#table.rows.entries()) {
            if (predicates.some((predicate) => predicate(row_index))) {
                excluded++;
                continue;
            }
            const date = DataCruncher.#parseDate(row[date_index]);
            const gains = sumColumns(row, gains_indices, false);
            const expenses = sumColumns(row, expenses_indices, true);
            if (date == null || (gains == null && expenses == null)) {
                skipped++;
                continue;
            }
            const day = date.getTime();
            const totals = totals_by_day.get(day) ?? { gains: 0, expenses: 0, rows: 0 };
            totals.gains += gains ?? 0;
            totals.expenses += expenses ?? 0;
            totals.rows++;
            totals_by_day.set(day, totals);
            if (gains != null) {
                const hour = DataCruncher.#parseHour(row[time_index], time_value !== "");
                if (hour == null) {
                    heatmap.no_time++;
                } else {
                    heatmap_sums[((date.getDay() + 6) % 7) * 24 + hour] += gains;
                    heatmap.rows++;
                    heatmap.first_day = Math.min(heatmap.first_day, day);
                    heatmap.last_day = Math.max(heatmap.last_day, day);
                }
            }
        }
        if (totals_by_day.size === 0) {
            owner.#destroyChart();
            owner.#setStatus(excluded > 0
                ? `No row left with both a valid date and a valid number in the selected columns (${excluded} rows excluded).`
                : "No row has both a valid date and a valid number in the selected columns.", true);
            return;
        }
        const days = [...totals_by_day.keys()].sort((a, b) => a - b);
        const merged = owner.#table.rows.length - excluded - skipped - days.length;
        const round = (value) => Math.round(value * 100) / 100;
        const headers = owner.#table.headers;
        /** a single column keeps its own header as series name */
        const seriesLabel = (indices, generic) => indices.length === 1 ? headers[indices[0]] : generic;
        const datasets = [];
        if (gains_indices.length > 0 && expenses_indices.length > 0) {
            datasets.push({
                label: "Net",
                data: days.map((day) => round(totals_by_day.get(day).gains - totals_by_day.get(day).expenses)),
            });
        } else {
            if (gains_indices.length > 0) {
                datasets.push({
                    label: seriesLabel(gains_indices, "Gains"),
                    data: days.map((day) => round(totals_by_day.get(day).gains)),
                });
            }
            if (expenses_indices.length > 0) {
                datasets.push({
                    label: seriesLabel(expenses_indices, "Expenses"),
                    data: days.map((day) => round(totals_by_day.get(day).expenses)),
                });
            }
        }
        owner.#destroyChart();
        owner.#chart = new GeneralChart({
            type: "line",
            labels: days.map((day) => new Date(day).toLocaleDateString()),
            datasets: datasets,
        });
        owner.elements.chart_container.hidden = false;
        owner.elements.chart_container.appendChild(owner.#chart.elementReference());
        // same series as a canvas chart, with the rows summed into each day as bars;
        // its x scale divides by `points - 1`, so it needs at least two days
        if (days.length > 1) {
            const daily_chart = UiBuilder.createChart({
                id: "dc-daily-chart",
                // ~6px per day keeps dots and bars hoverable on a year of data; a long range scrolls
                // sideways (see `.dc-chart` css), capped well below the browser's canvas size limit
                width: Math.max(600, Math.min(days.length * DataCruncher.#DAILY_CHART_PX_PER_DAY, 8000) + 100),
                title: datasets[0].label,
                title_linear: datasets[0].label,
                title_volume: "rows",
                type: "dotted",
                data: {
                    linear: datasets[0].data,
                    volume: days.map((day) => totals_by_day.get(day).rows),
                    axys_x: days.map((day) => new Date(day)),
                },
            });
            owner.elements.chart_container.appendChild(daily_chart);
            // open on the most recent days
            daily_chart.scrollLeft = daily_chart.scrollWidth;
        }
        let heatmap_note = null;
        if (gains_indices.length === 0) {
            heatmap_note = "pick a gains column for the weekday × hour heatmap";
        } else if (heatmap.rows === 0) {
            heatmap_note = time_value === ""
                ? "no time of day in the date column: pick a time column for the weekday × hour heatmap"
                : "no valid time of day in the time column, heatmap not drawn";
        } else {
            owner.#drawHeatmap(heatmap_sums, heatmap.first_day, heatmap.last_day);
            if (heatmap.no_time > 0) {
                heatmap_note = `${heatmap.no_time} rows without a time of day left out of the heatmap`;
            }
        }
        owner.#setStatus([
            `${days.length} points plotted`,
            merged > 0 ? `${merged} same-day rows summed` : null,
            excluded > 0 ? `${excluded} rows excluded` : null,
            skipped > 0 ? `${skipped} rows skipped (empty or not a date/number)` : null,
            heatmap_note,
        ].filter(Boolean).join(" · "));
    }
    /**
     * "Average gross revenue - weekday × hour": each cell is the gains of that hour summed over the
     * whole file, divided by how many times that weekday occurs between the first and the last day
     * with a timed row. An hour without sales counts as 0, so a quiet slot isn't averaged up by its
     * few busy days. Plain CSS grid (Chart.js has no matrix type without a plugin).
     * @param {Float64Array} sums - gains per `weekday * 24 + hour`, weekday 0 = Monday
     * @param {number} first_day - local-midnight timestamp
     * @param {number} last_day - local-midnight timestamp
     */
    #drawHeatmap(sums, first_day, last_day) {
        const owner = this;
        const container = owner.elements.heatmap_container;
        const weekday_counts = new Array(7).fill(0);
        for (let day = new Date(first_day); day.getTime() <= last_day; day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
            weekday_counts[(day.getDay() + 6) % 7]++;
        }
        /** @type {Array<number|null>} `null` = that weekday never occurs in the range */
        const averages = Array.from(sums, (sum, cell) => {
            const count = weekday_counts[Math.floor(cell / 24)];
            return count > 0 ? sum / count : null;
        });
        const values = averages.filter((value) => value != null);
        // magnitude from 0, unless refunds push some slot below it
        const min = Math.min(0, ...values);
        const max = Math.max(...values);
        const range = max - min;
        const ramp = DataCruncher.#isDarkTheme(owner.elements.self_ref) ? DataCruncher.heatmap_ramp_dark : DataCruncher.heatmap_ramp;
        const colorAt = (value) => DataCruncher.#rampColor(ramp, range > 0 ? (value - min) / range : 0);
        const format = (value, digits = 2) => value.toLocaleString(undefined, { maximumFractionDigits: digits });
        // 2024-01-01 is a Monday
        const weekday_names = Array.from({ length: 7 }, (_, weekday) => new Date(2024, 0, 1 + weekday));
        const short_names = weekday_names.map((date) => date.toLocaleDateString(undefined, { weekday: "short" }));
        const long_names = weekday_names.map((date) => date.toLocaleDateString(undefined, { weekday: "long" }));
        const pad = (hour) => `${hour}`.padStart(2, "0");

        const root = document.createElement("div");
        root.className = "dc-heatmap";
        const title = document.createElement("div");
        title.className = "dc-heatmap-title";
        title.textContent = "Average gross revenue — weekday × hour";
        const body = document.createElement("div");
        body.className = "dc-heatmap-body";
        const grid = document.createElement("div");
        grid.className = "dc-heatmap-grid";
        grid.setAttribute("role", "grid");
        grid.setAttribute("aria-label", title.textContent);
        for (let weekday = 0; weekday < 7; weekday++) {
            const label = document.createElement("div");
            label.className = "dc-heatmap-row-label";
            label.textContent = short_names[weekday];
            grid.appendChild(label);
            for (let hour = 0; hour < 24; hour++) {
                const value = averages[weekday * 24 + hour];
                const cell = document.createElement("div");
                cell.className = "dc-heatmap-cell";
                cell.dataset.weekday = `${weekday}`;
                cell.dataset.hour = `${hour}`;
                if (value == null) {
                    cell.classList.add("dc-heatmap-empty");
                    cell.dataset.tooltip = `${long_names[weekday]} ${pad(hour)}:00–${pad(hour + 1)}:00\nno ${long_names[weekday]} in the data`;
                } else {
                    cell.style.background = colorAt(value);
                    cell.dataset.tooltip = `${long_names[weekday]} ${pad(hour)}:00–${pad(hour + 1)}:00\navg ${format(value)}\nover ${weekday_counts[weekday]} days`;
                }
                cell.setAttribute("role", "gridcell");
                cell.setAttribute("aria-label", cell.dataset.tooltip.replace(/\n/g, ", "));
                grid.appendChild(cell);
            }
        }
        grid.appendChild(document.createElement("div")); // corner under the weekday labels
        for (let hour = 0; hour < 24; hour++) {
            const label = document.createElement("div");
            label.className = "dc-heatmap-col-label";
            label.textContent = `${hour}`;
            grid.appendChild(label);
        }

        const legend = document.createElement("div");
        legend.className = "dc-heatmap-legend";
        const scale = document.createElement("div");
        scale.className = "dc-heatmap-scale";
        scale.style.background = `linear-gradient(to top, ${ramp.join(", ")})`;
        const ticks = document.createElement("div");
        ticks.className = "dc-heatmap-ticks";
        const tick_count = range > 0 ? 5 : 1;
        for (let i = 0; i < tick_count; i++) {
            const fraction = tick_count > 1 ? i / (tick_count - 1) : 0;
            const tick = document.createElement("span");
            tick.style.bottom = `${fraction * 100}%`;
            tick.textContent = format(min + fraction * range, range >= 100 ? 0 : 2);
            ticks.appendChild(tick);
        }
        legend.append(scale, ticks);
        body.append(grid, legend);

        const axis_title = document.createElement("div");
        axis_title.className = "dc-heatmap-axis-title";
        axis_title.textContent = "hour";
        const tooltip = document.createElement("div");
        tooltip.className = "dc-heatmap-tooltip";
        tooltip.hidden = true;
        root.append(title, body, axis_title, tooltip);

        let hovered = null;
        const setHovered = (cell) => {
            hovered?.classList.remove("dc-heatmap-hover");
            hovered = cell;
            if (cell == null) {
                tooltip.hidden = true;
                return;
            }
            cell.classList.add("dc-heatmap-hover");
            tooltip.textContent = cell.dataset.tooltip;
            tooltip.hidden = false;
            // above the cell, centered on it, kept inside the heatmap
            const root_rect = root.getBoundingClientRect();
            const cell_rect = cell.getBoundingClientRect();
            const left = cell_rect.left - root_rect.left + cell_rect.width / 2 - tooltip.offsetWidth / 2;
            tooltip.style.left = `${Math.max(0, Math.min(left, root_rect.width - tooltip.offsetWidth))}px`;
            const top = cell_rect.top - root_rect.top - tooltip.offsetHeight - 6;
            tooltip.style.top = `${top >= 0 ? top : cell_rect.bottom - root_rect.top + 6}px`;
        };
        grid.addEventListener("pointermove", (e) => {
            const cell = e.target.closest?.(".dc-heatmap-cell") ?? null;
            if (cell !== hovered) {
                setHovered(cell);
            }
        });
        grid.addEventListener("pointerleave", () => setHovered(null));

        container.replaceChildren(root);
        container.hidden = false;
    }
    /**
     * Opens the selected sheet as a `Table2` in a floating container, replacing the one already open.
     */
    #showSheetTable() {
        const owner = this;
        if (owner.#table == null) {
            UiBuilder.Notify("Drop an Excel file first");
            return;
        }
        owner.#closeSheetTable();
        const { headers, rows, text_rows } = owner.#table;
        // the column letter keeps the keys unique when two headers share the same name
        const keys = headers.map((header, index) => `${XLSX.utils.encode_col(index)} · ${header}`);
        /** @type {Dictionary<string, Array>} */
        const ez_data_table = {};
        keys.forEach((key, column_index) => {
            ez_data_table[key] = rows.map((row, row_index) => DataCruncher.#tableCell(row[column_index], text_rows[row_index][column_index]));
        });
        const table = new Table2(ez_data_table, {
            title: owner.elements.select_sheet.value,
            width: "100%",
            displaying_data_threshold: 10,
            searchable_columns: headers.map((_, index) => index),
            searchable_columns_can_change_scope: true,
        });
        owner.#sheet_table = table;
        owner.#table_floater = UiBuilder.createFloatingContainer(table.elementReference(), {
            id: "dc-sheet-table",
            direction: "vertical",
            style: "width:min(1100px, 92vw); max-height:85vh; overflow:auto;",
            onDestroy: () => {
                table.destroy();
                if (owner.#sheet_table === table) {
                    owner.#sheet_table = null;
                    owner.#table_floater = null;
                }
            },
        });
    }
    #closeSheetTable() {
        // the close button runs the floater's own cleanup (listeners, SpaHistory entry) and then `onDestroy`
        this.#table_floater?.querySelector(".floating-container-close")?.click();
    }
    /**
     * Value shown (and sorted on) by the sheet table: numbers stay numbers so `Table2` sorts them
     * numerically, dates and text keep their formatted Excel text.
     * @param {any} raw
     * @param {string|null} text
     */
    static #tableCell(raw, text) {
        if (typeof raw === "number" && (text == null || DataCruncher.#parseDate(text) == null)) {
            return raw;
        }
        return text ?? (raw == null ? "" : `${raw}`);
    }
    #destroyChart() {
        const owner = this;
        owner.#chart?.destroy();
        owner.#chart = null;
        owner.elements.chart_container.replaceChildren();
        owner.elements.chart_container.hidden = true;
        owner.elements.heatmap_container.replaceChildren();
        owner.elements.heatmap_container.hidden = true;
    }
    /**
     * @param {string} text
     * @param {boolean} [is_error=false]
     */
    #setStatus(text, is_error = false) {
        this.elements.status.textContent = text;
        this.elements.status.classList.toggle("dc-error", is_error);
    }

    /**
     * Multi-selection column picker built with `UiBuilder.createDropDownMultipleSelections`.
     * Its selection is read back from the option checkboxes (`#getPickerValues`) instead of through
     * `onSelectionStatusChange`, because passing that callback makes the dropdown put
     * `default_title` in front of the initial summary text.
     * @param {string[]} headers
     * @param {number[]} checked_indices - columns selected from the start
     * @param {Function} onChange - called after every selection change
     * @returns {HTMLElement}
     */
    static #createColumnPicker(headers, checked_indices, onChange) {
        const picker = UiBuilder.createDropDownMultipleSelections({
            titles: headers.map((header, index) => `${XLSX.utils.encode_col(index)} · ${header}`),
            is_selected: headers.map((_, index) => checked_indices.includes(index)),
            default_title: "- select -",
            suffix_items_selected: "columns",
            direction_open: "bottom",
            stealth: false,
            style: "min-width:250px;"
        });
        // the dropdown always preselects its first option: toggle it back off when it wasn't requested
        // (index 0 of `.custom-dropdown-option` is the "toggle all" entry)
        if (headers.length > 0 && !checked_indices.includes(0)) {
            picker.querySelectorAll(".custom-dropdown-option")[1].click();
        }
        // "toggle all" updates the checkboxes in a requestAnimationFrame; that frame callback is queued by
        // the option's own click listener, before this one runs, so it has already been applied here
        picker.addEventListener("click", () => requestAnimationFrame(onChange));
        return picker;
    }
    /**
     * @param {HTMLElement|null} picker - from `#createColumnPicker`
     * @returns {number[]} selected column indices, in column order
     */
    static #getPickerValues(picker) {
        if (picker == null) {
            return [];
        }
        return [...picker.querySelectorAll(".cdo-mock-checkbox")].flatMap((checkbox, index) => checkbox.checked ? [index] : []);
    }
    /**
     * First non-empty row is the header row, everything below it is data.
     * @param {any} sheet - SheetJS worksheet
     * @returns {{headers: string[], rows: any[][], text_rows: string[][], preview_rows: string[][]}|null}
     */
    static #readTable(sheet) {
        if (sheet == null || sheet["!ref"] == null) {
            return null;
        }
        const is_filled = (row) => row.some((value) => value != null && `${value}`.trim() !== "");
        // raw values for parsing (numbers stay numbers, date cells stay Excel serials - no timezone
        // shifting), formatted text for showing sample values and for the text exclusion rules
        const all_raw_rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null, blankrows: false });
        const all_text_rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null, blankrows: false });
        // filtered on the raw rows only, so both arrays stay index-aligned
        const kept = all_raw_rows.flatMap((row, index) => is_filled(row) ? [index] : []);
        const raw_rows = kept.map((index) => all_raw_rows[index]);
        const text_rows = kept.map((index) => all_text_rows[index] ?? []);
        if (raw_rows.length === 0) {
            return null;
        }
        const width = raw_rows.reduce((max, row) => Math.max(max, row.length), 0);
        const headers = Array.from({ length: width }, (_, index) => {
            const header = raw_rows[0][index];
            return header != null && `${header}`.trim() !== "" ? `${header}`.trim() : `Column ${XLSX.utils.encode_col(index)}`;
        });
        return {
            headers: headers,
            rows: raw_rows.slice(1),
            text_rows: text_rows.slice(1),
            preview_rows: text_rows.slice(1, 6),
        };
    }
    /**
     * Picks the column whose header matches `header_hint` and whose values mostly parse with
     * `parser`, falling back (if `fallback`) to the first column whose values mostly parse.
     * @param {number[]} exclude_indices - columns already taken by another role
     * @param {boolean} fallback
     * @returns {number} column index, or -1
     */
    static #guessColumn(headers, rows, header_hint, parser, exclude_indices, fallback) {
        const sample = rows.slice(0, 50);
        const parses = (index) => {
            const values = sample.map((row) => row[index]).filter((value) => value != null && value !== "");
            return values.length > 0 && values.filter((value) => parser(value) != null).length / values.length >= 0.8;
        };
        const candidates = headers.map((_, index) => index).filter((index) => !exclude_indices.includes(index) && parses(index));
        return candidates.find((index) => header_hint.test(headers[index])) ?? (fallback ? candidates[0] : null) ?? -1;
    }
    /**
     * Excel date serials, JS dates, and `dd/mm/yyyy` / `yyyy-mm-dd` strings (`/`, `.` or `-`
     * separated; day-first like Italian Excel exports), always normalized to local midnight.
     * @returns {Date|null}
     */
    static #parseDate(value) {
        if (value instanceof Date) {
            return isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
        }
        if (typeof value === "number") {
            // 1 = 1900-01-01, 2958465 = 9999-12-31
            if (value < 1 || value > 2958465) {
                return null;
            }
            const parts = XLSX.SSF.parse_date_code(value);
            return parts == null ? null : new Date(parts.y, parts.m - 1, parts.d);
        }
        if (typeof value !== "string") {
            return null;
        }
        const text = value.trim();
        let match = text.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/);
        if (match) {
            return DataCruncher.#validDate(+match[1], +match[2], +match[3]);
        }
        match = text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})(?!\d)/);
        if (match) {
            const year = match[3].length === 2 ? 2000 + +match[3] : +match[3];
            return DataCruncher.#validDate(year, +match[2], +match[1]);
        }
        return null;
    }
    /**
     * Stricter than `#parseDate`, only used to preselect the date column: any plain number is a
     * valid Excel serial, so without a range check a gains column would look like dates too.
     */
    static #looksLikeDate(value) {
        if (typeof value === "number" && (value < 18264 || value > 73051)) { // 1950-01-01 .. 2099-12-31
            return null;
        }
        return DataCruncher.#parseDate(value);
    }
    /**
     * Hour of day (0-23) of a datetime or time-only cell: Excel serials (the fraction is the time,
     * `0.5` = 12:00), JS dates, and strings like `20:15`, `8.30 pm` or `dd/mm/yyyy HH:MM[:SS]`.
     * A whole serial (>= 1) is a plain date, so it has no time - an Excel datetime at exactly
     * midnight is indistinguishable from it and is left out as well.
     * @param {boolean} [bare_hours=false] - a dedicated time column: whole numbers 0-23 (`20`, `"20"`) are hours
     * @returns {number|null}
     */
    static #parseHour(value, bare_hours = false) {
        if (value instanceof Date) {
            return isNaN(value.getTime()) ? null : value.getHours();
        }
        if (bare_hours && (typeof value === "number" || typeof value === "string")) {
            const number = typeof value === "number" ? value : (/^\s*\d{1,2}\s*$/.test(value) ? Number(value) : NaN);
            if (Number.isInteger(number) && number >= 0 && number <= 23) {
                return number;
            }
        }
        if (typeof value === "number") {
            if (!isFinite(value) || value < 0 || (value >= 1 && Number.isInteger(value))) {
                return null;
            }
            const seconds = Math.round((value - Math.floor(value)) * 86400);
            return Math.floor(seconds / 3600) % 24;
        }
        if (typeof value !== "string") {
            return null;
        }
        let text = value.trim();
        // drop a leading date, so its `dd.mm` isn't read as a time
        const without_date = text.replace(/^(\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-](\d{4}|\d{2}))(?!\d)/, "");
        if (without_date !== text) {
            if (!/^[\sT,]/.test(without_date)) {
                return null;
            }
            text = without_date.replace(/^[\sT,]+/, "");
        }
        const match = text.match(/^(\d{1,2})[:.](\d{2})(?:[:.]\d{2}(?:[.,]\d+)?)?(?!\d)\s*(?:([ap])\.?m\.?)?/i);
        if (!match) {
            return null;
        }
        let hour = +match[1];
        if (hour > 23 || +match[2] > 59) {
            return null;
        }
        const meridiem = match[3]?.toLowerCase();
        if (meridiem != null) {
            if (hour < 1 || hour > 12) {
                return null;
            }
            hour = (hour % 12) + (meridiem === "p" ? 12 : 0);
        }
        return hour;
    }
    /**
     * Whether the component sits on a dark theme, judged by its text color (the theme's foreground).
     * @param {HTMLElement} element
     */
    static #isDarkTheme(element) {
        const channels = getComputedStyle(element).color.match(/[\d.]+/g)?.map(Number) ?? [];
        if (channels.length < 3) {
            return false;
        }
        const [r, g, b] = channels;
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.5;
    }
    /**
     * @param {string[]} ramp - `#rrggbb` steps, from 0 to 1
     * @param {number} fraction - 0..1, clamped
     * @returns {string} `rgb(...)` interpolated between the two nearest steps
     */
    static #rampColor(ramp, fraction) {
        const position = Math.min(Math.max(fraction, 0), 1) * (ramp.length - 1);
        const index = Math.min(Math.floor(position), ramp.length - 2);
        const t = position - index;
        const channels = (hex) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
        const from = channels(ramp[index]);
        const to = channels(ramp[index + 1]);
        return `rgb(${from.map((channel, i) => Math.round(channel + (to[i] - channel) * t)).join(", ")})`;
    }
    static #validDate(year, month, day) {
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
    }
    /**
     * Numbers, or strings like `1.234,56 €`, `1,234.56`, `-12,5`, `(300)`.
     * @returns {number|null}
     */
    static #parseNumber(value) {
        if (typeof value === "number") {
            return isFinite(value) ? value : null;
        }
        if (typeof value !== "string") {
            return null;
        }
        let text = value.trim();
        const negative_parentheses = /^\(.*\)$/.test(text);
        text = text.replace(/[^\d.,\-+]/g, "");
        if (!/\d/.test(text)) {
            return null;
        }
        const last_comma = text.lastIndexOf(",");
        const last_dot = text.lastIndexOf(".");
        if (last_comma >= 0 && last_dot >= 0) {
            // both present: whichever comes last is the decimal separator
            text = last_comma > last_dot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
        } else if (last_comma >= 0) {
            // only commas: several = thousands (1,234,567), one = decimal (12,5)
            text = text.split(",").length > 2 ? text.replace(/,/g, "") : text.replace(",", ".");
        } else if (text.split(".").length > 2) {
            // several dots = thousands (1.234.567)
            text = text.replace(/\./g, "");
        }
        const number = Number(text);
        if (!isFinite(number)) {
            return null;
        }
        return negative_parentheses ? -Math.abs(number) : number;
    }

    destroy(timeout_ms = 0) {
        window.removeEventListener("dragover", this.#preventNavigation);
        window.removeEventListener("drop", this.#preventNavigation);
        this.#chart?.destroy();
        this.#chart = null;
        this.#closeSheetTable();
        super.destroy(timeout_ms);
    }
}


//#START RESERVED AREA FOR UI_BUILDER
// setTimeout(() => {
//     const ss = new DataCruncher({});
//     document.body.appendChild(ss.elementReference());
// }, 0);
//#END RESERVED AREA FOR UI_BUILDER
