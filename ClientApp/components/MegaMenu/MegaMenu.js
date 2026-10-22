/**
 * @typedef {Object} MegaMenuLink
 * @property {string} label
 * @property {string} [icon] - Material Symbols codepoint (fonts.google.com/icons) shown before the label -
 *   must exist in the embedded FrameworkIcons font subset
 * @property {Function} [onClick] - called with (event, item) when the link is activated; the panel closes first
 * @property {boolean} [disabled] - rendered but not interactive
 * @property {string} [class] - extra css class(es), space separated
 */
/**
 * @typedef {Object} MegaMenuGroup
 * @property {string} [label] - heading shown above the group's links; omit for an untitled group
 * @property {MegaMenuLink[]} items
 * @property {string} [class] - extra css class(es), space separated
 */
/**
 * @typedef {Object} MegaMenuItem
 * @property {string} label
 * @property {string} [icon] - Material Symbols codepoint, see MegaMenuLink.icon
 * @property {Function} [onClick] - called with (event, item); ignored when `items` is set
 * @property {MegaMenuGroup[][]} [items] - panel content: an array of columns, each column an array of groups
 * @property {boolean} [disabled] - rendered but not interactive
 * @property {string} [class] - extra css class(es) for the root `<li>`, space separated
 */
/**
 * Menu bar whose entries either act directly (`onClick`) or show a multi-column panel of grouped links.
 * Panels are `SpeedActions` popups anchored to their entry: they open on hover and close on leave or
 * after a link is activated. In horizontal orientation the bar stays on one line: the trailing entries that
 * don't fit are packed into a "more" entry (recomputed on window/container resize).
 * @version 1.3
 */
