//keep DragAndDrop, MovableUtil, StickyBar
const debug = true;
/**
 * @version 1.0
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
        //AppStatus.displayVersion();
        document.body.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.key == "r") {
                e.stopPropagation();
                e.preventDefault();
                Lobby.post("AppRouter/Navigate", { where: "PDFEditor" }, (rsp) => {
                    resolve();
                    //owner.elements.button_login.classList.toggle("clicked", false);
                });
            }
        })

        setTimeout(async () => {
            let some_file = null;
            // a PDF the OS asked this app to open ("Open with", Android share/view intent, ...)
            const opened = await Lobby.postAsync("OpenedFile/TakePending");
            if (opened?.base64) {
                some_file = await App.fileFromDataUrl(`data:application/pdf;base64,${opened.base64}`, opened.fileName);
            } else if (debug) {
                const { base64, fileName } = await Lobby.postAsync("Mock/loadMockPdf");
                const file = await App.fileFromDataUrl(`data:application/pdf;base64,${base64}`, fileName);
                some_file = file;
            }
            const ss = new PDFEditor({
                file: some_file
            });
            document.body.appendChild(ss.elementReference());
        }, 0);
        //TODO constructor
    }
    static fileFromDataUrl(data_url, file_name) {
        const [header, base64] = data_url.split(",");
        const mime = header.match(/data:(.*?);base64/)[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new File([bytes], file_name, { type: mime });
    }

    async #asyncInit() {
        const owner = this;
        //TODO async stuff
    }
}
// setTimeout(() => {
//     window.the_main_app //access the app instance
// }, 0);