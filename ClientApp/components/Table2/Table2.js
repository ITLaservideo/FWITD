const circle_base64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjRweCIgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiIHdpZHRoPSIyNHB4IiBmaWxsPSIjMDAwMDAwIj4NCiAgPHBhdGggZD0iTTQ4MC04MHEtODMgMC0xNTYtMzEuNVQxOTctMTk3cS01NC01NC04NS41LTEyN1Q4MC00ODBxMC04MyAzMS41LTE1NlQxOTctNzYzcTU0LTU0IDEyNy04NS41VDQ4MC04ODBxODMgMCAxNTYgMzEuNVQ3NjMtNzYzcTU0IDU0IDg1LjUgMTI3VDg4MC00ODBxMCA4My0zMS41IDE1NlQ3NjMtMTk3cS01NCA1NC0xMjcgODUuNVQ0ODAtODBabTAtODBxMTM0IDAgMjI3LTkzdDkzLTIyN3EwLTEzNC05My0yMjd0LTIyNy05M3EtMTM0IDAtMjI3IDkzdC05MyAyMjdxMCAxMzQgOTMgMjI3dDIyNyA5M1oiLz4NCjwvc3ZnPg0K";
const circle_check_base64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMjRweCIgdmlld0JveD0iMCAtOTYwIDk2MCA5NjAiIHdpZHRoPSIyNHB4IiBmaWxsPSIjMDAwMDAwIj48cGF0aCBkPSJtNDI0LTI5NiAyODItMjgyLTU2LTU2LTIyNiAyMjYtMTE0LTExNC01NiA1NiAxNzAgMTcwWm01NiAyMTZxLTgzIDAtMTU2LTMxLjVUMTk3LTE5N3EtNTQtNTQtODUuNS0xMjdUODAtNDgwcTAtODMgMzEuNS0xNTZUMTk3LTc2M3E1NC01NCAxMjctODUuNVQ0ODAtODgwcTgzIDAgMTU2IDMxLjVUNzYzLTc2M3E1NCA1NCA4NS41IDEyN1Q4ODAtNDgwcTAgODMtMzEuNSAxNTZUNzYzLTE5N3EtNTQgNTQtMTI3IDg1LjVUNDgwLTgwWm0wLTgwcTEzNCAwIDIyNy05M3Q5My0yMjdxMC0xMzQtOTMtMjI3dC0yMjctOTNxLTEzNCAwLTIyNyA5M3QtOTMgMjI3cTAgMTM0IDkzIDIyN3QyMjcgOTNabTAtMzIwWiIvPjwvc3ZnPg==";

/**
 * @version 1.0
 */
