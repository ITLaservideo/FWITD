const debug = true;
//#region Commands
/**
 * test commands exposed as cards - each maps 1:1 to a FM32_25Controller route.
 * `section` picks which grid the card renders into - "general" or "read".
 * @type {Array<{title: string, desc: string, route: string, section: string}>}
 */
const COMMANDS = [
    { title: "enable business mode", desc: "switch the reader to NFC business mode", route: "FM32_25/EnableBusinessMode", section: "general" },
    // { title: "authenticate mifare 1k", desc: "attempt Mifare Classic 1K authentication", route: "FM32_25/AuthenticateMifareClassic1k", section: "general" },
    { title: "stop card", desc: "send the stop-card command", route: "FM32_25/StopCard", section: "general" },
    { title: "get system info", desc: "query firmware / hardware / serial number", route: "FM32_25/GetSystemInfo", section: "general" },
    //{ title: "dump DR log", desc: "print the internal data-response log", route: "FM32_25/LogDRLog", section: "general" }, @deprecated
    { title: "send raw command", desc: "hover to type a raw command string to send to the reader", route: "FM32_25/SendRawCommand", section: "general" },
    { title: "IDCard", desc: "hover to send the raw commands of the IDCard flow (reset/find card, Emirates ID, PACE, BAC)", route: "FM32_25/SendRawCommand", form: "idcard_raw_commands", section: "general" },

    { title: "listen mifare 1k", desc: "wait for a Mifare Classic 1K card", route: "FM32_25/ListenForMifare1kCard", section: "read" },
    { title: "listen identity cards", desc: "wait for an MRZ + NFC identity document", route: "FM32_25/ListenIdentityCards", section: "read" },

    { title: "write service card", desc: "ex: `tag000001` \ntag + 6 digits", route: "FM32_25/WriteMifare1kCards", section: "write" },
    { title: "write data command", desc: "hover to type data to overwrite onto the last card's sector 0", route: "FM32_25/WriteDataCommand", section: "write" },
    { title: "change password", desc: "hover to set a custom 12-digit hex password, or leave empty to reset to default", route: "FM32_25/ChangePasswordToCommand", section: "write" },

    { title: "test input mrz", desc: "provide an mrz\n verify wether is accepted", route: "FM32_25/TestMRZInput", section: "test_bypass" },
    { title: "(quick test) read CIE / passport", desc: "hover to pick which MRZ to use", route: "FM32_25/ReadCardMrz", section: "test_bypass", disabled: false },
];
/**
 * prefixes of the commands the reader doesn't answer with a terminal response (sent with `has_terminal_response: false`,
 * otherwise FM3281.SendCommandAsync waits for its timeout)
 */
const NO_TERMINAL_RESPONSE_PREFIXES = ["SCNENA", "ALLENA", "NFCENA", "NFCDOE"];
/**
 * @param {string} command
 * @returns {boolean}
 */
function hasTerminalResponse(command) {
    const upper = command.toUpperCase();
    return !NO_TERMINAL_RESPONSE_PREFIXES.some((prefix) => upper.startsWith(prefix));
}
/**
 * wraps an ISO 7816 APDU (hex) into the FM3281 passthrough command, mirrors `Utils.adaptISO7818ToFM3281` (LIBS/FM32_25):
 * `NFCCMD0019000000` + APDU length (1 byte hex) + APDU
 * @param {string} apdu_hex
 * @returns {string}
 */
function adaptISO7818ToFM3281(apdu_hex) {
    const hex = apdu_hex.replaceAll(" ", "").toUpperCase();
    return `NFCCMD0019000000${(hex.length / 2).toString(16).toUpperCase().padStart(2, "0")}${hex}`;
}
/**
 * raw commands of the IDCard flow (LIBS/FM32_25: FM3281.ReadCardMrz, eMRTD.ReadEmiratesIdPublicData, eMRTD.DoPace, eMRTD.DoBac), sent via FM32_25/SendRawCommand.
 * Only the static steps are here: MSE:Set AT, General Authenticate 2-4, LDF selection, BAC mutual authentication
 * and the secure-messaging DG reads are computed from EF.CardAccess / the MRZ, so they can't be sent as fixed commands.
 * `sequence: true` groups get a button sending all their steps in order, skipping those marked `skip_in_sequence`.
 * @type {Array<{group: string, desc: string, sequence?: boolean, commands: Array<{title: string, command: string, desc: string, skip_in_sequence?: boolean}>}>}
 */
