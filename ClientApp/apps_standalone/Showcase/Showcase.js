console.assert(typeof MovableUtil === "function", "missing module `MovableUtil`");
class App {
    #dnd_counter = 0;
    #listbox_counter = 0;
    /** @type {Object<string, StickyBar>} one demo bar per anchor */
    #sticky_bars = {};
    /** @type {BottomNavBar|null} */
    #bottom_nav_bar = null;
    /** @type {DockWindow|null} */
    #dock_window = null;

    constructor() {
        this.demos = [
            { title: "Buttons", desc: "UiBuilder.createButton", build: (el) => this.demoButtons(el) },
            { title: "Toggles", desc: "UiBuilder.createToggle", build: (el) => this.demoToggles(el) },
            { title: "Dropdown", desc: "UiBuilder.createDropDownButtonSelector", build: (el) => this.demoDropdown(el) },
            { title: "Multi-select dropdown", desc: "UiBuilder.createDropDownMultipleSelections", build: (el) => this.demoMultiDropdown(el) },
            { title: "Accordion", desc: "UiBuilder.createAccordion", build: (el) => this.demoAccordion(el) },
            { title: "Icons", desc: "Icons.create", build: (el) => this.demoIcons(el) },
            { title: "Notify", desc: "new Notify(...)", build: (el) => this.demoNotify(el) },
            { title: "Bottom Sheet", desc: "new BottomSheet(...)", build: (el) => this.demoBottomSheet(el) },
            { title: "Chart", desc: "new GeneralChart(...)", build: (el) => this.demoChart(el) },
            { title: "Table", desc: "new Table2(...)", build: (el) => this.demoTable(el) },
            { title: "List Box", desc: "new ListBox(...)", build: (el) => this.demoListBox(el) },
            { title: "Speed Dial", desc: "new SpeedDial(...)", build: (el) => this.demoSpeedDial(el) },
            { title: "Speed Actions", desc: "new SpeedActions(...)", build: (el) => this.demoSpeedActions(el) },
            { title: "Tooltip", desc: "UiBuilder.addHint", build: (el) => this.demoTooltip(el) },
            { title: "Mouse Pop-Up", desc: "new MousePopUp(...)", build: (el) => this.demoMousePopUp(el) },
            { title: "Date Picker", desc: "new DatePicker(...)", build: (el) => this.demoDatePicker(el) },
            { title: "On-screen Keyboard", desc: "new KeyBoard(...)", build: (el) => this.demoKeyBoard(el) },
            { title: "Wizard Stepper", desc: "new WizardStepper(...)", build: (el) => this.demoWizard(el) },
            { title: "Theme Selector", desc: "new ThemeSelector(...)", build: (el) => this.demoThemeSelector(el) },
            { title: "Insight", desc: "Insight.getInstance().show(...)", build: (el) => this.demoInsight(el) },
            { title: "Empty State", desc: "new EmptyState(...)", build: (el) => this.demoEmptyState(el) },
            { title: "Breadcrumbs", desc: "new BreadCrumbs(...)", build: (el) => this.demoBreadCrumbs(el) },
            { title: "Drag & Drop", desc: "DragAndDrop.makeItDraggable", build: (el) => this.demoDragAndDrop(el) },
            { title: "Skeleton Loader", desc: "new SkeletonLoader(...)", build: (el) => this.demoSkeleton(el) },
            { title: "Mega Menu", desc: "new MegaMenu(...)", build: (el) => this.demoMegaMenu(el) },
            { title: "Sticky Bar", desc: "new StickyBar(...)", build: (el) => this.demoStickyBar(el) },
            { title: "Bottom Nav Bar", desc: "new BottomNavBar(...)", build: (el) => this.demoBottomNavBar(el) },
            { title: "Side Bar", desc: "new SideBarLeft(...)", build: (el) => this.demoSideBarLeft(el) },
            { title: "Dock Window", desc: "new DockWindow(...)", build: (el) => this.demoDockWindow(el) },
            { title: "Export Data", desc: "new ExportDataButton(...)", build: (el) => this.demoExportData(el) },
            //{ title: "Work-time progress", desc: "new DCSVAC(...)", build: (el) => this.demoDCSVAC(el) },
            { title: "Tabs", desc: "UiBuilder.createTabs", build: (el) => this.demoTabs(el) },
            { title: "Badges", desc: "UiBuilder.createBadge", build: (el) => this.demoBadges(el) },
            { title: "Inputs", desc: "UiBuilder.createInput / createSearchInput", build: (el) => this.demoInputs(el) },
            { title: "Dialogs", desc: "UiBuilder.createSimpleTextInput / mockDialog / ask", build: (el) => this.demoDialogs(el) },
            { title: "Searchable Accordion", desc: "UiBuilder.createSearchableAccordion", build: (el) => this.demoSearchableAccordion(el) },
            { title: "Floating Container", desc: "UiBuilder.createFloatingContainer", build: (el) => this.demoFloatingContainer(el) },
            { title: "Drop-down at cursor", desc: "UiBuilder.showDropDown", build: (el) => this.demoShowDropDown(el) },
            { title: "Toast", desc: "UiBuilder.Notify", build: (el) => this.demoToast(el) },
            { title: "Loader", desc: "UiBuilder.createLoader", build: (el) => this.demoLoader(el) },
            { title: "JSON Preview", desc: "UiBuilder.previewJSON", build: (el) => this.demoPreviewJSON(el) },
            { title: "Settings", desc: "UiBuilder.createSettingsGroup / createSettingsRow / createDivisorio", build: (el) => this.demoSettings(el) },
            //{ title: "Canvas Chart", desc: "UiBuilder.createChart", build: (el) => this.demoCanvasChart(el) },
            { title: "Async View", desc: "UiBuilder.renderAsyncView", build: (el) => this.demoAsyncView(el) },
            { title: "Split View", desc: "UiBuilder.createSplitView", build: (el) => this.demoSplitView(el) },
        ];

        this.demos.forEach((demo, i) => this.mount(i + 1, demo));
        this.#mountTabs();

        AppStatus.displayVersion();
        UiBuilder.createScrollToTop();
        document.body.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.key == "r") {
                e.stopPropagation();
                e.preventDefault();
                Lobby.post("AppRouter/Navigate", { where: "Showcase" }, (rsp) => {
                    resolve();
                    //owner.elements.button_login.classList.toggle("clicked", false);
                });
            }
        })
    }

    mount(index, demo) {
        // cells are generated in grid order (4 columns, see .parent in Showcase.css); the id keeps a single cell targetable, e.g. to span it
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.id = `cell-${index}`;
        document.querySelector(".showcase-root .parent").appendChild(cell);

        const header = document.createElement("div");
        header.className = "cell-header";
        const title = document.createElement("div");
        title.className = "cell-title";
        title.textContent = demo.title;
        const desc = document.createElement("div");
        desc.className = "cell-desc";
        desc.textContent = demo.desc;
        header.appendChild(title);
        header.appendChild(desc);

        const body = document.createElement("div");
        body.className = "cell-body";

        cell.appendChild(header);
        cell.appendChild(body);

        try {
            demo.build(body);
        } catch (e) {
            console.error(`Showcase demo "${demo.title}" failed`, e);
            body.textContent = `demo error: ${e.message}`;
        }
    }

    demoButtons(el) {
        const row = document.createElement("div");
        row.className = "demo-row";
        el.appendChild(row);
        row.appendChild(UiBuilder.createButton({
            title: "default",
            onClick: () => new Notify({ text: "default button clicked", type: "ok", ms_timeout: 1200 }),
        }));
        row.appendChild(UiBuilder.createButton({ title: "shiny", theme: "shiny", onClick: () => new Notify({ text: "shiny button clicked", type: "ok", ms_timeout: 1200 }) }));
        row.appendChild(UiBuilder.createButton({ title: "text", theme: "text", onClick: () => new Notify({ text: "text button clicked", type: "ok", ms_timeout: 1200 }) }));
        row.appendChild(UiBuilder.createButton({ title: "ez", theme: "ez", onClick: () => new Notify({ text: "ez button clicked", type: "ok", ms_timeout: 1200 }) }));
        row.appendChild(UiBuilder.createButton({ icon_code: "e5ca", hint: "icon only", anchor: "top", onClick: () => new Notify({ text: "icon button clicked", type: "ok", ms_timeout: 1200 }) }));
        row.appendChild(UiBuilder.createButton({ icon_code: "e6aa", title: "icon + title", onClick: () => new Notify({ text: "icon+title button clicked", type: "ok", ms_timeout: 1200 }) }));
        row.appendChild(UiBuilder.createButton({
            title: "auto-disable",
            auto_disable_on_click: true,
            onClick: () => new Notify({ text: "auto-disabled for 1s", type: "warning", ms_timeout: 1200 }),
            icon_code: 'f0e4',
        }));
        row.appendChild(UiBuilder.createButton({
            title: "left/right click",
            onClick: () => new Notify({ text: "left click", type: "ok", ms_timeout: 1200 }),
            onRightClick: () => new Notify({ text: "right click", type: "info", ms_timeout: 1200 }),
            icon_code: 'e323',
        }));
        row.appendChild(UiBuilder.createAsyncButton({
            title: "async",
            onClick: async () => {
                await new Promise((resolve) => setTimeout(resolve, 1200));
                new Notify({ text: "async work finished", type: "ok", ms_timeout: 1200 });
            },
            icon_code: "ebff"
        }));
    }

    demoToggles(el) {
        const row = document.createElement("div");
        row.className = "demo-row";
        el.appendChild(row);
        // createToggle only fires onClick - it never flips its own visual state, the
        // caller is expected to call the setIsOn passed back as the second onClick argument.
        row.appendChild(UiBuilder.createToggle({ innerText: { on: "on", off: "off" }, isOn: true, label: "mini", theme: "mini", onClick: (event, opts) => opts.setIsOn(opts.isOn = !opts.isOn) }));
        row.appendChild(UiBuilder.createToggle({ innerText: { on: "on", off: "off" }, isOn: false, label: "default", onClick: (event, opts) => opts.setIsOn(opts.isOn = !opts.isOn) }));
        row.appendChild(UiBuilder.createToggle({ innerText: { on: "on", off: "off" }, isOn: true, label: "xxl", theme: "xxl", onClick: (event, opts) => opts.setIsOn(opts.isOn = !opts.isOn) }));
    }

    demoDropdown(el) {
        el.appendChild(UiBuilder.createDropDownButtonSelector({
            titles: ["10 rows", "25 rows", "50 rows"],
            label: "rows per page",
            onSelectionChange: (index) => new Notify({ text: `selected index ${index}`, type: "ok", ms_timeout: 1200 }),
            style: "margin-top:auto;",
        }));
    }

    demoMultiDropdown(el) {
        el.appendChild(UiBuilder.createDropDownMultipleSelections({
            titles: ["Espresso", "Cappuccino", "Tea"],
            default_title: "select drinks",
            onSelectionStatusChange: () => new Notify({ text: "selections changed", type: "ok", ms_timeout: 1200 }),
            onConfirm: () => new Notify({ text: "selection confirmed", type: "ok", ms_timeout: 1200 }),
            style: "margin-top:auto;",
        }));
    }

    demoAccordion(el) {
        const c1 = document.createElement("div");
        c1.textContent = "content of section one";
        const c2 = document.createElement("div");
        c2.textContent = "content of section two";
        el.appendChild(UiBuilder.createAccordion({
            titles: ["Section 1", "Section 2"],
            content: [c1, c2],
            id: "showcase-accordion",
        }));
    }

    demoIcons(el) {
        const row = document.createElement("div");
        row.className = "demo-row icon-row";
        el.appendChild(row);
        ["e5ca", "e5cd", "e002", "e88e", "e6aa", "e313", "e5cc", "e5cb"].forEach((code) => {
            row.appendChild(Icons.create(code));
        });
    }

    demoNotify(el) {
        const row = document.createElement("div");
        row.className = "demo-row";
        el.appendChild(row);
        const mk = (type) => UiBuilder.createButton({
            title: type,
            onClick: (event) => new Notify({
                title: type,
                text: `type "${type}"`,
                type,
                event: { clientX: event.clientX, clientY: event.clientY },
                ms_timeout: 1800,
                style: 3,
            }),
        });
        row.appendChild(mk("ok"));
        row.appendChild(mk("warning"));
        row.appendChild(mk("error"));
        row.appendChild(mk("info"));
    }

    demoBottomSheet(el) {
        el.appendChild(UiBuilder.createButton({
            title: "open bottom sheet",
            onClick: () => {
                const content = document.createElement("div");
                content.className = "demo-sheet-content";
                content.textContent = "Any element can be embedded inside a BottomSheet.";
                new BottomSheet({ element: content, centered: true, onClose: () => { } });
            },
        }));
    }

    demoChart(el) {
        const row = document.createElement("div");
        row.className = "demo-row";
        el.appendChild(row);
        const holder = document.createElement("div");
        holder.className = "demo-chart-holder";
        el.appendChild(holder);

        let chart = null;
        const render = (type) => {
            chart?.destroy?.();
            holder.replaceChildren();
            chart = new GeneralChart({
                type,
                labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
                datasets: [{ label: "Orders", data: [12, 19, 8, 15, 22] }],
            });
            holder.appendChild(chart.elementReference());
        };
        ["bar", "line", "pie"].forEach((type) => row.appendChild(UiBuilder.createButton({ title: type, onClick: () => render(type) })));
        render("bar");
    }

    demoTable(el) {
        const table2 = new Table2({
            "Product": ["Espresso", "Cappuccino", "Tea"],
            "Qty": [42, 17, 8],
            "Revenue €": [126.0, 68.0, 16.0],
        }, { title: "Sales" });
        el.appendChild(table2.elementReference());
    }

    demoListBox(el) {
        const lb = new ListBox({ title: "Event log", Size: { width: "99%", height: "140px" } });
        lb.addItem("ListBox ready");
        el.appendChild(UiBuilder.createButton({
            title: "add item",
            onClick: () => lb.addItem(`event #${++this.#listbox_counter}`),
        }));
        el.appendChild(lb.elementReference());
    }

    demoSpeedDial(el) {
        const row = document.createElement("div");
        row.className = "demo-row";
        el.appendChild(row);

        const makeSpeedDial = (anchor) => {
            const target = UiBuilder.createButton({ title: anchor, onClick: () => { } });
            row.appendChild(target);
            new SpeedDial({
                target,
                anchor,
                selections: [
                    { onClick: () => new Notify({ text: `${anchor}: action A`, type: "ok", ms_timeout: 1000 }), hint: "action A", icon_code: "e5ca" },
                    { onClick: () => new Notify({ text: `${anchor}: action B`, type: "ok", ms_timeout: 1000 }), hint: "action B", icon_code: "e5cd" },
                    { onClick: () => new Notify({ text: `${anchor}: action C`, type: "ok", ms_timeout: 1000 }), text: "C" },
                ],
            });
        };

        ["top", "bot", "left", "left-middle", "right", "right-middle", "around"].forEach(makeSpeedDial);
    }

    demoSpeedActions(el) {
        const target = UiBuilder.createButton({ title: "hover me", onClick: () => { } });
        el.appendChild(target);
        new SpeedActions({
            target,
            label: "Actions",
            side: "right",
            createButtons: [
                { title: "Edit", onClick: () => new Notify({ text: "edit clicked", type: "ok", ms_timeout: 1000 }) },
                { title: "Delete", onClick: () => new Notify({ text: "delete clicked", type: "error", ms_timeout: 1000 }) },
            ],
        });
    }

    demoTooltip(el) {
        const target = document.createElement("div");
        target.className = "demo-hover-target";
        target.textContent = "hover me";
        el.appendChild(target);
        UiBuilder.addHint({ hint: "This tooltip is powered by window.custom_tooltip", target, anchor: "top" });
    }

    demoMousePopUp(el) {
        const row = document.createElement("div");
        row.className = "demo-row";
        el.appendChild(row);

        row.appendChild(UiBuilder.createButton({
            title: "plain",
            onClick: (event) => new MousePopUp({
                title: "Plain menu",
                style: "plain",
                action_titles: ["Edit", "Duplicate", "Delete"],
                next: [
                    () => new Notify({ text: "edit", type: "ok", ms_timeout: 1000 }),
                    () => new Notify({ text: "duplicate", type: "ok", ms_timeout: 1000 }),
                    () => new Notify({ text: "delete", type: "error", ms_timeout: 1000 }),
                ],
                event: { clientX: event.clientX, clientY: event.clientY },
            }),
        }));

        row.appendChild(UiBuilder.createButton({
            title: "alert",
            onClick: (event) => new MousePopUp({
                title: "Confirm action",
                style: "alert",
                action_titles: ["Yes", "No"],
                next: [
                    () => new Notify({ text: "confirmed", type: "ok", ms_timeout: 1000 }),
                    () => new Notify({ text: "cancelled", type: "error", ms_timeout: 1000 }),
                ],
                event: { clientX: event.clientX, clientY: event.clientY },
            }),
        }));

        row.appendChild(UiBuilder.createButton({
            title: "info",
            onClick: (event) => new MousePopUp({
                title: "Just an info message",
                style: "info",
                iAmAwareThereAreNoSelections: true,
                action_titles: [],
                next: [],
                event: { clientX: event.clientX, clientY: event.clientY },
            }),
        }));

        const toggle_states = [true, false, true];
        row.appendChild(UiBuilder.createButton({
            title: "multi-select (toggles)",
            onClick: (event) => new MousePopUp({
                title: "Toggle features",
                style: "multi-select",
                reusable: true,
                action_titles: ["Notifications", "Dark mode", "Auto-sync"],
                toggles: { statuses: toggle_states },
                next: toggle_states.map((_, i) => () => (toggle_states[i] = !toggle_states[i])),
                event: { clientX: event.clientX, clientY: event.clientY },
            }),
        }));

        row.appendChild(UiBuilder.createButton({
            title: "ez",
            onClick: (event) => new MousePopUp({
                title: "Quick actions",
                style: "ez",
                action_titles: ["Copy", "Paste"],
                next: [
                    () => new Notify({ text: "copied", type: "ok", ms_timeout: 1000 }),
                    () => new Notify({ text: "pasted", type: "ok", ms_timeout: 1000 }),
                ],
                event: { clientX: event.clientX, clientY: event.clientY },
            }),
        }));

        row.appendChild(UiBuilder.createButton({
            title: "horizontal",
            onClick: (event) => new MousePopUp({
                title: "Pick one",
                style: "alert",
                horizontal_buttons: true,
                action_titles: ["A", "B", "C"],
                next: [
                    () => new Notify({ text: "picked A", type: "ok", ms_timeout: 1000 }),
                    () => new Notify({ text: "picked B", type: "ok", ms_timeout: 1000 }),
                    () => new Notify({ text: "picked C", type: "ok", ms_timeout: 1000 }),
                ],
                event: { clientX: event.clientX, clientY: event.clientY },
            }),
        }));
    }

    demoDatePicker(el) {
        const row = document.createElement("div");
        row.className = "demo-row";
        row.style.alignItems = "flex-start";
        el.appendChild(row);

        const mk = (label, hint, options) => {
            const wrap = document.createElement("div");
            wrap.style.cssText = "display:flex;flex-direction:column;gap:4px;align-items:center;";
            const caption = document.createElement("div");
            caption.className = "demo-status";
            caption.textContent = label;
            UiBuilder.addHint({ hint, target: caption, anchor: "top" });
            wrap.appendChild(caption);
            wrap.appendChild(new DatePicker(options).elementReference());
            row.appendChild(wrap);
        };

        mk("default", "floating:true (default) - elementReference() returns a read-only trigger input; click it to open the full picker in a centered BottomSheet.", {});
        mk("custom placeholder", "options.placeholder sets the trigger input's placeholder text; only used while floating.", { placeholder: "pick a date..." });
        mk("ignore_seconds", "Despite the name, removes the entire hour/minute/second row - not just seconds - including the \"fine giornata\"/\"inizio giornata\"/\"ora attuale\" shortcuts.", { ignore_seconds: true });
        mk("offset_years: 0", "offset_years sets how many years ahead of today the year-picker starts before counting down 100 years; the default instead lands on the nearest multiple of 10.", { offset_years: 0 });

        // const inline_caption = document.createElement("div");
        // inline_caption.className = "demo-status";
        // inline_caption.textContent = "inline (floating: false)";
        // UiBuilder.addHint({ hint: "floating:false renders the full calendar and time picker inline instead of behind a trigger input.", target: inline_caption, anchor: "top" });
        // el.appendChild(inline_caption);
        // el.appendChild(new DatePicker({ floating: false, ignore_seconds: true, width: "260px", height: "230px" }).elementReference());
    }

    demoKeyBoard(el) {
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "bound input";
        input.className = "demo-input";
        el.appendChild(input);
        el.appendChild(UiBuilder.createButton({
            title: "open keyboard",
            onClick: () => new KeyBoard({ input_target: input, label: "Showcase" }),
        }));
    }

    #wizardStepContent(text, getOnNext, getOnBack) {
        const wrap = document.createElement("div");
        wrap.className = "demo-wizard-step";
        const p = document.createElement("div");
        p.style = "white-space:pre;";
        p.textContent = text;
        wrap.appendChild(p);
        if (getOnBack && getOnNext) {
            const btn_row = document.createElement("div");
            btn_row.style.cssText = "display: flex; justify-content: space-evenly; width: 100%;";
            btn_row.appendChild(UiBuilder.createButton({ title: "previous", onClick: () => getOnBack()?.() }));
            btn_row.appendChild(UiBuilder.createButton({ title: "next", onClick: () => getOnNext()?.() }));
            wrap.appendChild(btn_row);
        } else if (getOnBack) {
            wrap.appendChild(UiBuilder.createButton({ title: "previous", onClick: () => getOnBack()?.() }));
        } else if (getOnNext) {
            wrap.appendChild(UiBuilder.createButton({ title: "next", onClick: () => getOnNext()?.() }));
        }
        return wrap;
    }

    demoWizard(el) {
        /** @type {WizardStep} */
        const step1 = { title: "Start" };
        /** @type {WizardStep} */
        const step2 = { title: "Details", freeRoam: true };
        /** @type {WizardStep} */
        const step3 = { title: "Finish", freeUndo: true };
        step1.content = this.#wizardStepContent("Step one content", () => step1.onComplete);
        step2.content = this.#wizardStepContent("Step two content", () => step2.onComplete, () => step2.onUndo);
        step3.content = this.#wizardStepContent("All done!\nYou can go back clicking on previous step-title", null);
        const wizard = new WizardStepper({
            steps: [step1, step2, step3],
            onFinish: () => new Notify({ text: "wizard finished", type: "ok", ms_timeout: 1200 }),
        });
        el.appendChild(wizard.elementReference());
    }

    demoThemeSelector(el) {
        const ts = new ThemeSelector({ floating: false, label: "Theme" });
        el.appendChild(ts.elementReference());
    }

    demoInsight(el) {
        const target = UiBuilder.createButton({ title: "target", onClick: () => { } });
        el.appendChild(target);
        el.appendChild(UiBuilder.createButton({
            title: "show insight",
            onClick: () => Insight.getInstance().show({ target, text: "This is a coach-mark pointing at the target button.", anchor: "top" }),
        }));
    }

    demoEmptyState(el) {
        const es = new EmptyState({
            icon_code: "e002",
            title: "No orders yet",
            text: "Orders will show up here once created.",
            action_text: "retry",
            onAction: () => new Notify({ text: "retry clicked", type: "ok", ms_timeout: 1000 }),
        });
        el.appendChild(es.elementReference());
    }

    demoBreadCrumbs(el) {
        const status = document.createElement("div");
        status.className = "demo-status";
        status.textContent = "click a crumb";
        const bc = new BreadCrumbs({
            items: [
                { text: "Home", icon_code: "e6aa", onClick: () => status.textContent = "Home clicked" },
                { text: "Settings", onClick: () => status.textContent = "Settings clicked" },
                { text: "Profile" },
            ],
        });
        el.appendChild(bc.elementReference());
        el.appendChild(status);
    }

    demoDragAndDrop(el) {
        window.configurations = window.configurations || {};
        window.configurations.debug_dand = false;

        const group_id = "showcase-dnd";
        const row = document.createElement("div");
        row.className = "demo-dnd-row";
        el.appendChild(row);

        const list_box = new ListBox({ title: "Drag & Drop events", Size: { width: "99%", height: "188px", fontSize: '12px', maxItemHeight: "6px", minItemHeight: "6px" } });
        el.appendChild(list_box.elementReference());

        const ts = () => {
            const d = new Date(Date.now());
            const pad = (n, len) => `${n}`.padStart(len, "0");
            return `${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}.${pad(d.getMilliseconds(), 3)}`;
        };

        ["A", "B", "C"].forEach((label) => {
            const chip = document.createElement("div");
            chip.className = "demo-dnd-chip";
            chip.textContent = label;
            chip.id = `el_${label}`
            row.appendChild(chip);
            DragAndDrop.makeItDraggable({
                target: chip,
                group_id,
                onDragStart: () => list_box.addItem(`${ts()} ${label}: onDragStart`, { color: "var(--vscode-descriptionForeground)" }),
                onDragEnd: () => list_box.addItem(`${ts()} ${label}: onDragEnd`, { color: "var(--vscode-descriptionForeground)", backgroundColor: "var(--vscode-toolbar-activeBackground)" }),
                onDrop: (obj) => list_box.addItem(`${ts()} ${label}: onDrop ${obj.start_id} -> ${obj.end_id}`, { backgroundColor: "color-mix(in srgb, var(--vscode-charts-green) 50%, transparent)" }),
                onDropSameContainer: () => list_box.addItem(`${ts()} ${label}: onDropSameContainer`, { backgroundColor: "color-mix(in srgb, var(--vscode-charts-yellow) 75%, transparent)" }),
                onDoubleClick: () => list_box.addItem(`${ts()} ${label}: onDoubleClick`, { color: "var(--vscode-charts-blue)" }),
                doClick: () => list_box.addItem(`${ts()} ${label}: doClick`, { color: "var(--vscode-textLink-foreground)" }),
                // onMouseEnter: () => list_box.addItem(`${ts()} ${label}: onMouseEnter`),
                // onMouseLeave: () => list_box.addItem(`${ts()} ${label}: onMouseLeave`),
            });
        });
    }

    demoSkeleton(el) {
        const holder = document.createElement("div");
        let skeleton = new SkeletonLoader({ variant: "table", rows: 3, columns: 3, width: '200px' });
        holder.appendChild(skeleton.elementReference());
        el.appendChild(UiBuilder.createButton({
            title: "toggle loading",
            onClick: () => {
                if (skeleton) {
                    skeleton.destroy();
                    skeleton = null;
                    const content = document.createElement("div");
                    content.className = "demo-status";
                    content.textContent = "content loaded!";
                    holder.appendChild(content);
                } else {
                    holder.replaceChildren();
                    skeleton = new SkeletonLoader({ variant: "table", rows: 3, columns: 3 });
                    holder.appendChild(skeleton.elementReference());
                }
            },
        }));
        el.appendChild(holder);
    }

    /**
     * opens `component` (anything with elementReference/destroy) in a centered BottomSheet,
     * destroying it when the sheet closes - the mounting the full-page components document for themselves
     * @returns {BottomSheet}
     */
    #openInSheet(component) {
        return new BottomSheet({ element: component.elementReference(), centered: true, onClose: () => component.destroy() });
    }

    demoMegaMenu(el) {
        const status = document.createElement("div");
        status.className = "demo-status";
        status.textContent = "hover an entry with a panel";
        const pick = (label) => () => status.textContent = `${label} clicked`;
        const menu = new MegaMenu({
            orientation: "horizontal",
            items: [
                { label: "Home", icon: "e88a", onClick: pick("Home") },
                {
                    label: "Products", icon: "f86e",
                    items: [
                        [{ label: "Drinks", items: [{ label: "Espresso", onClick: pick("Espresso") }, { label: "Tea", onClick: pick("Tea") }] }],
                        [{ label: "Food", items: [{ label: "Croissant", onClick: pick("Croissant") }, { label: "Sandwich", disabled: true }] }],
                    ],
                },
                {
                    label: "Help", icon: "e887",
                    items: [[{ items: [{ label: "Docs", icon: "e88e", onClick: pick("Docs") }, { label: "Settings", icon: "e8b8", onClick: pick("Settings") }] }]],
                },
            ],
            style: "width: 99%;outline: 1px solid #00800040;"
        });
        el.appendChild(menu.elementReference());
        el.appendChild(status);
    }

    demoStickyBar(el) {
        const row = document.createElement("div");
        row.className = "demo-row";
        el.appendChild(row);
        const status = document.createElement("div");
        status.className = "demo-status";
        status.textContent = "toggle a bar stuck to that side of the window";
        el.appendChild(status);
        ["top", "left", "right", "bottom"].forEach((anchor) => {
            const toggle = UiBuilder.createButton({
                title: anchor,
                onClick: () => {
                    if (this.#sticky_bars[anchor] != undefined) {
                        this.#sticky_bars[anchor].destroy();
                        delete this.#sticky_bars[anchor];
                        status.textContent = `${anchor} bar removed`;
                        return;
                    }
                    try {
                        this.#sticky_bars[anchor] = new StickyBar({
                            id: `showcase-sticky-${anchor}`,
                            anchor,
                            buttons: [
                                { title: "save", icon_code: "e161", onClick: () => new Notify({ text: `${anchor}: save`, type: "ok", ms_timeout: 1000 }) },
                                { title: "refresh", icon_code: "e5d5", onClick: () => new Notify({ text: `${anchor}: refresh`, type: "ok", ms_timeout: 1000 }) },
                            ],
                        });
                        status.textContent = `${anchor} bar added - its handle cycles full / concise / collapsed`;
                    } catch (error) {// no free spot left along that side
                        new Notify({ text: error.message, type: "error", ms_timeout: 1800 });
                    }
                },
            });
            row.appendChild(toggle);
        });
    }

    demoBottomNavBar(el) {
        const status = document.createElement("div");
        status.className = "demo-status";
        status.textContent = "the bar sticks to the bottom of the window";
        el.appendChild(UiBuilder.createButton({
            title: "show / hide",
            onClick: () => {
                if (this.#bottom_nav_bar != null) {
                    this.#bottom_nav_bar.destroy();
                    this.#bottom_nav_bar = null;
                    status.textContent = "bar removed";
                    return;
                }
                this.#bottom_nav_bar = new BottomNavBar({
                    selections: [
                        { icon_code: "ef3e", title: "analytics", onSelect: () => status.textContent = "analytics selected" },
                        { icon_code: "f86e", title: "inventory", onSelect: () => status.textContent = "inventory selected" },
                        { icon_code: "e88a", title: "home", onSelect: () => status.textContent = "home selected" },
                    ],
                });
                document.body.appendChild(this.#bottom_nav_bar.elementReference());
                status.textContent = "pick a section";
            },
        }));
        el.appendChild(status);
    }

    demoSideBarLeft(el) {
        el.appendChild(UiBuilder.createButton({
            title: "open side bar",
            onClick: () => {
                const content = document.createElement("div");
                content.className = "demo-sheet-content";
                content.textContent = "SideBarLeft hosts any element; with overlay:true a click outside closes it.";
                const sidebar = new SideBarLeft({
                    overlay: true,
                    elements: [
                        content,
                        UiBuilder.createButton({ title: "close", onClick: () => sidebar.destroy() }),
                    ],
                });
            },
        }));
    }

    demoDockWindow(el) {
        el.appendChild(UiBuilder.createButton({
            title: "open dock window",
            onClick: () => {
                if (this.#dock_window != null) {
                    return;
                }
                const content = document.createElement("div");
                content.className = "demo-sheet-content";
                content.textContent = "Docked to the bottom-right corner; ✕ closes it.";
                this.#dock_window = new DockWindow({ content, onClose: () => this.#dock_window = null });
                document.body.appendChild(this.#dock_window.elementReference());
            },
        }));
    }

    demoExportData(el) {
        const rows = [
            { Product: "Espresso", Qty: 42, "Revenue €": 126 },
            { Product: "Cappuccino", Qty: 17, "Revenue €": 68 },
            { Product: "Tea", Qty: 8, "Revenue €": 16 },
        ];
        const sample = document.createElement("table");
        sample.className = "demo-mini-table";
        sample.innerHTML = `<tr>${Object.keys(rows[0]).map((k) => `<th>${k}</th>`).join("")}</tr>`
            + rows.map((r) => `<tr>${Object.values(r).map((v) => `<td>${v}</td>`).join("")}</tr>`).join("");
        el.appendChild(sample);
        const export_button = new ExportDataButton({
            label: "sales",
            getWhatToPrint: () => sample,
            getWhatToPDF: () => ({ element: sample, filename: "showcase_sales.pdf" }),
            getWhatToExcel: () => ({ rows, sheetName: "Sales", filename: "showcase_sales.xlsx" }),
        });
        el.appendChild(export_button.elementReference());
    }

    //#region page tabs - the full-page components get a whole tab each, the grid of demos is the first one
    /**
     * wraps `.showcase-root` and one pane per full-page component into `UiBuilder.createTabs`;
     * each component is created the first time its tab is shown, then kept (createTabs only
     * swaps which pane is attached, so the work in progress survives switching tabs)
     */
    #mountTabs() {
        const titles = ["Showcase", "Image Editor", "PDF Editor", "Data Cruncher"];
        const builders = [
            null,// the grid, already built
            (pane) => this.#mountImageEditor(pane, App.#sampleImage()),
            (pane) => pane.appendChild(new PDFEditor({}).elementReference()),
            (pane) => pane.appendChild(new DataCruncher({}).elementReference()),
        ];
        const panes = [document.querySelector(".showcase-root")];
        for (let i = 1; i < titles.length; i++) {
            const pane = document.createElement("div");
            pane.className = "showcase-editor-pane";
            panes.push(pane);
        }
        const built = new Set([0]);
        const show = (index) => {
            // Showcase.css hides PDFEditor's window-level StickyBars on the other tabs
            document.body.dataset.showcaseTab = `${index}`;
            if (!built.has(index)) {
                built.add(index);
                builders[index](panes[index]);
            }
        };
        const tabs = UiBuilder.createTabs({ titles, content: panes, id_sync: "showcase-page", onViewChange: show });
        tabs.classList.add("showcase-tabs");
        document.body.appendChild(tabs);
        show(tabs.identify().index);// createTabs restores the last tab but doesn't call onViewChange for it
    }

    /**
     * ImageEditor destroys itself on confirm/cancel: show the result with the options to keep
     * editing it or start over, or start over right away on cancel
     */
    #mountImageEditor(pane, image_src) {
        pane.replaceChildren();
        const editor = new ImageEditor({
            image_src,
            onConfirm: (edited_data_url) => {
                const result = document.createElement("div");
                result.className = "demo-image-result";
                const img = document.createElement("img");
                img.className = "demo-thumb";
                img.src = edited_data_url;
                const row = document.createElement("div");
                row.className = "demo-row";
                row.appendChild(UiBuilder.createButton({ title: "edit this result", onClick: () => this.#mountImageEditor(pane, edited_data_url) }));
                row.appendChild(UiBuilder.createButton({ title: "start over", onClick: () => this.#mountImageEditor(pane, App.#sampleImage()) }));
                result.appendChild(img);
                result.appendChild(row);
                pane.replaceChildren(result);
            },
            onCancel: () => this.#mountImageEditor(pane, App.#sampleImage()),
        });
        pane.appendChild(editor.elementReference());
    }

    /** @returns {string} data URL of a generated sample picture */
    static #sampleImage() {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");
        // theme-independent: sample photo handed to the editor as content
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, "#4e8cff");
        gradient.addColorStop(1, "#ff5e7e");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff";
        ctx.font = "48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("crop / rotate / draw me", canvas.width / 2, canvas.height / 2);
        return canvas.toDataURL("image/png");
    }
    //#endregion

    //#region UiBuilder demos
    demoTabs(el) {
        const page = (text) => {
            const div = document.createElement("div");
            div.className = "demo-status";
            div.textContent = text;
            return div;
        };
        el.appendChild(UiBuilder.createTabs({
            titles: ["One", "Two", "Three"],
            content: [page("first tab"), page("second tab"), page("third tab - the selection is remembered via id_sync")],
            id_sync: "showcase-demo-tabs",
            style: "min-width:99%;",
        }));
    }

    demoBadges(el) {
        const row = document.createElement("div");
        row.className = "demo-row";
        el.appendChild(row);
        ["neutral", "info", "success", "warning", "danger"].forEach((color) => {
            row.appendChild(UiBuilder.createBadge(color, { color, hint: `color: "${color}"`, anchor: "top" }));
        });
    }

    demoInputs(el) {
        const status = document.createElement("div");
        status.className = "demo-status";
        status.textContent = "type in any field";
        el.appendChild(UiBuilder.createInput({ placeholder: "createInput (text)", class: "demo-input", oninput: (event) => status.textContent = `text: ${event.target.value}` }));
        el.appendChild(UiBuilder.createInput({ type: "number", value: 5, min: 0, max: 10, step: 1, oninput: (event) => status.textContent = `number: ${event.target.value}` }));
        el.appendChild(UiBuilder.createSearchInput({ placeholder: "createSearchInput (debounced)", onSearch: (query) => status.textContent = `search: "${query}"` }));
        el.appendChild(status);
    }

    demoDialogs(el) {
        const row = document.createElement("div");
        row.className = "demo-row";
        el.appendChild(row);
        const status = document.createElement("div");
        status.className = "demo-status";
        status.textContent = "the answer shows up here";
        el.appendChild(status);
        row.appendChild(UiBuilder.createButton({
            title: "ask text",
            onClick: () => UiBuilder.askTextInput({
                title: "What's your name?",
                description: "UiBuilder.askTextInput - Enter confirms, closing the sheet cancels",
                placeholder: "type and press Enter",
                onConfirm: (value) => status.textContent = `ask text: "${value}"`,
                onCancel: () => status.textContent = "ask text: cancelled",
            }),
        }));
        row.appendChild(UiBuilder.createButton({
            title: "ask number",
            onClick: () => UiBuilder.askNumberInput({
                title: "How many copies?",
                description: "UiBuilder.askNumberInput - between 1 and 10",
                value: 1,
                min: 1,
                max: 10,
                onConfirm: (value) => status.textContent = `ask number: ${value}`,
                onCancel: () => status.textContent = "ask number: cancelled",
            }),
        }));
        row.appendChild(UiBuilder.createButton({
            title: "confirm",
            onClick: () => UiBuilder.mockDialog({
                text1: "Delete the draft?",
                onConfirm: () => status.textContent = "confirm: yes",
                onDeny: () => status.textContent = "confirm: no",
                prefer_selection: 0,
            }),
        }));
        row.appendChild(UiBuilder.createButton({
            title: "ask at cursor",
            onClick: (event) => UiBuilder.ask({
                title: "Proceed?",
                description: "a small confirm popup opened where you clicked",
                event,
                onConfirm: () => status.textContent = "ask: confirmed",
                onCancel: () => status.textContent = "ask: cancelled",
            }),
        }));
    }

    demoSearchableAccordion(el) {
        const body = (text) => {
            const div = document.createElement("div");
            div.textContent = text;
            return div;
        };
        el.appendChild(UiBuilder.createSearchableAccordion({
            titles: ["Espresso", "Cappuccino", "Green tea"],
            searchable_target_data: ["coffee short strong", "coffee milk foam", "tea leaves"],
            hints: ["the search also matches each section's keywords, try \"milk\""],
            content: [body("short and strong"), body("espresso with milk foam"), body("brewed leaves")],
        }));
    }

    demoFloatingContainer(el) {
        el.appendChild(UiBuilder.createButton({
            title: "open floating container",
            onClick: () => {
                const content = document.createElement("div");
                content.className = "demo-sheet-content";
                content.textContent = "Drag it by the knob, minimize it, close it with ✕ or Escape. Its position is remembered.";
                UiBuilder.createFloatingContainer(content, { id: "showcase-floating", start_location: { left: "120px", top: "120px" } });
            },
        }));
    }

    demoShowDropDown(el) {
        const status = document.createElement("div");
        status.className = "demo-status";
        status.textContent = "the menu opens where you click";
        el.appendChild(UiBuilder.createButton({
            title: "open menu",
            onClick: (event) => UiBuilder.showDropDown({
                event,
                title: ["Copy", "Paste", "Delete"],
                next: [
                    () => status.textContent = "Copy picked",
                    () => status.textContent = "Paste picked",
                    () => status.textContent = "Delete picked",
                ],
            }),
        }));
        el.appendChild(status);
    }

    demoToast(el) {
        const row = document.createElement("div");
        row.className = "demo-row";
        el.appendChild(row);
        row.appendChild(UiBuilder.createButton({ title: "near the cursor", onClick: (event) => UiBuilder.Notify("UiBuilder.Notify, anchored to the click", event) }));
        row.appendChild(UiBuilder.createButton({ title: "centered", onClick: () => UiBuilder.Notify("UiBuilder.Notify, centered (click it to close early)") }));
    }

    demoLoader(el) {
        const holder = document.createElement("div");
        let loader = null;
        const start = () => {
            loader = UiBuilder.createLoader({ steps: ["Connecting", "Downloading", "Parsing"], demo: true });
            holder.replaceChildren(loader);
        };
        start();
        el.appendChild(holder);
        el.appendChild(UiBuilder.createButton({
            title: "next step",
            onClick: () => loader.isActive === false ? start() : loader.next(),// past the last step it ends (and removes itself)
        }));
    }

    demoPreviewJSON(el) {
        el.appendChild(UiBuilder.previewJSON({
            order: 1042,
            customer: { name: "Mario Rossi", vip: true },
            items: [{ product: "Espresso", qty: 2 }, { product: "Tea", qty: 1 }],
            _internal: "keys starting with _ are skipped",
        }, {
            propStyles: { vip: "color: var(--vscode-charts-green)" },
            propHint: { order: { hint: "propHint adds a hint to a key", anchor: "top" } },
        }));
    }

    demoSettings(el) {
        const toggle = UiBuilder.createToggle({ innerText: { on: "on", off: "off" }, isOn: true, theme: "mini", onClick: (event, opts) => opts.setIsOn(opts.isOn = !opts.isOn) });
        el.appendChild(UiBuilder.createSettingsGroup({
            title: "Notifications",
            rows: [
                UiBuilder.createSettingsRow({ label: "Push notifications", description: "on this device", control: toggle }),
                UiBuilder.createSettingsRow({ label: "Quiet from (hour)", control: UiBuilder.createInput({ type: "number", value: 22, min: 0, max: 23 }) }),
            ],
        }));
        el.appendChild(UiBuilder.createDivisorio());
        el.appendChild(UiBuilder.createSettingsGroup({
            rows: [
                UiBuilder.createSettingsRow({
                    label: "Sign out",
                    control: UiBuilder.createButton({ title: "sign out", theme: "text", onClick: () => new Notify({ text: "signed out", type: "info", ms_timeout: 1000 }) }),
                }),
            ],
        }));
    }

    demoCanvasChart(el) {
        const axys_x = [];
        const volume = [];
        const linear = [];
        for (let i = 0; i < 14; i++) {
            axys_x.push(new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000));
            volume.push(10 + ((i * 7) % 9));
            linear.push((linear[i - 1] ?? 0) + volume[i]);
        }
        el.appendChild(UiBuilder.createChart({
            title: "Orders",
            title_volume: "daily",
            title_linear: "cumulative",
            type: "linear",
            width: 430,
            height: 200,
            data: { volume, linear, axys_x },
        }));
    }

    demoAsyncView(el) {
        const row = document.createElement("div");
        row.className = "demo-row";
        el.appendChild(row);
        const holder = document.createElement("div");
        holder.className = "demo-async-holder";
        el.appendChild(holder);
        const run = (outcome) => UiBuilder.renderAsyncView(holder, {
            promise_factory: () => new Promise((resolve, reject) => setTimeout(() => {
                if (outcome === "error") {
                    reject(new Error("server unreachable"));
                } else {
                    resolve(outcome === "empty" ? [] : ["Espresso", "Cappuccino", "Tea"]);
                }
            }, 1000)),
            render: (data) => {
                const div = document.createElement("div");
                div.className = "demo-status";
                div.textContent = `loaded: ${data.join(", ")}`;
                return div;
            },
            skeleton: { variant: "table", rows: 2, columns: 2 },
            empty: { icon_code: "e002", title: "Nothing here", text: "the promise resolved to an empty array" },
        });
        ["ok", "empty", "error"].forEach((outcome) => row.appendChild(UiBuilder.createButton({ title: outcome, onClick: () => run(outcome) })));
        run("ok");
    }

    demoSplitView(el) {
        const pane = (text) => {
            const div = document.createElement("div");
            div.className = "demo-status";
            div.textContent = text;
            return div;
        };
        const holder = document.createElement("div");
        holder.className = "demo-split-holder";
        holder.appendChild(UiBuilder.createSplitView({ theme: "thin", content1: pane("drag the splitter"), content2: pane("right pane") }));
        el.appendChild(holder);
    }
    //#endregion

    // demoDCSVAC(el) {
    //     el.appendChild(UiBuilder.createButton({
    //         title: "open",
    //         onClick: () => this.#openInSheet(new DCSVAC({})),
    //     }));
    //     const note = document.createElement("div");
    //     note.className = "demo-status";
    //     note.textContent = "how much of the working day/week has elapsed - asks when your day ends first";
    //     el.appendChild(note);
    // }
}