class Table2 extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Dictionary<string, Array>} jsonArr - EzDataTable shape: column name -> array of
     * values, every array the same length (one entry per row).
     * @param {Object} [options={}] - Configuration options for the table.
     * @param {string} [options.title] - Title displayed in the table toolbar; when omitted the toolbar row is removed entirely.
     * @param {string} [options.width] - CSS width of the table (e.g., "100%", "800px").
     * @param {boolean} [options.to_be_printed=false] - If true, applies print-friendly styles and disables interactive chrome (3-dot menu, drag handles, search).
     * @param {boolean} [options.to_be_pdffed] - If true, swaps the checkbox/checkmark icons for their PDF-safe equivalents.
     * @param {number} [options.displaying_data_threshold] - Rows per page (default: `Table2.default_preferences.displaying_data.threshold`, 10).
     * @param {boolean} [options.exportable_data=true] - If false, skips wiring up the export button.
     * @param {boolean} [options.toolbox_hidden=false] - If true, hides the toolbar row via CSS.
     * @param {number[]} [options.searchable_columns] - Column indexes that are searchable; presence (with length > 0) is what makes the search box appear.
     * @param {boolean} [options.searchable_columns_can_change_scope] - If true, shows a scope-selector next to the search box to switch which column is searched.
     * @param {string[]} [options.hide_columns] - Column names to hide.
     * @param {Dictionary<string, string>} [options.override_column_names] - Maps a raw column key to a display label, applied before the header is built.
     * @param {Dictionary<number, string>} [options.styles_column_names] - Inline CSS per column index, applied to its `<th>`.
     * @param {Dictionary<number, string>} [options.styles_each_row] - Inline CSS per column index, applied to each `<td>` in that column.
     * @param {number[]} [options.is_text_checkbox] - Column indexes rendered as a toggleable ☐/☑ checkbox instead of text.
     * @param {number[]} [options.widths_columns] - Column widths in px, indexed by visible-column order.
     * @param {(ez_data_table: Dictionary<string, Array>) => HTMLElement} [options.createGraphElement] - When provided, adds a graph button to the toolbar; called on click with the table's own `EzDataTable` to build the popup content.
     * @param {number[]} [options.hide_3dots_at_i] - Column indexes where the 3-dot column menu is hidden.
     * @param {number[]} [options.hideColName] - Column indexes whose header text is hidden (opacity 0, no pointer events).
     * @param {Dictionary<number, Function>} [options.override_content_before_sorting] - Per-column-index `(a, b) => {a, b}` hooks to normalize row values before `sortData` compares them.
     * @param {Dictionary<number, Function>} [options.processRows] - Per-column-index `({content, container, row_object}) => string` cell renderers.
     * @param {Function} [options.onChangeIndexRowsPerPage] - Called with the new page-size whenever the rows-per-page dropdown changes.
     * @param {boolean} [options.tutorial_exist] - If true, shows a "?" button in the toolbar that starts `startTutorial()`.
     * @param {Object} [options.configuration]
     * @param {string} [options.configuration.group_id_DAndD] - Drag-and-drop group id shared across related tables.
     * @param {Object} [options.configuration.filtered_data]
     * @param {string} [options.configuration.filtered_data.by_search] - Initial search term (only meaningful with `to_be_printed`, to render the "filtered by" suffix).
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy (see FrameworkGC).
     * @param {Function} [options.onReady] - callback to be called when component is ready (see FrameworkGC).
     * @param {Object} [override_options={}] - Properties copied directly onto the instance (`this[key] = value`) before building starts.
     */
    constructor(jsonArr, options = {}, override_options = {}) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        window.the_f_table = this;
        this.#initialize(jsonArr, options, override_options);
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
        table: this.self_ref,
        thead: null,//fw-id
        tbody: null,//fw-id
        headerRowToolbox: null,//fw-id
        header: {
            columns: []
        },
        toolbox: {
            container: null,
            title_table: null,
            exporting_button: undefined,
            graph: undefined,
            search_box: null
        },
        footer: {
            container: null,
            record_counter: null,
            paginator: null,
            next_page: null,
            page_number: null,
            previous_page: null
        }
    }

    configuration = {
        group_id_DAndD: null,
        hasImgP: {
            yes: false,
            index_columns: []
        },
        filtered_data: {
            by_search: ''
        }
    }
    static default_preferences = {
        displaying_data: {
            threshold: 10
        }
    }
    /**
     * @type Function
     */
    changeIndexRowsPerPage;
    #the_column_names = []
    data = {
        /**
         * The `EzDataTable` (column name -> array of values) exactly as received by the constructor.
         * @type Dictionary<string, Array>
         */
        ez_data_table: null,
        /**
         * @type Object[]
         */
        raw_provided_data: null,
        /**
         * @type Object[]
         */
        raw_data: null,
        displaying_data: {
            threshold: 10,
            page_selected: 1,//start from 1
            page_count: 0,
            /**
             * @type Object[]
             */
            data: []
        },
        columns: {
            raw: [],
            hidden: [],
            renamed: []
        }
    }
    /**
     * Converts the columnar `EzDataTable` into row objects and builds the header, body, footer
     * and toolbar. See the constructor for the full `options`/`override_options` shape.
     *
     * @private
     * @param {Dictionary<string, Array>} EzDataTable
     * @param {Object} options
     * @param {Object} override_options
     */
    async #initialize(EzDataTable, options, override_options) {
        const owner = this;

        Object.keys(override_options).forEach(key => {
            this[key] = override_options[key];
        });
        // Create the table element
        if (options.configuration != undefined) {
            if (options.configuration.filtered_data != undefined) {
                owner.configuration.filtered_data.by_search = options.configuration.filtered_data.by_search ?? '';
            }
            owner.configuration.group_id_DAndD = options.configuration.group_id_DAndD;
        }
        if (owner.configuration.group_id_DAndD == null) {
            owner.configuration.group_id_DAndD = UiBuilder.newAttributeId("drag_and_drop_collection_compatibility");
        }
        for (let [key, value] of Object.entries(EzDataTable)) {
            owner.#the_column_names.push(key);
            //console.log(key/*col name*/, value/* arr_data */);
        }
        if (!EzDataTable || EzDataTable[owner.#the_column_names[0]].length === 0) {
            console.warn('Empty or invalid array provided.');
            return;
        }
        owner.data.ez_data_table = EzDataTable;
        owner.data.raw_provided_data = []; //mock for compatibility
        owner.data.raw_data = [];//new object as intended
        for (let i = 0; i < EzDataTable[owner.#the_column_names[0]].length; i++) {
            const some_obj = {};
            const some_obj2 = {};
            for (let [key, value] of Object.entries(EzDataTable)) {
                owner.#the_column_names.push(key);
                some_obj[`${key}`] = value[i];
                some_obj2[`${key}`] = value[i];
            }
            owner.data.raw_data.push(some_obj);
            owner.data.raw_provided_data.push(some_obj2);
        }
        owner.data.displaying_data.threshold = Table2.default_preferences.displaying_data.threshold;

        const table = owner.self_ref;
        if (owner.options.width != undefined) {
            table.style.width = owner.options.width;// CSS width of the table (e.g., "100%", "800px").
        }
        if (owner.options.to_be_printed == true) {
            owner.options.displaying_data_threshold = 2000000;
            table.classList.add("to-print-styles");
        }
        if (options.displaying_data_threshold != null) {
            owner.data.displaying_data.threshold = options.displaying_data_threshold;
        }
        for (let i = 0; i < Math.min(owner.data.displaying_data.threshold, owner.data.raw_data.length); i++) {
            owner.data.displaying_data.data.push(owner.data.raw_data[i]);
        }
        table.style.border = '1';

        owner.elements.tbody.setAttribute("tabindex", "0");
        // Create table header row
        const thead = owner.elements.thead;

        // Use properties from the first object as column headers
        const columns = Object.keys(owner.data.displaying_data.data[0]);
        let th_i = 0;
        let th_i_visible = 0;
        const rnd = Math.random();
        columns.forEach(col => {
            if (options.override_column_names != undefined && options.override_column_names[col] != undefined) {
                col = options.override_column_names[col];
            }
            owner.data.columns.raw.push(col);
            if (col == "ImgP") {
                owner.configuration.hasImgP.yes = true;

                owner.configuration.hasImgP.index_columns.push(th_i);
            }
            owner.data.columns.renamed.push("");
            let hidden_column = false;
            if (options.hide_columns != undefined) {
                if (options.hide_columns.indexOf(col) >= 0) {//if first object does not have the column can't inferr it's index
                    //adding it later the column will be shown anyway
                    hidden_column = true
                }
            }
            if (Table2.special_col_names.indexOf(col) >= 0 || hidden_column) {
                owner.data.columns.hidden.push(true);
            } else {
                owner.data.columns.hidden.push(false);
                const width_column = (Array.isArray(options.widths_columns) ?
                    (options.widths_columns.length > th_i_visible ? options.widths_columns[th_i_visible] : 10)
                    : 10);
                owner.elements["header-row"].appendChild(owner.#makeHeader(col,
                    {
                        group_id: owner.configuration.group_id_DAndD,
                        th_id: `mftml-th-x-${th_i}-${rnd}`,
                        width: width_column,
                        th_i: th_i
                    }));
                th_i_visible++;
            }
            th_i++;
        });
        if (options.title == undefined) {
            owner.elements.headerRowToolbox.remove();
        } else {
            owner.#createTableToolbar();
        }
        owner.#createTableFooter();
        owner.updateViewingData();
        if (options != undefined && options.exportable_data == false) {
            //owner.#addExportingButtons();
        } else {
            //owner.#addExportingButtons(options);
        }
        if (options != undefined && options.createGraphElement != undefined) {
            owner.#addGraphButton(options);
        }
        if (`${localStorage.getItem("show-images-in-tables")}` == "false") {
            owner.#changeVisibilityImageColumns(false);
        }
        return;
    }
    static special_col_names = ["css_style", "css_class"];
    /**
     * Updates the table body with the currently displayed data.
     * - Clears existing rows in the tbody.
     * - Populates rows based on `displaying_data.data`.
     * - Applies styles, processes special columns (e.g., images, checkboxes).
     * - Updates footer record counter and executes delayed operations.
     */
    updateViewingData() {
        const late_ops = [];
        const owner = this;
        owner.elements.tbody.innerHTML = '';
        if (owner.data.displaying_data.data == undefined || owner.data.displaying_data.data.length == 0) {
            owner.elements.footer.record_counter.innerText = Locale.at("no data is present");
            if (owner.elements.toolbox.exporting_button != undefined) {
                owner.elements.toolbox.exporting_button.classList.toggle("display-none-important", true);
            }
            return;
        }
        if (owner.elements.toolbox.exporting_button != undefined) {
            owner.elements.toolbox.exporting_button.classList.toggle("display-none-important", false);
        }
        const columns = Object.keys(owner.data.displaying_data.data[0]);
        owner.data.displaying_data.data.forEach(row_object => {
            const row = owner.#createTheMainTableRow(columns, row_object, late_ops);
            owner.elements.tbody.appendChild(row);
        });
        if (owner.options != undefined && owner.options.title != undefined) {
            owner.elements.toolbox.title_table.innerHTML = owner.options.title;
        }
        if (owner.elements.footer.record_counter != null && owner.data.raw_data.length > owner.data.displaying_data.threshold) {
            owner.elements.footer.record_counter.innerText = `${UiBuilder.capitalize(Locale.at("totale"))}: ${owner.data.raw_data.length}`;
        } else {
            owner.elements.footer.record_counter.innerText = ``;
        }
        for (let i = 0; i < late_ops.length; i++) {
            late_ops[i]();
        }
    }
    /**
     * Builds a single `<tr>` for `row_object`, used both by `updateViewingData` (one page's
     * worth at a time) and by the wheel/keyboard row-scrolling handlers (one row at a time).
     *
     * @private
     * @param {string[]} columns - `row_object`'s keys, in display order.
     * @param {Object} row_object - The row's data.
     * @param {Array<Function>} [late_ops] - When provided, checkbox-icon refresh ops are batched here to run after the caller's own loop; when omitted, each op runs on its own via `setTimeout`.
     * @returns {HTMLElement} The `<tr>` element.
     */
    #createTheMainTableRow(columns, row_object, late_ops = undefined) {
        const owner = this;
        const row = document.createElement('tr');
        if (owner.options.min_height_rows != undefined) {
            if (owner.options.to_be_printed == true) {
                row.style.height = 24;
                row.style.overflow = "hidden";
            } else {
                row.style.height = owner.options.min_height_rows;
            }
        }
        let index_column = -1;
        columns.forEach(col_name => {
            index_column++;
            if (Table2.special_col_names.indexOf(col_name) >= 0) {
                if (col_name == "css_class") {
                    row.className = ((`${(row_object[col_name] ?? '')}`.trim()));
                }
                return;
            }
            if (owner.data.columns.hidden[index_column] == true) {
                if (col_name == "Barcode") {
                    //preprocess data that is not displayed but it will be hopefully
                    setTimeout(async () => {
                        try {
                            await UiBuilder.toEanElement(row_object[col_name]);
                        } catch (error) { }
                    }, 0);
                }
                return;
            }
            const td = document.createElement('td');
            const styles = owner.options.styles_each_row;
            if (styles != undefined) {
                const applied_style = styles[index_column];
                if (applied_style != undefined) {
                    td.setAttribute('style', applied_style);
                }
            }
            const row_data = row_object[col_name];
            if (owner.options.is_text_checkbox != undefined) {
                if (owner.options.is_text_checkbox.indexOf(index_column) >= 0) {
                    td.addEventListener("click", () => {
                        const img = document.createElement("img");
                        img.src = circle_check_base64;
                        img.style.height = "15px";
                        img.style.width = "15px";
                        if (!Utils.ParseBool(row_object[col_name])) {
                            row_object[col_name] = true;
                            td.innerHTML = '';
                            img.src = circle_check_base64;
                            td.appendChild(img);
                        } else {
                            row_object[col_name] = false;
                            td.innerHTML = '';
                            img.src = circle_base64;
                            td.appendChild(img);
                        }
                    });
                    td.style.cursor = "pointer";
                    td.style.textAlign = "center";
                    const op_to_be_consumed_in_bulk = () => {
                        const img = document.createElement("img");
                        img.src = circle_check_base64;
                        img.style.height = "15px";
                        img.style.width = "15px";
                        if (!Utils.ParseBool(row_object[col_name])) {
                            td.innerHTML = '';
                            if (owner.options.to_be_pdffed) {
                                img.src = circle_base64;
                            } else {
                                img.src = circle_base64;
                            }
                            td.appendChild(img);
                        } else {
                            td.innerHTML = '';
                            if (owner.options.to_be_pdffed) {
                                img.src = circle_check_base64;
                            } else {
                                img.src = circle_check_base64;
                            }
                            td.appendChild(img);
                        }
                    };
                    if (late_ops != undefined) {
                        late_ops.push(op_to_be_consumed_in_bulk);
                    } else {
                        setTimeout(op_to_be_consumed_in_bulk, 0);
                    }
                }
            }
            let is_a_number = false;
            if (!isNaN(row_data) && row_data !== '' && row_data != undefined && row_data != null) {
                td.classList.add('mftml-number-value');
                is_a_number = true;
            }
            const data = (row_data !== undefined && row_data !== null) ? row_data : '';
            if (is_a_number && col_name.indexOf("€") >= 0) {
                td.textContent = `${parseFloat(data).toFixed(2)} €`;
            } else {
                let img_p;
                if (col_name == "ImgP") {
                    const img = document.createElement("img");
                    img.src = `${Lobby.BaseSrcImages}${data}`;
                    img.onerror = () => {
                        img.remove();
                        td.appendChild(Icons.ezIcon("f569"));
                    }
                    img.style.maxHeight = "30px";
                    td.style.display = "flex";
                    td.style.justifyContent = "center";
                    img_p = img;
                    // td.style.height = "inherit";
                }
                if (owner.options.processRows != undefined) {
                    if (owner.options.processRows[index_column] != undefined) {
                        td.textContent = owner.options.processRows[index_column]({ content: data, container: td, row_object: row_object });
                    } else {
                        if (col_name == "ImgP") {
                            td.appendChild(img_p);
                        } else {
                            td.textContent = data;
                        }
                    }
                } else {
                    if (col_name == "ImgP") {
                        td.appendChild(img_p);
                    } else {
                        td.textContent = data;
                    }
                }
                if (col_name == "Barcode") {
                    setTimeout(async () => {
                        try {
                            const ean_img = await UiBuilder.toEanElement(data);
                            ean_img.classList.add("inline-ean-code");
                            ean_img.setAttribute("draggable", false);
                            const wrap = document.createElement("div");
                            wrap.appendChild(ean_img);
                            wrap.appendChild(ean_img);
                            wrap.style.position = "absolute";
                            wrap.style.left = 0;
                            wrap.style.right = 0;
                            wrap.style.bottom = "2px";
                            wrap.style.top = "2px";
                            wrap.style.overflow = "hidden";
                            td.appendChild(wrap);
                            wrap.style.width = "-webkit-fill-available";
                            wrap.style.height = "-webkit-fill-available";
                            td.style.position = "relative";
                        } catch { }
                    }, 0);
                }
            }
            row.appendChild(td);
        });
        return row;
    }
    /**
     * Adds a graph button to the toolbar that opens `options.createGraphElement()`'s result in a
     * movable popup. No-op when printing or when there are fewer than 3 rows.
     *
     * @private
     * @param {Object} options
     * @param {(ez_data_table: Dictionary<string, Array>) => HTMLElement} options.createGraphElement - Builds the
     * element to show inside the popup; receives the same `EzDataTable` (column name -> array of values) the
     * table itself was constructed with.
     * @param {boolean} [options.to_be_printed]
     */
    #addGraphButton(options) {
        const owner = this;
        if (options.to_be_printed || owner.data.raw_data.length < 3) {
            return;
        }
        const btn = UiBuilder.createButton({
            hint: `${Locale.at("grafico")}\n${owner.elements.toolbox.title_table.innerText}` ?? "chart",
            onClick: async (event) => {
                if (owner.elements.toolbox.graph) {
                    owner.elements.toolbox.graph.classList.add("disable-pointer-events");
                }
                const graph_element = options.createGraphElement(owner.data.ez_data_table);
                const dims = (await Utils.determineDimensionsElement(graph_element));
                const mppoptions = {
                    afterTitleRow: graph_element,
                    iAmAwareThereAreNoSelections: true,
                    event: { clientX: ((window.innerWidth - dims.width) / 2) - 20, clientY: ((window.innerHeight - dims.height) / 3) },
                    onReady: () => { mppoptions.afterTitleRow.focus() },
                    requireToBeMovable: true,
                    visible_button_close: true
                }
                // console.warn(mppoptions.event.clientX)
                // console.warn(mppoptions.event.clientY)
                try {
                    mppoptions.afterTitleRow.firstElementChild.style.borderRadius = 0;
                } catch (error) { }
                new MousePopUp(mppoptions);
                setTimeout(() => {
                    owner.elements.toolbox.graph.classList.remove("disable-pointer-events");
                }, 100);
                setTimeout(() => {
                    btn.reset();
                }, 0);
            },
            icon_code: "e6bf",
            style: "width:28px; height:28px;", theme: "text",
        });
        owner.elements.toolbox.graph = btn;
        owner.elements.toolbox.container.insertBefore(btn, owner.elements.toolbox.container.children[0].nextSibling);
        try {
            owner.elements.toolbox.container.parentElement.style.height = "35px";
        } catch (error) { }

    }
    /**
     * Creates a table header cell (th) for a given column.
     *
     * @private
     * @param {string} col_name - Column name.
     * @param {Object} options - Header options.
     * @param {string} options.group_id - Drag-and-drop group ID.
     * @param {string} options.th_id - Unique ID for the header cell.
     * @param {number} options.th_i - Column index.
     * @param {number} options.width - Column width.
     * @param {boolean} [options.to_be_pdffed] - If true, uses the PDF-safe check-circle icon for a "☑" column header.
     * @returns {HTMLElement} The created <th> element.
     */
    #makeHeader(col_name, options) {
        const owner = this;
        const self_aware = {
            dots_btn: null,
            index_colonna: owner.data.columns.raw.length - 1,
            col_name: col_name
        }
        const three_dots_exist = owner.options.hide_3dots_at_i == undefined ? true : (owner.options.hide_3dots_at_i.indexOf(self_aware.index_colonna) < 0);
        const th = document.createElement('th');
        owner.elements.header.columns.push(th);
        if (owner.options.styles_column_names != undefined) {
            const style_column_name = owner.options.styles_column_names[self_aware.index_colonna];
            if (style_column_name != undefined) {
                th.setAttribute("style", `${th.getAttribute("style") ?? ''}${style_column_name}`);
            }
        }
        if (owner.options.to_be_printed == true) {
            th.style.padding = "0px";
            th.style.paddingLeft = "2px";
        } else {
            if (three_dots_exist) {
                th.style.paddingRight = '25px';
            }
        }
        // th.textContent = content;
        const span = document.createElement("span");
        span.innerText = self_aware.col_name;
        if (col_name == "☑") {
            const img = document.createElement("img");
            img.src = circle_check_base64;
            img.style.height = "15px";
            img.style.width = "15px";
            span.innerHTML = '';
            if (options.to_be_pdffed) {
                img.src = circle_check_base64;//Icons.setSrcIcon(img, "/check_circle.svg");
            } else {
                img.src = circle_check_base64;
            }
            span.appendChild(img);
        }
        if (`${self_aware.col_name}`.includes("€")) {
            span.style.whiteSpace = "break-spaces";
        }
        th.id = options.th_id;
        th.appendChild(span)
        span.setAttribute("data-col-id", self_aware.col_name);
        // th.addEventListener("dblclick", (event) => {
        // });
        th.style.position = 'relative';
        if (options.width != undefined) {
            if (owner.options.to_be_printed == true) {
                th.style.width = `${Number(options.width) + 5}px`;
            } else {
                th.style.width = `${Number(options.width)}px`;
            }
        }
        const openRenameDialog = async (event) => {
            const self_aware_i = {
                instance: undefined
            }
            const options = {
                afterTitleRow: UiBuilder.createSimpleTextInput({
                    next: (user_input) => {
                        span.innerText = user_input.trim();
                        if (user_input.trim() == '') {
                            span.innerText = self_aware.col_name;
                        }
                        owner.data.columns.renamed[self_aware.index_colonna] = user_input.trim();
                        //th.appendChild(self_aware.dots_btn);
                        if (self_aware_i.instance != undefined) {
                            self_aware_i.instance.destroy();
                            self_aware_i.instance = undefined;
                        }
                        if (App.linked_tables == true) {
                            //todo? no - preserve server integrity
                            //*alter existing tables      
                            //querySelectorAll(`[data-col-id="DateTime"]`);
                            //**alter future tables that are going to be created
                        }
                    },
                    onCancel: () => {
                        if (self_aware_i.instance != undefined) {
                            self_aware_i.instance.destroy();
                            self_aware_i.instance = undefined;
                        }
                    },
                    title: `${Locale.at("rinomina")} ${Locale.at("colonna")}: ${self_aware.col_name}`,
                    title_cancel: Locale.at("annulla"),
                    title_confirm: Locale.at("ok"),
                    placeholder: self_aware.col_name
                }),
                iAmAwareThereAreNoSelections: true,
                event: { clientX: event.clientX - 50, clientY: event.clientY - 50 },
                onReady: () => { options.afterTitleRow.focus() }
            }
            options.afterTitleRow.firstElementChild.style.borderRadius = 0;
            self_aware_i.instance = new MousePopUp(options);
        }
        if (owner.options.to_be_printed == true) {
        } else {
            self_aware.dots_btn = UiBuilder.createButton({
                onClick: (event) => {
                    new MousePopUp({
                        action_titles: [/*Locale.at("rinomina"), Locale.at("nascondi colonna"),*/ Locale.at("sort descending"), Locale.at("sort ascending")],
                        text_svgs: [/*"edit.svg", "hide_eye.svg",*/ "e986", "e984"],
                        next: [/*openRenameDialog, () => {
                        setTimeout(() => {
                            const index = Array.prototype.indexOf.call(span.parentElement.parentElement.children, span.parentElement);
                            if (index < 0) {
                                alert("tabella corrotta");
                            }
                            const tbody = span.parentElement.parentElement.parentElement.parentElement.getElementsByTagName("tbody")[0];
                            for (let i = 0; i < tbody.children.length; i++) {
                                tbody.children[i].children[index].remove();
                            }
                            span.parentElement.parentElement.children[index].remove();
                            owner.data.columns.hidden[self_aware.index_colonna] = true;
                            // th.remove();
                        }, 0);
                    },*/ () => {
                                owner.sortData(true, self_aware, self_aware);
                            }, () => {
                                owner.sortData(false, self_aware, self_aware);
                            }],
                        event: event,
                        title: Locale.at("colonna"),
                        style: 'alert'
                    });
                    setTimeout(() => {
                        self_aware.dots_btn.reset();
                    }, 0);
                }, icon_code: "e5d4", class: "f-table-button"
            });
        }
        if (col_name != "ImgP" && col_name != "☑") {
            th.addEventListener("dblclick", openRenameDialog);
        }
        if (owner.options.to_be_printed == true) {

        } else {
            if (three_dots_exist) {
                th.appendChild(self_aware.dots_btn);
            }
        }
        if (self_aware.index_colonna != 0) {
            setTimeout(async () => {
                return;//swapColumns undefined
                (await getDynamicModule.DragAndDrop()).makeItDraggable({
                    target: th,
                    group_id: options.group_id,
                    //target_to_grab: self_aware.dots_btn,
                    onDrop: ({ start_id, end_id, event }) => {
                        // console.error(start_id);
                        // console.error(end_id);
                        setTimeout(() => {
                            Table2.swapColumns(document.getElementById(start_id), document.getElementById(end_id));
                        }, 0);
                    }
                });
            }, 0);
        }
        if (col_name == "ImgP" || col_name == "InvisibleColName" || (owner.options.hideColName != undefined && owner.options.hideColName.indexOf(options.th_i) >= 0)) {
            span.style.opacity = 0;
            th.style.pointerEvents = "none";
        }
        return th;
    }
    /**
     * Sorts `data.raw_data` in place by `self_aware.col_name`, resets to page 1, and re-renders.
     * Numbers and strings compare natively; anything else falls back to string comparison.
     * Honors `options.override_content_before_sorting[self_aware.index_colonna]` if provided, to
     * normalize both sides before comparing.
     *
     * @param {boolean} [ascending=false]
     * @param {Object} self_aware - Column context, as built in `#makeHeader`.
     * @param {string} self_aware.col_name - Column key to sort by.
     * @param {number} self_aware.index_colonna - Column index, used to look up `override_content_before_sorting`.
     */
    sortData(ascending = false, self_aware) {
        const key = self_aware.col_name ?? '';
        const owner = this;
        /**
         * @type Array<Object>
         */
        const arr = this.data.raw_data;
        if (!arr.length || arr[0][key] === undefined) return;

        const sorting_alg = (a, b) => {
            if (owner.options.override_content_before_sorting != undefined) {
                if (owner.options.override_content_before_sorting[self_aware.index_colonna] != undefined) {
                    const tmp = owner.options.override_content_before_sorting[self_aware.index_colonna](a, b);
                    a[key] = tmp.a;
                    b[key] = tmp.b;
                }
            }
            if (typeof a[key] === 'string' && typeof b[key] === 'string') {
                return a[key].localeCompare(b[key]) * (ascending ? 1 : -1);
            } else if (typeof a[key] === 'number' && typeof b[key] === 'number') {
                return (a[key] - b[key]) * (ascending ? 1 : -1);
            }
            return `${a[key]}`.localeCompare(`${b[key]}`) * (ascending ? 1 : -1);
        };

        arr.sort(sorting_alg);

        const paginator_status = owner.data.displaying_data;
        paginator_status.page_selected = 1;
        if (owner.elements.footer.page_number != undefined) {
            owner.elements.footer.page_number.innerText = `${paginator_status.page_selected}/${paginator_status.page_count}`;
        }
        owner.data.displaying_data.data.length = 0
        for (let i = 0; i < Math.min(owner.data.displaying_data.threshold, owner.data.raw_data.length); i++) {
            owner.data.displaying_data.data.push(owner.data.raw_data[i]);
        }
        this.updateViewingData();
        setTimeout(() => {
            owner.#onViewdPangeChange();
        }, 0);
    }
    #scrolling_table_status = {
        scroll_direction_bottom: true,
        n_records_overload: 0
    }
    /**
     * Builds the table footer (pagination and record counter), and wires up `tbody`'s
     * mouse-wheel / keyboard row-scrolling: wheel and Arrow Up/Down prepend or append a single
     * row via `#createTheMainTableRow` (bailing out once `threshold > 50`, to keep native scroll
     * for large pages), Arrow Left/Right delegate to the pager buttons, and Escape blurs `tbody`.
     *
     * @private
     */
    #createTableFooter() {
        const owner = this;
        const tr = owner.elements.tfoottr;
        const td = document.createElement("td");
        const span = document.createElement("span");
        const container = document.createElement("div");
        container.classList.add("mftml-footer");
        const toolbox_left = document.createElement("div");
        toolbox_left.classList.add("mftml-footer-toolbox");
        span.appendChild(container);
        td.appendChild(span);
        td.style.textAlign = "right";
        td.colSpan = '999';
        tr.appendChild(td);
        const record_counter = document.createElement("div");
        record_counter.classList.add("table-toolbox-record-counter");
        owner.elements.footer.container = container;
        owner.elements.footer.record_counter = record_counter;
        container.appendChild(toolbox_left);
        container.appendChild(owner.#createPaginator());
        container.appendChild(record_counter);
        owner.elements.tbody.addEventListener("wheel", (event) => {
            if (document.activeElement !== owner.elements.tbody) {
                return;
            }
            if (owner.elements.footer.next_page == undefined || owner.elements.footer.previous_page == undefined) {
                return;
            }
            const paginator_status = owner.data.displaying_data;
            if (paginator_status.threshold > 50) {
                return;//no thank you, when the page is way too big i want default behaviour
            }
            if (event.deltaY < 0) {
                if (owner.data.displaying_data.data != undefined && owner.data.displaying_data.data.length > 0) {
                    event.preventDefault();
                    event.stopPropagation();
                    const columns = Object.keys(owner.data.displaying_data.data[0]);
                    const start = (paginator_status.page_selected - 1) * paginator_status.threshold;
                    if (owner.#scrolling_table_status.scroll_direction_bottom) {
                        owner.#scrolling_table_status.scroll_direction_bottom = false;
                    }
                    const the_next_index = start + owner.#scrolling_table_status.n_records_overload - 1;
                    if (the_next_index < 0) {
                        return;
                    }
                    const the_next_row_object = owner.data.raw_data[the_next_index];
                    if (the_next_row_object != undefined) {
                        owner.#scrolling_table_status.n_records_overload--;
                        const row = owner.#createTheMainTableRow(columns, the_next_row_object);
                        owner.elements.tbody.insertBefore(row, owner.elements.tbody.firstElementChild);
                    }
                    if (owner.elements.tbody.children.length > paginator_status.threshold) {
                        owner.elements.tbody.lastElementChild.remove();
                    }
                    if (owner.elements.footer.page_number != undefined) {
                        owner.elements.footer.page_number.innerText = `?${paginator_status.page_selected}/${paginator_status.page_count}`;
                    }
                }
            } else if (event.deltaY > 0) {
                if (owner.data.displaying_data.data != undefined && owner.data.displaying_data.data.length > 0) {
                    event.preventDefault();
                    event.stopPropagation();
                    const columns = Object.keys(owner.data.displaying_data.data[0]);
                    const start = (paginator_status.page_selected - 1) * paginator_status.threshold;
                    if (!owner.#scrolling_table_status.scroll_direction_bottom) {
                        owner.#scrolling_table_status.scroll_direction_bottom = true;
                    }
                    const end = owner.elements.tbody.children.length + owner.#scrolling_table_status.n_records_overload;
                    const the_next_index = start + end;
                    if (the_next_index < 0) return;
                    const the_next_row_object = owner.data.raw_data[the_next_index];
                    if (the_next_row_object != undefined) {
                        owner.#scrolling_table_status.n_records_overload++;
                        const row = owner.#createTheMainTableRow(columns, the_next_row_object);
                        owner.elements.tbody.appendChild(row);
                        setTimeout(() => {
                            try {
                                row.scrollIntoViewIfNeeded();
                            } catch (error) { }
                        }, 0);
                    }
                    if (owner.elements.tbody.children.length > paginator_status.threshold) {
                        owner.elements.tbody.firstElementChild.remove();
                    }
                    if (owner.elements.footer.page_number != undefined) {
                        owner.elements.footer.page_number.innerText = `?${paginator_status.page_selected}/${paginator_status.page_count}`;
                    }
                }
            }
        }, true);
        owner.elements.tbody.addEventListener("keydown", (event) => {
            if (event.key == "Escape") {
                owner.elements.tbody.blur();
                return;
            }
            if (event.key == "f" && !event.ctrlKey) {
                owner.#addTheSearchbox(true);
                event.preventDefault();
                event.stopPropagation();
                const the_input_element = owner.elements.toolbox.search_box.getElementsByTagName("input")[0];
                the_input_element.value = "";
                setTimeout(() => {
                    the_input_element.focus();
                }, 100);
                return;
            }
            if (owner.elements.footer.next_page == undefined || owner.elements.footer.previous_page == undefined) {
                return;
            }
            const paginator_status = owner.data.displaying_data;
            if (event.key === "ArrowDown") {
                if (owner.data.displaying_data.data != undefined && owner.data.displaying_data.data.length > 0) {
                    event.preventDefault();
                    event.stopPropagation();
                    const columns = Object.keys(owner.data.displaying_data.data[0]);
                    const start = (paginator_status.page_selected - 1) * paginator_status.threshold;
                    if (!owner.#scrolling_table_status.scroll_direction_bottom) {
                        const els_to_save = [];
                        for (let i = 0; i < paginator_status.threshold; i++) {
                            const element = owner.elements.tbody.children[owner.elements.tbody.children.length - 1 - i];
                            if (element != null) {
                                els_to_save.push(element);
                            }
                        }
                        owner.elements.tbody.innerText = '';
                        for (let i = els_to_save.length - 1; i >= 0; i--) {
                            const element = els_to_save[i];
                            owner.elements.tbody.appendChild(element);
                        }
                        owner.#scrolling_table_status.scroll_direction_bottom = true;
                        owner.#scrolling_table_status.n_records_overload = 0;
                    }
                    owner.#scrolling_table_status.n_records_overload++;
                    const end = owner.elements.tbody.children.length;
                    const the_next_index = start + end;
                    const the_next_row_object = owner.data.raw_data[the_next_index];
                    if (the_next_row_object != undefined) {
                        const row = owner.#createTheMainTableRow(columns, the_next_row_object);
                        owner.elements.tbody.appendChild(row);
                        setTimeout(() => {
                            try {
                                row.scrollIntoViewIfNeeded();
                            } catch (error) { }
                        }, 0);
                    }
                    if (owner.elements.footer.page_number != undefined) {
                        owner.elements.footer.page_number.innerText = `?${paginator_status.page_selected}/${paginator_status.page_count}`;
                    }
                }
            }
            if (event.key === "ArrowUp") {
                if (owner.data.displaying_data.data != undefined && owner.data.displaying_data.data.length > 0) {
                    event.preventDefault();
                    event.stopPropagation();
                    const columns = Object.keys(owner.data.displaying_data.data[0]);
                    const start = (paginator_status.page_selected - 1) * paginator_status.threshold;
                    if (owner.#scrolling_table_status.scroll_direction_bottom) {
                        const els_to_save = [];
                        for (let i = 0; i < paginator_status.threshold; i++) {
                            const element = owner.elements.tbody.children[i];
                            if (element != null) {
                                els_to_save.push(element);
                            }
                        }
                        owner.elements.tbody.innerText = '';
                        for (let i = 0; i < els_to_save.length; i++) {
                            const element = els_to_save[i];
                            owner.elements.tbody.appendChild(element);
                        }
                        owner.#scrolling_table_status.scroll_direction_bottom = false;
                        owner.#scrolling_table_status.n_records_overload = 0;
                    }
                    owner.#scrolling_table_status.n_records_overload++;
                    const the_next_index = start - owner.#scrolling_table_status.n_records_overload;
                    if (the_next_index < 0) return;
                    const the_next_row_object = owner.data.raw_data[the_next_index];
                    if (the_next_row_object != undefined) {
                        const row = owner.#createTheMainTableRow(columns, the_next_row_object);
                        owner.elements.tbody.insertBefore(row, owner.elements.tbody.firstElementChild);
                    }
                    if (owner.elements.footer.page_number != undefined) {
                        owner.elements.footer.page_number.innerText = `?${paginator_status.page_selected}/${paginator_status.page_count}`;
                    }
                }
            }
            if (event.key == "ArrowRight") {
                owner.elements.footer.next_page.onClick(event);
            }
            if (event.key == "ArrowLeft") {
                owner.elements.footer.previous_page.onClick(event);
            }
        }, true);
        if (owner.configuration.hasImgP.yes && !owner.options.to_be_printed) {
            setTimeout(() => {
                const self_aware = {
                    yes: (!(`${localStorage.getItem("show-images-in-tables")}` == "false"))
                }
                const options_create_toggle = {
                    label: Locale.at("show_images") ?? "Show Images",
                    innerText: {
                        on: Locale.at("is_on"),
                        off: Locale.at("is_off")
                    },
                    onClick: (event) => {
                        if (self_aware.yes) {
                            owner.#changeVisibilityImageColumns(false);
                        } else {
                            owner.#changeVisibilityImageColumns(true);
                        }
                        self_aware.yes = !self_aware.yes;
                        options_create_toggle.setIsOn(self_aware.yes);
                    },
                    isOn: self_aware.yes,
                    theme: "mini"
                };
                const toggle = UiBuilder.createToggle(options_create_toggle);
                toggle.style.marginLeft = "4px";
                toolbox_left.appendChild(toggle);
            }, 0);
        }
    }

    /**
     * Creates the paginator controls for navigating pages.
     *
     * @private
     * @returns {HTMLElement} The paginator container.
     */
    #createPaginator() {
        const owner = this;
        if (owner.data.raw_data.length < owner.data.displaying_data.threshold) {
            const empty = document.createElement("div");
            empty.style.display = 'none';
            return empty;
        }
        const container = document.createElement("div");
        container.classList.add("table-paginator");
        const rows = [10, 20, 30, 50, 100, 500, 1000];
        const paginator_status = owner.data.displaying_data;
        owner.changeIndexRowsPerPage = (index) => { //can be null if next.length==title.length
            const some_index = index ?? rows.indexOf(paginator_status.threshold);
            const the_index = some_index >= 0 ? some_index : 0;
            paginator_status.threshold = rows[the_index];
            if (owner.options.onChangeIndexRowsPerPage != undefined) {
                owner.options.onChangeIndexRowsPerPage(rows[the_index]);
            }
            paginator_status.data.length = 0
            paginator_status.page_selected = 1;
            for (let i = 0; i < Math.min(paginator_status.threshold, owner.data.raw_data.length); i++) {
                paginator_status.data.push(owner.data.raw_data[i]);
            }
            paginator_status.page_count = Math.ceil(owner.data.raw_data.length / paginator_status.threshold);
            page_number.innerText = `${paginator_status.page_selected}/${paginator_status.page_count}`;
            owner.updateViewingData();
            setTimeout(() => {
                owner.#onViewdPangeChange();
            }, 0);
        };
        /**
         * @type Element
        */
        const dropdown_btn = UiBuilder.createDropDownButtonSelector({
            label: Locale.at("righe per pagina"),
            override_first_label: `${Locale.at("righe per pagina")} ${owner.data.displaying_data.threshold}`,
            titles: rows, //array of selections
            // next: next, //array of functions that executes when clicking on a selection (titles.length == next.length) next can be null if onSelectionChange != undefined
            // icon_code: "f397",
            onSelectionChange: owner.changeIndexRowsPerPage,
        });
        paginator_status.page_count = Math.ceil(owner.data.raw_data.length / paginator_status.threshold);
        container.appendChild(dropdown_btn);
        const page_selector_container = document.createElement("div");
        page_selector_container.classList.add("page-selector");

        const arrow_left = UiBuilder.createButton({
            onClick: () => {
                owner.#scrolling_table_status.n_records_overload = 0;
                // if (paginator_status.page_selected > 1) {
                //     paginator_status.data.length = 0;
                //     paginator_status.page_selected = Math.max(paginator_status.page_selected - 1, 1);
                //     for (let i = paginator_status.page_selected * paginator_status.threshold;
                //         i < Math.min(paginator_status.threshold * (paginator_status.page_selected + 1), owner.data.raw_data.length);
                //         i++) {
                //         paginator_status.data.push(owner.data.raw_data[i]);
                //     }
                //     page_number.innerText = `${paginator_status.page_selected}/${paginator_status.page_count}`; owner.updateViewingData();
                // }

                if (paginator_status.page_selected > 1) {
                    paginator_status.page_selected--;
                    const start = (paginator_status.page_selected - 1) * paginator_status.threshold;
                    const end = start + paginator_status.threshold;
                    paginator_status.data = owner.data.raw_data.slice(start, end);
                    page_number.innerText = `${paginator_status.page_selected}/${paginator_status.page_count}`;
                    owner.updateViewingData();
                    setTimeout(() => {
                        owner.#onViewdPangeChange();
                    }, 0);
                }
                setTimeout(() => {
                    arrow_left.reset();
                }, 0);
            },
            hint: Locale.at("previous page") ?? '',
            title: '<',
            style: "min-width:30px;", class: "hide-in-place",
            theme: "text"
        });
        const arrow_right = UiBuilder.createButton({
            onClick: () => {
                owner.#scrolling_table_status.n_records_overload = 0;
                if (paginator_status.page_selected < paginator_status.page_count) {
                    paginator_status.page_selected++;
                    const start = (paginator_status.page_selected - 1) * paginator_status.threshold;
                    const end = start + paginator_status.threshold;
                    paginator_status.data = owner.data.raw_data.slice(start, end);
                    page_number.innerText = `${paginator_status.page_selected}/${paginator_status.page_count}`;
                    owner.updateViewingData();
                    setTimeout(() => {
                        owner.#onViewdPangeChange();
                    }, 0);
                }
                setTimeout(() => {
                    arrow_right.reset();
                }, 0);
            },
            hint: Locale.at("next page") ?? '',
            title: '>',
            style: "min-width:30px;",
            theme: "text"
        });
        arrow_right.addEventListener("keyup", (event) => {
            if (event.key == "ArrowRight") {
                arrow_right.onClick(event);
            }
            if (event.key == "ArrowLeft") {
                arrow_left.onClick(event);
            }
        });
        arrow_left.addEventListener("keyup", (event) => {
            if (event.key == "ArrowRight") {
                arrow_right.onClick(event);
            }
            if (event.key == "ArrowLeft") {
                arrow_left.onClick(event);
            }
        });


        const page_number = document.createElement("span");
        page_number.classList.add("page-number");
        page_number.addEventListener("click", (event) => {
            const self_aware_i = {
                instance: undefined
            }
            const options = {
                afterTitleRow: UiBuilder.createSimpleTextInput({
                    next: (user_input) => {
                        const regex = /[0-9]+/;
                        const new_page = (Math.min(Math.ceil(owner.data.raw_data.length / paginator_status.threshold), Math.max(1, Number((regex.exec(user_input.trim()) ?? [])[0] ?? 1))));

                        paginator_status.page_selected = new_page;
                        const start = (paginator_status.page_selected - 1) * paginator_status.threshold;
                        const end = start + paginator_status.threshold;
                        paginator_status.data = owner.data.raw_data.slice(start, end);
                        page_number.innerText = `${paginator_status.page_selected}/${paginator_status.page_count}`;
                        owner.updateViewingData();
                        setTimeout(() => {
                            owner.#onViewdPangeChange();
                        }, 0);
                        if (self_aware_i.instance != undefined) {
                            self_aware_i.instance.destroy();
                            self_aware_i.instance = undefined;
                        }
                    },
                    onCancel: () => {
                        if (self_aware_i.instance != undefined) {
                            self_aware_i.instance.destroy();
                            self_aware_i.instance = undefined;
                        }
                    },
                    title: Locale.at("vai alla pagina"),
                    title_cancel: Locale.at("annulla"),
                    title_confirm: Locale.at("ok"),
                    placeholder: "0"
                }),
                iAmAwareThereAreNoSelections: true,
                event: { clientX: event.clientX - 5, clientY: event.clientY - 5 },
                onReady: () => { options.afterTitleRow.focus() }
            }
            options.afterTitleRow.firstElementChild.style.borderRadius = 0;
            self_aware_i.instance = new MousePopUp(options);
        });
        page_number.innerText = `${paginator_status.page_selected}/${Math.ceil(owner.data.raw_data.length / paginator_status.threshold)}`;
        /*can you create the elements and add the event listeners? */

        page_selector_container.appendChild(arrow_left);
        page_selector_container.appendChild(page_number);
        page_selector_container.appendChild(arrow_right);
        owner.elements.footer.next_page = arrow_right;
        owner.elements.footer.page_number = page_number;
        owner.elements.footer.previous_page = arrow_left;
        container.appendChild(page_selector_container);
        return container;
    }

    /**
     * Runs after a page change: scrolls the table into view if it isn't already, and toggles
     * `hide-in-place` on the prev/next pager buttons based on the current page.
     *
     * @private
     */
    #onViewdPangeChange() {
        const owner = this;
        const scroll_first_result = () => {
            const rect = owner.elements.table.getBoundingClientRect();
            const isInView = (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );

            if (!isInView) {
                try {
                    owner.elements.thead.scrollIntoView({ behavior: 'smooth' });
                } catch (error) {
                    owner.elements.table.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
        const toggle_arrows = () => {
            if (owner.elements.footer.previous_page == null || owner.elements.footer.next_page == null) {
                return;
            }
            if (owner.data.displaying_data.page_selected == 1) {
                owner.elements.footer.previous_page.classList.toggle("hide-in-place", true);
            } else {
                owner.elements.footer.previous_page.classList.toggle("hide-in-place", false);
            }
            if (owner.data.displaying_data.page_count == owner.data.displaying_data.page_selected) {
                owner.elements.footer.next_page.classList.toggle("hide-in-place", true);
            } else {
                owner.elements.footer.next_page.classList.toggle("hide-in-place", false);
            }
        }
        requestAnimationFrame(() => {
            scroll_first_result();
            toggle_arrows();
        });
    }
    /**
     * Creates the table toolbar row with title and optional search box.
     *
     * @private
     * @returns {HTMLElement} The toolbar row (<tr>).
     */
    #createTableToolbar() {
        const owner = this;
        /**
         * @type Element
         */
        const headerRow = owner.elements.headerRowToolbox;
        headerRow.classList.add("container-table-toolbox");
        if (owner.options.to_be_printed == true) {
            headerRow.style.height = "16px";
        }
        const toolbox = document.createElement("div");
        toolbox.classList.add("table-toolbox");

        const title_table = document.createElement("div");
        title_table.classList.add("table-toolbox-title-talbe");
        toolbox.appendChild(title_table);
        if (this.options.tutorial_exist) {
            const start_tutorial = UiBuilder.createButton({
                onClick: () => {
                    owner.startTutorial();
                    setTimeout(() => {
                        start_tutorial.reset();
                    }, 0);
                },
                hint: `explain what I'm seeing`, icon_code: "f529", style: "min-width:30px;", theme: "text"
            });
            toolbox.appendChild(start_tutorial);
        }
        headerRow.appendChild(toolbox);
        owner.elements.toolbox.container = toolbox;
        owner.elements.toolbox.title_table = title_table;
        owner.#addTheSearchbox(false);

        if (owner.options != undefined) {
            if (owner.options.toolbox_hidden == true) {
                headerRow.classList.add("display-none-important");
                owner.elements.table.style.borderTopLeftRadius = "0px";
                owner.elements.table.style.borderTopRightRadius = "0px";
            }
        }
        return headerRow;
    }
    /**
     * Builds and attaches the search box to the toolbar when `options.searchable_columns` says
     * the table should be searchable. No-ops if a search box already exists.
     *
     * @param {boolean} [force=false] When true, makes the table searchable (defaulting to column
     * 0, with scope-changing enabled) even if `options.searchable_columns` wasn't set.
     * @private
     */
    #addTheSearchbox(force = false) {
        const owner = this;
        if (owner.elements.toolbox.search_box != undefined) {
            return;
        }
        if (force == true) {
            if (owner.options.searchable_columns == undefined) {
                owner.options.searchable_columns = [0];
            }
            owner.options.searchable_columns_can_change_scope = true;
        }
        if (owner.options.searchable_columns != undefined && owner.options.searchable_columns.length > 0) {
            if (owner.options.to_be_printed == true) {
                if (owner.configuration.filtered_data.by_search.length > 0) {
                    if (owner.configuration.filtered_data.by_search.length > 7) {
                        owner.elements.toolbox.title_table.setAttribute("data-suffix", `(${Locale.at("filtered_by_search")}: ${owner.configuration.filtered_data.by_search.substring(0, 5)}...)`);
                    } else {
                        owner.elements.toolbox.title_table.setAttribute("data-suffix", `(${Locale.at("filtered_by_search")}: ${owner.configuration.filtered_data.by_search})`);
                    }
                }
            } else {
                const the_search_box = owner.#createSearchBox();
                owner.elements.toolbox.search_box = the_search_box;
                owner.elements.toolbox.container.appendChild(the_search_box);
                owner.elements.toolbox.container.style.flexDirection = "row-reverse";
                owner.elements.headerRowToolbox.style.height = "42px";
            }
        }
    }
    /**
     * Walks the user through the header, toolbox and footer via `Insight`, one step at a time.
     * Waits for `window.insight_component` to exist before starting if it isn't ready yet.
     */
    startTutorial() {
        const owner = this;
        setTimeout(() => {
            const insight = Insight.getInstance();
            const insights = [
                () => {
                    setTimeout(() => {
                        const target = owner.elements.header.columns[0];
                        insight.show({
                            target: target,
                            text: `this is the header of the table`,
                            anchor: "right",
                            singleShotOnClose: () => {
                                insights[1]();
                            }
                        });
                    }, 500);
                },
                () => {
                    setTimeout(() => {
                        const target = owner.elements.toolbox.container;
                        insight.show({
                            target: target,
                            text: `this is the toolbox`,
                            anchor: "bottom",
                            singleShotOnClose: () => {
                                insights[2]();
                            }
                        });
                    }, 500);
                },
                () => {
                    setTimeout(() => {
                        const target = owner.elements.footer.container;
                        insight.show({
                            target: target,
                            text: `this is the footer`,
                            anchor: "left"
                        });
                    }, 500);
                },
            ];
            const giveInsight = () => {
                insights[0]();
            }
            if (window.insight_component == undefined) {
                setTimeout(() => {
                    giveInsight();
                }, 1000);
                return;
            }
            giveInsight();
        }, 0);
    }
    #doing_heavy_task = {
        trigger_search_id: undefined,
        worker: undefined
    };
    /**
     * Builds the toolbar search box: a debounced (1s) filter over `data.raw_provided_data` using
     * `options.searchable_columns`, offloaded to a Web Worker when available (falls back to
     * filtering on the main thread otherwise). When `options.searchable_columns_can_change_scope`
     * is set, also adds a scope-selector popup to switch which column is searched.
     *
     * @private
     * @returns {HTMLElement} The search box container.
     */
    #createSearchBox() {
        const owner = this;
        const container = document.createElement("div");
        container.classList.add("mftml-searchbox");
        container.style.display = "flex";
        container.style.position = "relative";
        const icon = Icons.create("e8b6");//search.svg
        icon.style = "position: absolute;right: 5px;bottom: 0;top: 0;margin: auto;cursor:pointer;";
        const input = document.createElement("input");
        icon.addEventListener("click", () => {
            if (input.value.trim().length == 0) {
                input.focus();
            } else {
                input.value = '';
                //icon.src = "/Images/Icone2024/ui_2024/search.svg";
                input.dispatchEvent(new Event("keyup"));
            }
        });
        //owner.testWorker();
        input.addEventListener("keyup", () => {
            requestAnimationFrame((() => {
                if (input.value.trim().length > 0) {
                    Icons.setSrcIcon(icon, "e14a");//backspace.svg
                } else {

                    Icons.setSrcIcon(icon, "e8b6");//search.svg
                }
            }));
            clearTimeout(owner.#doing_heavy_task.trigger_search_id);
            owner.#doing_heavy_task.trigger_search_id = setTimeout(() => {
                owner.data.raw_data.length = 0;
                /**
                 * @type Array<Number>
                 */
                const indexes_columns_to_search = owner.options.searchable_columns;
                const array_of_objects = owner.data.raw_provided_data;
                const array_of_results = owner.data.raw_data;
                const value_to_search = input.value.trim().toLowerCase();

                if (value_to_search.length > 0) {
                    if (array_of_objects.length > 0) {
                        if (owner.#doing_heavy_task.worker != undefined) {
                            owner.#doing_heavy_task.worker.terminate();
                            owner.#doing_heavy_task.worker = undefined
                        }
                        try {
                            //fetch from server
                            const code = `onmessage=function(t){const e=t.data.array_of_objects,s=t.data.indexes_columns_to_search,n=t.data.value_to_search,a=[];if(n.length>0&&e.length>0){const t=Object.keys(e[0]),r=[];t.forEach((function(t){r.push(Utils.getProcessRows(e[0][t]))})),e.forEach((function(e){s.some((function(s){const a=t[s];if(!a||null==e[a])return!1;return(r&&r[s]?String(r[s](e[a])):String(e[a])).toLowerCase().includes(n)}))&&a.push(e)}))}else try{a.push.apply(a,e)}catch(t){a.length=0,e.forEach((function(t){a.push(t)}))}self.postMessage(a)};class Utils{static getProcessRows(t){return String(t).trim().match(/([0-9]{4}).([0-9]{2}).([0-9]{2}).([0-9]{2}).([0-9]{2}).([0-9]{2})/)?Utils.format1:null}static format1(t){const e=new Date(t);return String(e.getDate()).padStart(2,"0")+"-"+String(e.getMonth()+1).padStart(2,"0")+"-"+e.getFullYear()+" "+String(e.getHours()).padStart(2,"0")+":"+String(e.getMinutes()).padStart(2,"0")+":"+String(e.getSeconds()).padStart(2,"0")}}`;
                            const blob = new Blob([code], { type: "application/javascript" });
                            const workerUrl = URL.createObjectURL(blob);
                            owner.#doing_heavy_task.worker = new Worker(workerUrl);
                            URL.revokeObjectURL(workerUrl);//worker already started loading the script, safe to free the blob now
                            owner.#doing_heavy_task.worker.onmessage = function (e) {
                                const results = e.data;
                                owner.data.raw_data.length = 0;
                                try {
                                    owner.data.raw_data.push(...results);
                                } catch (error) {
                                    owner.data.raw_data.length = 0;
                                    results.forEach(obj => {
                                        owner.data.raw_data.push(obj);
                                    });
                                }
                                owner.configuration.filtered_data.by_search = value_to_search;
                                owner.changeIndexRowsPerPage();
                            };
                            owner.#doing_heavy_task.worker.onerror = (e) => {
                                console.error("Worker error:", e);
                            }
                            owner.#doing_heavy_task.worker.onmessageerror = (e) => {
                                console.error(e)
                            }
                            owner.#doing_heavy_task.worker.postMessage({
                                array_of_objects: owner.data.raw_provided_data,
                                indexes_columns_to_search: owner.options.searchable_columns,
                                value_to_search: input.value.trim().toLowerCase(),
                            });
                        } catch (error) {//sort on main thread
                            const keys = Object.keys(array_of_objects[0]);//assume all objects have same keys as first record
                            owner.data.raw_data.length = 0;
                            array_of_objects.forEach(obj => {
                                // Check if any of the searchable columns contain the search value
                                const match = indexes_columns_to_search.some(idx => {
                                    const key = keys[idx];
                                    if (!key || obj[key] == null) return false;
                                    const to_cmp = owner.options.processRows != undefined ? (owner.options.processRows[idx] != undefined ? String(owner.options.processRows[idx]({ content: obj[key], omit_rendering: true })) : String(obj[key])) : String(obj[key]);
                                    return to_cmp.toLowerCase().indexOf(value_to_search) !== -1;
                                });
                                if (match) {
                                    array_of_results.push(obj);
                                }
                            });
                            owner.configuration.filtered_data.by_search = value_to_search;
                            owner.changeIndexRowsPerPage();
                        }
                    }
                } else {
                    try {
                        if (owner.#doing_heavy_task.worker != undefined) {
                            owner.#doing_heavy_task.worker.terminate();
                            owner.#doing_heavy_task.worker = undefined
                        }
                    } catch { }
                    try {
                        array_of_results.push(...array_of_objects);
                    } catch (error) {
                        owner.data.raw_data.length = 0;
                        array_of_objects.forEach(obj => {
                            array_of_results.push(obj);
                        });
                    }
                    owner.configuration.filtered_data.by_search = value_to_search;
                    owner.changeIndexRowsPerPage();
                }
            }, 1000);
        });
        input.addEventListener("focus", async () => {
            if (window.App == undefined || !window.App.viewportverticale) {
                return;
            }
            disablePointerEvents(input);
            const exist_keyboard = document.getElementById("tkb-component");
            if (exist_keyboard != undefined) {
                exist_keyboard.instanceReference.updateInputTarget({ input_target: input, label: input.placeholder });
                enablePointerEvents(input);
                return;
            } else {
                const keyboard_i = new KeyBoard({
                    input_target: input,
                    only_numbers: false,
                    onClickOutside: () => {
                        input.dispatchEvent(new Event("keyup"));
                    },
                    onConfirmClick: () => {
                        setTimeout(() => {
                            keyboard_i.destroy();
                        }, 0);
                        input.dispatchEvent(new Event("keyup"));
                    },
                    label: input.placeholder
                });
            }
            setTimeout(() => {
                enablePointerEvents(input);
            }, 100);
        });
        input.addEventListener("dblclick", () => {
            if (input.value.trim().length == 0) {
                input.focus();
            } else {
                input.value = '';
                input.dispatchEvent(new Event("keyup"));
            }
        });
        // input.classList.add("dp-inputs");
        input.type = "search"; // styled via `.mftml-searchbox > input[type="search"]` in Table2.css

        if (owner.data.raw_provided_data.length > 0 && owner.options.searchable_columns.length > 0) {
            const keys = Object.keys(owner.data.raw_provided_data[0]);//assume all objects have same keys as first record
            const key = keys[owner.options.searchable_columns[0]] ?? '';
            input.placeholder = `${Locale.at("cerca")} ${key}`;
            let sc_i = 1;
            while (sc_i < owner.options.searchable_columns.length) {
                input.placeholder = input.placeholder + `/${(keys[owner.options.searchable_columns[sc_i]] ?? '')}`
                sc_i++;
            }
        } else {
            input.placeholder = Locale.at("cerca");
        }
        if (owner.options.searchable_columns_can_change_scope == true) {
            container.classList.add("mit-scope");
            const scope_selector = document.createElement("div");
            scope_selector.classList.add("mftml-scope")
            const scs_icon = Icons.create("f02f")//search_column.svg");
            container.appendChild(scope_selector);
            UiBuilder.addHint({
                hint: Locale.at("Select the column to search in"),
                target: scope_selector,
                anchor: "top"
            });
            const titles = [];
            const next = [];
            const array_of_objects = owner.data.raw_provided_data;
            if (array_of_objects.length > 0) {
                const keys = Object.keys(array_of_objects[0]);//assume all objects have same keys as first record
                let ki = 0;
                keys.forEach(chiave => {
                    const the_ki = ki;
                    if (!owner.data.columns.hidden[the_ki]) {
                        titles.push(chiave);
                        next.push(() => {
                            input.value = '';
                            input.placeholder = `${Locale.at("cerca")} ${chiave}`;
                            if (owner.options.searchable_columns != undefined) {
                                owner.options.searchable_columns.length = 0;
                                owner.options.searchable_columns.push(the_ki);
                            }
                            input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
                            setTimeout(() => {
                                input.focus();
                            }, 50);
                        });
                    }
                    ki++;
                });
            }
            new SpeedActions({
                label: Locale.at("Select the column to search in"),
                target: scope_selector,
                createButtons: titles.map((title, index) => ({ title: title, onClick: next[index] }))
            });
            scope_selector.appendChild(scs_icon);
        }
        container.appendChild(icon);
        container.appendChild(input);
        container.style = "margin-right: auto;position: relative;margin-left: 7px;";
        setTimeout(() => {
            if (owner.changeIndexRowsPerPage == undefined) {
                container.remove();
            }
        }, 0);
        return container;
    }
    /**
     * Shows or hides every `ImgP` column, persists the choice to `localStorage`, and re-renders.
     *
     * @private
     * @param {boolean} visible
     */
    #changeVisibilityImageColumns(visible) {
        const owner = this;
        for (let i = 0; i < owner.configuration.hasImgP.index_columns.length; i++) {
            const index_colonna = owner.configuration.hasImgP.index_columns[i];
            owner.data.columns.hidden[index_colonna] = !visible;
            owner.elements.header.columns[index_colonna].classList.toggle("display-none-important", !visible);
        }
        localStorage.setItem("show-images-in-tables", visible);
        owner.updateViewingData();
    }
    /**
     * `super.destroy()` (FrameworkGC) only detaches `self_ref` from the DOM, runs the `onClose`
     * callbacks and unregisters the back/popstate handler - it knows nothing about this
     * component's own state, so everything below has to be released here instead.
     *
     * @param {number} [timeout_ms=0]
     */
    destroy(timeout_ms = 0) {
        const owner = this;
        clearTimeout(owner.#doing_heavy_task.trigger_search_id);
        if (owner.#doing_heavy_task.worker != undefined) {
            owner.#doing_heavy_task.worker.terminate();
            owner.#doing_heavy_task.worker = undefined;
        }
        if (window.the_f_table === owner) {
            window.the_f_table = undefined;
        }
        owner.changeIndexRowsPerPage = undefined;
        if (owner.configuration != undefined) {
            owner.configuration.group_id_DAndD = null;
            if (owner.configuration.hasImgP != undefined) {
                owner.configuration.hasImgP.yes = false;
                owner.configuration.hasImgP.index_columns.length = 0;
            }
            if (owner.configuration.filtered_data != undefined) {
                owner.configuration.filtered_data.by_search = '';
            }
        }
        owner.configuration = null;
        if (owner.data != undefined) {
            owner.data.ez_data_table = null;
            owner.data.raw_provided_data = null;
            owner.data.raw_data = null;
            if (owner.data.displaying_data != undefined) {
                owner.data.displaying_data.threshold = 0;
                owner.data.displaying_data.page_selected = 0;
                owner.data.displaying_data.page_count = 0;
                owner.data.displaying_data.data.length = 0;
            }
            if (owner.data.columns != undefined) {
                owner.data.columns.raw.length = 0;
                owner.data.columns.hidden.length = 0;
                owner.data.columns.renamed.length = 0;
            }
        }
        owner.data = null;
        if (owner.elements != undefined) {
            owner.elements.header.columns.length = 0;
        }
        owner.elements = null;
        owner.options = null;
        super.destroy(timeout_ms);
    }
    // owner.self_ref;//access element reference here
    // owner.elementReference();//alternative way to access element reference
    // owner.destroy();//call destroy method when needed
    // owner.options;//access building options here

    //#region FrameworkEventListeners
    async #onButtonTestClick() {// add attribute inside the .html ` (click)='#onButtonTestClick' `
        /**
         * @type HTMLElement
         */
        const element_with_this_event = this;
        /**
         * @type Table2
         */
        const owner = element_with_this_event.fwInstanceReference;
        element_with_this_event.classList.add("clicked");
        alert("clicked");
    }
    //#endregion
}
//#START RESERVED AREA FOR UI_BUILDER :: 15 cards, one per Table2 option (or small group of related
////options), each with a "cosa testare / cosa aspettarsi" note under the table so a regression is
////obvious at a glance after touching this file.
///*mock for the UIBuilder::live-watch-component uncomment to test it  */
// setTimeout(() => {
//     const mock_container = document.createElement("div");
//     mock_container.style.display = "grid";
//     mock_container.style.gridTemplateColumns = "repeat(3, 1fr)";
//     mock_container.style.gridTemplateRows = "repeat(5, auto)";// auto, not 1fr: cards have very different heights
//     mock_container.style.gap = "16px";
//     mock_container.style.padding = "20px";
//     document.body.appendChild(mock_container);

