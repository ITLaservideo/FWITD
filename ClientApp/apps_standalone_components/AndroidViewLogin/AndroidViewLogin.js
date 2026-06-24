/**
 * @version 1.0
 */
class AndroidViewLogin extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options 
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        this.#initialize();
        this.#addEventListeners();
        if (typeof this.options.onReady === "function") {
            this.options.onReady();
        }
    }
    elements = {
        /**
         * @type HTMLElement
         */
        social_login_requests: null,
        /**
         * @type HTMLElement
         */
        button_login: null,
        /**
         * @type HTMLElement
         */
        button_signup: null,
        /**
         * @type HTMLElement
         */
        button_forgotpwd: null,
        /**
         * @type HTMLElement
         */
        input_pwd: null,
        /**
         * @type HTMLElement
         */
        input_login: null,
    }
    async #initialize() {
        const owner = this;
        owner.elements.social_login_requests = owner.self_ref.querySelector("[id='social_login_requests']");
        owner.elements.button_login = owner.self_ref.querySelector(`[id="button-login"]`);
        owner.elements.button_signup = owner.self_ref.querySelector(`[id="button-signup"]`);
        owner.elements.button_forgotpwd = owner.self_ref.querySelector(`[id="button-forgotpwd"]`);
        owner.elements.input_pwd = owner.self_ref.querySelector(`[id="input-pwd"]`);
        owner.elements.input_login = owner.self_ref.querySelector(`[id="input-login"]`);
        if (owner.options.social_login == undefined) {
            owner.elements.social_login_requests.remove();
        }
        if (owner.options.can_sign_up != true) {
            owner.elements.button_signup.remove();
        }
        if (owner.options.can_retrieve_password != true) {
            owner.elements.button_forgotpwd.remove();
        }
        return;
    }
    // demo fw-click listern
    // static incrementer = 0;
    // async onClickGigioed(event) {
    //     const element_with_this_event = this;
    //     /**
    //      * @type AndroidViewLogin
    //      */
    //     const owner = element_with_this_event.fwInstanceReference;
    //     owner.elements.Gigioed.innerText = `ajio ${AndroidViewLogin.incrementer++}`;
    // }
    async #addEventListeners() {
        const owner = this;
        const text_icon = owner.elements.button_login.getElementsByClassName("f-icon-i")[0];
        owner.elements.input_pwd.addEventListener("keyup", (event) => {
            if (event.key === "Enter") {
                owner.elements.button_login.click();
            }
        });
        owner.elements.button_login.addEventListener("click", async (event) => {
            const s = owner.elements.button_login.getBoundingClientRect();
            if (owner.elements.input_login.value.trim().length < 3 || owner.elements.input_pwd.value.trim() < 3) {
                new Notify({
                    text: `${Locale.at("not valid inputs")}`,
                    event: { clientX: s.x, clientY: s.y },
                    ms_timeout: 2000,
                    style: 3,
                    type: 1
                });
                return;
            }
            owner.elements.button_login.classList.toggle("clicked", true);
            text_icon.innerHTML = "&#xe898;";
            // owner.elements.button_login.lastElementChild.innerText = `${owner.elements.button_login.lastElementChild.innerText}...`;
            await new Promise((resolve) => {
                Lobby.post({
                    prompt: 7/*login*/,
                    data1: owner.elements.input_login.value.trim(),
                    data2: owner.elements.input_pwd.value.trim()
                }, (rsp) => {
                    resolve();
                    if (rsp.error != undefined) {
                        new Notify({
                            text: `${Locale.at("authentication failed")}`,
                            event: { clientX: s.x, clientY: s.y },
                            ms_timeout: 2000,
                            style: 3,
                            type: 1
                        });
                        //owner.elements.button_login.lastElementChild.innerText = `${owner.elements.button_login.lastElementChild.innerText.replace("...", "")}`;
                        setTimeout(() => {
                            text_icon.innerHTML = "&#xe73c;";
                            owner.elements.button_login.classList.toggle("clicked", false);
                        }, 500);
                    } else if (rsp.data == "waiting device authentication") {
                        new Notify({
                            text: `${Locale.at("required OTP")}`,
                            event: { clientX: s.x, clientY: s.y },
                            ms_timeout: 2000,
                            style: 3,
                            type: 0
                        });
                        setTimeout(async () => {
                            owner.self_ref.innerText = "";
                            const otp_component = new OTPComponent({});
                            owner.self_ref.appendChild(otp_component.elementReference());
                        }, 500);
                    } else {
                        new Notify({
                            text: `${Locale.at("authenticated")}`,
                            event: { clientX: s.x, clientY: s.y },
                            ms_timeout: 2000,
                            style: 3,
                            type: 0
                        });
                        text_icon.innerHTML = "&#xf656;";
                        setTimeout(async () => {
                            await new Promise((resolve) => {
                                Lobby.post({ prompt: 14/*open the app*/ }, (rsp) => {
                                    resolve();
                                    //owner.elements.button_login.classList.toggle("clicked", false);
                                });
                            });
                        }, 500);
                    }
                });
            });
        });
        owner.elements.button_signup.addEventListener("click", async () => {
            owner.elements.button_signup.classList.toggle("clicked", true);
            await new Promise((resolve) => {
                Lobby.post({ prompt: -9999/*sign up*/ }, (rsp) => {
                    resolve();
                    //owner.elements.button_login.classList.toggle("clicked", false);
                });
            });
        });
        owner.elements.button_forgotpwd.addEventListener("click", async () => {
            owner.elements.button_forgotpwd.classList.toggle("clicked", true);
            await new Promise((resolve) => {
                Lobby.post({ prompt: -9999/*sign up*/ }, (rsp) => {
                    resolve();
                    //owner.elements.button_login.classList.toggle("clicked", false);
                });
            });
        });
        const all_fields = owner.self_ref.getElementsByClassName("field");
        for (let i = 0; i < all_fields.length; i++) {
            const element = all_fields[i];
            element.addEventListener("click", async () => {
                element.querySelector("input").focus();
            })
        }
    }
    // owner.self_ref;//access element reference here
    // owner.elementReference();//alternative way to access element reference
    // owner.destroy();//call destroy method when needed
    // owner.options;//access building options here
}
