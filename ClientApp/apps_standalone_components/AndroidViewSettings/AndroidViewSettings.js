/**
 * @version 1.0
 */
class AndroidViewSettings extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        this.#initialize();
        this.#addEventListeners();
        const ts = new ThemeSelector({ auto_deploy: false, label: "change theme", floating: false });
        this.self_ref.appendChild(ts.elementReference());
        //add event listener onBack
        //don't execute the other ones and prevent default 
        //owner.destroy();
        //remove remove the event listener on back
    }
    /**
     * store here the elements references of the html  
     * automatically gathers elements with attribute ` fw-id="xxx" ` after super()
     */
    elements = {
        /**
         * @type HTMLElement
         */
        self_ref: this.self_ref
    }
    async #initialize() {
        const owner = this;
        owner.#addNotifications();
        //TODO initialize component here
        return;
    }
    async #addEventListeners() {
        const owner = this;
        //TODO add event listeners for component here
    }
    // owner.self_ref;//access element reference here
    // owner.elementReference();//alternative way to access element reference
    // owner.destroy();//call destroy method when needed
    // owner.options;//access building options here

    //#region FrameworkEventListeners
    async #onButtonTestClick() {// add attribute inside the .html ` fw-click='#onButtonTestClick' `
        /**
         * @type HTMLElement
         */
        const element_with_this_event = this;
        /**
         * @type AndroidViewSettings
         */
        const owner = element_with_this_event.fwInstanceReference;
        element_with_this_event.classList.add("clicked");
        alert("clicked");
    }
    //#endregion
    //#region SettingsList
    #addNotifications() {
        const owner = this;
        const self_aware = {
            yes: AppStatus.UseThisDeviceForNotifications
        }
        const options_create_toggle = {
            label: Locale.at("ricevi notifiche su questo dispositivo"),
            innerText: {
                on: Locale.at("is_on"),
                off: Locale.at("is_off")
            },
            onClick: (event) => {
                if (self_aware.yes) {
                    UiBuilder.mockDialog({
                        text1: `${Locale.at("Unregister this device from Notifications and OTP authentication.")} \n\n${Locale.at("You'll be able to access your account without second factor authentication (not recommended).")} \n\n${Locale.at("You will NOT receive notifications about finished products.")}`,
                        onConfirm: () => {
                            self_aware.yes = false;
                            Lobby.post({ prompt: 20/*use this device for notifications*/, a_number: new Number(self_aware.yes) }, (rsp) => {
                                if (rsp.error != undefined) {
                                    return;
                                }
                                AppStatus.UseThisDeviceForNotifications = self_aware.yes;
                                options_create_toggle.setIsOn(self_aware.yes);
                            });
                        },
                        onConfirmText: Locale.at("unpair device"),
                        onDeny: () => {
                        },
                        onDenyText: Locale.at("close"),
                        onClose: () => {
                        },
                        prefer_selection: 0
                    });
                } else {
                    UiBuilder.mockDialog({
                        text1: `${Locale.at("use this device for notifications like")} \n${Locale.at("OTP authentication")} \n${Locale.at("finished products")} \n${Locale.at("etc.")}`,
                        onConfirm: () => {
                            self_aware.yes = true;
                            Lobby.post({ prompt: 20/*use this device for notifications*/, a_number: new Number(self_aware.yes) }, (rsp) => {
                                if (rsp.error != undefined) {
                                    return;
                                }
                                AppStatus.UseThisDeviceForNotifications = self_aware.yes;
                                options_create_toggle.setIsOn(self_aware.yes);
                            });
                        },
                        onConfirmText: Locale.at("pair device"),
                        onDeny: () => {
                        },
                        onDenyText: Locale.at("close"),
                        onClose: () => {
                        },
                        prefer_selection: 1
                    });
                }
            },
            isOn: self_aware.yes,
            // theme: "mini"
        };
        const toggle = UiBuilder.createToggle(options_create_toggle);
        toggle.style.marginLeft = "4px";
        owner.self_ref.appendChild(toggle);
    }
    //#endregion
}