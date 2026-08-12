console.assert(typeof MovableUtil === "function", "missing module `MovableUtil`");
class App {
    #dnd_counter = 0;
    #listbox_counter = 0;

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
        ];

        this.demos.forEach((demo, i) => this.mount(i + 1, demo));

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
        const cell = document.getElementById(`cell-${index}`);
        if (!cell) return;

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
        const lb = new ListBox({ title: "Event log", Size: { width: "100%", height: "140px" } });
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
                onDragStart: () => list_box.addItem(`${ts()} ${label}: onDragStart`, { color: "#888" }),
                onDragEnd: () => list_box.addItem(`${ts()} ${label}: onDragEnd`, { color: "#888", backgroundColor: "#444343e3" }),
                onDrop: (obj) => list_box.addItem(`${ts()} ${label}: onDrop ${obj.start_id} -> ${obj.end_id}`, { backgroundColor: "green" }),
                onDropSameContainer: () => list_box.addItem(`${ts()} ${label}: onDropSameContainer`, { backgroundColor: "#b4ad68c0" }),
                onDoubleClick: () => list_box.addItem(`${ts()} ${label}: onDoubleClick`, { color: "#6eb4f1" }),
                doClick: () => list_box.addItem(`${ts()} ${label}: doClick`, { color: "#1f93f8" }),
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
}
