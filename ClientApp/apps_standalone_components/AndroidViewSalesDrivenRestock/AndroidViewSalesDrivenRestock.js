/**
 * @version 1.0
 */
class AndroidViewSalesDrivenRestock extends FrameworkGC(`${injector_html}`) {
    static mobile_os = document.querySelector("[name~=mobile-os][content]")?.content == "true";
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        const owner = this;
        const self_aware = {
            received_UserDefinedIntervalls: false,
            received_TriggerPortaApertaIntervalls: false
        }
        Lobby.post({ prompt: 16 /*getUserDefinedIntervalls*/ }, (rsp) => {
            owner.datatable_user_defined_intervalls = rsp.datatable;
            // console.warn(owner.datatable_user_defined_intervalls);
            self_aware.received_UserDefinedIntervalls = true;
            if (self_aware.gonna_check_if_ready != undefined) {
                return;
            }
            setTimeout(() => {
                if (self_aware.received_TriggerPortaApertaIntervalls && self_aware.received_UserDefinedIntervalls) {
                    owner.#initialize();
                }
            }, 0);
        });
        Lobby.post({ prompt: 17 /* getTriggerPortaApertaIntervalls */ }, (rsp) => {
            owner.datatable_apertura_porta = rsp.datatable;
            // console.warn(owner.datatable_apertura_porta);
            self_aware.received_TriggerPortaApertaIntervalls = true;
            setTimeout(() => {
                if (self_aware.received_TriggerPortaApertaIntervalls && self_aware.received_UserDefinedIntervalls) {
                    owner.#initialize();
                }
            }, 0);
        });
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
    appstatus = {
        status_intervalls_dropdown: null
    }
    #calcolaBackHandler = null;
    async #initialize() {
        const owner = this;
        if (owner.already_initialized_fr == true) {
            return;
        }
        owner.already_initialized_fr = true;
        owner.#createTabs();// it creates User Intervalls
        return;
    }
    //#region avsdr-content-filtering
    #createTabs() {
        const owner = this;
        // owner.#elements.intervall_selector.remove();
        const build_options = {
            titles: [],
            content: [],
            id_sync: "sales_driven_sales",
            onViewChange: () => {
                App.removeTablesAndButtonsPerSearch();
            }
        };
        // for (let [key, value] of Object.entries(owner.datatable_apertura_porta)) {
        //     console.log(key, value);
        // }
        if (owner.datatable_apertura_porta != undefined && owner.datatable_apertura_porta.DataOra != undefined && owner.datatable_apertura_porta.DataOra.length > 0) {//apertura porta
            const title_1 = Locale.at("apertura porta");
            build_options.titles.push(title_1);
            build_options.content.push(owner.#createUserIntervalls(owner.datatable_apertura_porta, title_1));
        }
        if (owner.datatable_user_defined_intervalls != undefined && owner.datatable_user_defined_intervalls.DataOra != undefined && owner.datatable_user_defined_intervalls.DataOra.length > 0) {//user reset button 1
            const title_2 = Locale.at("Inventory Refilling Log");
            build_options.titles.push(title_2);
            build_options.content.push(owner.#createUserIntervalls(owner.datatable_user_defined_intervalls, title_2));
        }

        if (owner.datatable_user_defined_reset_monete != undefined && owner.datatable_user_defined_reset_monete.DataOra != undefined && owner.datatable_user_defined_reset_monete.DataOra.length > 0) {//user reset button 2
            const title_3 = Locale.at("Cash Collection Log");
            build_options.titles.push(title_3);
            build_options.content.push(owner.#createUserIntervalls(owner.datatable_user_defined_reset_monete, title_3));
        }
        const tabs = UiBuilder.createTabs(build_options);
        if (tabs == undefined) {
            UiBuilder.mockDialog({
                text1: `${Locale.at("servers down")} \n${Locale.at("retry in a few hours")}`,
                onConfirm: () => {
                },
                onConfirmText: Locale.at("ok"),
                onDeny: () => {
                },
                hideOnDeny: true,
                onClose: () => {
                },
                prefer_selection: 0
            });
            return;
        }
        owner.elements.tabs_container = tabs;
        owner.elements["avsdr-content-filtering"].appendChild(tabs);
    }
    #createUserIntervalls(dict_object_arr, title_intervalls) {
        const owner = this;
        const container = document.createElement("div");
        container.classList.add("user-dates-container");


        const userDiv = document.createElement("div");
        userDiv.classList.add("user-entry");
        const status_intervalls = {
            label: title_intervalls,
            titles: [],
            /**
             * @param start
             * @param end
             * @type Array<Dictionary<Date|undefined, Date|undefined>>
             */
            state: [],
            startIndex: 0,
            endIndex: 0
        };
        status_intervalls.titles.push(`❪ ${Locale.localizeDate(new Date(dict_object_arr.DataOra[0]), { str_locale: App.lingua_ui, tipo: 2 })} ➔ ${Locale.at("now") ?? now} ❫`);
        const state = {
            start: new Date(dict_object_arr.DataOra[0]),
            end: undefined
        }
        status_intervalls.state.push(state);
        for (let i = 1; i < dict_object_arr.DataOra.length; i++) {
            const user_date_end = new Date(dict_object_arr.DataOra[i - 1]);
            const user_date_start = new Date(dict_object_arr.DataOra[i]);
            const diffMs = user_date_end - user_date_start;
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMinutes / 60);
            const diffDays = Math.floor(diffHours / 24);
            const hours = diffHours % 24;
            const minutes = diffMinutes % 60;
            let ui = `❪ ${Locale.localizeDate(user_date_start, { str_locale: App.lingua_ui, tipo: 2 })} ➔ ${Locale.localizeDate(user_date_end, { str_locale: App.lingua_ui, tipo: 2 })} ❫\n                  [`;

            if (diffDays >= 1) {
                ui += ` ${diffDays} ${diffDays === 1 ? Locale.at("day") : Locale.at("days")}`;
            }
            if (diffHours >= 1) {
                ui += ` ${hours} ${hours === 1 ? Locale.at("hour") : Locale.at("hours")}`;
            }
            ui += ` ${minutes} ${minutes === 1 ? Locale.at("minute") : Locale.at("minutes")}]`;
            status_intervalls.titles.push(ui);
            const state = {
                start: new Date(user_date_start),
                end: new Date(user_date_end)
            }
            status_intervalls.state.push(state);
        }
        // const dropdown_btn = UiBuilder.createDropDownButtonSelector({
        //     label: status_intervalls.label,
        //     titles: status_intervalls.titles, //array of selections
        //     // next: next, //array of functions that executes when clicking on a selection (titles.length == next.length) next can be null if onSelectionChange != undefined
        //     onSelectionChange: (index) => { //can be null if next.length==title.length
        //         status_intervalls.selectedIndex = index;
        //     },
        //     direction_open: 'bot',
        //     stealth: false,
        //     max_selections_height: "Max(50vh, 210px)"
        // });
        const dropdown_btn = UiBuilder.createDropDownMultipleSelections({
            label: status_intervalls.label,
            titles: status_intervalls.titles, //array of selections
            // next: next, //array of functions that executes when clicking on a selection (titles.length == next.length) next can be null if onSelectionChange != undefined
            /**
             * 
             * @param {Object} param0 
             * @param {Array<boolean>} param0.is_selected
             * @param {Array<string>} param0.titles
             */
            onSelectionStatusChange: ({ is_selected, titles }) => { //can be null if next.length==title.length
                const exist_selection = is_selected.indexOf(true) >= 0;
                requestAnimationFrame(() => {
                    btn_calcola.classList.toggle("disabled", !exist_selection);
                });
                if (exist_selection) {
                    status_intervalls.endIndex = is_selected.indexOf(true);
                    status_intervalls.startIndex = is_selected.lastIndexOf(true);
                    requestAnimationFrame(() => {
                        const diffMs = (status_intervalls.state[status_intervalls.endIndex].end ?? new Date()) - status_intervalls.state[status_intervalls.startIndex].start;
                        const diffMinutes = Math.floor(diffMs / (1000 * 60));
                        const diffHours = Math.floor(diffMinutes / 60);
                        const diffDays = Math.floor(diffHours / 24);
                        const hours = diffHours % 24;
                        const minutes = diffMinutes % 60;
                        let ui = `❪ ${Locale.localizeDate(status_intervalls.state[status_intervalls.startIndex].start, { str_locale: App.lingua_ui, tipo: 2 })} ➔ ${Locale.localizeDate((status_intervalls.state[status_intervalls.endIndex].end ?? new Date()), { str_locale: App.lingua_ui, tipo: 2 })} ❫\n                    [`;
                        if (status_intervalls.state[status_intervalls.endIndex].end == undefined) {
                            ui = `❪ ${Locale.localizeDate(status_intervalls.state[status_intervalls.startIndex].start, { str_locale: App.lingua_ui, tipo: 2 })} ➔ ${Locale.at("now")} ❫\n                    [`;
                        }
                        if (diffDays >= 1) {
                            ui += ` ${diffDays} ${diffDays === 1 ? Locale.at("day") : Locale.at("days")}`;
                        }
                        if (diffHours >= 1) {
                            ui += ` ${hours} ${hours === 1 ? Locale.at("hour") : Locale.at("hours")}`;
                        }
                        ui += ` ${minutes} ${minutes === 1 ? Locale.at("minute") : Locale.at("minutes")}]`;
                        dropdown_btn.getElementsByClassName("custom-dropdown-selected")[0].innerText = `${ui}`;
                    });
                }
                // console.warn(status_intervalls);
            },
            direction_open: 'bot',
            stealth: false,
            max_selections_height: "Max(50vh, 210px)",
            chained_selection: true,
            default_title: Locale.at("select"),
            omit_rendering: true,
            onConfirm: () => {
                owner.askCalcola(dropdown_btn, status_intervalls);
            }
        });
        // dropdown_btn.style.width = "750px";
        dropdown_btn.style.width = "100%";
        const btn_calcola = UiBuilder.createButton({
            onClick: () => {
                owner.askCalcola(btn_calcola, status_intervalls);
            },
            title: Locale.at("calcola"), icon: "calculate.svg"
        });
        container.appendChild(dropdown_btn);
        container.appendChild(btn_calcola);
        return container;
    }
    //#endregion
    async askCalcola(btn_calcola, status_intervalls_dropdown) {
        const owner = this;
        owner.elements["avsdr-content-filtering"].innerText = '';
        const date_start = status_intervalls_dropdown.state[status_intervalls_dropdown.startIndex].start;
        const date_end = status_intervalls_dropdown.state[status_intervalls_dropdown.endIndex].end ?? new Date();
        owner.last_feedback_search = `${Locale.parseDateConvertToReadable(date_start,
            { tipo: 2 })} -> ${Locale.parseDateConvertToReadable(date_end, { tipo: 2 })}`;
        // console.log("start date")
        // console.log(date_start)
        // console.log("end date")
        // console.log(date_end)
        owner.elements['avsdr-content-viewer'].innerText = "";
        Lobby.post({ prompt: 18, data1: Locale.toIsoDate(date_start), data2: Locale.toIsoDate(date_end) }, (rsp) => {
            // console.warn(rsp);
            owner.#data = rsp.datatables;
            owner.#digestData();
            btn_calcola.classList.toggle("clicked", false);
            if (owner.#calcolaBackHandler && typeof SpaHistory !== "undefined") {
                SpaHistory.popState(owner.#calcolaBackHandler);
            }
            owner.#calcolaBackHandler = () => {
                owner.#calcolaBackHandler = null;
                owner.elements["avsdr-content-filtering"].innerText = '';
                owner.elements['avsdr-content-viewer'].innerText = "";
                owner.elements["avsdr-content-filtering"].appendChild(owner.elements.tabs_container);
            };
            if (typeof SpaHistory !== "undefined") {
                SpaHistory.pushState(owner.#calcolaBackHandler);
            }
        });
    }
    //#region avsdr-content-viewer
    /**
     * @type Dict<key,Array<Object>>
     */
    #data = {};
    /**
     * @type Array<Table>
     */
    tables = [];
    #digested = {
        TheTableBuildOptions: {}
    }
    last_feedback_search = '';
    #digestData(silent = false) {
        const owner = this;
        console.warn(owner.#data)
        if (owner.#data["OverallEvaluation"] == undefined || owner.#data["OverallEvaluation"]["number of sales"].length == 0) {
            if (!silent) {
                new Notify({
                    text: Locale.at("no data is present"),
                    event: {
                        clientX: owner.elements.tabs_container.getBoundingClientRect().x + 30,
                        clientY: owner.elements.tabs_container.getBoundingClientRect().y + 130
                    },
                    ms_timeout: 1200,
                    style: 3,
                    type: 1
                });
                return;
            }
            owner.last_feedback_search = `${owner.last_feedback_search} => ${Locale.at("no data is present")}`;

        }
        this.tables.length = 0;

        owner.#digested.TheTableBuildOptions["OverallEvaluation"] = {

            styles_column_names: {
                0: "text-align: right;",
                1: "text-align: right;",
                2: "text-align: right;",
                // 3: "text-align: right;",
                // 4: "text-align: right;"
            },
            exportable_data: false, toolbox_hidden: false,
            title: `${Locale.at("Overall evaluation for the period")} <span class='abscspan'>${owner.last_feedback_search}</span>`
        };
        if (AndroidViewSalesDrivenRestock.mobile_os || window.innerWidth < 525) {
            owner.#digested.TheTableBuildOptions["OverallEvaluation"].title = `${Locale.at("Overall evaluation for the period")} \n${owner.last_feedback_search}`;
        } else {
            owner.#digested.TheTableBuildOptions["OverallEvaluation"].title = `${Locale.at("Overall evaluation for the period")} <span class='abscspan'>${owner.last_feedback_search}</span>`;
        }
        const table_OverallEvaluation = new Table2(owner.#data["OverallEvaluation"], owner.#digested.TheTableBuildOptions["OverallEvaluation"]);
        owner.elements["avsdr-content-filtering"].appendChild(table_OverallEvaluation.elements.table);
        if (owner.#data["OverviewPerProduct"].Barcode.length == 0) {
            return;
        }//datatables.OverviewPerProduct
        const i_numero_motore = 3;
        const key_col_numero_motore = Object.keys(owner.#data["OverviewPerProduct"])[i_numero_motore];
        if (AndroidViewSalesDrivenRestock.mobile_os || window.innerWidth < 525) {
            const cards = [];
            /**
             * @type Object
             */
            const all_building_args = {};
            for (let i = 0; i < owner.#data["OverviewPerProduct"].IDProdotto.length; i++) {
                const id_prodotto = owner.#data["OverviewPerProduct"].IDProdotto[i];
                const building_args = {
                    description: owner.#data["OverviewPerProduct"].Desc1[i],
                    Barcode: owner.#data["OverviewPerProduct"].Barcode[i],
                    // barcode_img: owner.#data["OverviewPerProduct"].ImgP[i],
                    numero_motore: owner.#data["OverviewPerProduct"]["numero motore"][i],
                    number_of_sales: owner.#data["OverviewPerProduct"]["number of sales"][i],
                    refilled: owner.#data["OverviewPerProduct"].refillato[i] != "☐",
                    prodotto_img: Lobby.BaseSrcImages + owner.#data["OverviewPerProduct"].ImgP[i],
                }
                if (!all_building_args.hasOwnProperty(id_prodotto)) {
                    all_building_args[`${id_prodotto}`] = building_args;
                }
                if (all_building_args[`${id_prodotto}`].iterations == undefined) {
                    all_building_args[`${id_prodotto}`].iterations = [];
                }
                all_building_args[`${id_prodotto}`].iterations.push({
                    numero_motore: owner.#data["OverviewPerProduct"]["numero motore"][i],
                    number_of_sales: owner.#data["OverviewPerProduct"]["number of sales"][i],
                });
            }
            for (let [key, value] of Object.entries(all_building_args)) {
                cards.push(new CardRefillmentSuggestions(value));
            }
            requestAnimationFrame(() => {
                for (let i = 0; i < cards.length; i++) {
                    const card = cards[i];
                    owner.elements['avsdr-content-viewer'].appendChild(card.elementReference());
                }
            });
        } else {
            owner.#digested.TheTableBuildOptions["OverviewPerProduct"] = {
                exportable_data: false,
                toolbox_hidden: false,
                // title: `${Locale.at("OverviewPerProduct")} <span class='abscspan'>${owner.last_feedback_search}</span>`,
                widths_columns: [20, 500, 40, 40, 30],
                hide_3dots_at_i: [6, 1],
                min_height_rows: 42,
                hide_columns: ["IDProdotto"],
                styles_each_row: {
                    6: "text-align: center; user-select:none;",
                    4: "text-align: right;"
                },
                styles_column_names: {
                    6: "text-align: center; user-select:none;",
                    2: "text-align: center;",
                    3: "text-align: right;",
                    4: "text-align: right;",
                },
                override_content_before_sorting: {
                    i_numero_motore: (a, b) => {
                        // console.warn(`${a} vs ${b}`)
                        try {
                            const res = { a: parseInt(a[key_col_numero_motore]), b: parseInt(b[key_col_numero_motore]) };
                            if (isNaN(res.a) || isNaN(res.b)) {
                                throw new Error("");
                            }
                            return res;
                        } catch (error) {
                            return { a: a[key_col_numero_motore], b: b[key_col_numero_motore] };
                        }
                    }
                },
                is_text_checkbox: [6]

            }
            owner.#digested.TheTableBuildOptions["OverviewPerProduct"].title = `${Locale.at("OverviewPerProduct")} <span class='abscspan'>${owner.last_feedback_search}</span>`;
            const table_OverviewPerProduct = new Table2(owner.#data["OverviewPerProduct"], owner.#digested.TheTableBuildOptions["OverviewPerProduct"]);
            owner.elements['avsdr-content-viewer'].appendChild(table_OverviewPerProduct.elements.table);
            owner.tables.table_OverviewPerProduct = table_OverviewPerProduct;
        }

        owner.tables.table_OverallEvaluation = table_OverallEvaluation;
        //owner.#addExportingButtonS();
    }
    //#endregion
    /**
     * @param {number} timeout_ms
     */
    destroy(timeout_ms = 0) {
        if (this.#calcolaBackHandler) {
            if (typeof SpaHistory !== "undefined") {
                SpaHistory.popState(this.#calcolaBackHandler);
            }
            this.#calcolaBackHandler = null;
        }
        super.destroy(timeout_ms);
    }
    // owner.self_ref;//access element reference here
    // owner.elementReference();//alternative way to access element reference
    // owner.destroy();//call destroy method when needed
    // owner.options;//access building options here
}