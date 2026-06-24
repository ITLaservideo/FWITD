/**
 * @version 1.0
 */
class SystemSettings extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        this.#initialize();
        if (typeof this.options.onReady === "function") {
            this.options.onReady();
        }
    }

    elements = {
        /** @type {HTMLElement} */
        self_ref: this.self_ref,
        /** @type {HTMLElement} */
        settings_list: null,
        /** @type {HTMLElement} */
        status_bar: null,
    }

    async #initialize() {
        const owner = this;
        try {
            const [getRes, metaRes] = await Promise.all([
                Lobby.postAsync('SystemSettings/Get'),
                Lobby.postAsync('SystemSettings/Meta'),
            ]);
            SystemSettings.#cache = getRes;
            SystemSettings.#metaCache = metaRes;
            const values = Object.fromEntries(
                Object.entries(getRes).filter(([k]) => !k.startsWith('__'))
            );
            const meta = Array.isArray(metaRes.data) ? metaRes.data : [];
            owner.#renderSettings(meta, values);
        } catch (err) {
            owner.#showStatus('Failed to load settings', 'err');
        }
    }

    #renderSettings(meta, values) {
        const owner = this;
        const list = owner.elements.settings_list;
        list.innerHTML = '';

        if (meta.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'font-size:11px;color:var(--vscode-descriptionForeground,#858585);text-align:center;padding:12px 0;';
            empty.textContent = 'No settings available.';
            list.appendChild(empty);
            return;
        }

        for (const field of meta) {
            const row = document.createElement('div');
            row.className = 'sys-settings-row';

            const label = document.createElement('span');
            label.className = 'sys-settings-label' + (field.writable ? '' : ' read-only');
            label.textContent = Locale.at[field.key] ?? SystemSettings.#humanize(field.key);
            label.title = field.key;
            row.appendChild(label);

            row.appendChild(owner.#createControl(field, values[field.key]));
            list.appendChild(row);
        }
    }

    #createControl(field, value) {
        return SystemSettings.#buildControl(field, value, (k, v, el) => this.#patchSetting(k, v, el));
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
                const lbl = document.createElement('label');
                lbl.className = 'sys-settings-toggle';
                const chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.checked = !!value;
                const slider = document.createElement('span');
                slider.className = 'sys-settings-slider';
                lbl.append(chk, slider);
                chk.onchange = () => patchFn(field.key, chk.checked, chk);
                return lbl;
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
                const inp = document.createElement('input');
                inp.type = 'datetime-local';
                inp.className = 'sys-settings-input';
                if (value) inp.value = new Date(value).toISOString().slice(0, 16);
                inp.onchange = () => patchFn(field.key, inp.value || null, inp);
                return inp;
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
     * 
     * @param {string} key 
     * @param {string} value 
     * @param {HTMLElement} inp 
     */
    async #patchSetting(key, value, inp) {
        const owner = this;
        const where = inp.getBoundingClientRect();
        const x = where.left;
        const y = where.top;
        try {
            await Lobby.postAsync('SystemSettings/Patch', { [key]: value });
            // owner.#showStatus('Saved', 'ok');
            UiBuilder.Notify('✔ Saved', { clientX: x, clientY: y });
        } catch (e) {
            // owner.#showStatus('Error saving', 'err');
            UiBuilder.Notify('⚠ ' + (e?.message ?? String(err)), { clientX: x, clientY: y });
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

    static #cache = null;
    static #metaCache = null;

    /**
     * Creates a controller field if exist metaCache else return ❓
     * @returns {HTMLElement}
     */
    static async getController(key_field) {
        if (!SystemSettings.#metaCache) {
            SystemSettings.#metaCache = await Lobby.postAsync('SystemSettings/Meta');
        }
        const meta = Array.isArray(SystemSettings.#metaCache.data) ? SystemSettings.#metaCache.data : [];
        const field = meta.find(f => f.key === key_field);
        if (!field) {
            const mock = document.createElement("div");
            mock.innerText = `❓`;
            UiBuilder.addHint({ hint: `SystemSettings does not provide a backend definition of\n'${key_field}'`, target: mock })
            return mock;
        }

        if (!SystemSettings.#cache) {
            SystemSettings.#cache = await Lobby.postAsync('SystemSettings/Get');
        }
        const value = SystemSettings.#cache?.[key_field] ?? "🚫";
        // if (null == SystemSettings.#cache?.[key_field]) {
        //     field.writable = false;
        // }
        const patchFn = async (key, val, el) => {
            const r = el.getBoundingClientRect();
            try {
                await Lobby.postAsync('SystemSettings/Patch', { [key]: val });
                UiBuilder.Notify('✔ Saved', { clientX: r.left, clientY: r.top });
            } catch (e) {
                UiBuilder.Notify('⚠ ' + (e?.message ?? String(e)), { clientX: r.left, clientY: r.top });
            }
        };

        const row = document.createElement('div');
        row.className = 'sys-settings-row';

        const label = document.createElement('span');
        label.className = 'sys-settings-label' + (field.writable ? '' : ' read-only');
        label.textContent = Locale.at[field.key] ?? SystemSettings.#humanize(field.key);
        label.title = field.key;

        row.append(label, SystemSettings.#buildControl(field, value, patchFn));
        return row;
    }

    static async at(key) {
        if (!SystemSettings.#cache) {
            SystemSettings.#cache = await Lobby.postAsync('SystemSettings/Get');
        }
        return SystemSettings.#cache?.[key] ?? null;
    }

    static #humanize(key) {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
    }
}
