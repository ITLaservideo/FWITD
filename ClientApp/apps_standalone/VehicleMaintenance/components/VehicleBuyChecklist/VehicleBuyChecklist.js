/**
 * Full-screen "I want to buy one" checklist: what to verify on a vehicle before buying it.
 * The checks are defined here (`CATALOGS`, localized client side); `VehicleMaintenanceController` only stores each
 * check's state (`ok` / `issue` / not checked) by key, one checklist per vehicle type, not tied to a profile,
 * so progress survives closing the app mid-inspection.
 * Append `elementReference()` to `document.body`; it removes itself on close.
 * @version 1.1
 */
class VehicleBuyChecklist extends FrameworkGC(`${injector_html}`) {
    /**
     * Checks per vehicle type. `key` is what the backend stores the state under: letters/digits only,
     * and never rename one (its saved state would be lost).
     * @returns {Record<'Car'|'Motorcycle', {title: string, items: {key: string, label: string, hint?: string}[]}[]>}
     */
    static get CATALOGS() {
        const L = Locale.at;
        const documents = {
            title: L('Bring with you'), items: [
                { key: 'DocId', label: L('Driving licence or ID card, still valid') },
                { key: 'DocTaxCode', label: L('Tax code (codice fiscale)') },
            ]
        };
        const costs = (hint_insurance) => ({
            title: L('Costs'), items: [
                { key: 'RoadTax', label: L('Road tax (bollo)'), hint: L('Not included: check there are no unpaid years') },
                { key: 'Insurance', label: L('Insurance'), hint: hint_insurance },
            ]
        });
        return {
            Car: [
                documents,
                {
                    title: L('Bodywork & exterior'), items: [
                        { key: 'Tires', label: L('Tires'), hint: L('Tread depth (legal 1.6 mm, 3 mm recommended), even wear, no cracks, age on the DOT code') },
                        { key: 'RustUnderneath', label: L('Rust under the car'), hint: L('Sills, subframe, wheel arches — structural rust means serious problems') },
                        { key: 'Windscreen', label: L('Windscreen chipped or cracked?') },
                    ]
                },
                {
                    title: L('Engine (cold, before the test drive)'), items: [
                        { key: 'OilLevel', label: L('Engine oil level'), hint: L('Dipstick between MIN and MAX') },
                        { key: 'OilCapFoam', label: L('Yellow foamy residue under the oil filler cap?'), hint: L('Open the filler cap: "mayonnaise" = coolant in the oil, head gasket gone') },
                        { key: 'CoolantColor', label: L('Coolant black or oily?'), hint: L('Means the head gasket is gone') },
                        { key: 'ExhaustSmoke', label: L('White smoke from the exhaust?'), hint: L('Persistent once warm = burning coolant/oil, head gasket gone') },
                    ]
                },
                {
                    title: L('Test drive'), items: [
                        { key: 'Acceleration', label: L('Acceleration through all the gears'), hint: L('No slipping clutch, no grinding, smooth shifts') },
                        { key: 'Braking', label: L('Brake hard (safely)'), hint: L('Pulls to one side or vibrates = worn/faulty brakes') },
                        { key: 'BrakePadsDiscs', label: L('Brake pads / discs'), hint: L('Pads not worn down, discs without deep grooves or a lip on the edge') },
                    ]
                },
                {
                    title: L('Equipment & keys'), items: [
                        { key: 'SpareWheel', label: L('Spare wheel / space-saver'), hint: L('Present and inflated (or a repair kit)') },
                        { key: 'WarningTriangle', label: L('Warning triangle') },
                        { key: 'RemoteLocking', label: L('Remote central locking works') },
                        { key: 'SecondKey', label: L('Second key'), hint: L('A replacement costs ~150 €') },
                    ]
                },
                costs(L('Not included: arrange your own policy before driving it home')),
            ],
            Motorcycle: [
                documents,
                {
                    title: L('Frame & exterior'), items: [
                        { key: 'Tires', label: L('Tires'), hint: L('Tread depth, even wear, no cracks, age on the DOT code (over 5 years = replace)') },
                        { key: 'CrashSigns', label: L('Signs of a crash'), hint: L('Scraped bar ends, levers, footpegs, mirrors; bent subframe or handlebar') },
                        { key: 'Rust', label: L('Rust on frame, exhaust, fasteners') },
                    ]
                },
                {
                    title: L('Chain & suspension'), items: [
                        { key: 'ChainSprockets', label: L('Chain & sprockets'), hint: L('Hooked/sharp sprocket teeth, stiff or rusty links, chain pulls far off the rear sprocket') },
                        { key: 'ForkSeals', label: L('Fork seals'), hint: L('Oil on the stanchions = leaking seals; pitted stanchions are expensive') },
                        { key: 'SteeringBearings', label: L('Steering head bearings'), hint: L('Front wheel lifted: bars turn smoothly, no notch in the center') },
                    ]
                },
                {
                    title: L('Engine (cold, before the test drive)'), items: [
                        { key: 'OilLevel', label: L('Engine oil level'), hint: L('Sight glass / dipstick between MIN and MAX, no leaks') },
                        { key: 'OilCapFoam', label: L('Yellow foamy residue under the oil filler cap?'), hint: L('"Mayonnaise" = coolant in the oil, head gasket gone') },
                        { key: 'CoolantColor', label: L('Coolant black or oily? (liquid-cooled)'), hint: L('Means the head gasket is gone') },
                        { key: 'ColdStart', label: L('Starts cold, idles steadily') },
                        { key: 'ExhaustSmoke', label: L('Smoke from the exhaust?'), hint: L('White once warm = coolant, blue = burning oil') },
                    ]
                },
                {
                    title: L('Test drive'), items: [
                        { key: 'Acceleration', label: L('Acceleration through all the gears'), hint: L('No slipping clutch, no false neutrals, no jumping out of gear') },
                        { key: 'Braking', label: L('Brake hard (safely)'), hint: L('Pulsing lever/pedal = warped discs') },
                        { key: 'BrakePadsDiscs', label: L('Brake pads / discs / fluid'), hint: L('Pads over 2–3 mm, fluid clear, not dark') },
                        { key: 'Electrics', label: L('Lights, indicators, horn, dashboard') },
                    ]
                },
                {
                    title: L('Keys'), items: [
                        { key: 'SecondKey', label: L('Second key'), hint: L('Often coded to the immobilizer: expensive to replace') },
                    ]
                },
                costs(L('Not included: arrange your own policy before riding it home')),
            ],
        };
    }
    /**
     * @param {Object} options
     * @param {'Car'|'Motorcycle'} [options.type] - checklist shown first (defaults to Car)
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        this.#initialize(options);
    }
    elements = {
        /** @type {HTMLElement} */
        self_ref: this.self_ref,
        /** @type {HTMLElement} */
        title: null,
        /** @type {HTMLElement} */
        progress_text: null,
        /** @type {HTMLElement} */
        type_switch: null,
        /** @type {HTMLElement} */
        btn_reset: null,
        /** @type {HTMLElement} */
        btn_close: null,
        /** @type {HTMLElement} */
        progress_bar: null,
        /** @type {HTMLElement} */
        sections_container: null,
        /** @type {HTMLElement} */
        notes_title: null,
        /** @type {HTMLTextAreaElement} */
        notes: null,
    }
    status = {
        /** @type {'Car'|'Motorcycle'} */
        type: 'Car',
        /** @type {{key: string, state: ('ok'|'issue'|null)}[]} */
        items: [],
        /** @type {number|undefined} pending notes save */
        notes_timer: undefined,
    }
    #onKeyDown = (e) => {
        // leave Escape to a dialog opened on top (e.g. the "start over" confirmation)
        if (e.key === 'Escape' && !document.querySelector('.wrapper-bottom-sheet-template')) this.close();
    }
    #initialize(options) {
        const owner = this;
        owner.status.type = App.VEHICLE_TYPES.some(t => t.type === options.type) ? options.type : 'Car';
        owner.elements.title.textContent = Locale.at('Buying checklist');
        owner.elements.notes_title.textContent = Locale.at('Notes');
        owner.elements.notes.placeholder = Locale.at('Price, seller, mileage, anything to negotiate on...');
        owner.elements.btn_close.addEventListener('click', () => owner.close());
        owner.elements.btn_reset.addEventListener('click', () => owner.#askReset());
        owner.elements.notes.addEventListener('input', () => {
            clearTimeout(owner.status.notes_timer);
            owner.status.notes_timer = setTimeout(() => owner.#saveNotes(), 600);
        });
        document.addEventListener('keydown', owner.#onKeyDown);
        owner.#renderTypeSwitch();
        owner.#reload();
    }
    /**
     * Saves pending notes and removes the overlay.
     */
    close() {
        const owner = this;
        document.removeEventListener('keydown', owner.#onKeyDown);
        if (owner.status.notes_timer !== undefined) {
            owner.#saveNotes();
        }
        owner.destroy();
    }
    async #saveNotes() {
        const owner = this;
        clearTimeout(owner.status.notes_timer);
        owner.status.notes_timer = undefined;
        await Lobby.postAsync('VehicleMaintenance/SaveBuyNotes', { type: owner.status.type, notes: owner.elements.notes.value });
    }
    async #reload() {
        const owner = this;
        const rsp = await Lobby.postAsync('VehicleMaintenance/GetBuyChecklist', { type: owner.status.type });
        const states = rsp.states ?? {};
        // fresh copies each time (the getter rebuilds them), so `state` can be set on the items directly
        const sections = VehicleBuyChecklist.CATALOGS[owner.status.type];
        for (const item of sections.flatMap(s => s.items)) {
            item.state = states[item.key] ?? null;
        }
        owner.status.items = sections.flatMap(s => s.items);
        owner.elements.notes.value = rsp.notes ?? '';
        owner.#renderSections(sections);
        owner.#renderProgress();
    }
    #renderTypeSwitch() {
        const owner = this;
        const container = owner.elements.type_switch;
        container.replaceChildren();
        for (const t of App.VEHICLE_TYPES) {
            const btn = document.createElement('button');
            btn.className = 'vbc-type-btn' + (t.type === owner.status.type ? ' vbc-type-active' : '');
            btn.title = t.title;
            btn.appendChild(Icons.create(t.icon_code));
            const label = document.createElement('span');
            label.textContent = t.title;
            btn.appendChild(label);
            btn.addEventListener('click', async () => {
                if (t.type === owner.status.type) return;
                if (owner.status.notes_timer !== undefined) await owner.#saveNotes();
                owner.status.type = t.type;
                owner.#renderTypeSwitch();
                await owner.#reload();
                owner.elements.sections_container.parentElement.scrollTop = 0;
            });
            container.appendChild(btn);
        }
    }
    #renderSections(sections) {
        const owner = this;
        const container = owner.elements.sections_container;
        container.replaceChildren();
        for (const section of sections) {
            const el = document.createElement('div');
            el.className = 'vbc-section';
            const heading = document.createElement('div');
            heading.className = 'vbc-section-title';
            heading.textContent = section.title;
            el.appendChild(heading);
            const list = document.createElement('div');
            list.className = 'vbc-list';
            for (const item of section.items) {
                list.appendChild(owner.#buildRow(item));
            }
            el.appendChild(list);
            container.appendChild(el);
        }
    }
    #buildRow(item) {
        const owner = this;
        const row = document.createElement('div');
        const main = document.createElement('div');
        main.className = 'vbc-row-main';
        const label = document.createElement('div');
        label.className = 'vbc-row-label';
        label.textContent = item.label;
        main.appendChild(label);
        if (item.hint) {
            const hint = document.createElement('div');
            hint.className = 'vbc-row-hint';
            hint.textContent = item.hint;
            main.appendChild(hint);
        }
        row.appendChild(main);
        const actions = document.createElement('div');
        actions.className = 'vbc-row-actions';
        const buttons = {
            ok: VehicleBuyChecklist.#stateButton('e5ca', Locale.at('OK'), 'vbc-btn-ok'),
            issue: VehicleBuyChecklist.#stateButton('e5cd', Locale.at('Problem'), 'vbc-btn-issue'),
        };
        const paint = () => {
            row.className = 'vbc-row' + (item.state ? ` vbc-state-${item.state}` : '');
            buttons.ok.classList.toggle('vbc-btn-active', item.state === 'ok');
            buttons.issue.classList.toggle('vbc-btn-active', item.state === 'issue');
        };
        for (const [state, btn] of Object.entries(buttons)) {
            btn.addEventListener('click', async () => {
                const previous = item.state;
                // clicking the already-selected state clears it
                item.state = item.state === state ? null : state;
                paint();
                owner.#renderProgress();
                try {
                    await Lobby.postAsync('VehicleMaintenance/SetBuyCheck', { type: owner.status.type, key: item.key, state: item.state });
                } catch (err) {
                    item.state = previous;
                    paint();
                    owner.#renderProgress();
                    throw err;
                }
            });
            actions.appendChild(btn);
        }
        row.appendChild(actions);
        paint();
        return row;
    }
    static #stateButton(icon_code, title, class_name) {
        const btn = document.createElement('button');
        btn.className = `vbc-state-btn ${class_name}`;
        btn.title = title;
        btn.appendChild(Icons.create(icon_code));
        return btn;
    }
    #renderProgress() {
        const owner = this;
        const items = owner.status.items;
        const done = items.filter(i => i.state != null).length;
        const issues = items.filter(i => i.state === 'issue').length;
        const pct = items.length ? Math.round(done / items.length * 100) : 0;
        owner.elements.progress_bar.style.width = `${pct}%`;
        owner.elements.progress_bar.classList.toggle('vbc-progress-has-issues', issues > 0);
        owner.elements.progress_text.textContent =
            `${done}/${items.length} ${Locale.at('checked')}` +
            (issues > 0 ? ` · ${issues} ${issues === 1 ? Locale.at('problem') : Locale.at('problems')}` : '');
    }
    #askReset() {
        const owner = this;
        UiBuilder.mockDialog({
            text1: Locale.at('Clear every check and the notes, to start over on another vehicle?'),
            hideOnDeny: true,
            onConfirmText: Locale.at('Start over'),
            onConfirm: async () => {
                clearTimeout(owner.status.notes_timer);
                owner.status.notes_timer = undefined;
                await Lobby.postAsync('VehicleMaintenance/ResetBuyChecklist', { type: owner.status.type });
                await owner.#reload();
            },
        });
    }
}