//     // mock data: EzDataTable shape is a dictionary of column name -> array of values,
//     // every array the same length (one entry per row)
//     function mockEzDataTable(rows_count) {
//         const categorie = ["Elettronica", "Alimentari", "Abbigliamento", "Casa"];
//         const data = { ID: [], Prodotto: [], Categoria: [], Quantita: [], [`Prezzo €`]: [], Disponibile: [], DateTime: [] };
//         for (let i = 0; i < rows_count; i++) {
//             data.ID.push(1000 + i);
//             data.Prodotto.push(`Prodotto ${i + 1}`);
//             data.Categoria.push(categorie[i % categorie.length]);
//             data.Quantita.push(Math.floor(Math.random() * 200));
//             data[`Prezzo €`].push((Math.random() * 150).toFixed(2));
//             data.Disponibile.push(Math.random() > 0.3 ? "true" : "false");
//             const created = new Date();
//             created.setMinutes(created.getMinutes() - Math.floor(Math.random() * 60 * 24 * 30)); // up to 30 days ago
//             data.DateTime.push(created.toISOString().slice(0, 19).replace("T", " "));
//         }
//         return data;
//     }

//     // one card per Table2 option (or small group of related options); index in `options.title`
//     // matches the grid position (row-major, 3 columns) so "card 7" always means the same slot
//     const mock_variants = [
//         {
//             title: "1) Base: paginazione + callback righe/pagina",
//             options: {
//                 title: "Base",
//                 hide_columns: ["DateTime"],
//                 displaying_data_threshold: 5,
//                 onChangeIndexRowsPerPage: (n) => console.log("onChangeIndexRowsPerPage ->", n)
//             },
//             test: "Ordina cliccando le intestazioni, usa le freccette e clicca il numero di pagina (deve apparire un popup per saltare a una pagina), poi cambia il menu \"righe per pagina\".",
//             expect: "Ordinamento asc/desc corretto, freccette disabilitate ai limiti, il popup pagina salta subito alla pagina digitata, la console stampa il nuovo valore quando cambi le righe per pagina."
//         },
//         {
//             title: "2) exportable_data:false",
//             options: { title: "Senza esportazione", hide_columns: ["DateTime"], exportable_data: false },
//             test: "Guarda se compare un bottone di esportazione nella toolbar.",
//             expect: "GAP NOTO: l'esportazione è disabilitata in Table2 a prescindere da questo flag (#addExportingButtons non è ancora implementato). Oggi non deve comparire nulla; quando verrà implementata, questa card dovrà iniziare a mostrare/nascondere il bottone in base al flag."
//         },
//         {
//             title: "3) toolbox_hidden:true",
//             options: { title: "Toolbox nascosta", hide_columns: ["DateTime"], toolbox_hidden: true },
//             test: "Osserva la barra della toolbar e gli angoli superiori della tabella.",
//             expect: "La toolbar è completamente invisibile e gli angoli in alto della tabella sono squadrati (border-radius 0), non arrotondati."
//         },
//         {
//             title: "4) Ricerca forzata col tasto \"f\"",
//             options: { hide_columns: ["DateTime"], title: "Ricerca forzata" },
//             test: "Clicca dentro il corpo della tabella per dargli il focus, poi premi \"f\" (senza Ctrl).",
//             expect: "Anche senza searchable_columns configurato, compare la casella di ricerca nella toolbar e il focus va subito nel campo di testo."
//         },
//         {
//             title: "5) Ricerca con cambio ambito",
//             options: { title: "Ricerca + ambito", searchable_columns: [1, 2], hide_columns: ["DateTime"], searchable_columns_can_change_scope: true },
//             test: "Scrivi qualcosa nella ricerca, poi clicca l'icona dell'ambito e scegli un'altra colonna mentre il testo è ancora presente.",
//             expect: "Il filtro si applica mentre scrivi; cambiando ambito il campo si svuota, la ricerca viene rilanciata immediatamente (niente più righe filtrate dal vecchio termine) e il focus torna sul campo."
//         },
//         {
//             title: "6) styles_column_names (allineamento numerico)",
//             options: { title: "Allineamento numerico", styles_column_names: { 3: "text-align: right;font-style: italic;", 4: "text-align: right;font-variant-caps: small-caps;" }, hide_columns: ["DateTime"] },
//             test: "Guarda le COLONNE: Quantita e Prezzo.",
//             expect: "Entrambe le colonne risultano allineate a destra."
//         },
//         {
//             title: "7) is_text_checkbox",
//             options: { title: "Checkbox disponibilità", is_text_checkbox: [5], hide_columns: ["DateTime"] },
//             test: "Clicca sulle celle della colonna Disponibile.",
//             expect: "Le celle mostrano ☐/☑ invece del testo true/false e il click alterna lo stato."
//         },
//         {
//             title: "8) widths_columns",
//             options: { title: "Larghezza fissa", widths_columns: [10, 160, 110, 80, 90, 110], hide_columns: ["DateTime"] },
//             test: "Confronta la larghezza delle colonne con l'array [50,160,110,80,90,110].",
//             expect: "Ogni colonna visibile rispetta la larghezza indicata, nello stesso ordine da sinistra a destra."
//         },
//         {
//             title: "9) hide_columns",
//             options: { title: "Colonna nascosta", hide_columns: ["ID", "DateTime"] },
//             test: "Cerca la colonna ID nell'intestazione e nelle righe.",
//             expect: "La colonna ID non compare mai; le altre colonne non si spostano e non perdono dati."
//         },
//         {
//             title: "10) override_column_names",
//             options: { title: "Intestazioni rinominate", override_column_names: { [`Prezzo €`]: "Prezzo (€)", Quantita: "Qtà" }, hide_columns: ["DateTime"] },
//             test: "Guarda le intestazioni delle colonne Quantita e Prezzo.",
//             expect: "Mostrano \"Qtà\" e \"Prezzo (€)\" invece del nome grezzo della colonna; ordinamento e ricerca continuano a funzionare sui dati originali."
//         },
//         {
//             title: "11) hideColName + hide_3dots_at_i",
//             options: { title: "Intestazioni parziali", override_column_names: { Disponibile: '☑' }, hideColName: [0], hide_3dots_at_i: [1, 5], hide_columns: ["DateTime"] },
//             test: "Guarda la colonna 1 (ID) e la colonna 2 (Prodotto).",
//             expect: "La colonna ID non ha testo di intestazione visibile ma resta cliccabile per ordinare; la colonna Prodotto non ha il menu a 3 puntini, le altre colonne sì."
//         },
//         {
//             title: "12) processRows + override_content_before_sorting",
//             options: {
//                 title: "Celle calcolate + ordinamento",
//                 processRows: { 3: ({ content, container }) => Number(content) < 20 ? (() => { UiBuilder.addHint({ target: container, anchor: "right", hint: "special" }); return `⚠ ${content}` })() : `${content}` },
//                 override_content_before_sorting: { 4: (a, b) => ({ a: Number(a[`Prezzo €`]), b: Number(b[`Prezzo €`]) }) }
//             },
//             test: "Ordina per Quantita (osserva le celle sotto 20) e poi per Prezzo, sia crescente che decrescente.",
//             expect: "Le quantità sotto 20 hanno il prefisso ⚠ con tooltip; il Prezzo si ordina numericamente (es. 9.20 prima di 10.50), non come testo (dove \"10.50\" finirebbe prima di \"9.20\")."
//         },
//         {
//             title: "13) createGraphElement",
//             options: {
//                 title: "Bottone grafico",
//                 createGraphElement: (the_feeded_data) => {
//                     const sample = the_feeded_data;//mockEzDataTable(250);