class MegaMenu extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options
     * @param {MegaMenuItem[]} options.items - root entries, in display order
     * @param {"horizontal"|"vertical"} [options.orientation] - "horizontal" by default; horizontal panels
     *   open below their entry, vertical ones to its right (each falls back to the opposite side if needed)
     * @param {string} [options.style] - inline css text assigned to the menu's root element
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        console.assert(Array.isArray(options.items), "MegaMenu requires an options.items array");
        this.#initialize();
    }
    /**
     * store here the elements references of the html
     * automatically gathers elements with attribute ` fw-id="xxx" ` after super()
     */
    elements = {
        /** @type HTMLElement */
        self_ref: this.self_ref,
        /** @type HTMLElement */
        root_list: null,
    }
    /** @type {"horizontal"|"vertical"} */
    #orientation = "horizontal";
    /**
     * root entries in display order; `speed_actions` is the entry's panel popup, null when it has no panel
     * @type {{item: MegaMenuItem, li: HTMLElement, speed_actions: SpeedActions|null}[]}
     */
    #root_entries = [];
    /**
     * trailing "more" entry collecting the root entries that don't fit (horizontal only)
     * @type {{li: HTMLElement, panel: HTMLElement, speed_actions: SpeedActions}|null}
     */
    #overflow = null;
    /** @type {number|null} pending requestAnimationFrame id of onWindowResize */
    #resize_frame = null;
    /** @type {ResizeObserver|null} */
    #resize_observer = null;
    #onWindowResizeListener = () => this.onWindowResize();

    #initialize() {
        const owner = this;
        owner.#orientation = owner.options.orientation === "vertical" ? "vertical" : "horizontal";
        owner.self_ref.classList.add(`mm-${owner.#orientation}`);
        if (owner.options.style != undefined) {
            owner.self_ref.style = owner.options.style;
        }
        owner.elements.root_list.setAttribute("aria-orientation", owner.#orientation);
        if (owner.#orientation === "horizontal") {
            owner.#overflow = owner.#buildOverflowItem();
            window.addEventListener("resize", owner.#onWindowResizeListener);
            // also fires once the menu is first attached, and when its container resizes without the window
            owner.#resize_observer = new ResizeObserver(owner.#onWindowResizeListener);
            owner.#resize_observer.observe(owner.self_ref);
        }
        owner.setItems(owner.options.items);
    }
    /**
     * replaces all root entries and their panels
     * @param {MegaMenuItem[]} items
     */
    setItems(items) {
        const owner = this;
        owner.#destroySpeedActions();
        owner.elements.root_list.innerHTML = "";
        for (let i = 0; i < items.length; i++) {
            const entry = owner.#buildRootItem(items[i]);
            owner.#root_entries.push(entry);
            owner.elements.root_list.appendChild(entry.li);
        }
        if (owner.#overflow != null) {
            owner.elements.root_list.appendChild(owner.#overflow.li);
        }
        owner.onWindowResize();
    }
    /**
     * horizontal only: moves the trailing root entries that don't fit on one line into the "more" entry.
     * Runs on the next animation frame; repeated calls before then are coalesced.
     */
    onWindowResize() {
        const owner = this;
        if (owner.#overflow == null || owner.#resize_frame != null) {
            return;
        }
        owner.#resize_frame = requestAnimationFrame(() => {
            owner.#resize_frame = null;
            owner.#packOverflow();
        });
    }
    destroy(timeout_ms = 0) {
        const owner = this;
        window.removeEventListener("resize", owner.#onWindowResizeListener);
        owner.#resize_observer?.disconnect();
        if (owner.#resize_frame != null) {
            cancelAnimationFrame(owner.#resize_frame);
            owner.#resize_frame = null;
        }
        owner.#destroySpeedActions();
        owner.#overflow?.speed_actions.destroy();
        super.destroy(timeout_ms);
    }
    #destroySpeedActions() {
        const owner = this;
        for (let i = 0; i < owner.#root_entries.length; i++) {
            owner.#root_entries[i].speed_actions?.destroy();
        }
        owner.#root_entries = [];
    }

    //#region overflow
    #packOverflow() {
        const owner = this;
        const entries = owner.#root_entries;
        for (let i = 0; i < entries.length; i++) {
            entries[i].li.classList.remove("mm-hidden");
        }
        owner.#overflow.li.classList.add("mm-hidden");
        /** @type {MegaMenuItem[]} */
        const overflowed = [];
        if (owner.#overflows()) {
            owner.#overflow.li.classList.remove("mm-hidden");
            for (let i = entries.length - 1; i >= 0 && owner.#overflows(); i--) {
                entries[i].li.classList.add("mm-hidden");
                entries[i].speed_actions?.hide();
                overflowed.unshift(entries[i].item);
            }
        }
        owner.#fillOverflowPanel(overflowed);
    }
    /**
     * @returns {boolean}
     */
    #overflows() {
        const list = this.elements.root_list;
        return list.scrollWidth > list.clientWidth + 1;
    }
    /**
     * @returns {{li: HTMLElement, panel: HTMLElement, speed_actions: SpeedActions}}
     */
    #buildOverflowItem() {
        const owner = this;
        const li = document.createElement("li");
        li.className = "mm-root-item mm-overflow-item mm-hidden";
        li.setAttribute("role", "none");
        const link = owner.#buildRootLink({ icon: "e5d2" });//more_horiz
        link.setAttribute("aria-haspopup", "true");
        link.setAttribute("aria-label", Locale.at("more"));
        li.appendChild(link);
        const panel = document.createElement("div");
        panel.className = "mm-panel mm-overflow-panel";
        panel.setAttribute("role", "menu");
        const speed_actions = new SpeedActions({
            target: li,
            element: panel,
            side: "bottom",
            side_strict: true,
            unpinnable: true,
        });
        return { li, panel, speed_actions };
    }
    /**
     * entries with a panel are flattened into a titled section holding all of their groups,
     * since a SpeedActions popup can't open another one on top of itself
     * @param {MegaMenuItem[]} items
     */
    #fillOverflowPanel(items) {
        const owner = this;
        const panel = owner.#overflow.panel;
        const onActivated = () => owner.#hidePanel(owner.#overflow.speed_actions);
        panel.innerHTML = "";
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const has_panel = Array.isArray(item.items) && item.items.length > 0;
            if (!has_panel) {
                panel.appendChild(owner.#buildLink(item, onActivated));
                continue;
            }
            const section = document.createElement("div");
            section.className = "mm-overflow-section";
            owner.#addCustomClass(section, item.class);
            const heading = document.createElement("div");
            heading.className = "mm-overflow-label";
            if (item.icon != undefined) {
                heading.appendChild(Icons.create(item.icon));
            }
            const text = document.createElement("span");
            text.innerText = item.label ?? "";
            heading.appendChild(text);
            section.appendChild(heading);
            for (let c = 0; c < item.items.length; c++) {
                const groups = item.items[c] ?? [];
                for (let g = 0; g < groups.length; g++) {
                    section.appendChild(owner.#buildGroup(groups[g], onActivated));
                }
            }
            panel.appendChild(section);
        }
    }
    //#endregion

    //#region building
    /**
     * @param {MegaMenuItem} item
     * @returns {{item: MegaMenuItem, li: HTMLElement, speed_actions: SpeedActions|null}}
     */
    #buildRootItem(item) {
        const owner = this;
        const li = document.createElement("li");
        li.className = "mm-root-item";
        li.setAttribute("role", "none");
        owner.#addCustomClass(li, item.class);
        const link = owner.#buildRootLink(item);
        li.appendChild(link);
        const has_panel = Array.isArray(item.items) && item.items.length > 0;
        if (!has_panel) {
            link.addEventListener("click", (event) => {
                owner.#activate(event, item);
            });
            return { item, li, speed_actions: null };
        }
        link.setAttribute("aria-haspopup", "true");
        const caret = Icons.create(owner.#orientation === "vertical" ? "e5cc" : "e5cf");//chevron_right : expand_more
        caret.classList.add("mm-caret");
        link.appendChild(caret);
        const speed_actions = new SpeedActions({
            target: li,
            element: owner.#buildPanel(item.items, () => owner.#hidePanel(speed_actions)),
            side: owner.#orientation === "vertical" ? "right" : "bottom",
            unpinnable: true,
            conditionsMet: () => !link.disabled,
        });
        return { item, li, speed_actions };
    }
    /**
     * @param {{label?: string, icon?: string, disabled?: boolean}} item
     * @returns {HTMLButtonElement}
     */
    #buildRootLink(item) {
        const link = document.createElement("button");
        link.type = "button";
        link.className = "mm-root-link";
        link.setAttribute("role", "menuitem");
        if (item.icon != undefined) {
            const icon = Icons.create(item.icon);
            icon.classList.add("mm-icon");
            link.appendChild(icon);
        }
        if (item.label != undefined) {
            const text = document.createElement("span");
            text.className = "mm-label";
            text.innerText = item.label;
            link.appendChild(text);
        }
        if (item.disabled === true) {
            link.disabled = true;
            link.setAttribute("aria-disabled", "true");
        }
        return link;
    }
    /**
     * @param {MegaMenuGroup[][]} columns
     * @param {Function} onActivated - called before a link's own onClick, to close the panel
     * @returns {HTMLElement}
     */
    #buildPanel(columns, onActivated) {
        const owner = this;
        const panel = document.createElement("div");
        panel.className = "mm-panel";
        panel.setAttribute("role", "menu");
        for (let c = 0; c < columns.length; c++) {
            const column = document.createElement("div");
            column.className = "mm-column";
            const groups = columns[c] ?? [];
            for (let g = 0; g < groups.length; g++) {
                column.appendChild(owner.#buildGroup(groups[g], onActivated));
            }
            panel.appendChild(column);
        }
        return panel;
    }
    /**
     * @param {MegaMenuGroup} group
     * @param {Function} onActivated
     * @returns {HTMLElement}
     */
    #buildGroup(group, onActivated) {
        const owner = this;
        const section = document.createElement("div");
        section.className = "mm-group";
        section.setAttribute("role", "group");
        owner.#addCustomClass(section, group.class);
        if (group.label != undefined) {
            const heading = document.createElement("div");
            heading.className = "mm-group-label";
            heading.innerText = group.label;
            section.setAttribute("aria-label", group.label);
            section.appendChild(heading);
        }
        const items = group.items ?? [];
        for (let i = 0; i < items.length; i++) {
            section.appendChild(owner.#buildLink(items[i], onActivated));
        }
        return section;
    }
    /**
     * @param {MegaMenuLink} item
     * @param {Function} onActivated
     * @returns {HTMLElement}
     */
    #buildLink(item, onActivated) {
        const owner = this;
        const activate = (event) => {
            owner.#activate(event, item, onActivated);
        };
        const link = UiBuilder.createButton({
            title: item.label ?? "",
            icon_code: item.icon,
            theme: "text",
            class: ["mm-link", item.disabled === true ? "mm-disabled" : "", item.class ?? ""].join(" "),
            onClick: activate,
        });
        link.setAttribute("role", "menuitem");
        if (item.disabled === true) {
            link.setAttribute("aria-disabled", "true");
            link.removeAttribute("tabindex");
        }
        // createButton only reacts to the mouse
        link.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activate(event);
            }
        });
        return link;
    }
    /**
     * @param {HTMLElement} element
     * @param {string} [class_names] - space separated
     */
    #addCustomClass(element, class_names) {
        if (typeof class_names !== "string") {
            return;
        }
        const names = class_names.split(/\s+/).filter((name) => name.length > 0);
        if (names.length > 0) {
            element.classList.add(...names);
        }
    }
    //#endregion

    /**
     * @param {Event} event
     * @param {MegaMenuItem|MegaMenuLink} item
     * @param {Function} [onActivated]
     */
    #activate(event, item, onActivated) {
        if (item.disabled === true) {
            return;
        }
        onActivated?.();
        if (typeof item.onClick === "function") {
            item.onClick(event, item);
        }
    }
    /**
     * @param {SpeedActions} speed_actions
     */
    #hidePanel(speed_actions) {
        // any key pressed inside the popup pins it, and a pinned popup only dims on hide
        SpeedActions.pinned.toggle(false);
        speed_actions.hide();
    }
}


