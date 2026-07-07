/**
 * @deprecated use Table2
 * @variation framework 3.5
 * @example
 * # DataDecorator: Array(5)
 *      0:{Dato: 'Matricola', Valore: '2194979'}
 *      ...
 * 
 * # OverviewPerPosizione: Array(137)
 *      0:{ImgP: 'T0001295.png', Prodotto: 'VEO STICKS PURPLE CLICK ', Barcode: '80882350', Selezione: '1', quantità: 19, …}
 *      ...
 */
class Table {
    elements = {
        table: null,
        tbody: null,
        header: {
            columns: []
        },
        toolbox: {
            container: null,
            title_table: null,
            exporting_button: undefined,
            graph: undefined
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
    data = {
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
    options = undefined;
    static default_preferences = {
        displaying_data: {
            threshold: 10
        }
    }
    /**
     * @type Function
     */
    changeIndexRowsPerPage;
    /**
     * Creates a new Table instance and initializes its structure.
     *
     * @constructor
     * @param {Object[]} jsonArr - Array of objects representing the table data.
     * @param {Object} [options={}] - Configuration options for the table.
     * @param {string} [options.title] - Title displayed in the table toolbar.
     * @param {string} [options.width] - CSS width of the table (e.g., "100%", "800px").
     * @param {boolean} [options.to_be_printed=false] - If true, applies print-friendly styles.
     * @param {number} [options.displaying_data_threshold] - Number of rows per page (default: 10).
     * @param {boolean} [options.exportable_data=true] - If false, disables export buttons.
     * @param {boolean} [options.toolbox_hidden=false] - If true, hides the toolbar.
     * @param {number[]} [options.searchable_columns] - Array of column indexes that are searchable.
     * @param {string[]} [options.hide_columns] - Array of column names to hide.
     * @param {string[]} [options.styles_column_names] - CSS styles applied to column headers.
     * @param {string[]} [options.styles_each_row] - CSS styles applied to each row cell.
     * @param {number[]} [options.is_text_checkbox] - Column indexes that behave as checkboxes.
     * @param {number[]} [options.widths_columns] - CSS styles applied to column headers.
     * @param {boolean} [options.createGraphElement] - If provided, adds a graph button.
     * @param {boolean} [options.hide_3dots_at_i] - Array of column indexes where the 3-dot menu is hidden.
     * @param {boolean} [options.override_content_before_sorting] - Functions to preprocess column content before sorting.
     * @param {Object} [override_options={}] - Properties to override directly on the instance.
     *
     * @description
     * - Initializes internal data structures and DOM elements.
     * - Builds the table header, body, and footer.
     * - Applies options such as column hiding, widths, and title.
     * - Sets up pagination, exporting, and optional graph button.
     *
     * @example
     * const table = new Table(dataArray, {
     *   title: `My Table&nbsp;<span class='abscspan'>${this.#elements.periodo_calcolato.innerText}</span>`,
     *   exportable_data: false,
     *   toolbox_hidden: false,
     *   width: "100%",
     *   widths_columns: [157, 500, 40, 40, 30],
     *   min_height_rows: App.viewportverticale ? 50 : 42,
     *   hide_columns: ["Barcode"],
     *   hideColName: [5],
     *   hide_3dots_at_i: [5],
     *   searchable_columns: [0, 1],
     *   to_be_printed: false,
     *   processRows: {
     *       0: ({ content, container, row_object }) => {
     *           return Locale.localizeDate(content, { str_locale: App.lingua_ui, tipo: 2 });
     *       }
     *   },       
     * });
     */

    constructor(jsonArr, options = {}, override_options = {}) {
        window.last_built_table = this;
        if (options == null) {
            options = {}
        }
        Object.keys(override_options).forEach(key => {
            this[key] = override_options[key];
        });
        const owner = this;
        owner.options = options;
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
        if (!jsonArr || jsonArr.length === 0) {
            console.warn('Empty or invalid array provided.');
            return;
        }
        owner.data.raw_provided_data = jsonArr;
        owner.data.raw_data = [];
        for (let i = 0; i < jsonArr.length; i++) {
            const some_obj = jsonArr[i];
            owner.data.raw_data.push(some_obj);
        }
        owner.data.displaying_data.threshold = Table.default_preferences.displaying_data.threshold;

        const table = document.createElement('table');
        if (owner.options.width != undefined) {
            table.style.width = owner.options.width;
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
        table.classList.add("mftml-table");
        table.style.border = '1'; // Optional: add border for clarity

        // Create table header row
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        // Use properties from the first object as column headers
        const columns = Object.keys(owner.data.displaying_data.data[0]);
        let th_i = 0;
        const rnd = Math.random();
        columns.forEach(col => {
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
            if (Table.special_col_names.indexOf(col) >= 0 || hidden_column) {
                owner.data.columns.hidden.push(true);
            } else {
                owner.data.columns.hidden.push(false);
                const width_column = (Array.isArray(options.widths_columns) ?
                    (options.widths_columns.length > th_i ? options.widths_columns[th_i] : 10)
                    : 10);
                headerRow.appendChild(owner.#makeHeader(col,
                    {
                        group_id: owner.configuration.group_id_DAndD,
                        th_id: `mftml-th-x-${th_i}-${rnd}`,
                        width: width_column,
                        th_i: th_i
                    }));
            }
            th_i++;
        });
        if (options.title != undefined) {
            thead.appendChild(owner.#createTableToolbar());
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);
        owner.elements.thead = thead;

        // Create table body
        const tbody = document.createElement('tbody');
        owner.elements.tbody = tbody;
        table.appendChild(tbody);
        table.appendChild(owner.#createTableFooter());
        owner.updateViewingData();
        owner.elements.table = table;
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
    }
    #addGraphButton(options) {
        const owner = this;
        if (options.to_be_printed || owner.data.raw_data.length < 3) {
            return;
        }
        const btn = UiBuilder.createButton({
            hint: `${Locale.at.grafico}\n${owner.elements.toolbox.title_table.innerText}` ?? "chart", onClick: async (event) => {
                if (owner.elements.toolbox.graph) {
                    owner.elements.toolbox.graph.classList.add("disable-pointer-events");
                }
                const graph_element = options.createGraphElement();
                const dims = (await UiBuilder2.determineDimensionsElement(graph_element));
                const mppoptions = {
                    afterTitleRow: graph_element,
                    iAmAwareThereAreNoSelections: true,
                    event: { clientX: ((window.innerWidth - dims.width) / 2) - 20, clientY: ((window.innerHeight - dims.height) / 3) },
                    onReady: () => { mppoptions.afterTitleRow.focus() },
                    requireToBeMovable: true,
                }
                // console.warn(mppoptions.event.clientX)
                // console.warn(mppoptions.event.clientY)
                mppoptions.afterTitleRow.firstElementChild.style.borderRadius = 0;
                // self_aware_i.instance = await newDynamicModule.MousePopUp(options);

                new MousePopUp(mppoptions);
                setTimeout(() => {
                    owner.elements.toolbox.graph.classList.remove("disable-pointer-events");
                }, 100);
                setTimeout(() => {
                    btn.reset();
                }, 0);
            }, icon: "finance_24.svg", style: "width:28px; height:28px;"
        });
        owner.elements.toolbox.graph = btn;
        owner.elements.toolbox.container.insertBefore(btn, owner.elements.toolbox.container.children[0].nextSibling);
        try {
            owner.elements.toolbox.container.parentElement.style.height = "35px";
        } catch (error) { }

    }
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
     * Builds the table footer with pagination and record counter.
     *
     * @private
     * @returns {HTMLElement} The <tfoot> element.
     */
    #createTableFooter() {
        const owner = this;
        const tfoot = owner.elements.tfoot;
        const tr = document.createElement('tr');
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
        tfoot.appendChild(tr);
        const record_counter = document.createElement("div");
        record_counter.classList.add("table-toolbox-record-counter");
        owner.elements.footer.container = container;
        owner.elements.footer.record_counter = record_counter;
        container.appendChild(toolbox_left);
        container.appendChild(owner.#createPaginator());
        container.appendChild(record_counter);
        if (owner.configuration.hasImgP.yes && !owner.options.to_be_printed) {
            setTimeout(() => {
                const self_aware = {
                    yes: (!(`${localStorage.getItem("show-images-in-tables")}` == "false"))
                }
                const options_create_toggle = {
                    label: Locale.at.show_images ?? "Show Images",
                    innerText: {
                        on: Locale.at.is_on,
                        off: Locale.at.is_off
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
        return tfoot;
    }
    /**
     * Creates the table toolbar row with title and optional search box.
     *
     * @private
     * @returns {HTMLElement} The toolbar row (<tr>).
     */
    #createTableToolbar() {
        const owner = this;
        const headerRow = document.createElement('tr');
        headerRow.classList.add("container-table-toolbox");
        if (owner.options.to_be_printed == true) {
            headerRow.style.height = "16px";
        }
        const toolbox = document.createElement("div");
        toolbox.classList.add("table-toolbox");

        const title_table = document.createElement("div");
        title_table.classList.add("table-toolbox-title-talbe");

        const start_tutorial = UiBuilder.createButton({
            onClick: () => {
                owner.startTutorial();
                setTimeout(() => {
                    start_tutorial.reset();
                }, 0);
            },
            hint: `explain what I'm seeing`, title: '!', style: "min-width:30px;"
        });
        toolbox.appendChild(title_table);
        toolbox.appendChild(start_tutorial);
        //toolbox.appendChild(owner.#createPaginator());
        headerRow.appendChild(toolbox);
        if (owner.options.searchable_columns != undefined && owner.options.searchable_columns.length > 0) {
            if (owner.options.to_be_printed == true) {
                if (owner.configuration.filtered_data.by_search.length > 0) {
                    if (owner.configuration.filtered_data.by_search.length > 7) {
                        title_table.setAttribute("data-suffix", `(${Locale.at.filtered_by_search}: ${owner.configuration.filtered_data.by_search.substring(0, 5)}...)`);
                    } else {
                        title_table.setAttribute("data-suffix", `(${Locale.at.filtered_by_search}: ${owner.configuration.filtered_data.by_search})`);
                    }
                }
            } else {
                toolbox.appendChild(owner.#createSearchBox());
                toolbox.style.flexDirection = "row-reverse";
                headerRow.style.height = "42px";
            }
        }
        owner.elements.toolbox.container = toolbox;
        owner.elements.toolbox.title_table = title_table;

        if (owner.options != undefined) {
            if (owner.options.toolbox_hidden == true) {
                headerRow.classList.add("display-none-important");
            }
        }
        return headerRow;
    }
    #doing_heavy_task = {
        trigger_search_id: undefined,
        worker: undefined
    };
    static table_worker = null;
    #createSearchBox() {
        const owner = this;
        const container = document.createElement("div");
        container.classList.add("mftml-searchbox");
        container.style.display = "flex";
        container.style.position = "relative";
        const icon = document.createElement("img");
        //icon.src = "https://app.local/search.svg";
        Icons.setSrcIcon(icon, "/search.svg");
        icon.style = "position: absolute;right: 5px;bottom: 0;top: 0;margin: auto;";
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
                    Icons.setSrcIcon(icon, "/backspace.svg");
                } else {
                    Icons.setSrcIcon(icon, "/search.svg");
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

        // input.classList.add("dp-inputs");
        input.type = "search";
        input.style = "border-radius:12px;"
        input.style.padding = "5px";

        if (owner.data.raw_provided_data.length > 0 && owner.options.searchable_columns.length > 0) {
            const keys = Object.keys(owner.data.raw_provided_data[0]);//assume all objects have same keys as first record
            const key = keys[owner.options.searchable_columns[0]] ?? '';
            input.placeholder = `${window.Locale.at.cerca} ${key}`;
            let sc_i = 1;
            while (sc_i < owner.options.searchable_columns.length) {
                input.placeholder = input.placeholder + `/${(keys[owner.options.searchable_columns[sc_i]] ?? '')}`
                sc_i++;
            }
        } else {
            input.placeholder = window.Locale.at.cerca;
        }
        if (owner.options.searchable_columns_can_change_scope == true) {
            container.classList.add("mit-scope");
            const scope_selector = document.createElement("div");
            scope_selector.classList.add("mftml-scope")
            const scs_icon = document.createElement("img");
            Icons.setSrcIcon(scs_icon, "/search_column.svg");
            container.appendChild(scope_selector);
            UiBuilder.addHint({
                hint: Locale.at.cj0039,
                target: scope_selector,
                anchor: "top"
            });
            scope_selector.addEventListener("click", async (event) => {
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
                                input.placeholder = `${window.Locale.at.cerca} ${chiave}`;
                                if (owner.options.searchable_columns != undefined) {
                                    owner.options.searchable_columns.length = 0;
                                    owner.options.searchable_columns.push(the_ki);
                                }
                            });
                        }
                        ki++;
                    });
                }
                new MousePopUp({
                    action_titles: titles,
                    next: next,
                    event: event,
                    title: Locale.at.cj0039,
                    style: 4
                });
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
    async testWorker() {
        const worker = new Worker("js/utils/workers/testWorker.min.js");
        worker.onmessage = (e) => console.log("Main got:", e.data);
        worker.postMessage("ping");
        return worker;
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
            onSelectionChange: owner.changeIndexRowsPerPage,
        });
        paginator_status.page_count = Math.ceil(owner.data.raw_data.length / paginator_status.threshold);
        container.appendChild(dropdown_btn);
        const page_selector_container = document.createElement("div");
        page_selector_container.classList.add("page-selector");

        const arrow_left = UiBuilder.createButton({
            onClick: () => {
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
            hint: Locale.at.txt_pagina_precedente ?? '', title: '<', style: "min-width:30px;"
        });
        const arrow_right = UiBuilder.createButton({
            onClick: () => {
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
            hint: Locale.at.txt_pagina_successiva ?? '', title: '>', style: "min-width:30px;"
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
    static special_col_names = ["css_style", "css_class"];
    /**
     * Updates the table body with the currently displayed data.
     *
     * @method
     * @description
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
            owner.elements.footer.record_counter.innerText = Locale.at["no data is present"];
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
                if (Table.special_col_names.indexOf(col_name) >= 0) {
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
                        // img.onerror = () => {
                        //     img.src = "/Images/Icone2024/ui_2024/circle.svg";
                        // }
                        td.addEventListener("click", () => {
                            const img = document.createElement("img");
                            img.src = circle_check_base64;
                            img.style.height = "15px";
                            img.style.width = "15px";
                            if (row_object[col_name] != "☑") {
                                row_object[col_name] = "☑";
                                td.innerHTML = '';
                                img.src = circle_check_base64;
                                td.appendChild(img);
                            } else {
                                row_object[col_name] = "☐";
                                td.innerHTML = '';
                                img.src = circle_base64;
                                td.appendChild(img);
                            }
                        });
                        td.style.cursor = "pointer";
                        late_ops.push(() => {
                            const img = document.createElement("img");
                            img.src = circle_check_base64;
                            img.style.height = "15px";
                            img.style.width = "15px";
                            if (row_object[col_name] != "☑") {
                                td.innerHTML = '';
                                if (owner.options.to_be_pdffed) {

                                    Icons.setSrcIcon(img, "/circle.svg");
                                } else {
                                    img.src = circle_base64;
                                }
                                td.appendChild(img);
                            } else {
                                td.innerHTML = '';
                                if (owner.options.to_be_pdffed) {
                                    Icons.setSrcIcon(img, "/circle_check.svg");
                                } else {
                                    img.src = circle_check_base64;
                                }
                                td.appendChild(img);
                            }
                        });
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
                        img.src = `${Lobby.BaseSrcImages}/${data}`;
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
            owner.elements.tbody.appendChild(row);
        });
        if (owner.options != undefined && owner.options.title != undefined) {
            owner.elements.toolbox.title_table.innerHTML = owner.options.title;
        }
        if (owner.elements.footer.record_counter != null && owner.data.raw_data.length > owner.data.displaying_data.threshold) {
            owner.elements.footer.record_counter.innerText = `${UiBuilder.capitalize(Locale.at["totale"])}: ${owner.data.raw_data.length}`;
        } else {
            owner.elements.footer.record_counter.innerText = ``;
        }
        for (let i = 0; i < late_ops.length; i++) {
            late_ops[i]();
        }
    }
    /**
     * Adds export buttons to the table for data export functionality.
     * @deprecated incompatiple with this FW
     * @private
     * @param {Object} [build_options] - Additional options for export behavior.
     */
    async #addExportingButtons(build_options = undefined) {
        throw new Error("DatePicker is outdated");
        if (window.idp == undefined) {
            const target = document.getElementById("ctl00_ContentPlaceHolder2_txtStartDate");
            const target_to = document.getElementById("ctl00_ContentPlaceHolder2_txtEndDate");
            window.idp = new DatePicker(target, target_to);
        }
        const dp = window.idp;
        const owner = this;
        const options = {};
        let id_matricola = '';
        try {
            id_matricola = `${document.title.match(/[0-9]+/)[0]} `;
        } catch { }
        try {
            options.exporting_data_title = `${id_matricola}${document.getElementById("titolo_pagina").innerText}: ${dp.toStringBuildedDates()}`;
        } catch {
            options.exporting_data_title = `${id_matricola} ${dp.toStringBuildedDates()}`;
        }
        try {
            options.exported_file_name = `${id_matricola}${document.getElementById("titolo_pagina").innerText.trim().replaceAll(" ", "_")}:${dp.toStringBuildedDates(1)}`;
        } catch {
            options.exported_file_name = `${id_matricola} ${dp.toStringBuildedDates(1)}`;
        }
        options.promiseData = () => {
            return new Promise((async (resolve) => {
                setTimeout(() => {
                    resolve(owner.getDataToExport());
                }, 0);
            }));
        }
        if (build_options != undefined) {
            options.getElementBeforePrint = build_options.getElementBeforePrint;
        }
        options.anchor_speed_dial = owner.elements.toolbox.title_table != undefined ? "right-middle" : undefined;
        return;
        const btn_export_data = await (new ExportData(options)).elementReference();
        owner.elements.toolbox.exporting_button = btn_export_data;
        //console.error(options);
        btn_export_data.classList.add("export-table-button");
        setTimeout(() => {
            btn_export_data.style.width = "fit-content";
            if (owner.elements.toolbox.title_table != undefined) {
                /**
                 * @type Element
                 */
                const icon = btn_export_data.children[0];
                btn_export_data.innerText = '';
                icon.setAttribute("width", "18px");
                icon.setAttribute("height", "18px");
                btn_export_data.appendChild(icon);
                btn_export_data.style.marginLeft = "auto";
                UiBuilder.addHint({ hint: `${Locale.at.esporta_dati}\n${owner.elements.toolbox.title_table.innerText}`, target: btn_export_data });
                owner.elements.toolbox.container.insertBefore(btn_export_data, owner.elements.toolbox.container.children[0].nextSibling);
            } else {
                owner.elements.table.parentElement.insertBefore(btn_export_data, owner.elements.table.nextSibling);
                btn_export_data.style.marginRight = "auto";
            }
            owner.elements.table.style.position = "relative";
            btn_export_data.style.marginLeft = "auto";
        }, 0);
    }
    /**
     * Retrieves the table data for export, excluding hidden columns.
     *
     * @method
     * @returns {Object[]} Array of objects representing visible table data.
     *
     * @description
     * - Iterates through raw data.
     * - Applies column renaming and hides columns marked as hidden.
     */

    getDataToExport() {
        const owner = this;
        const data = [];
        const columns = Object.keys(this.data.raw_data[0]);
        //owner.data.columns.raw==columns;
        //owner.data.columns.hidden is Array<bool>
        //owner.data.columns.renamed is Array<string>
        for (let r = 0; r < owner.data.raw_data.length; r++) {
            const row_to_add = {};
            const row = (owner.data.raw_data[r]);
            Object.entries(row).forEach(([column, content]) => {
                const index_column = owner.data.columns.raw.indexOf(column);
                if (index_column >= 0) {
                    if (owner.data.columns.hidden[index_column]) {
                        return;
                    }
                    if (owner.data.columns.renamed[index_column] != '' && owner.data.columns.renamed[index_column] != undefined) {
                        row_to_add[`${owner.data.columns.renamed[index_column].trim()}`] = content;
                    } else {
                        row_to_add[column] = content;
                    }
                }
            });
            data.push(row_to_add);
        }
        window.data = data;
        return data;
        const displayed_columns = [];
        const true_col_to_displayed_col = {};
        const row_0 = owner.data.raw_data[0];
        let col_i = 0;
        row_0.forEach(col => {
            const content = (row_0[col] !== undefined && row_0[col] !== null) ? row_0[col] : '???';
            if (this.data.columns.renamed[col_i] != '') {
                //yes
            } else {
                //no

            }
            col_i++;
        });
        let row_i = 0;
        owner.data.raw_data.forEach(row => {
            let col_i = 0;
            if (row_i == 0) { //cols names
                columns.forEach(col => {
                    const content = (row[col] !== undefined && row[col] !== null) ? row[col] : '';
                    if (!this.data.columns.hidden[col_i]) {
                        //this col exist is renamed?
                        if (this.data.columns.renamed[col_i] != '') {
                            //yes
                        } else {
                            //no

                        }
                    }
                    col_i++;
                });
            } else {
                const col_name =
                    columns.forEach(col => {
                        const content = (row[col] !== undefined && row[col] !== null) ? row[col] : '';
                        if (!this.data.columns.hidden[col_i]) {
                            //this col exist
                        }
                        col_i++;
                    });
            }
            row_i++;
        });
        console.warn(owner.data.raw_data)
        return owner.data.raw_data;
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
                Icons.setSrcIcon(img, "/check_circle.svg");
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
                th.style.width = Number(options.width) + 5;
            } else {
                th.style.width = options.width;
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
                            //todo 
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
                    title: `${Locale.at.rinomina} ${Locale.at.colonna}: ${self_aware.col_name}`,
                    title_cancel: Locale.at.annulla,
                    title_confirm: Locale.at.ok,
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
                        action_titles: [/*Locale.at.rinomina, Locale.at["nascondi colonna"],*/ Locale.at["sort descending"], Locale.at["sort ascending"]],
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
                        title: Locale.at.colonna,
                        style: 0
                    });
                    setTimeout(() => {
                        self_aware.dots_btn.reset();
                    }, 0);
                }, icon: "vertical_dots.svg", class: "f-table-button"
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
                return;
                (await getDynamicModule.DragAndDrop()).makeItDraggable({
                    target: th,
                    group_id: options.group_id,
                    //target_to_grab: self_aware.dots_btn,
                    onDrop: ({ start_id, end_id, event }) => {
                        // console.error(start_id);
                        // console.error(end_id);
                        setTimeout(() => {
                            Table.swapColumns(document.getElementById(start_id), document.getElementById(end_id));
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
    static swapColumns(th1, th2) {
        const table = th1.closest('table');
        if (!table || !th2.closest('table') || table !== th2.closest('table')) {
            console.error('Headers are not in the same table.');
            return;
        }

        const headerRow = th1.parentElement; // assuming th is directly in tr
        const headers = Array.from(headerRow.children);

        const index1 = headers.indexOf(th1);
        const index2 = headers.indexOf(th2);

        if (index1 === -1 || index2 === -1) {
            console.error('One of the header elements was not found in the header row.');
            return;
        }

        // Swap the child nodes of the header cells
        Table.swapChildNodes(th1, th2);

        // For each row, swap the child nodes in the specified columns
        const rows = Array.from(table.querySelectorAll('tr')).filter(row => row !== headerRow);

        rows.forEach(row => {
            const cells = Array.from(row.children);
            if (cells.length > Math.max(index1, index2)) {
                Table.swapChildNodes(cells[index1], cells[index2]);
            }
        });
    }
    static swapChildNodes(th1, th2) {
        if (th1.children.length == 0 && th2.children.length == 0) {
            setTimeout(() => {
                const don_t_forget_me = th1.innerText;
                th1.innerText = th2.innerText;
                th2.innerText = don_t_forget_me;
            }, 0);
            return;
        }
        const elements_1 = [];
        for (let i = 0; i < th1.children.length; i++) {
            const element = th1.children[i];
            elements_1.push(element);
        }
        const elements_2 = [];
        for (let i = 0; i < th2.children.length; i++) {
            const element = th2.children[i];
            elements_2.push(element);
        }
        setTimeout(() => {
            for (let i = 0; i < elements_1.length; i++) {
                const element = elements_1[i];
                th2.appendChild(element);
            }
            for (let i = 0; i < elements_2.length; i++) {
                const element = elements_2[i];
                th1.appendChild(element);
            }
        }, 0);
    }
    /**
     * Creates a clone of the current Table instance with overridden options.
     *
     * @method
     * @param {Object} override_options - Options to override in the cloned instance.
     * @returns {Table} A new Table instance with merged options.
     *
     * @example
     * const clonedTable = originalTable.cloneStub({ title: "Cloned Table" });
     */
    cloneStub(override_options) {
        const owner = this;
        const c_options = { ...owner.options, ...override_options };
        if (c_options.configuration == undefined) {
            c_options.configuration = {}
        }
        c_options.configuration.group_id_DAndD = owner.configuration.group_id_DAndD;
        if (c_options.configuration.filtered_data == undefined) {
            c_options.configuration.filtered_data = {}
        }
        c_options.configuration.filtered_data.by_search = owner.configuration.filtered_data.by_search;
        const table = new Table(owner.data.raw_data, c_options);

        // {
        //     configuration: owner.configuration,
        //         data: owner.data,
        //             options: owner.options,
        // }
        // table.elements = owner.elements;
        return table;
    }
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
}