//                     // Line/volume chart: aggregate the real DateTime column into one point per
//                     // calendar day (units sold + revenue that day), instead of a synthetic date range
//                     const totals_by_day = new Map();
//                     sample.DateTime.forEach((dt, i) => {
//                         const day_key = dt.slice(0, 10); // "YYYY-MM-DD"
//                         const entry = totals_by_day.get(day_key) ?? { units: 0, revenue: 0 };
//                         entry.units += sample.Quantita[i];
//                         entry.revenue += Number(sample[`Prezzo €`][i]);
//                         totals_by_day.set(day_key, entry);
//                     });
//                     const sorted_days = Array.from(totals_by_day.keys()).sort();
//                     const axys_x = sorted_days.map(day_key => new Date(`${day_key}T00:00:00`));
//                     const daily_units = sorted_days.map(day_key => totals_by_day.get(day_key).units);
//                     const daily_revenue = sorted_days.map(day_key => Math.round(totals_by_day.get(day_key).revenue * 100) / 100);
//                     const line_chart = UiBuilder.createChart({
//                         id: "table2-mock-graph",
//                         title: "Vendite giornaliere",
//                         title_volume: "unità",
//                         title_linear: "€",
//                         type: "dotted",
//                         data: {
//                             linear: daily_revenue,
//                             volume: daily_units,
//                             axys_x: axys_x
//                         }
//                     });

