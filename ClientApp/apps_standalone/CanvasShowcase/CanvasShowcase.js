console.assert(typeof MovableUtil === "function", "missing module `MovableUtil`");   // needed by ImageEditor
console.assert(typeof SpeedActions === "function", "missing module `SpeedActions`"); // needed by ImageEditor
const debug = false;
/**
 * @version 2.0
 * Explorer (TreeMenu) on the left, the selected entry is mounted in the content area on the right.
 * Every entry's `mount(container)` returns an object with `destroy()`, called when another entry is opened,
 * so only one demo at a time runs its animation loop / timers / key handlers.
 * The canvas demos live in the subfolders (balls/, moles/, shapes/), bundled automatically with the page.
 */
class App {
    static #STORAGE_LAST_OPENED = "canvas-showcase-last-opened";
    static #STORAGE_EXPLORER_WIDTH = "canvas-showcase-explorer-width";
    static #EXPLORER_MIN_WIDTH = 160;
    static #EXPLORER_MAX_WIDTH = 480;

    elements = {
        app_main_content: document.getElementById("app-main-content"),
        explorer_tree: document.getElementById("cs-explorer-tree"),
        explorer_footer: document.getElementById("cs-explorer-footer"),
        resizer: document.getElementById("cs-resizer"),
        content_title: document.getElementById("cs-content-title"),
        content_hint: document.getElementById("cs-content-hint"),
        content_body: document.getElementById("cs-content-body"),
    }
    /** @type {TreeMenu} */
    #tree = null;
    /** @type {{id: string, view: {destroy: Function}|null}|null} */
    #opened = null;
    /** explorer entries, in display order; `icon` = code point from https://fonts.google.com/icons */
    #entries = [
        {
            id: "image-editor", label: "ImageEditor", description: "component", icon: "e3f4",
            hint: "Crop, straighten, erase, draw and add text · drop an image on it to edit your own",
            mount: (container) => this.#mountImageEditor(container),
        },
        {
            id: "balls", label: "balls", description: "canvas + svg physics", icon: "e6dd",
            hint: "Click = new ball · R = reset · Space = flip gravity",
            mount: (container) => new BouncingBallsDemo(container),
        },
        {
            id: "moles", label: "moles", description: "whack-a-mole", icon: "ea28",
            hint: "Hit the heads (+100), avoid the rears (-200), get above 1000 to win",
            mount: (container) => new WhackAMoleDemo(container, { size: 4 }),
        },
        {
            id: "shapes", label: "shapes", description: "shape painter", icon: "e574",
            hint: "Drag to draw · 1–6 pick a shape · F fill · Ctrl+Z undo · C clear",
            mount: (container) => new ShapePainterDemo(container),
        },
        {
            id: "uptrend", label: "1.uptrend", description: "trend shape", icon: "e8e5",
            hint: "Up / Down / Both (1/2/3) · drag b up/down (↑/↓, Shift ×10) · L = lock/unlock angle ±45° · Both: drag the a–a′ line (PgUp/PgDn) · wheel = zoom · drag empty space = pan · F = fit · R = reset",
            mount: (container) => new UptrendShapeDemo(container),
        },
    ];

    constructor() {
        this.#init();
        this.#asyncInit();
    }
    #init() {
        const owner = this;
        AppStatus.displayVersion();
        const btn_exit = UiBuilder.createButton({
            onClick: () => Lobby.closeApp(true),
            icon_code: "f508",
            hint: Locale.at("close app"),
            anchor: 'top'
        });
        owner.elements.explorer_footer.appendChild(btn_exit);

        owner.#initExplorer();
        owner.#initResizer();

        let last_opened = null;
        try { last_opened = localStorage.getItem(App.#STORAGE_LAST_OPENED); } catch (e) { /* storage blocked */ }
        const first = owner.#entries.find(entry => entry.id === last_opened) ?? owner.#entries[0];
        owner.#tree.setSelection([first.id]);
        owner.#open(first.id);
    }
    async #asyncInit() {
        const owner = this;
        //TODO async stuff
    }

    #initExplorer() {
        const owner = this;
        owner.#tree = new TreeMenu({
            id: "canvas-showcase-explorer",
            title: "Explorer",
            nodes: owner.#entries.map(entry => ({
                id: entry.id,
                label: entry.label,
                description: entry.description,
                icon: entry.icon,
                tooltip: `${entry.label}: ${entry.hint}`,
            })),
            sort: "none",
            multiSelect: false,
            bookmarks: false,
            onActivate: (node) => owner.#open(node.id),
        });
        owner.elements.explorer_tree.appendChild(owner.#tree.elementReference());
    }

    /** drag the bar between explorer and content to resize the explorer, double click to reset it */
    #initResizer() {
        const owner = this;
        const { app_main_content, resizer } = owner.elements;
        const apply = (width) => {
            const clamped = Math.round(Math.min(Math.max(width, App.#EXPLORER_MIN_WIDTH), App.#EXPLORER_MAX_WIDTH));
            app_main_content.style.setProperty("--cs-explorer-width", `${clamped}px`);
            return clamped;
        };
        let saved = 0;
        try { saved = Number(localStorage.getItem(App.#STORAGE_EXPLORER_WIDTH)) || 0; } catch (e) { /* storage blocked */ }
        if (saved > 0) {
            apply(saved);
        }
        resizer.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            resizer.setPointerCapture(event.pointerId);
            resizer.classList.add("is-dragging");
            const left = app_main_content.getBoundingClientRect().left;
            let width = 0;
            const on_move = (e) => { width = apply(e.clientX - left); };
            const on_up = () => {
                resizer.classList.remove("is-dragging");
                resizer.removeEventListener("pointermove", on_move);
                resizer.removeEventListener("pointerup", on_up);
                resizer.removeEventListener("pointercancel", on_up);
                if (width > 0) {
                    try { localStorage.setItem(App.#STORAGE_EXPLORER_WIDTH, width); } catch (e) { /* ignore */ }
                }
            };
            resizer.addEventListener("pointermove", on_move);
            resizer.addEventListener("pointerup", on_up);
            resizer.addEventListener("pointercancel", on_up);
        });
        resizer.addEventListener("dblclick", () => {
            app_main_content.style.removeProperty("--cs-explorer-width");
            try { localStorage.removeItem(App.#STORAGE_EXPLORER_WIDTH); } catch (e) { /* ignore */ }
        });
    }

    /** unmounts the current entry and mounts `id` in the content area */
    #open(id) {
        const owner = this;
        const entry = owner.#entries.find(e => e.id === id);
        if (entry == undefined || owner.#opened?.id === id) {
            return;
        }
        owner.#close();
        const { content_title, content_hint, content_body } = owner.elements;
        content_title.textContent = entry.label;
        content_hint.textContent = entry.hint;
        content_body.dataset.view = entry.id;
        content_body.scrollTop = 0;
        try {
            owner.#opened = { id, view: entry.mount(content_body) };
        } catch (error) {
            console.error(error);
            owner.#opened = { id, view: null };
            const message = document.createElement("div");
            message.className = "cs-error";
            message.textContent = `couldn't open ${entry.label}: ${error.message}`;
            content_body.replaceChildren(message);
        }
        owner.#tree.setActive(id);
        try { localStorage.setItem(App.#STORAGE_LAST_OPENED, id); } catch (e) { /* ignore */ }
    }
    #close() {
        const owner = this;
        try {
            owner.#opened?.view?.destroy();
        } catch (error) {
            console.error(error);
        }
        owner.#opened = null;
        owner.elements.content_body.replaceChildren();
    }

    /**
     * ImageEditor destroys itself on confirm/cancel: show the result with the options to keep
     * editing it or start over, or start over right away on cancel
     * @param {HTMLElement} container
     * @returns {{destroy: Function}}
     */
    #mountImageEditor(container) {
        /** @type {ImageEditor|null} */
        let editor = null;
        const show_editor = (image_src) => {
            container.replaceChildren();
            editor = new ImageEditor({
                image_src,
                onConfirm: (edited_data_url) => {
                    editor = null;// it destroys itself
                    show_result(edited_data_url);
                },
                onCancel: () => {
                    editor = null;// it destroys itself
                    show_editor(App.#sampleImage());
                },
            });
            container.appendChild(editor.elementReference());
        };
        const show_result = (data_url) => {
            const result = document.createElement("div");
            result.className = "cs-image-result";
            const img = document.createElement("img");
            img.src = data_url;
            const actions = document.createElement("div");
            actions.className = "cs-image-result-actions";
            actions.appendChild(UiBuilder.createButton({ title: "edit this result", onClick: () => show_editor(data_url) }));
            actions.appendChild(UiBuilder.createButton({ title: "start over", onClick: () => show_editor(App.#sampleImage()) }));
            result.appendChild(img);
            result.appendChild(actions);
            container.replaceChildren(result);
        };
        show_editor(App.#sampleImage());
        return {
            destroy: () => {
                editor?.destroy();
                editor = null;
            },
        };
    }

    /** @returns {string} data URL of a generated placeholder picture */
    static #sampleImage() {
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 500;
        const ctx = canvas.getContext("2d");
        // theme-independent: placeholder image handed to the editor as content
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, "#4e8cff");
        gradient.addColorStop(1, "#ff5e7e");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff";
        ctx.font = "40px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("drag & drop an image", canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText("here", canvas.width / 2, canvas.height / 2 + 40);
        return canvas.toDataURL("image/png");
    }
}
// setTimeout(() => {
//     window.the_main_app //access the app instance
// }, 0);
