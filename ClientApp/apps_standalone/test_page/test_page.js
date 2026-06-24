const debug = false;
class App {
    #elements = {
        main_container: document.getElementsByClassName("test-container")[0],
    }
    /**
     * Represents the current status of the application.
     */
    static app_status = {
        bottom_section_visible: true
    };
    constructor() {
        this.initializeWindowControls();
        this.initializeTests();
    }
    #preferences = {
        rows_per_page: 10
    }
    async initializeTests() {
        const owner = this;
        const tests = document.getElementsByClassName("testx");
        tests[0].addEventListener("click", (event) => {
            new Notify({ text: "try test post", event: event, ms_timeout: 2000, style: 3, type: 0 });
            const translated_event = { clientX: event.clientX + 30, clientY: event.clientY + 30 };
            Lobby.post({ prompt: 4/*ApplyDefaultConfiguration*/ }, (rsp) => {
                new Notify({ text: "ricevuto rsp test post", event: translated_event, ms_timeout: 2000, style: 3, type: 0 });
            });
        });
        UiBuilder.addHint({
            hint: "test me",
            target: tests[0],
            anchor: "top",
        });
        tests[1].addEventListener('click', () => {
            const OpenLittleSettings = document.createElement('div')
            OpenLittleSettings.style = `display: flex;justify-content: center;padding-top: 9px;`;
            OpenLittleSettings.innerHTML = policy.createHTML(`some content`);

            const chart = new PieChart({
                products: [
                    new PCMockProduct("Products 1", 120),
                    new PCMockProduct("Products 2", 80)
                ],
                onClose: () => console.log("Chart closed")
            });
            OpenLittleSettings.appendChild(chart.elementReference());
            new BottomSheet({
                element: OpenLittleSettings,
                onClose: () => {
                    // if (typeof filters_list_el.onAnnulla === 'function') {
                    //     filters_list_el.onAnnulla();
                    // }
                    if (owner.onSkip != undefined) {
                        owner.onSkip();
                    }
                },
                //centered: true
            });
        });
        tests[2].addEventListener('click', () => {
            const OpenLittleSettings = document.createElement('div')
            OpenLittleSettings.style = `display: flex;justify-content: center;padding-top: 9px;`;
            OpenLittleSettings.innerHTML = `some content`;
            const mock_data = `[{"Datum/Uhrzeit":"2025-10-11T15:21:28","Bewegung":"Overpay - Resto non disponibile","Menge €":0.05,"Gesamtguthaben €":0,"iwmiMovStatus":null,"csusTypeOriginal":40019,"csusLoggedIn":null,"Extra":"Overpay - Resto non disponibile : Overpay"},{"Datum/Uhrzeit":"2025-09-29T19:11:36","Bewegung":"Elfbar ELFA Starter Kit Black m. Blue Razz-Pod 20mg 5","Menge €":13.9,"Gesamtguthaben €":13.9,"iwmiMovStatus":1,"csusTypeOriginal":null,"csusLoggedIn":null,"Extra":null},{"Datum/Uhrzeit":"2025-09-27T07:07:40","Bewegung":"Chesterfield Blue 100s","Menge €":6.3,"Gesamtguthaben €":18.9,"iwmiMovStatus":1,"csusTypeOriginal":null,"csusLoggedIn":null,"Extra":null},{"Datum/Uhrzeit":"2025-09-22T20:13:51","Bewegung":"Chesterfield Blue 100s","Menge €":6.3,"Gesamtguthaben €":20,"iwmiMovStatus":1,"csusTypeOriginal":null,"csusLoggedIn":null,"Extra":null},{"Datum/Uhrzeit":"2025-08-14T21:25:12","Bewegung":"Marlboro Touch","Menge €":6.6,"Gesamtguthaben €":6.6,"iwmiMovStatus":1,"csusTypeOriginal":null,"csusLoggedIn":null,"Extra":null},{"Datum/Uhrzeit":"2025-07-09T08:11:11","Bewegung":"Chesterfield Blue 100s","Menge €":6.3,"Gesamtguthaben €":6.3,"iwmiMovStatus":1,"csusTypeOriginal":null,"csusLoggedIn":null,"Extra":null},{"Datum/Uhrzeit":"2025-07-03T13:43:34","Bewegung":"Chesterfield Selec. Fields Blue Chesterfield Selected Fields Blue","Menge €":6.1,"Gesamtguthaben €":12.2,"iwmiMovStatus":1,"csusTypeOriginal":null,"csusLoggedIn":null,"Extra":null},{"Datum/Uhrzeit":"2025-07-02T18:01:45","Bewegung":"Chesterfield Selec. Fields Blue Chesterfield Selected Fields Blue","Menge €":6.1,"Gesamtguthaben €":6.1,"iwmiMovStatus":1,"csusTypeOriginal":null,"csusLoggedIn":null,"Extra":null},{"Datum/Uhrzeit":"2025-06-30T13:35:50","Bewegung":"VELO Freezing Peppermint Original Slim 4/6 10,9mg","Menge €":6.1,"Gesamtguthaben €":6.1,"iwmiMovStatus":1,"csusTypeOriginal":null,"csusLoggedIn":null,"Extra":null},{"Datum/Uhrzeit":"2025-06-30T13:32:50","Bewegung":"Marlboro 22s","Menge €":7,"Gesamtguthaben €":7,"iwmiMovStatus":1,"csusTypeOriginal":null,"csusLoggedIn":null,"Extra":null},{"Datum/Uhrzeit":"2025-06-30T13:27:55","Bewegung":"Marlboro 22s","Menge €":7,"Gesamtguthaben €":8,"iwmiMovStatus":1,"csusTypeOriginal":null,"csusLoggedIn":null,"Extra":null},{"Datum/Uhrzeit":"2025-06-30T13:25:40","Bewegung":"Marlboro 22s","Menge €":7,"Gesamtguthaben €":10,"iwmiMovStatus":1,"csusTypeOriginal":null,"csusLoggedIn":null,"Extra":null},{"Datum/Uhrzeit":"2025-06-27T18:08:18","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-26T08:21:51","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-26T06:55:16","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-26T04:22:01","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-26T00:39:29","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-26T00:38:58","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":false,"Extra":null},{"Datum/Uhrzeit":"2025-06-25T07:24:24","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-25T06:58:11","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-25T05:16:14","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-25T00:22:51","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-24T22:02:31","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-24T21:33:55","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-24T19:40:27","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-24T19:29:46","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-24T19:05:41","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-24T18:33:31","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-24T18:31:02","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-24T18:28:32","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-24T14:39:37","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-24T13:37:03","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null},{"Datum/Uhrzeit":"2025-06-24T13:29:32","Bewegung":"- Andere -","Menge €":null,"Gesamtguthaben €":null,"iwmiMovStatus":null,"csusTypeOriginal":-1,"csusLoggedIn":true,"Extra":null}]`;
            const mock_options = {
                exportable_data: true,
                toolbox_hidden: false,
                title: `&nbsp;<span class='abscspan'>- -title- -</span>`,
                widths_columns: [93, "auto", 55, 50, "auto", "auto", "auto", "auto"],
                styles_column_names: ["min-width:93px;max-width:93px;", "min-width:250px;", "min-width:56px;", "", "min-width:250px;", "min-width:250px;", "min-width:250px;", "min-width:250px;"],
                // hide_3dots_at_i: [5],
                // hideColName: [5],
                // min_height_rows: 40,
                // hide_columns: ["TAS", "IDServizio", "TCDC"],//the table looks first data to determine the columns at build time
                hide_columns: (debug ? [] : ["iwmiMovStatus", "csusLoggedIn", "csusTypeOriginal", "ID", "Device", "Operazione", "Dati1", "Dati2", "Dati3", "Dati4", "Dati5", "Dati6", "Dati7", "Dati8", "Dati9", "Dati10", "Dati11"]),
                // styles_each_row: {
                //     5: "text-align: center; user-select:none;",
                //     4: "text-align: right;"
                // },
                displaying_data_threshold: App.viewportverticale ? 25 : owner.#preferences.rows_per_page,
                onChangeIndexRowsPerPage: (rpp) => {
                    if (rpp <= 30) {
                        owner.#preferences.rows_per_page = rpp;
                    }
                },
                searchable_columns: [0],
                searchable_columns_can_change_scope: true,
                processRows: {
                    0: ({ content, row_object, container, omit_rendering }) => {
                        return Locale.localizeDate(content, { tipo: 2 });
                    }
                },
            }
            const a_table = new Table(JSON.parse(mock_data), mock_options);
            const bts = new BottomSheet({
                element: a_table.elements.table,
                onClose: () => {
                    // if (typeof filters_list_el.onAnnulla === 'function') {
                    //     filters_list_el.onAnnulla();
                    // }
                    if (owner.onSkip != undefined) {
                        owner.onSkip();
                    }
                },
                centered: true
            });
        });
        owner.testDragAndDrop();
        owner.testSpeedDial();
        owner.testComponentFramework();
    }
    async testComponentFramework() {
        const test_component = new FrameworkTestComponent({
            onClose: () => {
                console.log("test component closed");
            },
        });
        this.#elements.main_container.appendChild(test_component.elementReference());
    }

    async testSpeedDial() {
        const target = document.getElementsByClassName("button-container1")[0];
        new SpeedDial({
            target: target, //element add onClickEventListener
            anchor: "left",//top, bot, left, right, around
            selections: [
                {
                    onClick: (event) => {
                    },
                    hint: "more info",
                    icon_code: "f810"
                },
                {
                    onClick: (event) => {
                    },
                    hint: "more info" //default icon
                },
                {
                    onClick: (event) => {
                    },
                    hint: "more info",
                    text: "action1" //no icon at all if icon=undefined
                }
            ]
        });
    }
    async testDragAndDrop() {
        const tests = document.getElementsByClassName("testx");
        const group_id = "2wevf24";
        const list_box = new ListBox({
            Size: { width: "200px", height: "300px", fontSize: "14px", maxItemHeight: "40px" },
            title: "Drag and Drop Events",
        });
        list_box.addItem("care for multiple events attached to same element", { backgroundColor: "#606060c0" });
        document.getElementById("drag-and-drop-testing").appendChild(list_box.elementReference());
        for (let i = 0; i < tests.length; i++) {
            const element = tests[i];
            DragAndDrop.makeItDraggable({
                target: element,
                // target_to_grab: element,
                group_id: group_id,
                img_src: `Images\\Icone2024\\ui_2024\\box.svg`,
                onDrop: async (obj) => {
                    list_box.addItem(`${i + 1}: onDrop`, { backgroundColor: "#8a6363c0" });
                },
                doClick: (event) => {
                    //owner.openSettings(event);
                    list_box.addItem(`${i + 1}: doClick`, { color: "green" });
                },
                onDropSameContainer: (event) => {
                    //owner.openSettings(event);
                    list_box.addItem(`${i + 1}: onDropSameContainer`, { backgroundColor: "green" });
                },
                onDragStart: (arg_target) => {
                    //App.drag_motors_in_progress = arg_target.offsetParent.parentElement;
                    list_box.addItem(`${i + 1}: onDragStart`, { color: "#888" });
                },
                onDragEnd: (target) => {
                    //App.drag_motors_in_progress = false;
                    list_box.addItem(`${i + 1}: onDragEnd`, { color: "#888", backgroundColor: "#444343e3" });
                },
                img_offset: { x: 18, y: 25 },
                img_style: 1,
                //scroll_while_drag: { target: owner.container_singolo_motorino.parentElement }
            });
        }
    }
    async initializeWindowControls() {
        const owner = this;

        App.app_status = await new Promise((resolve) => {
            Lobby.post({ prompt: 3/*app status*/ }, (rsp) => {
                resolve(rsp.ps);
            });
        });
        return;
        const btns = document.getElementsByClassName("window-controls")[0].children;
        btns[0].addEventListener('click', () => {
            Lobby.post({ prompt: -3 });
        });
        const img_full_screen = await Icons.getImgElement("fullscreen.svg");
        const img_close_full_view = await Icons.getImgElement("close_full_view.svg");
        if (!App.app_status.bottom_section_visible) {
            btns[1].firstElementChild.innerText = '';
            btns[1].firstElementChild.appendChild(img_full_screen);
        }
        btns[1].addEventListener('click', () => {
            if (App.app_status.bottom_section_visible) {
                const json = {
                    prompt: 2//, data: "exit from fullscreen"
                }
                Lobby.post(json, (rsp) => {
                    App.app_status.bottom_section_visible = false;
                    btns[1].firstElementChild.innerText = '';
                    btns[1].firstElementChild.appendChild(img_full_screen);
                });
            } else {
                const json = {
                    prompt: 1//, data: "go fullscreen"
                }
                Lobby.post(json, (rsp) => {
                    App.app_status.bottom_section_visible = true;
                    btns[1].firstElementChild.innerText = '';
                    btns[1].firstElementChild.appendChild(img_close_full_view);
                });
            }
        });
    }
}