//                     // Categoria & Quantita bar chart: total Quantita (and Prezzo, for the label) per Categoria, same sample as above
//                     const totals_by_category = {};
//                     sample.Categoria.forEach((categoria, i) => {
//                         const entry = totals_by_category[categoria] ?? { quantita: 0, prezzo: 0 };
//                         entry.quantita += sample.Quantita[i];
//                         entry.prezzo += Number(sample[`Prezzo €`][i]);
//                         totals_by_category[categoria] = entry;
//                     });

//                     // Title reflects the actual interval/duration covered by the sample's DateTime column
//                     const sample_dates = sample.DateTime.map(dt => new Date(dt.replace(" ", "T")));
//                     const min_date = new Date(Math.min(...sample_dates));
//                     const max_date = new Date(Math.max(...sample_dates));
//                     const duration_days = Math.round((max_date - min_date) / (1000 * 60 * 60 * 24));
//                     const fmt_date = (d) => d.toISOString().slice(0, 10);
//                     const bar_panel = document.createElement("div");
//                     const bar_title = document.createElement("strong");
//                     bar_title.innerText = `Quantita per Categoria — ${fmt_date(min_date)} → ${fmt_date(max_date)} (${duration_days} giorni)`;
//                     bar_panel.appendChild(bar_title);
//                     const bar_chart = new GeneralChart({
//                         type: "bar",
//                         labels: Object.entries(totals_by_category).map(([categoria, entry]) => `${categoria} ${entry.prezzo.toFixed(2)} €`),
//                         datasets: [{ label: "Quantita totale", data: Object.values(totals_by_category).map(entry => entry.quantita) }]
//                     });
//                     bar_panel.appendChild(bar_chart.elementReference());

