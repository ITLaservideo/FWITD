const debug = false;
//#region LiveLogger
/**
 * Pushed to directly from the C# side (FM32_25/Ui.cs :: Ui.log) via ExecuteScriptAsync,
 * independently of any App instance, so it has to live at module/window scope.
 */
window.live_logger = {
    /**
     * @type {ListBox}
     */
    listbox: null,
    log(text, type_log) {
        if (this.listbox == undefined) {
            return;
        }
        // type_log matches FM32_25/Ui.cs :: Ui.TypeLog's ToString() values
        switch (type_log) {
            case "warn":
                this.listbox.addItem(text, { color: "var(--vscode-editorWarning-foreground)" });
                break;
            case "danger":
                this.listbox.addItem(text, { color: "var(--vscode-errorForeground)" });
                break;
            case "success":
                this.listbox.addItem(text, { color: "var(--vscode-charts-green)" });
                break;
            case "info":
                this.listbox.addItem(text, { color: "var(--vscode-editorInfo-foreground)" });
                break;
            case "none":
            default:
                this.listbox.addItem(text);
                break;
        }
    }
};
//#endregion
//#region Commands
/**
 * test commands exposed as cards - each maps 1:1 to a FM32_25Controller route.
 * `section` picks which grid the card renders into - "general" or "read".
 * @type {Array<{title: string, desc: string, route: string, section: string}>}
 */
const COMMANDS = [
    { title: "enable business mode", desc: "switch the reader to NFC business mode", route: "FM32_25/EnableBusinessMode", section: "general" },
    { title: "authenticate mifare 1k", desc: "attempt Mifare Classic 1K authentication", route: "FM32_25/AuthenticateMifareClassic1k", section: "general" },
    { title: "stop card", desc: "send the stop-card command", route: "FM32_25/StopCard", section: "general" },
    { title: "get system info", desc: "query firmware / hardware / serial number", route: "FM32_25/GetSystemInfo", section: "general" },
    //{ title: "dump DR log", desc: "print the internal data-response log", route: "FM32_25/LogDRLog", section: "general" }, @deprecated
    { title: "send raw command", desc: "hover to type a raw command string to send to the reader", route: "FM32_25/SendRawCommand", section: "general" },

    { title: "listen mifare 1k", desc: "wait for a Mifare Classic 1K card", route: "FM32_25/ListenForMifare1kCard", section: "read" },
    { title: "listen identity cards", desc: "wait for an MRZ + NFC identity document", route: "FM32_25/ListenIdentityCards", section: "read" },
    // { title: "(quick test) read CIE / passport", desc: "hover to pick which mock identity to simulate", route: "FM32_25/ReadCIEAUS", section: "read", disabled: true }, @deprecated

    { title: "write service card", desc: "ex: `tag000001` \ntag + 6 digits", route: "FM32_25/WriteMifare1kCards", section: "write" },
    { title: "write data command", desc: "hover to type data to overwrite onto the last card's sector 0", route: "FM32_25/WriteDataCommand", section: "write" },
    { title: "change password", desc: "hover to set a custom 12-digit hex password, or leave empty to reset to default", route: "FM32_25/ChangePasswordToCommand", section: "write" },

    { title: "test input mrz", desc: "provide an mrz\n verify wether is accepted", route: "FM32_25/TestMRZInput", section: "test_bypass" },
];
//#endregion
/**
 * @version 1.0
 */
