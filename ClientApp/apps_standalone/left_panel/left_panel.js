class App {
    #elements = {
    }
    /**
     * Represents the current status of the application.
     */
    static app_status = {
        bottom_section_visible: true
    };
    constructor() {
        this.initializeBottomButtons();
    }
    async initializeBottomButtons() {
        const owner = this;

        App.app_status = await new Promise((resolve) => {
            Lobby.post({ prompt: 3/*app status*/ }, (rsp) => {
                resolve(rsp.ps);
            });
        });
        const btns = document.getElementsByClassName("bottom-section")[0].getElementsByClassName("btn-wrapper");
        btns[0].addEventListener('click', () => {
            const OpenLittleSettings = document.createElement('div')
            OpenLittleSettings.style = `display: flex;justify-content: center;padding-top: 9px;`;
            OpenLittleSettings.innerHTML = policy.createHTML(`<li><strong>pre-Alpha version:</strong><ul><li>I bug possono solo accompagnare.</li><li>Un sacco di roba che non funziona.</li><li>Aspetta e speeera.</li></ul></li>`);

            new BottomSheet({
                element: OpenLittleSettings,
                onClose: () => {
                    // if (typeof filters_list_el.onAnnulla === 'function') {
                    //     filters_list_el.onAnnulla();
                    // }
                    if (owner.onSkip != undefined) {
                        owner.onSkip();
                    }
                },
                centered: true
            });
        });
        const play_button = document.getElementById("play");
        play_button.addEventListener("click", () => {
            play_button.classList.toggle("clicked", true);
            setTimeout(() => {
                play_button.classList.toggle("clicked", false);
            }, 500);
        });
        const news_button = document.getElementById("news");
        news_button.addEventListener("click", () => {
            news_button.classList.toggle("clicked", true);
            setTimeout(() => {
                news_button.classList.toggle("clicked", false);
            }, 500);
        });
    }
}