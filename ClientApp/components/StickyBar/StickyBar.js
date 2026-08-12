
/**
 * @typedef {Object} Actionable = UiBuilder.createButton.options
 */
/**
 * @version 1.0
 */
class StickyBar extends FrameworkGC(`${injector_html}`) {
    static #ICON_FULL = 'f507';
    static #ICON_CONCISE = 'e8f5';
    /** distance kept from the viewport edges, along the anchor side */
    static #EDGE_PAD = 8;
    /** distance kept between two bars sharing the same anchor side */
    static #GAP = 6;
    /**
     * `options.anchor` => side the bar sticks to + where along that side it prefers to sit
     * @type {Record<string, {side: 'left'|'top'|'bottom'|'right', align: 'start'|'center'|'end'}>}
     */
    static #ANCHORS = {
        'top': { side: 'top', align: 'center' },
        'bottom': { side: 'bottom', align: 'center' },
        'left': { side: 'left', align: 'center' },
        'right': { side: 'right', align: 'center' },
        'left-top': { side: 'left', align: 'start' },
        'left-center': { side: 'left', align: 'center' },
        'left-bottom': { side: 'left', align: 'end' },
        'bottom-left': { side: 'bottom', align: 'start' },
        'bottom-center': { side: 'bottom', align: 'center' },
        'bottom-right': { side: 'bottom', align: 'end' },
    };
    /**
     * spots taken along each anchor side, in px along the side's axis (x for top/bottom, y for left/right)
     * @type {Record<'left'|'top'|'bottom'|'right', Array<{start: number, end: number}>>}
     */
    static #spots = { left: [], top: [], bottom: [], right: [] };
    /**
     * @param {Object} options
     * @param {string} options.id - unique id of the bar; the last used phase (other than `collapsed`) is stored in localStorage under it and restored on the next creation
     * @param {Actionable|Array<Actionable>} options.buttons
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {'left'|'top'|'bottom'|'right'|'left-top'|'left-center'|'left-bottom'|'bottom-left'|'bottom-center'|'bottom-right'} [options.anchor='top'] - where to stick the container: the side, optionally followed by where along it the bar prefers to sit (plain side = `-center`); `bottom` is placed like the BottomSheet. When the preferred spot is taken, the next free one is used, moving away from that end (from the start of the side when centered)
     * @param {'full'|'concise'|'collapsed'} [options.phase='full'] - initial phase, used only when no phase was stored for `options.id`: 1. full => display icons & text; 2. concise => display only icons; 3. collapsed => display a 5px box low-opacity, onClick opens to full
     * @param {Function} [options.onReady] - callback to be called when component is ready
     * @throws {Error} `unavailable space for now` if there is no free spot left along `options.anchor`'s side
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        console.assert(options.id != undefined, "StickyBar: provide options.id to remember the last used phase");
        this.#initialize();
        this.#addEventListeners();
    }
    /**
     * store here the elements references of the html
     * automatically gathers elements with attribute ` fw-id="xxx" ` after super()
     */
    elements = {
        /** @type HTMLElement */
        self_ref: this.self_ref,
    }
    /** @type {'left'|'top'|'bottom'|'right'} the side part of `options.anchor` */
    #anchor = 'top';
    /** @type {'start'|'center'|'end'} the preferred position along `#anchor`, from `options.anchor` */
    #align = 'center';
    /** @type {'full'|'concise'|'collapsed'} */
    #phase = 'full';
    /** @type {HTMLElement} */
    #toggle_btn = null;
    /** @type {{start: number, end: number}|null} */
    #spot = null;
    /**
     * synchronous on purpose: the "no space" error must surface from the constructor
     */
    #initialize() {
        const owner = this;
        const { side, align } = StickyBar.#ANCHORS[owner.options.anchor] ?? StickyBar.#ANCHORS.top;
        owner.#anchor = side;
        owner.#align = align;
        owner.self_ref.classList.add(`sb-${owner.#anchor}`);

        const configs = Array.isArray(owner.options.buttons) ? owner.options.buttons : [owner.options.buttons];
        configs.filter(Boolean).forEach(cfg => {
            const btn = UiBuilder.createButton(cfg);
            StickyBar.#markLabels(btn);
            owner.#addConciseHint(btn);
            owner.self_ref.appendChild(btn);
        });
        owner.#toggle_btn = UiBuilder.createButton({
            icon_code: StickyBar.#ICON_FULL,
            theme: 'text',
            class: 'sb-toggle',
            onClick: () => owner.#onToggleClick(),
        });
        owner.self_ref.appendChild(owner.#toggle_btn);

        // measured in the full phase, so the reserved spot always fits the widest layout
        owner.self_ref.classList.add('sb-measuring');
        document.body.appendChild(owner.self_ref);
        const rect = owner.self_ref.getBoundingClientRect();
        const size = owner.#isHorizontal() ? rect.width : rect.height;
        const start = StickyBar.#findSpot(owner.#anchor, size, owner.#align);
        if (start == null) {
            owner.self_ref.remove();
            throw new Error('unavailable space for now');
        }
        owner.#spot = { start: start, end: start + size };
        StickyBar.#spots[owner.#anchor].push(owner.#spot);
        owner.self_ref.style[owner.#isHorizontal() ? 'left' : 'top'] = `${start}px`;
        owner.self_ref.classList.remove('sb-measuring');

        const initial_phase = owner.#loadPhase() ?? owner.options.phase;
        owner.setPhase(['concise', 'collapsed'].includes(initial_phase) ? initial_phase : 'full');
    }
    #storageKey() {
        return `sticky-bar:${this.options.id}`;
    }
    /**
     * @returns {'full'|'concise'|null} the last used phase stored for `options.id`
     */
    #loadPhase() {
        const owner = this;
        if (owner.options.id == undefined) {
            return null;
        }
        try {
            const saved = localStorage.getItem(owner.#storageKey());
            return ['full', 'concise'].includes(saved) ? saved : null;
        } catch {
            return null;
        }
    }
    /**
     * `collapsed` is never stored: the bar always comes back readable
     * @param {'full'|'concise'|'collapsed'} phase
     */
    #savePhase(phase) {
        const owner = this;
        if (owner.options.id == undefined || phase == 'collapsed') {
            return;
        }
        try {
            localStorage.setItem(owner.#storageKey(), phase);
        } catch { }
    }
    #addEventListeners() {
        const owner = this;
        owner.self_ref.addEventListener('click', (event) => {
            // the toggle acts on mouseup: the click that follows it must not reopen the bar it just collapsed
            if (owner.#phase == 'collapsed' && !owner.#toggle_btn.contains(event.target)) {
                owner.setPhase('full');
            }
        });
    }
    #onToggleClick() {
        const owner = this;
        if (owner.#phase == 'full') {
            owner.setPhase('concise');
        } else if (owner.#phase == 'concise') {
            owner.setPhase('collapsed');
        }
    }
    /**
     * @param {'full'|'concise'|'collapsed'} phase
     */
    setPhase(phase) {
        const owner = this;
        owner.#phase = phase;
        owner.#savePhase(phase);
        owner.self_ref.classList.toggle('sb-concise', phase == 'concise');
        owner.self_ref.classList.toggle('sb-collapsed', phase == 'collapsed');
        const icon = owner.#toggle_btn.querySelector('.f-icon-i');
        icon?.replaceWith(Icons.create(phase == 'concise' ? StickyBar.#ICON_CONCISE : StickyBar.#ICON_FULL));
    }
    /**
     * @returns {'full'|'concise'|'collapsed'}
     */
    getPhase() {
        return this.#phase;
    }
    #isHorizontal() {
        return this.#anchor == 'top' || this.#anchor == 'bottom';
    }
    /**
     * `start`: the first free spot from the start of the side (top/left end);
     * `end`: the first free spot from the end of the side (bottom/right end);
     * `center`: centered first (like the BottomSheet), otherwise as `start`
     * @param {'left'|'top'|'bottom'|'right'} anchor
     * @param {number} size
     * @param {'start'|'center'|'end'} [align='center']
     * @returns {number|null} start of the spot, null if none is available
     */
    static #findSpot(anchor, size, align = 'center') {
        const length = (anchor == 'top' || anchor == 'bottom') ? window.innerWidth : window.innerHeight;
        const taken = StickyBar.#spots[anchor];
        const fits = (start) => start >= StickyBar.#EDGE_PAD
            && start + size <= length - StickyBar.#EDGE_PAD
            && taken.every(s => start + size + StickyBar.#GAP <= s.start || start >= s.end + StickyBar.#GAP);
        const from_start = [
            StickyBar.#EDGE_PAD,
            ...taken.map(s => s.end + StickyBar.#GAP).sort((a, b) => a - b),
        ];
        const from_end = [
            length - StickyBar.#EDGE_PAD - size,
            ...taken.map(s => s.start - StickyBar.#GAP - size).sort((a, b) => b - a),
        ];
        const candidates = align == 'start' ? from_start
            : align == 'end' ? from_end
                : [Math.round((length - size) / 2), ...from_start];
        return candidates.find(fits) ?? null;
    }
    /**
     * `createButton` sets the title as a bare text node: wrap it so the concise phase can hide it
     * @param {HTMLElement} btn
     */
    static #markLabels(btn) {
        const has_icon = btn.querySelector(':scope > img, :scope > .f-icon-i, :scope > .f-icon, :scope > .icon') != null;
        btn.classList.toggle('sb-has-icon', has_icon);
        [...btn.childNodes].forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() != '') {
                const label = document.createElement('span');
                label.classList.add('sb-label');
                node.replaceWith(label);
                label.appendChild(node);
            } else if (node.classList?.contains('text')) {
                node.classList.add('sb-label');
            }
        });
    }
    /**
     * the concise phase hides the labels of buttons with an icon: show them as a hint instead, pointing
     * away from the anchor side. Buttons already carrying their own hint (`createButton`'s `options.hint`) keep it
     * @param {HTMLElement} btn - already passed through `#markLabels`
     */
    #addConciseHint(btn) {
        const owner = this;
        const label = btn.querySelector(':scope > .sb-label')?.textContent.trim();
        if (!btn.classList.contains('sb-has-icon') || !label || btn['hint_builder_options'] != undefined) {
            return;
        }
        UiBuilder.addHint({
            hint: label,
            target: btn,
            anchor: { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[owner.#anchor],
            conditionsMet: () => owner.#phase == 'concise',
        });
    }

    destroy(timeout_ms = 0) {
        const owner = this;
        if (owner.#spot != null) {
            const taken = StickyBar.#spots[owner.#anchor];
            taken.splice(taken.indexOf(owner.#spot), 1);
            owner.#spot = null;
        }
        super.destroy(timeout_ms);
    }
}


//#START RESERVED AREA FOR UI_BUILDER
// setTimeout(() => {
//     const ss = new StickyBar({
//         id: "demo-actions",
//         anchor: "left",
//         phase: "full",
//         buttons: [
//             { title: 'save', icon_code: 'e161', onClick: () => console.log('save') },
//             { title: 'export', icon_code: 'ef5f', onClick: () => console.log('export') },
//         ],
//     });
//     const ss2 = new StickyBar({
//         id: "demo-refresh",
//         anchor: "left",
//         buttons: { title: 'refresh', icon_code: 'e5d5', onClick: () => console.log('refresh') },
//     });
// }, 0);
//#END RESERVED AREA FOR UI_BUILDER