class App {
    elements = {
        app_main_content: document.getElementById("app-main-content"),
        page: document.getElementById("dlb-page"),
        title: document.getElementById("dlb-title"),
        port_select_container: document.getElementById("dlb-port-select-container"),
        actions_row: document.getElementById("dlb-actions-row"),
        commands_grid_general: document.getElementById("dlb-commands-grid-general"),
        commands_grid_read: document.getElementById("dlb-commands-grid-read"),
        commands_grid_write: document.getElementById("dlb-commands-grid-write"),
        commands_grid_test_bypass: document.getElementById("dlb-commands-grid-test_bypass"),
        log_container: document.getElementById("dlb-log-container"),
    }
    /**
     * @type {Element}
     */
    #portStatusBtn = null;
    /**
     * @type {Element}
     */
    #closeBtn = null;
    /**
     * @type {Element}
     */
    #beepBtn = null;
    /**
     * @type {Element[]}
     */
    #commandCards = [];
    /**
     * @type {Element}
     */
    #writeMifareCancelBtn = null;
    #portIsOpen = false;
    //#region Init
    constructor() {
        this.#init();
        this.#asyncInit();
        document.body.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.key == "r") {
                e.stopPropagation();
                e.preventDefault();
                Lobby.post("AppRouter/Navigate", { where: "DashboardLettoreBarcode" }, (rsp) => {
                    resolve();
                    //owner.elements.button_login.classList.toggle("clicked", false);
                });
            }
        })
    }
    #init() {
        AppStatus.displayVersion();
        this.#buildActionsRow();
        this.#buildCommandCards();
        this.#buildLogPanel();
    }
    //#endregion
    //#region BuildCommandCards
    //@note dispatch table below: each COMMANDS route is either wired to a hover form
    //(its own region further down) or falls through to the generic #runCommand
    #buildCommandCards() {
        const owner = this;
        for (let i = 0; i < COMMANDS.length; i++) {
            const cmd = COMMANDS[i];
            const card = document.createElement("div");
            card.className = "dlb-command-card disabled";
            const title = document.createElement("div");
            title.className = "dlb-command-card-title";
            title.innerText = Locale.at(cmd.title);
            const desc = document.createElement("div");
            desc.className = "dlb-command-card-desc";
            desc.innerText = cmd.disabled ? `${Locale.at(cmd.desc)} (${Locale.at("disabled for now")})` : Locale.at(cmd.desc);
            card.appendChild(title);
            card.appendChild(desc);
            const grid = cmd.section === "read" ? owner.elements.commands_grid_read
                : cmd.section === "write" ? owner.elements.commands_grid_write
                    : cmd.section === "test_bypass" ? owner.elements.commands_grid_test_bypass
                        : owner.elements.commands_grid_general;
            if (cmd.disabled) {
                // permanently disabled regardless of port state - not wired up, not part
                // of the open/close port enable/disable toggle
                grid.appendChild(card);
                continue;
            }
            if (cmd.route === "FM32_25/ReadCIEAUS") {
                // hover-driven identity picker instead of a plain click-to-run command
                throw new Error("deprecated");
                owner.#wireQuickTestNFCCard(card);
            } else if (cmd.route === "FM32_25/WriteMifare1kCards") {
                // hover-driven tag/range form instead of a plain click-to-run command
                owner.#wireWriteMifareCard(card);
            } else if (cmd.route === "FM32_25/SendRawCommand") {
                // hover-driven command/permanent_setting form instead of a plain click-to-run command
                owner.#wireSendRawCommandCard(card);
            } else if (cmd.route === "FM32_25/WriteDataCommand") {
                // hover-driven data-to-write form instead of a plain click-to-run command
                owner.#wireWriteDataCommandCard(card);
            } else if (cmd.route === "FM32_25/ChangePasswordToCommand") {
                // hover-driven optional-password form instead of a plain click-to-run command
                owner.#wireChangePasswordCard(card);
            } else if (cmd.route === "FM32_25/TestMRZInput") {
                // pure text parsing, no reader/port involved - stays enabled regardless of
                // port open/close, so it's wired up separately and skips the #commandCards
                // gating below
                owner.#wireTestMRZInputCard(card);
                grid.appendChild(card);
                continue;
            } else {
                card.addEventListener("click", (event) => owner.#runCommand(cmd, event));
            }
            owner.#commandCards.push(card);
            grid.appendChild(card);
        }
    }
    //#endregion
    //#region ReadCIEAUS
    //@note deprecated - #buildCommandCards throws before wiring this up, kept for reference
    async #wireQuickTestNFCCard(card) {
        const owner = this;
        const rsp = await Lobby.postAsync("FM32_25/GetQuickTestNFCCards", {});
        if (rsp.error != undefined) {
            return;
        }
        const entries = rsp.data ?? [];
        if (entries.length === 0) {
            return;
        }
        new SpeedActions({
            target: card,
            label: Locale.at("select identity"),
            createButtons: entries.map((entry) => ({
                title: entry.Name,
                onClick: (event) => owner.#runReadCIEAUS(entry.Index, event),
            })),
            side: "bottom"
        });
    }
    async #runReadCIEAUS(which, event) {
        const owner = this;
        if (!owner.#portIsOpen) {
            return;
        }
        window.live_logger.log(`⚡ ${Locale.at("read CIE / passport")}: ${which}`);
        const rsp = await Lobby.postAsync("FM32_25/ReadCIEAUS", { which: String(which) });
        if (rsp.error != undefined) {
            window.live_logger.log(`  ${Locale.at("error")}: ${rsp.error}`);
            UiBuilder.Notify(`${Locale.at("error")}: ${rsp.error}`, event);
        }
    }
    //#endregion
    //#region FormHelpers
    //@note shared by the WriteMifare1kCards/SendRawCommand/ChangePasswordToCommand forms below
    #buildWriteMifareRow(label_key, input) {
        const row = document.createElement("div");
        row.className = "dlb-write-row";
        const label = document.createElement("label");
        label.innerText = Locale.at(label_key);
        row.appendChild(label);
        row.appendChild(input);
        return row;
    }
    //#endregion
    //#region WriteMifare1kCards
    #wireWriteMifareCard(card) {
        const owner = this;
        const container = document.createElement("div");
        container.className = "dlb-write-form";

        const tag_input = document.createElement("input");
        tag_input.type = "text";
        tag_input.value = "PMAT";
        tag_input.className = "dlb-write-input";

        const from_input = document.createElement("input");
        from_input.type = "number";
        from_input.step = "1";
        from_input.value = "0";
        from_input.className = "dlb-write-input";

        const to_input = document.createElement("input");
        to_input.type = "number";
        to_input.step = "1";
        to_input.value = "500";
        to_input.className = "dlb-write-input";
        from_input.addEventListener("keyup", (event) => {
            from_input.value = UiBuilder.toUInt(from_input.value);
            if (Number(from_input.value) > Number(to_input.value)) {
                to_input.value = from_input.value;
            }
        });
        to_input.addEventListener("keyup", (event) => {
            to_input.value = UiBuilder.toUInt(to_input.value);
            if (Number(to_input.value) < Number(from_input.value)) {
                from_input.value = to_input.value;
            }
        });

        const cancel_btn = UiBuilder.createButton({
            title: Locale.at("cancel"),
            class: "dlb-action-btn disabled",
            onClick: (event) => owner.#runWriteMifareCardsCancel(card, cancel_btn, event),
        });

        const start_btn = UiBuilder.createButton({
            title: Locale.at("start"),
            class: "dlb-action-btn",
            onClick: (event) => {
                owner.#runWriteMifareCards(card, cancel_btn, tag_input.value, from_input.value, to_input.value, event);
                if (the_speed) {
                    the_speed.hide();
                }
            },
        });

        const btn_row = document.createElement("div");
        btn_row.className = "dlb-write-btn-row";
        btn_row.appendChild(start_btn);
        btn_row.appendChild(cancel_btn);
        owner.#writeMifareCancelBtn = cancel_btn;

        container.appendChild(owner.#buildWriteMifareRow("tag", tag_input));
        container.appendChild(owner.#buildWriteMifareRow("[start", from_input));
        container.appendChild(owner.#buildWriteMifareRow("end)", to_input));
        container.appendChild(btn_row);

        let the_speed = new SpeedActions({
            target: card,
            label: Locale.at("write service cards"),
            element: container,
            side: "bottom",
        });
    }
    /**
     * once a write starts, every other command card gets disabled (this card itself stays
     * enabled so the popup - and its cancel button - remain reachable) until cancelled.
     */
    async #runWriteMifareCards(write_card, cancel_btn, tag, from_include, to_include, event) {
        const owner = this;
        if (!owner.#portIsOpen) {
            return;
        }
        window.live_logger.log(`⚡ ${Locale.at("write service card")}: ${tag} [${from_include}-${to_include}]`);
        const rsp = await Lobby.postAsync("FM32_25/WriteMifare1kCards", {
            tag: String(tag),
            from_include: String(from_include),
            to_include: String(to_include),
        });
        if (rsp.error != undefined) {
            window.live_logger.log(`  ${Locale.at("error")}: ${rsp.error}`);
            UiBuilder.Notify(`${Locale.at("error")}: ${rsp.error}`, event);
            return;
        }
        owner.#commandCards.forEach((c) => {
            if (c !== write_card) {
                c.classList.add("disabled");
            }
        });
        cancel_btn.classList.remove("disabled");
    }
    async #runWriteMifareCardsCancel(write_card, cancel_btn, event) {
        const owner = this;
        const rsp = await Lobby.postAsync("FM32_25/WriteMifare1kCardsCancel", {});
        if (rsp.error != undefined) {
            UiBuilder.Notify(`${Locale.at("error")}: ${rsp.error}`, event);
        }
        window.live_logger.log(`${Locale.at("write service card")}: ${Locale.at("cancelled")}`);
        owner.#resetWriteMifareUI();
    }
    /**
     * Called from the C# side (MifareClassic1k.cs :: writeIDSCards, via FM32_25/Ui.cs ::
     * Ui.callApp) once the write loop finishes all `count` cards on its own - as opposed to
     * the page cancelling it. Public and no-arg: reached as `window.the_main_app.onWriteMifareCardsDone()`.
     */
    onWriteMifareCardsDone() {
        const owner = this;
        window.live_logger.log(`${Locale.at("write service card")}: ${Locale.at("done")}`, "success");
        owner.#resetWriteMifareUI();
    }
    #resetWriteMifareUI() {
        const owner = this;
        if (owner.#portIsOpen) {
            owner.#commandCards.forEach((c) => c.classList.remove("disabled"));
        }
        owner.#writeMifareCancelBtn?.classList.add("disabled");
    }
    //#endregion
    //#region SendRawCommand
    #wireSendRawCommandCard(card) {
        const owner = this;
        const container = document.createElement("div");
        container.className = "dlb-write-form";

        const command_input = document.createElement("input");
        command_input.type = "text";
        command_input.value = "";
        command_input.className = "dlb-write-input";

        const self_aware = { yes: false };
        const options_create_toggle = {
            label: Locale.at("permanent?"),
            innerText: {
                on: "# " + Locale.at("no"),
                off: Locale.at("yes") + " @"
            },
            onClick: (event) => {
                self_aware.yes = !self_aware.yes;
                options_create_toggle.setIsOn(self_aware.yes);
            },
            isOn: self_aware.yes,
            theme: "mini",
            hint: "Storage type:\n “@” means permanent setting which will not be lost by removing power from the scanner or rebooting it;\n “#” means temporary setting which will be lost by removing power from the scanner or rebooting it. ",
            anchor: "left"
        };
        const permanent_toggle = UiBuilder.createToggle(options_create_toggle);
        const send_btn = UiBuilder.createButton({
            title: Locale.at("send"),
            class: "dlb-action-btn",
            onClick: (event) => owner.#runSendRawCommand(command_input.value, self_aware.yes, event),
        });

        const btn_row = document.createElement("div");
        btn_row.className = "dlb-write-btn-row";
        btn_row.appendChild(send_btn);

        container.appendChild(owner.#buildWriteMifareRow("command", command_input));
        container.appendChild(permanent_toggle);
        container.appendChild(btn_row);

        new SpeedActions({
            target: card,
            label: Locale.at("send raw command"),
            element: container,
            side: "bottom",
        });
    }
    /**
     * `permanent_setting` mirrors FM32_25Controller.SendRawCommand's flag: true prefixes the
     * command with `@` (persisted setting) instead of the default `#` (transient command).
     */
    async #runSendRawCommand(command, permanent_setting, event) {
        const owner = this;
        if (!owner.#portIsOpen || !command) {
            return;
        }
        window.live_logger.log(`⚡ ${Locale.at("send raw command")}: ${command}`);
        const rsp = await Lobby.postAsync("FM32_25/SendRawCommand", {
            command: String(command),
            permanent_setting: Boolean(permanent_setting),
        });
        if (rsp.error != undefined) {
            window.live_logger.log(`  ${Locale.at("error")}: ${rsp.error}`);
            UiBuilder.Notify(`${Locale.at("error")}: ${rsp.error}`, event);
        }
    }
    //#endregion
    //#region WriteDataCommand
    #wireWriteDataCommandCard(card) {
        const owner = this;
        const container = document.createElement("div");
        container.className = "dlb-write-form";
        container.innerText = `${Locale.at("new lines are replaced with ` `")}\n${Locale.at("max memory 742 bytes/characters")}`;

        const what_input = document.createElement("input");
        what_input.type = "text";
        what_input.value = "";
        what_input.className = "dlb-write-input";

        const send_btn = UiBuilder.createButton({
            title: Locale.at("send"),
            class: "dlb-action-btn",
            onClick: (event) => owner.#runWriteDataCommand((what_input.value.length == 0 ? null : ""), event),
        });
        const wipe_btn = UiBuilder.createButton({
            title: Locale.at("wipe"),
            hint: Locale.at("onverwrite with empty blocks"),
            anchor: "bottom",
            class: "dlb-action-btn",
            onClick: (event) => owner.#runWriteDataCommand("", event),
        });

        const btn_row = document.createElement("div");
        btn_row.className = "dlb-write-btn-row";
        btn_row.appendChild(send_btn);
        btn_row.appendChild(wipe_btn);

        container.appendChild(owner.#buildWriteMifareRow("data", what_input));
        container.appendChild(btn_row);

        new SpeedActions({
            target: card,
            label: Locale.at("write data command"),
            element: container,
            side: "bottom",
        });
    }
    /**
     * mirrors FM32_25Controller.WriteDataCommand: always overwrites sector 0 of whichever
     * Mifare card is currently on the reader - there is no card/sector selection here.
     */
    async #runWriteDataCommand(what, event) {
        console.error(what == undefined);
        const owner = this;
        if (!owner.#portIsOpen || what == undefined) {
            return;
        }
        window.live_logger.log(`⚡ ${Locale.at("write data command")}: ${what}`);
        const rsp = await Lobby.postAsync("FM32_25/WriteDataCommand", { what: String(what) });
        if (rsp.error != undefined) {
            window.live_logger.log(`  ${Locale.at("error")}: ${rsp.error}`);
            UiBuilder.Notify(`${Locale.at("error")}: ${rsp.error}`, event);
        }
    }
    //#endregion
    //#region ChangePasswordToCommand
    #wireChangePasswordCard(card) {
        const owner = this;
        const container = document.createElement("div");
        container.className = "dlb-write-form";

        const password_input = document.createElement("input");
        password_input.type = "text";
        password_input.value = "";
        password_input.placeholder = Locale.at("empty = default");
        password_input.className = "dlb-write-input";

        const send_btn = UiBuilder.createButton({
            title: Locale.at("send"),
            class: "dlb-action-btn",
            onClick: (event) => owner.#runChangePasswordCommand(password_input.value, event),
        });

        const btn_row = document.createElement("div");
        btn_row.className = "dlb-write-btn-row";
        btn_row.appendChild(send_btn);

        const da_input = owner.#buildWriteMifareRow("password (12 hex)", password_input);
        UiBuilder.addHint({
            target: da_input,
            hint: "default: `FFFFFFFFFFFF`",
            anchor: "left"
        });
        container.appendChild(da_input);
        container.appendChild(btn_row);

        new SpeedActions({
            target: card,
            label: Locale.at("change password"),
            element: container,
            side: "bottom",
        });
    }
    /**
     * mirrors FM32_25Controller.ChangePasswordToCommand: `what` is validated server-side
     * as exactly 12 hex chars - anything else (including empty) falls back to the default password.
     */
    async #runChangePasswordCommand(what, event) {
        const owner = this;
        if (!owner.#portIsOpen) {
            return;
        }
        window.live_logger.log(`⚡ ${Locale.at("change password")}: ${what || Locale.at("default")}`);
        const rsp = await Lobby.postAsync("FM32_25/ChangePasswordToCommand", { what: String(what ?? "") });
        if (rsp.error != undefined) {
            window.live_logger.log(`  ${Locale.at("error")}: ${rsp.error}`);
            UiBuilder.Notify(`${Locale.at("error")}: ${rsp.error}`, event);
        }
    }
    //#endregion
    //#region TestMRZInput
    //@note hardware-independent bypass tool, not gated by port open/close
    #wireTestMRZInputCard(card) {
        const owner = this;
        const container = document.createElement("div");
        container.className = "dlb-write-form";

        const mrz_input = document.createElement("textarea");
        mrz_input.rows = 4;
        mrz_input.placeholder = Locale.at("paste mrz here");
        mrz_input.className = "dlb-write-textarea";

        const test_btn = UiBuilder.createButton({
            title: Locale.at("test"),
            class: "dlb-action-btn",
            onClick: (event) => owner.#runTestMRZInput(mrz_input.value, event),
        });

        const btn_row = document.createElement("div");
        btn_row.className = "dlb-write-btn-row";
        btn_row.appendChild(test_btn);

        container.appendChild(mrz_input);
        container.appendChild(btn_row);

        new SpeedActions({
            target: card,
            label: Locale.at("test input mrz"),
            element: container,
            side: "bottom",
        });
        // bypass tool, not gated by port state - see the routing continue in #buildCommandCards
        card.classList.remove("disabled");
    }
    /**
     * mirrors FM32_25Controller.TestMRZInput: it always returns ok:true and pushes the
     * accept/reject verdict itself via Ui.log (window.live_logger), independently of this
     * response - here we only surface the parsed MRZInfo fields once a read is accepted.
     */
    async #runTestMRZInput(what, event) {
        if (!what) {
            return;
        }
        const rsp = await Lobby.postAsync("FM32_25/TestMRZInput", { what: String(what) });
        if (rsp.error != undefined) {
            UiBuilder.Notify(`${Locale.at("error")}: ${rsp.error}`, event);
            return;
        }
        const info = rsp.res;
        const grid = UiBuilder.previewJSON(info);
        UiBuilder.mockDialog({
            hideOnDeny: true,
            onConfirmText: Locale.at("ok"),
            body: grid
        });
        // if (info && (info.IDNumber || info.PassportNumber)) {
        //     window.live_logger.log(`  ${info.DocumentType} | ${info.LastName ?? "-"} ${info.FirstName ?? "-"} | ${info.IDNumber || info.PassportNumber} | ${Locale.at("nationality")}:${info.Nationality ?? "-"}`);
        // }
    }
    //#endregion
    //#region LogPanel
    #buildLogPanel() {
        const owner = this;
        const listbox = new ListBox({
            title: Locale.at("log"),
            Size: { height: "100%", minItemHeight: "18px" },
        });
        listbox.addItem(Locale.at("..."));
        owner.elements.log_container.appendChild(listbox.elementReference());
        window.live_logger.listbox = listbox;
    }
    //#endregion
    //#region GenericCommand
    //@note handles the plain one-shot COMMANDS entries that don't need a hover form
    //(EnableBusinessMode, AuthenticateMifareClassic1k, StopCard, GetSystemInfo,
    //ListenForMifare1kCard, ListenIdentityCards)
    async #runCommand(cmd, event) {
        const owner = this;
        if (!owner.#portIsOpen) {
            return;
        }
        window.live_logger.log(`⚡ ${Locale.at(cmd.title)}`);
        const rsp = await Lobby.postAsync(cmd.route, {});
        if (rsp.error != undefined) {
            window.live_logger.log(`  ${Locale.at("error")}: ${rsp.error}`);
            UiBuilder.Notify(`${Locale.at("error")}: ${rsp.error}`, event);
            return;
        }
        if (cmd.route === "FM32_25/GetSystemInfo") {
            window.live_logger.log(`  ${rsp.ProductName ?? "-"} | fw:${rsp.FirmwareVersion ?? "-"} | hw:${rsp.HardwareVersion ?? "-"} | sn:${rsp.SerialNumber ?? "-"}`);
        }
    }
    //#endregion
    //#region ActionsRow
    #buildActionsRow() {
        const owner = this;
        owner.#portStatusBtn = UiBuilder.createButton({
            title: `${Locale.at("port closed")}`,
            class: "dlb-action-btn",
            onClick: (event) => { owner.#selectPort(event); },
        });
        owner.elements.actions_row.appendChild(owner.#portStatusBtn);
        owner.#closeBtn = UiBuilder.createButton({
            title: Locale.at("close port"),
            class: "dlb-action-btn disabled",
            onClick: () => { owner.#closeSelectedPort(); owner.#portStatusBtn.classList.toggle("disabled", false); },
        });
        owner.#beepBtn = UiBuilder.createButton({
            title: Locale.at("beep"),
            class: "dlb-action-btn disabled",
            onClick: (event) => owner.#beep(event),
        });
        owner.elements.actions_row.appendChild(owner.#closeBtn);
        owner.elements.actions_row.appendChild(owner.#beepBtn);
        this.elements.port_select_container.appendChild(UiBuilder.createButton({
            icon_code: "f508",
            class: "close-btn",
            hint: Locale.at("close app"),
            anchor: "left",
            onClick: () => {
                Lobby.closeApp(true);
            }
        }));
    }
    //#endregion
    //#region AsyncInit
    async #asyncInit() {
        const owner = this;
        setTimeout(() => {
            Locale.applyAll();
            owner.elements.page.style.opacity = 1;
        }, 0);
    }
    //#endregion
    //#region PortLifecycle
    async #selectPort(event) {
        const owner = this;
        const rsp = await Lobby.postAsync("FM32_25/ListPorts", {});
        if (rsp.error != undefined) {
            owner.#setStatus(`${Locale.at("error listing ports")}: ${rsp.error}`);
            return;
        }
        const ports = rsp.data ?? [];
        if (ports.length === 0) {
            UiBuilder.Notify(Locale.at("no ports found"), event);
            return;
        }
        new MousePopUp({
            title: Locale.at("select which port to open"),
            action_titles: ports,
            next: ports.map((port_name) => () => owner.#openPort(port_name)),
            event: event,
            style: 3,
        });
    }
    async #openPort(port_name) {
        const owner = this;
        owner.#setStatus(Locale.at("opening..."));
        const rsp = await Lobby.postAsync("FM32_25/OpenPort", { port_name });
        if (rsp.error != undefined) {
            owner.#setStatus(`${Locale.at("error")}: ${rsp.error}`);
            return;
        }
        owner.#setStatus(rsp.CurrentStatus ?? Locale.at("unknown status"));
        owner.#portIsOpen = true;
        owner.#closeBtn.classList.remove("disabled");
        owner.#beepBtn.classList.remove("disabled");
        owner.#portStatusBtn.classList.toggle("disabled", true)
        owner.#commandCards.forEach((card) => card.classList.remove("disabled"));
        // fire-and-forget: the reader may never answer QRYSYS (no timeout anywhere in this
        // command chain), so this must not block the rest of the open-port flow on it
        owner.#appendSystemInfoToTitle();
    }
    async #appendSystemInfoToTitle() {
        const owner = this;
        const rsp = await Lobby.postAsync("FM32_25/GetSystemInfo", {});
        if (rsp.error != undefined) {
            return;
        }
        const info = [rsp.ProductName, rsp.FirmwareVersion].filter(Boolean).join(" ");
        if (info.length === 0) {
            return;
        }
        let the_hint = "";
        let i = 0;
        for (let [key, value] of Object.entries(rsp)) {
            if (!key.startsWith("_")) {
                the_hint += `${key}: ${value}\n`;
                i++;
                if (i % 2 == 0) {
                    the_hint += `---------------------\n`;
                }
            }
        }
        UiBuilder.addOrUpdateHint({ target: owner.elements.title, text: the_hint, anchor: "bottom" });
        owner.elements.title.textContent = `${Locale.at("lettore FM32 / FM25")} — ${info}`;
    }
    async #closeSelectedPort() {
        const owner = this;
        if (!owner.#portIsOpen) {
            return;
        }
        const rsp = await Lobby.postAsync("FM32_25/ClosePort", {});
        if (rsp.error != undefined) {
            owner.#setStatus(`${Locale.at("error")}: ${rsp.error}`);
            return;
        }
        owner.#portIsOpen = false;
        owner.#closeBtn.classList.add("disabled");
        owner.#beepBtn.classList.add("disabled");
        owner.#commandCards.forEach((card) => card.classList.add("disabled"));
        owner.#setStatus(Locale.at("port closed"));
        owner.elements.title.textContent = Locale.at("lettore FM32 / FM25");
    }
    async #beep(event) {
        const owner = this;
        if (!owner.#portIsOpen) {
            return;
        }
        const rsp = await Lobby.postAsync("FM32_25/Beep", {});
        if (rsp.error != undefined) {
            UiBuilder.Notify(`${Locale.at("error")}: ${rsp.error}`, event);
        }
    }
    #setStatus(text) {
        const owner = this;
        owner.#portStatusBtn.innerText = text;
    }
    //#endregion
}
// setTimeout(() => {
//     window.the_main_app //access the app instance
// }, 0);
