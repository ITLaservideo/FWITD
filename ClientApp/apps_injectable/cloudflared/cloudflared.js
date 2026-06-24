const wait100ms = UiBuilder.wait100ms;
/**
 * @version 1.0
 */
class App {
    elements = {
        /**
         * @type Element
         */
        floating_container: null
    }
    constructor() {
        AppStatus.displayVersion();
        this.#init();
        const late_ops = setInterval(() => {
            if (document.readyState == 'complete') {
                App.#onPageFullyLoaded();
                clearInterval(late_ops);
                // UiBuilder.Notify("🪒 time " + `cloudflared`);
            }
        }, 750);
    }
    static #onPageFullyLoaded() {
        //TODO
    }
    async #init() {
        this.elements.floating_container = UiBuilder.createFloatingContainer(null, {
            id: "main-floater",
            direction: "vertical",
            style: "min-width:90px;"
        });
        // this.elements.floating_container.classList.add("themain-floating-container");
        const owner = this;
        const some_style = "white-space:nowrap;font-size: 15px;height: fit-content;";
        const btn = UiBuilder.createButton({
            onClick: async () => {
                document.getElementById("email").focus();
                await wait100ms();
                await Lobby.postAsync("Windows/TypeKey", {
                    key: "cf-the-email"
                });
                await wait100ms();
                document.getElementById("password").focus();
                await wait100ms();
                await Lobby.postAsync("Windows/TypeKey", {
                    key: "cf-the-password"
                });
                try {
                    const captha_iframe_container = document.querySelector("[data-testid='challenge-widget-container']");
                    const rect_captcha = captha_iframe_container.getBoundingClientRect();
                    await Lobby.postAsync("Windows/MoveMouseAt", {
                        x: Math.floor(rect_captcha.x + 20),
                        y: Math.floor(rect_captcha.y + 67)
                    });
                    await wait100ms();
                    await Lobby.postAsync("Windows/ClickAt", {
                        x: Math.floor(rect_captcha.x + 20),
                        y: Math.floor(rect_captcha.y + 67)
                    });
                    const button_confirm = captha_iframe_container.nextElementSibling;
                    const rect_button_confirm = button_confirm.getBoundingClientRect();
                    const max_iter = 10;
                    let iter = 0;
                    while (rect_button_confirm.firstElementChild.disabled && iter < max_iter) {
                        await wait100ms(1000);
                        iter++;
                    }
                    if (!rect_button_confirm.firstElementChild.disabled) {
                        await Lobby.postAsync("Windows/MoveMouseAt", {
                            x: Math.floor(rect_button_confirm.x + 80),
                            y: Math.floor(rect_button_confirm.y + 20)
                        });
                    }
                } catch { }
            },
            title: "type login"
            , style: some_style,
            icon_code: "f524"
        });
        const btn2 = UiBuilder.createButton({
            onClick: async () => {
                window.location.href = AppStatus.CF_URL_NEW_TUNNEL;
            },
            title: "++tunnel"
            , style: some_style
        });
        const btn3 = UiBuilder.createButton({
            onClick: async (event) => {
                // step 0: find sub domain
                let url_prefix = null;
                try {
                    url_prefix = document.body.innerHTML.toLowerCase().match(/legend[0-9]+/)[0];
                } catch { }
                try {
                    url_prefix = document.body.innerHTML.toLowerCase().match(/tiger[0-9]+/)[0];
                } catch { }
                if (url_prefix == null) {
                    UiBuilder.Notify("nome della macchina non trovato o non gestito \n(tiger|legend)[0-9]+", event, 6000);
                    return;
                }

                // step 1: type sub domain
                document.getElementById("domain.subdomain").focus();
                await Lobby.postAsync("Windows/Type", {
                    text: url_prefix
                });
                App.scrollBot();
                await wait100ms();

                // step 2: type target url
                document.getElementById("service.url").focus();
                await Lobby.postAsync("Windows/TypeKey", {
                    key: "cf-the-local-app-url"
                });
                App.purgePageBeforeCompletingTunnel();
                App.scrollBot();
                await wait100ms();

                // step 3: click dropdown domain
                const domain_dropdown_rect = document.getElementById("domain.domain").getBoundingClientRect();
                await Lobby.postAsync("Windows/ClickAt", {
                    x: Math.floor(domain_dropdown_rect.x + 100),
                    y: Math.floor(domain_dropdown_rect.y)
                });
                await wait100ms();

                // step 4: click first selection

                let coo_x_domain_selection = null;
                let coo_y_domain_selection = null;
                for (let nth_select = 0; nth_select < 20; nth_select++) {
                    for (let nth_RS = 0; nth_RS < 20; nth_RS++) {
                        const element = document.getElementById(`react-select-${nth_RS}-option-${nth_select}`);
                        if (element) {
                            if ((element.firstElementChild.innerText ?? '').toLowerCase().trim() == 'open-shop.eu') {
                                const the_pos_http_selection = element.getBoundingClientRect();
                                coo_x_domain_selection = Math.floor(the_pos_http_selection.x + 50);
                                coo_y_domain_selection = Math.floor(the_pos_http_selection.y + 20);

                                UiBuilder.Notify("✔", { clientX: coo_x_domain_selection + 150, clientY: coo_y_domain_selection + 23 }, 500);
                                break;
                            }
                        }
                    }
                    if (coo_x_domain_selection && coo_y_domain_selection) {
                        break;
                    }
                }
                if (coo_x_domain_selection == null || coo_y_domain_selection == null) {
                    UiBuilder.Notify("le coordinate di sto maledetto DOMAIN non riesco a trovarle\nreact select del piffero...", event, 6000);
                    return;
                }
                await Lobby.postAsync("Windows/ClickAt", {
                    x: Math.floor(coo_x_domain_selection),
                    y: Math.floor(coo_y_domain_selection)
                });

                // step 5: open dropdown service
                document.getElementById("service.type").focus();
                await wait100ms(500); // extra delay before reading rect
                const service_dropdown_rect = document.getElementById("service.type").getBoundingClientRect();
                await Lobby.postAsync("Windows/ClickAt", {
                    x: Math.floor(service_dropdown_rect.x + 100),
                    y: Math.floor(service_dropdown_rect.y)
                });
                await wait100ms();
                App.scrollBot();
                await wait100ms();

                // step 6: click dropdown service selection
                let coo_x_http_selection = null;
                let coo_y_http_selection = null;
                for (let nth_select = 0; nth_select < 20; nth_select++) {
                    for (let nth_RS = 0; nth_RS < 20; nth_RS++) {
                        const element = document.getElementById(`react-select-${nth_RS}-option-${nth_select}`);
                        if (element) {
                            if ((element.firstElementChild.innerText ?? '').toLowerCase().trim() == "http") {
                                const the_pos_http_selection = element.getBoundingClientRect();
                                coo_x_http_selection = Math.floor(the_pos_http_selection.x + 50);
                                coo_y_http_selection = Math.floor(the_pos_http_selection.y + 20);

                                UiBuilder.Notify("✔", { clientX: coo_x_http_selection + 150, clientY: coo_y_http_selection + 23 }, 500);
                                break;
                            }
                        }
                    }
                    if (coo_x_http_selection && coo_y_http_selection) {
                        break;
                    }
                }
                if (coo_x_http_selection == null || coo_y_http_selection == null) {
                    UiBuilder.Notify("le coordinate di sto maledetto HTTP non riesco a trovarle\nreact select del piffero...", event, 6000);
                    return;
                }
                await Lobby.postAsync("Windows/ClickAt", {
                    x: Math.floor(coo_x_http_selection),
                    y: Math.floor(coo_y_http_selection)
                });
                await wait100ms();

                // step 7: move mouse to
                const buttons = document.querySelectorAll(`[type="button"]`);
                let i_scroller = buttons.length - 1;
                let the_real_save_button = buttons[i_scroller];
                while ((!the_real_save_button.innerText.trim().toLowerCase().includes("salva")) && (!the_real_save_button.innerText.trim().toLowerCase().includes("completa")) && i_scroller >= 0) {
                    the_real_save_button = buttons[i_scroller];
                    i_scroller--;
                }
                const dom_rect_save_btn = the_real_save_button.getBoundingClientRect();
                await Lobby.postAsync("Windows/MoveMouseAt", {
                    x: Math.floor(dom_rect_save_btn.x + 20),
                    y: Math.floor(dom_rect_save_btn.y + 10)
                });
                // fine
                setTimeout(() => {
                    btn3.classList.remove("clicked");
                }, 1000);
            },
            title: "complete tunnel"
            , style: some_style,
            icon_code: "f3d8"
        });
        const btnx = UiBuilder.createButton({
            onClick: async () => {
                window.location.href = AppStatus.CF_URL_DeleteURL;
            },
            title: "-- url"
            , style: some_style
        });
        // const btn5_container = document.createElement("div");
        // btn5_container.style.display = "flex";
        // btn5_container.style.flexDirection = "column";
        // btn5_container.style.gap = "4px";
        // const btn5 = UiBuilder.createAccordion({
        //     titles: ["➲ navigate"],
        //     content: [btn5_container],
        //     id: "section_navigate"
        // });
        // btn5.addEventListener("contextmenu", (event) => {
        //     btn2.onClick();
        //     event.preventDefault();
        //     event.stopPropagation();
        // });
        // btn5_container.appendChild(btn2);
        // btn5_container.appendChild(btnx);
        owner.elements.floating_container.appendChild(btn);
        owner.elements.floating_container.appendChild(btn3);
        // owner.elements.floating_container.appendChild(btn5);
        owner.elements.floating_container.appendChild(btn2);
        owner.elements.floating_container.appendChild(btnx);
        const the_intervall = setInterval(() => {
            try {
                if (document.body.innerText.includes("cloudflared.exe service install")) {
                    clearInterval(the_intervall);
                    setTimeout(() => {
                        App.scrollBot();
                        setTimeout(() => {
                            App.scrollBot();
                        }, 1000);
                    }, 50);
                }
            } catch (error) {

            }
        }, 1000);
    }
    static scrollBot() {
        const footers = document.getElementsByTagName("footer");
        for (let i = 0; i < footers.length; i++) {
            setTimeout(() => {
                console.log("sto scrollando");
                footers[i].scrollIntoView();
            }, i * 5);
        }
    }
    static purgePageBeforeCompletingTunnel() {
        try { document.getElementsByClassName("mt-3")[1].remove(); } catch { }
        try { document.getElementsByClassName("bz ca cb cd iq cf bn")[0].remove(); } catch { }
        try { document.getElementsByClassName("mt-3 flex flex-row flex-wrap")[0].style = "opacity:0;height:0;" } catch (error) { }
        try { document.getElementsByClassName("gi gj gk gl gb gm bn")[0].remove(); } catch (error) { }
        try { const ss = document.getElementsByClassName("gi gj gk gl hn gm bn"); const ff = ss[0]; const ff2 = ss[1]; ff.remove(); ff2.remove(); } catch (error) { }
        try { document.getElementsByClassName("flex w-full list-none flex-row gap-4 border-solid leading-[1.15] items-center border-none")[0].remove(); } catch (error) { }
        try {
            document.getElementsByClassName("flex w-full list-none flex-row gap-4 border-solid leading-[1.15] items-center border-none")[0].remove();
        } catch (error) { }
        try { document.getElementsByClassName("bz ca cb cd cf qn")[0].remove(); } catch (error) { }
        try { document.getElementsByClassName("bz ca cb cd hw cf bn")[0].remove(); } catch (error) { }
        try { document.getElementsByClassName("l go bq dc")[0].remove(); } catch (error) { }
        try { } catch (error) { }
        try {
            const ffs = document.getElementsByClassName("hr bq bs hs ht h hu hv hw hx")[0].children[0];
            const ffs2 = document.getElementsByClassName("hr bq bs hs ht h hu hv hw hx")[0].children[1];
            ffs.remove();
            ffs2.remove();
        } catch (error) { }
    }
}