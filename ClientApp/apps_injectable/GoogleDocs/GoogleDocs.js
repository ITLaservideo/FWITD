const wait100ms = UiBuilder.wait100ms;
/**
 * automatically instantiated with setTimeout(`window.the_main_app = new App()`)
 */
class App {
    elements = {
        /**
         * @type Element
         */
        floating_container: null,
        docs_editor_container: document.getElementById("docs-editor-container")
    }
    constructor() {
        const owner = this;
        this.#init();
        const late_ops = setInterval(() => {
            if (document.readyState == 'complete') {
                owner.#onPageFullyLoaded();
                clearInterval(late_ops);
                UiBuilder.Notify("🪒 time " + `GoogleDocs`);
                let dw_ = null;
                dw_ = setInterval(() => {
                    if (document.getElementsByClassName("appsDocsUiWizFindbarFindInputContainer").length <= 0) {
                        return;
                    }
                    const kix_finding_box = document.getElementsByClassName("appsElementsPositionedSurfaceContainer")[0];
                    if (kix_finding_box) {
                        document.body.appendChild(kix_finding_box);
                        Object.assign(kix_finding_box.style, {
                            zIndex: '999999999999999999999',
                        });
                        if (dw_ != null) {
                            clearInterval(dw_);
                        }
                    }
                }, 1500);
            }
        }, 750);
    }
    async #init() {
        const owner = this;
        owner.elements.floating_container = UiBuilder.createFloatingContainer(null, {
            id: "test-floater",
            direction: "verical",
            start_location: { left: '0', top: 'calc(100vh - 55px)' },
            style: 'z-index:2222222222;min-width:87px;min-height:unset;',
        });
        // this.elements.floating_container.classList.add("themain-floating-container");
        // const some_style = "width:fit-content;white-space:nowrap;font-size: 15px;height: fit-content;";
        const input = document.createElement("input");
        input.setAttribute("placeholder", "extract matricole");
        Object.assign(input.style, {
            width: "120px",
            margin: "2px",
        });
        owner.elements.floating_container.appendChild(input);
        console.log("hi there")
        input.addEventListener("paste", async (event) => {
            const copiedText = event.clipboardData.getData("text").trim();
            const found = copiedText
                .split('\n')
                .filter(line => line.includes("machine "))
                .map(line => line.match(/machine (\d+)/i)?.[1])
                .filter(Boolean);
            if (found.length === 0) {
                UiBuilder.Notify(`nessuna matricola trovata 'machine [0-9]+'`);
                return
            };
            event.preventDefault();
            // console.error();
            owner.elements.docs_editor_container.getElementsByClassName("kix-appview-editor")[0].scrollBy(0, 999999999999999999999999999999);
            await wait100ms();
            await Lobby.postAsync("Windows/ClickAt", {
                x: Math.floor(window.innerWidth - 20),
                y: Math.floor(window.innerHeight - 100)
            });
            await UiBuilder.wait100ms();
            await Lobby.postAsync("Windows/Type", {
                text: "\n" + found.join('\n')
            });
        });
        input.addEventListener("keyup", () => {
            input.value = '';
        });
        owner.#addOnResizeSaveWindowCoordinates();
        // AppStatus.displayVersion();
        //TODO
    }
    #addOnResizeSaveWindowCoordinates() {
        let timer = null;
        const scheduleSavePanelDimensions = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(async () => {
                await Lobby.postAsync("Settings/SaveDimensions", {
                    key: "GoogleDocs",
                    Width: window.innerWidth,
                    Height: window.innerHeight
                });
            }, 1000);
        };
        const onResizeWindow = () => {
            scheduleSavePanelDimensions();
        };

        window.addEventListener("resize", onResizeWindow);
    }
    #onPageFullyLoaded() {
        const owner = this;
        // return;
        document.body.appendChild(owner.elements.docs_editor_container);

        Object.assign(owner.elements.docs_editor_container.style, {
            position: "absolute",
            left: 0,
            top: 0,
            zIndex: 124124214321421521341,
            height: "100vh",
            width: "100vw",
        });
        // owner.elements.docs_editor_container.getElementsByClassName("left-sidebar-container")[0].remove();
        // document.body.appendChild(owner.elements.docs_editor_container.getElementsByClassName("kix-appview-editor-container")[0])
        // Object.assign(owner.elements.docs_editor_container.getElementsByClassName("kix-appview-editor-container")[0].style, {
        //     left: "-350px",
        // });
        setTimeout(() => {
            Object.assign(owner.elements.docs_editor_container.getElementsByClassName("kix-rotatingtilemanager")[0].style, {
                width: "100vw",
            });
            const figli = owner.elements.docs_editor_container.getElementsByClassName("kix-rotatingtilemanager-content")[0].children;
            for (let i = 0; i < figli.length; i++) {
                const element = figli[i];
                //console.log(element);
                Object.assign(element.style, {
                    width: "100vw",
                });
            }
            Object.assign(owner.elements.docs_editor_container.getElementsByClassName("kix-appview-editor")[0].style, {
                width: "100vw",
                height: "100vh",
            });
            const bt_side_crap = owner.elements.docs_editor_container.getElementsByClassName("navigation-widget-hat-close")[0];
            ['mousedown', 'mouseup', 'click'].forEach(type =>
                bt_side_crap.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }))
            );
            document.body.appendChild(owner.elements.floating_container);
            setTimeout(() => {
                const kix_editor = owner.elements.docs_editor_container.getElementsByClassName("kix-appview-editor")[0];
                kix_editor.scrollBy(0, kix_editor.scrollHeight - 440);
            }, 0);
        }, 1000);
        // owner.elements.docs_editor_container.getElementsByClassName("kix-rotatingtilemanager")[0].style.left=0;
        // owner.elements.docs_editor_container.getElementsByClassName("kix-scrollareadocumentplugin")[0].style.left=0;
    }
}
//new SpeedActions()