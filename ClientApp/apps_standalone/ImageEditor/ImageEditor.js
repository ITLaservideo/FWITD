console.assert(typeof MovableUtil === "function", "missing module `MovableUtil`");
console.assert(typeof SpeedActions === "function", "missing module `SpeedActions`");
const debug = false;
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
        setTimeout(() => {
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(640, Math.floor(window.innerWidth * 0.9));
            canvas.height = Math.max(480, Math.floor(window.innerHeight * 0.9) - 200);
            const ctx = canvas.getContext("2d");
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, "#4e8cff");
            gradient.addColorStop(1, "#ff5e7e");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#ffffff";
            ctx.font = "40px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("drag & drop the image", canvas.width / 2, canvas.height / 2);
            ctx.fillText("here", canvas.width / 2, canvas.height / 1.77);
            const mock_image_src = canvas.toDataURL("image/png");

            const editor = new ImageEditor({
                image_src: mock_image_src,
                onConfirm: (cropped_data_url) => {
                    console.log("cropped image", cropped_data_url);
                    editor.destroy();
                },
                onCancel: () => {
                    editor.destroy();
                }
            });
            document.body.appendChild(editor.elementReference());
        }, 0);
    }
    async #asyncInit() {
        const owner = this;
        //TODO async stuff
    }
}
// setTimeout(() => {
//     window.the_main_app //access the app instance
// }, 0);