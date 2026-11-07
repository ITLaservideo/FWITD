const debug = false;
/**
 * @version 1.1
 */
class App {
    elements = {
        app_main_content: document.getElementById("app-main-content"),
    }
    constructor() {
        this.#init();
        this.#asyncInit();
    }
    #init() {
        AppStatus.displayVersion();
    }
    async #asyncInit() {
        const owner = this;
        await App.askVehicleInfo();
        await App.askMileage();
        const dashboard = new VehicleDashboard({});
        owner.elements.app_main_content.appendChild(dashboard.elementReference());
    }

    /**
     * The vehicle types the backend (`VehicleMaintenanceController.VehicleType`) knows, with their display data.
     * @returns {{type: 'Car'|'Motorcycle', title: string, icon_code: string, placeholder: string}[]}
     */
    static get VEHICLE_TYPES() {
        return [
            { type: 'Car', title: Locale.at('Car'), icon_code: 'e531', placeholder: 'e.g. Fiat Panda' },
            { type: 'Motorcycle', title: Locale.at('Motorcycle'), icon_code: 'e9f9', placeholder: 'e.g. Honda CB500F' },
        ];
    }
    /**
     * @param {string} type
     */
    static vehicleTypeInfo(type) {
        return App.VEHICLE_TYPES.find(t => t.type === type) ?? App.VEHICLE_TYPES[0];
    }

    /**
     * Shows the onboarding form the first time no vehicle info is stored, or always when `force` is set
     * (used by VehicleDashboard's "edit info" button to let the user revise it later).
     * @param {boolean} [force=false]
     * @returns {Promise<void>}
     */
    static async askVehicleInfo(force = false) {
        const info = await Lobby.postAsync('VehicleMaintenance/GetInfo');
        if (!force && info.hasInfo) return;
        return new Promise((resolve) => {
            const body = App.#buildInfoForm(info);
            UiBuilder.mockDialog({
                text1: Locale.at('Tell us about your vehicle'),
                body,
                hideOnDeny: true,
                onConfirmText: Locale.at('Save'),
                onConfirm: async () => {
                    const { model, plate } = body.__inputs;
                    await Lobby.postAsync('VehicleMaintenance/SaveInfo', {
                        type: body.__getType(),
                        model: model.value.trim(),
                        plate: plate.value.trim() || null,
                        year: body.__getYear(),
                    });
                    resolve();
                },
            });
        });
    }

    /**
     * Always asks the current mileage on load, prefilled with the last known value.
     * @returns {Promise<void>}
     */
    static async askMileage() {
        const { currentMileageKm } = await Lobby.postAsync('VehicleMaintenance/GetCurrentMileage');
        return new Promise((resolve) => {
            UiBuilder.askNumberInput({
                title: Locale.at('Update current mileage'),
                description: Locale.at('Current mileage (km)'),
                value: currentMileageKm ?? undefined,
                min: 0,
                onConfirm: async (km) => {
                    await Lobby.postAsync('VehicleMaintenance/SaveMileage', { km: Math.round(km) });
                    resolve();
                },
                onCancel: () => resolve(),
            });
        });
    }

    static #buildInfoForm({ type, model, plate, year, hasInfo } = {}) {
        // a brand-new profile has no stored type yet (the backend reports its fallback): offer the first type instead
        let selected_type = hasInfo ? type : App.VEHICLE_TYPES[0].type;
        // `createDropDownButtonSelector` always shows `titles[0]` first: put the current type on top
        const types = [App.vehicleTypeInfo(selected_type), ...App.VEHICLE_TYPES.filter(t => t.type !== selected_type)];
        const inputs = {
            model: UiBuilder.createInput({ type: 'text', placeholder: App.vehicleTypeInfo(selected_type).placeholder, value: model }),
            plate: UiBuilder.createInput({ type: 'text', placeholder: 'e.g. AB123CD', value: plate }),
        };
        // stays null until a year is picked (the picker itself always holds one, defaulting to the current year)
        let selected_year = year ?? null;
        const year_picker = new DatePicker({
            year_only: true,
            min_year: 1900,
            max_year: new Date().getFullYear() + 1,
            placeholder: 'e.g. 2020',
            value: year ?? undefined,
            onChange: (_, dp) => { selected_year = dp.status.selected_year; },
        });
        const type_selector = UiBuilder.createDropDownButtonSelector({
            titles: types.map(t => t.title),
            direction_open: 'bottom',
            stealth: false,
            onSelectionChange: (index) => {
                selected_type = types[index].type;
                inputs.model.placeholder = types[index].placeholder;
            },
        });
        const group = UiBuilder.createSettingsGroup({
            rows: [
                UiBuilder.createSettingsRow({ label: Locale.at('Type'), control: type_selector }),
                UiBuilder.createSettingsRow({ label: Locale.at('Model'), control: inputs.model }),
                UiBuilder.createSettingsRow({ label: Locale.at('Plate'), control: inputs.plate }),
                UiBuilder.createSettingsRow({ label: Locale.at('Year'), control: year_picker.elementReference() }),
            ],
        });
        group.classList.add('vm-info-form');
        group.__inputs = inputs;
        group.__getType = () => selected_type;
        group.__getYear = () => selected_year;
        return group;
    }
}
