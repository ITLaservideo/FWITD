/**
 * @version 1.0
 * Merges what used to be the separate UserSettings/SystemSettings components: same rendering and
 * patch-on-change behavior, driven off `${scope}/Get`, `${scope}/Meta` and `${scope}/Patch` for
 * whichever backend(s) `options.scope` selects.
 */
class Settings extends FrameworkGC(`${injector_html}`) {
    static #SCOPES = ['UserSettings', 'SystemSettings'];

    /**
     * @param {Object} options
     * @param {'UserSettings'|'SystemSettings'|'All'} [options.scope='All'] - Which backend(s) to load/patch. 'All' loads both and renders them as two grouped sections.
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        console.assert(options?.scope == undefined || options.scope === 'All' || Settings.#SCOPES.includes(options.scope), `Settings: unknown options.scope '${options?.scope}'`);
        this.#initialize();
    }

    elements = {
        /** @type {HTMLElement} */
        self_ref: this.self_ref,
        /** @type {HTMLElement} */
        settings_list: null,
        /** @type {HTMLElement} */
        status_bar: null,
    }

    #scopes() {
        return this.options.scope === 'All' || this.options.scope == undefined ? Settings.#SCOPES : [this.options.scope];
    }

    async reload() {
        const owner = this;
        const scopes = owner.#scopes();
        try {
            const groups = await Promise.all(scopes.map(async (scope) => {
                const [getRes, metaRes] = await Promise.all([
                    Lobby.postAsync(`${scope}/Get`),
                    Lobby.postAsync(`${scope}/Meta`),
                ]);
                Settings.#cache[scope] = getRes;
                Settings.#metaCache[scope] = metaRes;
                return { scope, meta: Array.isArray(metaRes.data) ? metaRes.data : [] };
            }));
            owner.#renderSettings(groups);
        } catch (err) {
            owner.#showStatus('Failed to load settings', 'err');
        }
    }
    async #initialize() {
        await this.reload();
    }

    #renderSettings(groups) {
        const owner = this;
        const list = owner.elements.settings_list;
        list.innerHTML = '';

        if (groups.every(g => g.meta.length === 0)) {
            const empty = document.createElement('div');
            empty.style.cssText = 'font-size:11px;color:var(--vscode-descriptionForeground,#858585);text-align:center;padding:12px 0;';
            empty.textContent = 'No settings available.';
            list.appendChild(empty);
            return;
        }

        const show_group_headers = groups.length > 1;
        for (const { scope, meta } of groups) {
            if (meta.length === 0) continue;

            const group = document.createElement('div');
            group.className = 'sys-settings-group';

            if (show_group_headers) {
                const header = document.createElement('div');
                header.className = 'sys-settings-group-header';
                header.textContent = Locale.at(Settings.#scopeLabel(scope));
                group.appendChild(header);
            }

            for (const field of meta) {
                const row = document.createElement('div');
                row.className = 'sys-settings-row';

                const label = document.createElement('span');
                label.className = 'sys-settings-label' + (field.writable ? '' : ' read-only');
                label.textContent = Locale.at[field.key] ?? Settings.#humanize(field.key);
                label.title = field.key;
                if (field.type != 'bool' && field.type != 'datetime') {
                    row.appendChild(label);
                }
                const value = Settings.#cache[scope]?.[field.key];
                row.appendChild(owner.#createControl(field, value, scope));
                group.appendChild(row);
            }

            list.appendChild(group);
        }
    }

    #createControl(field, value, scope) {
        return Settings.#buildControl(field, value, (k, v, el) => this.#patchSetting(scope, k, v, el));
    }

    static #scopeLabel(scope) {
        return scope === 'SystemSettings' ? 'System Settings' : 'User Settings';
    }

    static #buildControl(field, value, patchFn) {
        if (!field.writable) {
            const span = document.createElement('span');
            span.className = 'sys-settings-ro-value';
            span.textContent = value == null ? '—' : String(value);
            return span;
        }
        switch (field.type) {
            case 'bool': {
                return UiBuilder.createToggle({
                    label: Locale.at[field.key] ?? Settings.#humanize(field.key),
                    theme: 'mini',
                    isOn: !!value,
                    innerText: {
                        on: Locale.at('is_on'),
                        off: Locale.at('is_off'),
                    },
                    onClick: (event, opts) => {
                        opts.setIsOn(opts.isOn = !opts.isOn);
                        patchFn(field.key, opts.isOn, event.currentTarget);
                    },
                });
            }
            case 'number': {
                const inp = document.createElement('input');
                inp.type = 'number';
                inp.className = 'sys-settings-input';
                inp.value = value ?? '';
                inp.onchange = () => patchFn(field.key, inp.value === '' ? null : Number(inp.value), inp);
                return inp;
            }
            case 'datetime': {
                const dp = new DatePicker({
                    label: Locale.at[field.key] ?? Settings.#humanize(field.key),
                    value: value ? new Date(value) : undefined,
                    onChange: (iso) => patchFn(field.key, iso, dp.elementReference()),
                });
                return dp.elementReference();
            }
            default: {
                const inp = document.createElement('input');
                inp.type = 'text';
                inp.className = 'sys-settings-input';
                inp.value = value ?? '';
                inp.onchange = () => patchFn(field.key, inp.value || null, inp);
                return inp;
            }
        }
    }
    /**
     * @param {'UserSettings'|'SystemSettings'} scope
     * @param {string} key
     * @param {string} value
     * @param {HTMLElement} inp
     */
    async #patchSetting(scope, key, value, inp) {
        const owner = this;
        const where = inp.getBoundingClientRect();
        const x = where.left;
        const y = where.top;
        try {
            await Lobby.postAsync(`${scope}/Patch`, { [key]: value });
            UiBuilder.Notify('✔ Saved', { clientX: x, clientY: y });
        } catch (e) {
            UiBuilder.Notify('⚠ ' + (e?.message ?? String(e)), { clientX: x, clientY: y });
        }
    }

    #showStatus(msg, cls = '') {
        const owner = this;
        const bar = owner.elements.status_bar;
        bar.textContent = msg;
        bar.className = 'sys-settings-status' + (cls ? ' ' + cls : '');
        if (cls === 'ok') {
            setTimeout(() => {
                if (bar.textContent === msg) {
                    bar.textContent = '';
                    bar.className = 'sys-settings-status';
                }
            }, 1800);
        }
    }

    static #cache = { UserSettings: null, SystemSettings: null };
    static #metaCache = { UserSettings: null, SystemSettings: null };

    /**
     * Creates a controller field if exist metaCache else return ❓
     * @param {string} key_field
     * @param {'UserSettings'|'SystemSettings'} scope
     * @returns {HTMLElement}
     */
    static async getController(key_field, scope) {
        console.assert(Settings.#SCOPES.includes(scope), `Settings.getController requires an explicit scope ('UserSettings'|'SystemSettings'), got: '${scope}'`);
        if (!Settings.#metaCache[scope]) {
            Settings.#metaCache[scope] = await Lobby.postAsync(`${scope}/Meta`);
        }
        const meta = Array.isArray(Settings.#metaCache[scope].data) ? Settings.#metaCache[scope].data : [];
        const field = meta.find(f => f.key === key_field);
        if (!field) {
            const mock = document.createElement("div");
            mock.innerText = `❓`;
            UiBuilder.addHint({ hint: `${scope} does not provide a backend definition of\n'${key_field}'`, target: mock })
            return mock;
        }

        if (!Settings.#cache[scope]) {
            Settings.#cache[scope] = await Lobby.postAsync(`${scope}/Get`);
        }
        const value = Settings.#cache[scope]?.[key_field] ?? "🚫";
        const patchFn = async (key, val, el) => {
            const r = el.getBoundingClientRect();
            try {
                await Lobby.postAsync(`${scope}/Patch`, { [key]: val });
                UiBuilder.Notify('✔ Saved', { clientX: r.left, clientY: r.top });
            } catch (e) {
                UiBuilder.Notify('⚠ ' + (e?.message ?? String(e)), { clientX: r.left, clientY: r.top });
            }
        };

        const row = document.createElement('div');
        row.className = 'sys-settings-row';

        const label = document.createElement('span');
        label.className = 'sys-settings-label' + (field.writable ? '' : ' read-only');
        label.textContent = Locale.at[field.key] ?? Settings.#humanize(field.key);
        label.title = field.key;
        if (field.type != 'bool' && field.type != 'datetime') {
            row.appendChild(label);
        }
        row.appendChild(Settings.#buildControl(field, value, patchFn));
        return row;
    }

    static async at(key, scope) {
        console.assert(Settings.#SCOPES.includes(scope), `Settings.at requires an explicit scope ('UserSettings'|'SystemSettings'), got: '${scope}'`);
        if (!Settings.#cache[scope]) {
            Settings.#cache[scope] = await Lobby.postAsync(`${scope}/Get`);
        }
        return Settings.#cache[scope]?.[key] ?? null;
    }

    static #humanize(key) {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
    }
}