const IDCARD_RAW_COMMANDS = [
    {
        group: "setup", desc: "reader setup sent before listening for a card (no terminal response)",
        commands: [
            { title: "barcode off", command: "SCNENA0", desc: "disable barcode scanning" },
            { title: "symbologies off", command: "ALLENA0", desc: "disable all barcode symbologies" },
            { title: "NFC on", command: "NFCENA1", desc: "enable the NFC reader" },
            { title: "NFC off", command: "NFCENA0", desc: "disable the NFC reader (ReadCardMrz toggles off/on to recover from NAKs)" },
            { title: "UID output on", command: "NFCDOE1", desc: "re-enable the UID output" },
        ],
    },
    {
        group: "card", desc: "card presence / reset",
        commands: [
            { title: "NFC active?", command: "NFCCMD00EF0010", desc: "check the NFC module is active (also used as re-find card by DoBac)" },
            { title: "find card", command: "NFCCMD0011", desc: "find card: the reader answers with the UID once a card is placed" },
            { title: "re-find card", command: "NFCCMD00E1", desc: "alternative re-find card (commented out in DoBac)" },
            { title: "reset card", command: "NFCCMD0018", desc: "reset card (RATS): ok when the reader status is 00, or the ATS ends with 9000 (only the CIE's does; the Emirates ID's ends with 0000). DoPace/DoBac retry it up to 5 times, 250ms apart; skipped for passports" },
            { title: "stop card", command: "NFCCMD001A", desc: "stop card, sent at the end of the read" },
        ],
    },
    {
        group: "Emirates ID", desc: "eMRTD.ReadEmiratesIdPublicData (MRZ issuing state ARE, tried before PACE): public data in the clear, no PACE/BAC/secure messaging", sequence: true,
        commands: [
            { title: "reset card", command: "NFCCMD0018", desc: "reset card (skipped for passports)" },
            { title: "select eMRTD applet", command: adaptISO7818ToFM3281("00 A4 04 00 07 A0 00 00 02 47 10 01 00"), desc: "SELECT AID A0000002471001 (00 A4 04 00 07 A0 00 00 02 47 10 01 00): Le=00 is required, the card answers 6700 without it" },
            { title: "select UAE applet", command: adaptISO7818ToFM3281("00 A4 04 00 0C A0 00 00 02 43 00 13 00 00 00 01 01 00"), desc: "SELECT AID A00000024300130000000101 (00 A4 04 00 0C A0 00 00 02 43 00 13 00 00 00 01 01 00)" },
            { title: "select DF 0200", command: adaptISO7818ToFM3281("00 A4 00 00 02 02 00 00"), desc: "SELECT DF 0200 (00 A4 00 00 02 02 00 00): parent of EF 0201/0203, selecting them from the applet root answers 6A82" },
            { title: "select EF 0203", command: adaptISO7818ToFM3281("00 A4 00 00 02 02 03 00"), desc: "SELECT EF 0203, name/dates/nationality/gender (00 A4 00 00 02 02 03 00): the FCI 80 02 object holds the file size" },
            { title: "select EF 0201", command: adaptISO7818ToFM3281("00 A4 00 00 02 02 01 00"), desc: "SELECT EF 0201, ID number + card number (00 A4 00 00 02 02 01 00): ReadEmiratesEf re-selects eMRTD applet -> UAE applet -> DF 0200 before each EF", skip_in_sequence: true },
            { title: "read binary", command: adaptISO7818ToFM3281("00 B0 00 00 E0"), desc: "READ BINARY offset 0, 224 bytes (00 B0 00 00 E0): the EF is read in chunks of max 0xE0 bytes up to the FCI size", skip_in_sequence: true },
        ],
    },
    {
        group: "PACE", desc: "eMRTD.DoPace: static steps up to the first General Authenticate", sequence: true,
        commands: [
            { title: "reset card", command: "NFCCMD0018", desc: "reset card (skipped for passports)" },
            { title: "select EF.CardAccess", command: adaptISO7818ToFM3281("00 A4 02 0C 02 01 1C"), desc: "SELECT EF.CardAccess under the current DF (00 A4 02 0C 02 01 1C): the CIE accepts it with 9000, don't pre-select the MF on the CIE" },
            { title: "select MF", command: adaptISO7818ToFM3281("00 A4 00 0C 02 3F 00"), desc: "fallback on a non-9000 SW (Emirates ID answers 6A82): SELECT MF (00 A4 00 0C 02 3F 00), then SELECT EF.CardAccess again", skip_in_sequence: true },
            { title: "select CardAccess by path", command: adaptISO7818ToFM3281("00 A4 08 0C 04 3F 00 01 1C"), desc: "fallback: SELECT by path 3F00/011C (00 A4 08 0C 04 3F 00 01 1C)", skip_in_sequence: true },
            { title: "read CardAccess by SFI", command: adaptISO7818ToFM3281("00 B0 9C 00 00"), desc: "last fallback: READ BINARY by SFI 0x1C, implicit select (00 B0 9C 00 00)", skip_in_sequence: true },
            { title: "read CardAccess length", command: adaptISO7818ToFM3281("00 B0 00 00 06"), desc: "READ BINARY offset 0, 6 bytes (00 B0 00 00 06): ASN.1 header with the total length, then read in chunks of max 200 bytes" },
            { title: "General Auth 1", command: adaptISO7818ToFM3281("10 86 00 00 02 7C 00 00"), desc: "General Authenticate 1 (10 86 00 00 02 7C 00 00): asks for the encrypted nonce, needs a previous MSE:Set AT (computed from CardAccess)", skip_in_sequence: true },
        ],
    },
    {
        group: "BAC", desc: "eMRTD.DoBac: static steps up to the challenge", sequence: true,
        commands: [
            { title: "re-find card", command: "NFCCMD00EF0010", desc: "re-find card" },
            { title: "reset card", command: "NFCCMD0018", desc: "reset card (skipped for passports)" },
            { title: "select application", command: adaptISO7818ToFM3281("00 A4 04 0C 07 A0 00 00 02 47 10 01"), desc: "SELECT eMRTD application, AID A0000002471001 (00 A4 04 0C 07 A0 00 00 02 47 10 01): ICAO 9303 CLA 00" },
            { title: "select application (CLA 01)", command: adaptISO7818ToFM3281("01 A4 04 0C 07 A0 00 00 02 47 10 01"), desc: "fallback on a non-9000 SW: the original CLA 01 form (01 A4 04 0C 07 A0 00 00 02 47 10 01), the Emirates ID rejects it with 6985", skip_in_sequence: true },
            { title: "get challenge", command: adaptISO7818ToFM3281("00 84 00 00 08"), desc: "GET CHALLENGE, 8 bytes RND.ICC (00 84 00 00 08): next step is the mutual authentication (computed from the MRZ)" },
            { title: "MSE:Set AT key ref 02", command: adaptISO7818ToFM3281("00 22 C1 A4 06 80 01 01 83 01 02"), desc: "on 6A88 from the mutual authentication (not for the Emirates ID): MSE:Set AT key reference 02 (00 22 C1 A4 06 80 01 01 83 01 02), then a new GET CHALLENGE", skip_in_sequence: true },
            { title: "MSE:Set AT key ref 01", command: adaptISO7818ToFM3281("00 22 C1 A4 06 80 01 01 83 01 01"), desc: "next retry: MSE:Set AT key reference 01 (00 22 C1 A4 06 80 01 01 83 01 01), then a new GET CHALLENGE", skip_in_sequence: true },
        ],
    },
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
        if (debug) {
            const edb = new ExportDataButton({});
            // document.body.innerText = '_';
            this.elements.commands_grid_test_bypass.appendChild(edb.elementReference());
        }
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
            if (cmd.route === "FM32_25/ReadCardMrz") {
                // hover-driven identity picker instead of a plain click-to-run command
                //throw new Error("deprecated");
                owner.#wireQuickTestNFCCard(card);
            } else if (cmd.route === "FM32_25/WriteMifare1kCards") {
                // hover-driven tag/range form instead of a plain click-to-run command
                owner.#wireWriteMifareCard(card);
            } else if (cmd.form === "idcard_raw_commands") {
                // hover-driven buttons sending the IDCard flow raw commands
                owner.#wireIDCardRawCommandsCard(card);
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
    //#region ReadCardMrz
    async #wireQuickTestNFCCard(card) {
        const owner = this;
        const rsp = await Lobby.postAsync("FM32_25/GetCards", {});
        if (rsp.error != undefined) {
            LiveLogger.log(`  ${Locale.at("error")}: ${rsp.error}`);
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
                onClick: (event) => owner.#runReadCardMrz(entry.Mrz, event),
            })),
            side: "bottom"
        });
    }
    async #runReadCardMrz(mrz, event) {
        const owner = this;
        if (!owner.#portIsOpen) {
            return;
        }
        LiveLogger.log(`⚡ ${Locale.at("read CIE / passport")}: ${mrz}`);
        const rsp = await Lobby.postAsync("FM32_25/ReadCardMrz", { mrz: String(mrz) });
        if (rsp.error != undefined) {
            LiveLogger.log(`  ${Locale.at("error")}: ${rsp.error}`);
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
        UiBuilder.addHint({
            hint: Locale.at("-1 -> continues from last write"),
            anchor: "left",
            target: from_input,
        })
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
        LiveLogger.log(`⚡ ${Locale.at("write service card")}: ${tag} [${from_include}-${to_include}]`);
        const rsp = await Lobby.postAsync("FM32_25/WriteMifare1kCards", {
            tag: String(tag),
            from_include: String(from_include),
            to_include: String(to_include),
        });
        if (rsp.error != undefined) {
            LiveLogger.log(`  ${Locale.at("error")}: ${rsp.error}`);
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
        LiveLogger.log(`${Locale.at("write service card")}: ${Locale.at("cancelled")}`);
        owner.#resetWriteMifareUI();
    }
    /**
     * Called from the C# side (MifareClassic1k.cs :: writeIDSCards, via FM32_25/Ui.cs ::
     * Ui.callApp) once the write loop finishes all `count` cards on its own - as opposed to
     * the page cancelling it. Public and no-arg: reached as `window.the_main_app.onWriteMifareCardsDone()`.
     */
    onWriteMifareCardsDone() {
        const owner = this;
        LiveLogger.log(`${Locale.at("write service card")}: ${Locale.at("done")}`, "success");
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
            label: `${Locale.at("permanent")}?`,
            innerText: {
                on: Locale.at("yes") + " @",
                off: "# " + Locale.at("no")
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
     * `has_terminal_response` is derived from the command, see `hasTerminalResponse`.
     */
    async #runSendRawCommand(command, permanent_setting, event) {
        const owner = this;
        if (!owner.#portIsOpen || !command) {
            return;
        }
        command = `${command}`.trim();
        LiveLogger.log(`⚡ ${Locale.at("send raw command")}: ${command}`);
        const rsp = await Lobby.postAsync("FM32_25/SendRawCommand", {
            command: String(command),
            permanent_setting: Boolean(permanent_setting),
            has_terminal_response: hasTerminalResponse(command),
        });
        if (rsp.error != undefined) {
            LiveLogger.log(`${Locale.at("error")}: ${rsp.error}`);
            UiBuilder.Notify(`${Locale.at("error")}: ${rsp.error}`, event);
        }
    }
    //#endregion
    //#region IDCardRawCommands
    //@note one button per IDCARD_RAW_COMMANDS step, sent through #runSendRawCommand (transient `#` setting);
    //the reader's answer is logged by the C# side (FM32_25Controller.SendRawCommand -> Ui.log)
    #wireIDCardRawCommandsCard(card) {
        const owner = this;
        const container = document.createElement("div");
        container.className = "dlb-write-form dlb-idcard-form";

        for (const group of IDCARD_RAW_COMMANDS) {
            const label = document.createElement("div");
            label.className = "dlb-idcard-group-label";
            label.innerText = Locale.at(group.group);
            UiBuilder.addHint({ target: label, hint: Locale.at(group.desc), anchor: "left" });

            const buttons = document.createElement("div");
            buttons.className = "dlb-idcard-buttons";
            group.commands.forEach((step, i) => {
                buttons.appendChild(UiBuilder.createButton({
                    title: `${group.sequence ? `${i + 1}. ` : ""}${Locale.at(step.title)}`,
                    hint: `${step.command}\n\n${Locale.at(step.desc)}`,
                    anchor: "bottom",
                    class: "dlb-action-btn",
                    onClick: (event) => owner.#runSendRawCommand(step.command, false, event),
                }));
            });
            if (group.sequence) {
                buttons.appendChild(UiBuilder.createButton({
                    title: `:: ${Locale.at("sequence")}`,
                    hint: Locale.at("sends the steps in order (the reader's answers are only logged, a failing step doesn't stop the next ones)"),
                    anchor: "bottom",
                    class: "dlb-action-btn",
                    onClick: (event) => owner.#runIDCardSequence(group, event),
                }));
            }
            container.appendChild(label);
            container.appendChild(buttons);
        }

        const note = document.createElement("div");
        note.className = "dlb-idcard-note";
        note.innerText = Locale.at("MSE:Set AT, General Authenticate 2-4, mutual authentication and DG reads are computed: use \"listen identity cards\"");
        container.appendChild(note);

        new SpeedActions({
            target: card,
            label: Locale.at("IDCard raw commands"),
            element: container,
            side: "bottom",
        });
    }
    async #runIDCardSequence(group, event) {
        const owner = this;
        if (!owner.#portIsOpen) {
            return;
        }
        LiveLogger.log(`:: ${Locale.at(group.group)}`);
        for (const step of group.commands) {
            if (!step.skip_in_sequence) {
                await owner.#runSendRawCommand(step.command, false, event);
            }
        }
    }
    //#endregion
    //#region WriteDataCommand
    #wireWriteDataCommandCard(card) {
        const owner = this;
        const container = document.createElement("div");
        container.className = "dlb-write-form";
        const inner = document.createElement("span");
        inner.innerText = `${Locale.at("new lines are replaced with ` `")}\n${Locale.at("max memory 752bytes")}`;
        container.appendChild(inner);
        UiBuilder.addHint({
            target: inner,
            anchor: "left",
            hint: `Plain ASCII is 1 byte per char\n\n[A-Za-z0-9 !"#$%&'()*+,-./:;<=>?@[]^_\`{|}~\n\nNon-ASCII costs more: é = 2 bytes, 中 = 3 bytes, 😀 = 4 bytes.`
        });

        const what_input = document.createElement("input");
        what_input.type = "text";
        what_input.value = "";
        what_input.className = "dlb-write-input";
        let really_don_t_spam = null;
        const notifyIfTooLarge = (event) => {
            const bytes = new TextEncoder().encode(what_input.value.trim());
            if (bytes.length > 752) {
                clearTimeout(really_don_t_spam);
                really_don_t_spam = setTimeout(() => {
                    const coo = what_input.getBoundingClientRect();
                    new Notify({ text: Locale.at("data will be truncated"), event: { clientX: coo.x - 50, clientY: coo.y + 50 }, type: "warning", style: 3 });
                }, 500);
            }
        };
        what_input.addEventListener("keyup", notifyIfTooLarge);
        // the pasted text isn't in what_input.value yet when "paste" fires, defer to after it lands
        what_input.addEventListener("paste", (event) => setTimeout(() => notifyIfTooLarge(event), 0));

        const send_btn = UiBuilder.createButton({
            title: Locale.at("send"),
            class: "dlb-action-btn",
            onClick: (event) => owner.#runWriteDataCommand((what_input.value.length == 0 ? null : what_input.value), event),
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
        LiveLogger.log(`⚡ ${Locale.at("write data command")}: ${what}`);
        const rsp = await Lobby.postAsync("FM32_25/WriteDataCommand", { what: String(what) });
        if (rsp.error != undefined) {
            LiveLogger.log(`  ${Locale.at("error")}: ${rsp.error}`);
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
        LiveLogger.log(`⚡ ${Locale.at("change password")}: ${what || Locale.at("default")}`);
        const rsp = await Lobby.postAsync("FM32_25/ChangePasswordToCommand", { what: String(what ?? "") });
        if (rsp.error != undefined) {
            LiveLogger.log(`  ${Locale.at("error")}: ${rsp.error}`);
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
        this.#DataCrunch1(rsp.res)
        this.#DataCrunch2(rsp.res)
        // if (info && (info.IDNumber || info.PassportNumber)) {
        //     LiveLogger.log(`  ${info.DocumentType} | ${info.LastName ?? "-"} ${info.FirstName ?? "-"} | ${info.IDNumber || info.PassportNumber} | ${Locale.at("nationality")}:${info.Nationality ?? "-"}`);
        // }
    }
    #DataCrunch2(da_info) {
        /**
         * @type Array<MRZInfo>
         */
        const info = da_info;
        // timestamp format: yyyy.MM.dd.HH.mm.ss (see FM32_25Controller.timestampPrefixRegex)
        // group repeat reads of the same document together, nested under the day they were read
        const by_day = new Map();
        const preview_options = {
            propStyles: {
                "IDNumber": "text-decoration: underline;",
                "DateOfBirth": "text-decoration: underline;",
                "ExpirationDate": "text-decoration: underline;"
            },
            propHint: {
                "IDNumber": {
                    hint: "used to generate PACE private key",
                    anchor: "left",
                },
                "DateOfBirth": {
                    hint: "used to generate PACE private key",
                    anchor: "left",
                },
                "ExpirationDate": {
                    hint: "used to generate PACE private key",
                    anchor: "left",
                }
            }
        };
        for (const item of info) {
            const day = item.timestamp?.slice(0, 10) ?? Locale.at("unknown date");
            const by_mrz = by_day.get(day) ?? new Map();
            const mrz_key = item.fullMRZ ?? "";
            const group = by_mrz.get(mrz_key) ?? { item, count: 0 };
            group.count++;
            by_mrz.set(mrz_key, group);
            by_day.set(day, by_mrz);
        }

        const day_titles = [];
        const day_content = [];
        const searchable_target_data = [];
        for (const [day, by_mrz] of by_day) {
            const total_reads = [...by_mrz.values()].reduce((sum, group) => sum + group.count, 0);

            const reads_titles = [];
            const reads_content = [];
            let what = "";
            let da_countries_txt = "";
            const fset = new Set();
            for (const { item, count } of by_mrz.values()) {
                reads_titles.push(`${item.LastName ?? "-"} ${item.FirstName ?? "-"} (${count}x)`);
                reads_content.push(UiBuilder.previewJSON(item, preview_options));
                what += (item.fullMRZ);
                fset.add(item.fullMRZ.substring(2, 5).replaceAll("<", ""));
            }
            const iterator = fset.values();
            let the_f_value = iterator.next().value;
            while (the_f_value != undefined) {
                da_countries_txt += ` ${the_f_value}`;
                the_f_value = iterator.next().value;
            }
            day_content.push(UiBuilder.createAccordion({ titles: reads_titles, content: reads_content }));
            day_titles.push(`${day} (${total_reads}) ${da_countries_txt}`);
            searchable_target_data.push(what);
        }
        const accordion = UiBuilder.createSearchableAccordion({ titles: day_titles, searchable_target_data: searchable_target_data, content: day_content, id: "DataCrunch2" });
        accordion.style.maxHeight = "90vh";
        accordion.style.overflow = "auto";
        const floating_container = UiBuilder.createFloatingContainer(accordion, {
            id: "DataCrunch2",
            direction: "vertical",
            style: "width:670px"
        });
    }
    #DataCrunch1(da_info) {
        /**
         * @type Array<MRZInfo>
         */
        const info = da_info;
        const preview_options = {
            propStyles: {
                "IDNumber": "text-decoration: underline;",
                "DateOfBirth": "text-decoration: underline;",
                "ExpirationDate": "text-decoration: underline;"
            },
            propHint: {
                "IDNumber": {
                    hint: "used to generate PACE private key",
                    anchor: "left",
                },
                "DateOfBirth": {
                    hint: "used to generate PACE private key",
                    anchor: "left",
                },
                "ExpirationDate": {
                    hint: "used to generate PACE private key",
                    anchor: "left",
                }
            }
        };
        if (info.length == 1) {
            const grid = UiBuilder.previewJSON(info[0], preview_options);
            UiBuilder.mockDialog({
                hideOnDeny: true,
                onConfirmText: Locale.at("ok"),
                body: grid
            });
        } else {
            // DocumentType is the FM32_25.MRZParser.DocumentType enum (CIE=0, Passport=1, ND=2)
            // - at most 3 distinct values - group entries by type instead of one section per entry
            const DOCUMENT_TYPE_LABELS = {
                0: Locale.at("CIE"),
                1: Locale.at("Passport"),
                2: Locale.at("undefined"),
            };
            const groups = new Map();
            for (const item of info) {
                const group = groups.get(item.DocumentType) ?? [];
                group.push(item);
                groups.set(item.DocumentType, group);
            }
            const titles = [];
            const content = [];
            const export_rows = [];
            for (const [document_type, items] of groups) {
                const label = DOCUMENT_TYPE_LABELS[document_type] ?? document_type;
                titles.push(`${label} (${items.length})`);
                const group_container = document.createElement("div");
                group_container.classList.add("gcppj-card");
                items.forEach((item) => {
                    group_container.appendChild(UiBuilder.previewJSON(item, preview_options));
                });
                content.push(group_container);

                // one ExportDataButton per group above, 1:1 with the accordion section it exports
                const file_stem = String(label).replace(/\s+/g, "_");
                const export_button = new ExportDataButton({
                    getWhatToPrint: () => group_container,
                    getWhatToPDF: () => ({ element: group_container, filename: `${file_stem}.pdf` }),
                    getWhatToExcel: () => ({ rows: items, sheetName: label, filename: `${file_stem}.xlsx` }),
                    label: file_stem
                });
                const export_row = document.createElement("div");
                export_row.classList.add("gcppj-export-row");
                // export_row_label.textContent = label;
                export_row.appendChild(export_button.elementReference());
                export_rows.push(export_row);
            }
            const accordion = UiBuilder.createAccordion({ titles, content });

            // 2-column layout: accordion on the left, one export-button row per document-type
            // group stacked vertically on the right
            const export_column = document.createElement("div");
            export_column.classList.add("gcppj-export-column");
            export_rows.forEach((row) => export_column.appendChild(row));

            const columns = document.createElement("div");
            columns.classList.add("gcppj-columns");
            columns.appendChild(accordion);
            columns.appendChild(export_column);

            const floating_container = UiBuilder.createFloatingContainer(columns, {
                id: "dlbc-gcppj-card",
                direction: "vertical",
                style: "width:670px"
            });
        }
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
        LiveLogger.listbox = listbox;
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
        LiveLogger.log(`⚡ ${Locale.at(cmd.title)}`);
        const rsp = await Lobby.postAsync(cmd.route, {});
        if (rsp.error != undefined) {
            LiveLogger.log(`  ${Locale.at("error")}: ${rsp.error}`);
            UiBuilder.Notify(`${Locale.at("error")}: ${rsp.error}`, event);
            return;
        }
        if (cmd.route === "FM32_25/GetSystemInfo") {
            LiveLogger.log(`  ${rsp.ProductName ?? "-"} | fw:${rsp.FirmwareVersion ?? "-"} | hw:${rsp.HardwareVersion ?? "-"} | sn:${rsp.SerialNumber ?? "-"}`);
        }
    }
    //#endregion
    //#region ActionsRow
    #buildActionsRow() {
        const owner = this;
        // hover-driven port picker (SpeedActions) instead of a plain click-to-run command
        owner.#portStatusBtn = document.createElement("div");
        owner.#portStatusBtn.classList.add("twj-button", "dlb-action-btn");
        owner.#portStatusBtn.setAttribute("tabindex", "0");
        owner.#portStatusBtn.innerText = Locale.at("port closed");
        owner.elements.actions_row.appendChild(owner.#portStatusBtn);
        owner.#wirePortSelectSpeedActions();
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
    async #wirePortSelectSpeedActions() {
        const owner = this;
        const rsp = await Lobby.postAsync("FM32_25/ListPorts", {});
        if (rsp.error != undefined) {
            owner.#setStatus(`${Locale.at("error listing ports")}: ${rsp.error}`);
            return;
        }
        const ports = rsp.data ?? [];
        const port_select = new SpeedActions({
            target: owner.#portStatusBtn,
            label: Locale.at("select which port to open"),
            createButtons: ports.length > 0
                ? ports.map((port_name) => ({
                    title: port_name, onClick: async () => {
                        if (await owner.#openPort(port_name)) {
                            // unpin first, otherwise hide() only dims a pinned popup
                            SpeedActions.pinned.toggle(false);
                            port_select.hide();
                        }
                    }
                }))
                : [{ title: Locale.at("no ports found"), onClick: (event) => UiBuilder.Notify(Locale.at("no ports found"), event) }],
            side: "bottom",
        });
    }
    async #openPort(port_name) {
        const owner = this;
        owner.#setStatus(Locale.at("opening..."));
        const rsp = await Lobby.postAsync("FM32_25/OpenPort", { port_name });
        if (rsp.error != undefined) {
            owner.#setStatus(`${Locale.at("error")}: ${rsp.error}`);
            return false;
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
        return true;
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
