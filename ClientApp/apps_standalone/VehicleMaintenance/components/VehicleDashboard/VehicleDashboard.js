/**
 * @version 1.1
 */
class VehicleDashboard extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        this.#initialize();
    }
    elements = {
        /** @type {HTMLElement} */
        self_ref: this.self_ref,
        /** @type {HTMLElement} */
        vehicle_icon: null,
        /** @type {HTMLElement} */
        vehicle_name: null,
        /** @type {HTMLElement} */
        vehicle_sub: null,
        /** @type {HTMLElement} */
        btn_change_profile: null,
        /** @type {HTMLElement} */
        btn_edit_info: null,
        /** @type {HTMLElement} */
        btn_update_mileage: null,
        /** @type {HTMLElement} */
        sections_container: null,
    }
    async #initialize() {
        const owner = this;
        owner.elements.btn_change_profile.addEventListener('click', () => owner.#openProfileSwitcher());
        owner.elements.btn_edit_info.addEventListener('click', async () => {
            await App.askVehicleInfo(true);
            await owner.#reload();
        });
        owner.elements.btn_update_mileage.addEventListener('click', async () => {
            await App.askMileage();
            await owner.#reload();
        });
        await owner.#reload();
    }
    async #reload() {
        const owner = this;
        const [info, mileage, tasksRsp] = await Promise.all([
            Lobby.postAsync('VehicleMaintenance/GetInfo'),
            Lobby.postAsync('VehicleMaintenance/GetCurrentMileage'),
            Lobby.postAsync('VehicleMaintenance/ListMaintenance'),
        ]);
        owner.#renderHeader(info, mileage);
        owner.#renderSections(Array.isArray(tasksRsp.data) ? tasksRsp.data : []);
    }
    async #openProfileSwitcher() {
        const owner = this;
        const rsp = await Lobby.postAsync('VehicleMaintenance/ListProfiles');
        const profiles = Array.isArray(rsp.data) ? rsp.data : [];
        const body = document.createElement('div');
        body.className = 'vd-profile-list';
        for (const p of profiles) {
            const row = document.createElement('div');
            row.className = 'vd-profile-row' + (p.isCurrent ? ' vd-profile-current' : '');
            const icon = Icons.create(App.vehicleTypeInfo(p.type).icon_code);
            icon.classList.add('vd-profile-icon');
            row.appendChild(icon);
            const label = document.createElement('span');
            label.className = 'vd-profile-label';
            label.textContent = [p.model, p.plate].filter(Boolean).join(' · ');
            row.appendChild(label);
            if (!p.isCurrent) {
                row.appendChild(UiBuilder.createButton({
                    title: Locale.at('Switch'),
                    class: 'vd-profile-action',
                    onClick: async () => {
                        await Lobby.postAsync('VehicleMaintenance/SwitchProfile', { id: p.id });
                        sheet.destroy();
                        await owner.#reload();
                    },
                }));
            }
            if (profiles.length > 1) {
                row.appendChild(UiBuilder.createButton({
                    title: Locale.at('Delete'),
                    class: 'vd-profile-action vd-profile-delete',
                    onClick: async () => {
                        await Lobby.postAsync('VehicleMaintenance/DeleteProfile', { id: p.id });
                        sheet.destroy();
                        await owner.#openProfileSwitcher();
                        await owner.#reload();
                    },
                }));
            }
            body.appendChild(row);
        }
        body.appendChild(UiBuilder.createButton({
            title: Locale.at('Add vehicle'),
            class: 'vd-profile-add',
            onClick: async () => {
                await Lobby.postAsync('VehicleMaintenance/CreateProfile');
                sheet.destroy();
                await App.askVehicleInfo(true);
                await App.askMileage();
                await owner.#reload();
            },
        }));
        const sheet = UiBuilder.mockDialog({
            text1: Locale.at('Your vehicles'),
            body,
            hideOnDeny: true,
            onConfirmText: Locale.at('Close'),
            onConfirm: () => { },
        });
    }
    #renderHeader(info, mileage) {
        const owner = this;
        const type_info = App.vehicleTypeInfo(info.type);
        owner.elements.vehicle_icon.replaceChildren(Icons.create(type_info.icon_code));
        owner.elements.vehicle_icon.title = type_info.title;
        owner.elements.vehicle_name.textContent = info.model || type_info.title;
        const plateYear = [info.plate, info.year].filter(Boolean).join(' · ');
        owner.elements.vehicle_sub.textContent =
            (plateYear ? plateYear + ' — ' : '') +
            `${Locale.at('mileage')}: ${mileage.currentMileageKm ?? '—'} km`;
    }
    #renderSections(items) {
        const owner = this;
        const container = owner.elements.sections_container;
        container.innerHTML = '';
        const categories = [
            { key: 'Ordinary', title: Locale.at('Ordinary maintenance') },
            { key: 'Extraordinary', title: Locale.at('Extraordinary maintenance') },
        ];
        for (const { key, title } of categories) {
            const group = items.filter(i => i.category === key);
            if (group.length === 0) continue;
            const section = document.createElement('div');
            section.className = 'vd-section';
            const heading = document.createElement('div');
            heading.className = 'vd-section-title';
            heading.textContent = title;
            section.appendChild(heading);
            const list = document.createElement('div');
            list.className = 'vd-list';
            for (const item of group) {
                list.appendChild(owner.#buildRow(item));
            }
            section.appendChild(list);
            container.appendChild(section);
        }
    }
    #buildRow(item) {
        const owner = this;
        const row = document.createElement('div');
        row.className = `vd-row vd-status-${item.status}`;
        const badge = document.createElement('span');
        badge.className = 'vd-badge';
        badge.textContent = VehicleDashboard.#statusLabel(item.status);
        row.appendChild(badge);
        const main = document.createElement('div');
        main.className = 'vd-row-main';
        const label = document.createElement('div');
        label.className = 'vd-row-label';
        label.textContent = item.label;
        main.appendChild(label);
        const detail = document.createElement('div');
        detail.className = 'vd-row-detail';
        detail.textContent = VehicleDashboard.#remainingText(item);
        main.appendChild(detail);
        row.appendChild(main);
        row.appendChild(UiBuilder.createButton({
            title: Locale.at('Mark done'),
            class: 'vd-row-action',
            onClick: async () => {
                await Lobby.postAsync('VehicleMaintenance/MarkDone', { key: item.key });
                UiBuilder.Notify(`✔ ${item.label}`);
                await owner.#reload();
            },
        }));
        return row;
    }
    static #statusLabel(status) {
        switch (status) {
            case 'overdue': return Locale.at('Overdue');
            case 'warning': return Locale.at('Due soon');
            case 'ok': return Locale.at('OK');
            default: return Locale.at('Info');
        }
    }
    static #remainingText(item) {
        const parts = [];
        if (item.lastKm != null) parts.push(`${Locale.at('last')}: ${item.lastKm} km`);
        if (item.lastDate != null) parts.push(Locale.localizeDate(item.lastDate));
        if (item.kmRemaining != null) {
            parts.push(item.kmRemaining >= 0
                ? `${item.kmRemaining} km ${Locale.at('left')}`
                : `${Locale.at('overdue by')} ${-item.kmRemaining} km`);
        }
        if (item.daysRemaining != null) {
            parts.push(item.daysRemaining >= 0
                ? `${item.daysRemaining} ${Locale.at('days left')}`
                : `${Locale.at('overdue by')} ${-item.daysRemaining} ${Locale.at('days')}`);
        }
        return parts.join(' · ') || Locale.at('as needed');
    }
}