//                     const wrapper = document.createElement("div");
//                     wrapper.style.display = "flex";
//                     wrapper.style.flexDirection = "column";
//                     wrapper.style.gap = "16px";
//                     wrapper.appendChild(line_chart);
//                     wrapper.appendChild(UiBuilder.createDivisorio());
//                     wrapper.appendChild(bar_panel);
//                     return wrapper;
//                 }
//             },
//             test: "Clicca il bottone grafico nella toolbar.",
//             expect: "Si apre un popup mobile con due grafici impilati: in alto un grafico a linee/volume (vendite giornaliere), in basso un grafico a barre con la Quantita totale per Categoria, il cui titolo riporta l'intervallo di date e la durata (in giorni) coperti dal campione."
//         },
//         {
//             title: "14) tutorial_exist",
//             options: { title: "Tutorial guidato", tutorial_exist: true },
//             test: "Clicca il bottone \"?\" nella toolbar.",
//             expect: "Un tour (Insight) guida in sequenza tra intestazione, toolbox e footer."
//         },
//         {
//             title: "15) to_be_printed + ricerca già filtrata",
//             options: {
//                 title: "Modalità stampa filtrata",
//                 to_be_printed: true,
//                 configuration: { filtered_data: { by_search: "Alimentari" } }
//             },
//             test: "Guarda il titolo della card e verifica che non ci sia nessun elemento interattivo (niente ricerca, menu a 3 puntini o drag handle).",
//             expect: "Il titolo mostra un suffisso che indica il filtro attivo (\"Alimentari\") e l'intera toolbar è priva di controlli interattivi."
//         }
//     ];