//#START RESERVED AREA FOR UI_BUILDER
// setTimeout(() => {
//     const ss = new MegaMenu({
//         items: [
//             {
//                 label: Locale.at(`Pagina Iniziale`),
//                 priority: 0,
//                 icon: 'e88a',
//                 onClick: () => console.log('goTo/dashboard')
//             },
//             {
//                 label: `Configurazione`,
//                 priority: 0,
//                 icon: 'f569',
//                 items: [
//                     [
//                         {
//                             label: `Monitor`,
//                             items: [
//                                 { label: `Categorie a Monitor`, icon: 'e574', onClick: () => console.log('goTo/categorie-a-monitor') },
//                                 { label: `Prodotti nei Monitor`, icon: 'f3b9', onClick: () => console.log('goTo/prodotti-nei-monitor') },
//                                 { label: `Ricariche e Servizi`, icon: 'e896', onClick: () => console.log('goTo/ricariche-e-servizi') }]
//                         }
//                     ],
//                     [
//                         {
//                             label: `Magazzino`,
//                             items: [
//                                 { label: `Configurazione Motori`, icon: 'f86e', onClick: () => console.log('goTo/associa-prodotti-alle-selezioni') },
//                                 { label: `Elenco Prodotti`, icon: 'f756', onClick: () => console.log('goTo/lista-prodotti') },
//                                 { label: `Suggerimenti di rifornimento`, icon: 'f5a4', onClick: () => console.log('goTo/sales-driven-restock') }]
//                         }
//                     ]
//                 ]
//             },
//             {
//                 label: `Contabilità`,
//                 icon: 'ef3e',
//                 priority: 0,
//                 items: [
//                     [
//                         {
//                             label: `Storico Movimenti`,
//                             items: [
//                                 { label: `Incassi totale`, icon: 'e6bf', onClick: () => console.log('goTo/incassi-totale') },
//                                 { label: `Tutti i Movimenti`, icon: 'e99c', onClick: () => console.log('goTo/transazioni') }
//                             ]
//                         }
//                     ],
//                     [
//                         {
//                             label: `Ricariche`,
//                             items: [
//                                 { label: `Elenco scontrini ricaricabili`, icon: 'e70d', onClick: () => console.log('goTo/elenco-scontrini-ricaricabili') }
//                             ]
//                         }
//                     ],
//                     [
//                         {
//                             label: `Agenzia delle Entrate`,
//                             items: [
//                                 { label: `Invio dati Agenzia delle Entrate`, icon: 'e8cc', onClick: () => console.log('goTo/corrispettivi-ae') }]
//                         }
//                     ]
//                 ]
//             },
//             {
//                 label: `Webcam`,
//                 icon: 'f7a6',
//                 onClick: () => console.log('goTo/webcam')
//             },
//             {
//                 label: `Impostazioni`,
//                 icon: 'e8b8',
//                 onClick: () => console.log('goTo/settings')
//             },
//             {
//                 label: `Help e Contatti`,
//                 icon: 'e887',
//                 class: 'help-menu',
//                 items: [
//                     [
//                         {
//                             items: [
//                                 {
//                                     label: `Hai bisogno d'aiuto?`,
//                                     icon: 'e88e',
//                                     onClick: () => {
//                                         const url = `https://assistenza.laservideo.it/login?key1=${this.branch}&key2=${this.matricola}`;
//                                         window.open(url, '_blank');
//                                     }
//                                 },
//                                 { label: `Registra impronte`, icon: 'e3cd', onClick: () => { console.log("openPopupRegistraImpronte()") } },
//                                 { label: `Programma di assistenza`, icon: 'e157', onClick: () => { window.open('https://get.teamviewer.com/laservideo', '_blank'); } },
//                                 { label: `Versione app` + ": " + (()=>{try{return AppStatus?.VERSION;}catch{return 'demo'} })(), icon: 'e88e', disabled: true }
//                             ]
//                         }
//                     ]
//                 ]
//             },
//             {
//                 label: `Account`,
//                 icon: 'e7fd',
//                 class: 'account-menu',
//                 items: [
//                     [
//                         {
//                             items: [
//                                 { label: `Cambia Password`, icon: 'e73c', onClick: () => console.log('goTo/change-password') },
//                                 { label: `Autenticazione a due fattori`, icon: 'f686', onClick: () => console.log('goTo/two-factor') },
//                                 { label: `Logout`, icon: 'e9ba', onClick: () => console.log(this.current_user.logout()) }
//                             ]
//                         }
//                     ]
//                 ]
//             }
//         ],
//         orientation: 'horizontal'
//     });
//     document.body.appendChild(ss.elementReference());
// }, 0);
//#END RESERVED AREA FOR UI_BUILDER