//     const total_mocks = mock_variants.length;
//     for (let i = 0; i < total_mocks; i++) {
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

//         const variant = mock_variants[i];
//         const label = document.createElement("div");
//         label.style.fontWeight = "600";
//         label.textContent = variant.title;
//         slot.appendChild(label);

//         const table_holder = document.createElement("div");
//         slot.appendChild(table_holder);

//         const instructions = document.createElement("div");
//         instructions.style.fontSize = "12px";
//         instructions.style.opacity = "0.85";
//         instructions.style.borderTop = "1px dashed #999";
//         instructions.style.paddingTop = "4px";
//         instructions.innerHTML = `<b>Testare:</b> ${variant.test}<br><b>Aspettarsi:</b> ${variant.expect}`;
//         slot.appendChild(instructions);

//         const skeleton = new SkeletonLoader({ variant: "table", rows: 5, columns: 6 });
//         table_holder.appendChild(skeleton.elementReference());
//         const delay_ms = Math.floor(200 + Math.random() * 50 + i * 250); // staggered so the skeleton is briefly visible everywhere, but everything still resolves
//         setTimeout(() => {
//             const table = new Table2(mockEzDataTable(delay_ms), variant.options);
//             skeleton.destroy();
//             table_holder.appendChild(table.elements.table);
//             setTimeout(() => {
//                 table.elements.table.style.opacity = 1;
//             }, 0);
//         }, delay_ms);
//     }
// }, 0);
//#END RESERVED AREA FOR UI_BUILDER