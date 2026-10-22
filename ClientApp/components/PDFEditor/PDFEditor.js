//keep DragAndDrop, MovableUtil, StickyBar
setTimeout(() => {
    console.assert(typeof window.exportsPDFLIB === "object", "missing module `pdf-lib` (lib/pdf-lib.js)");
    console.assert(typeof window.pdfjsLib === "object", "missing module `pdf.js` (lib/pdf.js)");
    console.assert(window.pdfjsLib?.GlobalWorkerOptions.workerPort != null || typeof window.pdfjsWorker === "object", "missing module `pdf.js` worker (inlined into lib/pdf.js by JSProvider)");
}, 0);
/**
 * PDF toolbox: merge (with drag & drop reordering), split into parts, compress, and a light
 * annotate/redact/delete-page editor. Editing renders the real page onto a canvas via PDF.js (not
 * the browser's built-in PDF viewer - Android's WebView doesn't ship one) as a read-only backdrop,
 * with a transparent canvas on top capturing draw/text/redaction marks - those marks (plus page
 * deletions) are only baked into a real PDF (via pdf-lib) when the user hits "Salva e scarica".
 * @version 1.0
 * @example
 *      const editor = new PDFEditor({ onClose: () => editor.destroy() });
 *      new BottomSheet({ element: editor.elementReference(), centered: true, onClose: () => editor.destroy() });
 * @example
 *      // jump straight into the "edit" tab with an already-acquired PDF, skipping the file picker
 *      const editor = new PDFEditor({ file: some_pdf_file, onClose: () => editor.destroy() });
 */
class PDFEditor extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options
     * @param {File} [options.file] - a PDF to immediately load into the "edit" tab, bypassing the tab
     * and file picking - equivalent to the user picking the "edit" tab and dropping this file in
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        console.assert(options.file == undefined || options.file instanceof File, "options.file must be a File instance");
        this.#initialize();
        this.#addEventListeners();
    }
    /**
     * store here the elements references of the html
     * automatically gathers elements with attribute ` fw-id="xxx" ` after super()
     */
    elements = {
        /** @type HTMLElement */
        self_ref: this.self_ref,
        /** @type HTMLElement - lives in `status.tabs_bar`, set by `#createTabsBar` */
        tab_merge: null,
        /** @type HTMLElement - lives in `status.tabs_bar`, set by `#createTabsBar` */
        tab_split: null,
        /** @type HTMLElement - lives in `status.tabs_bar`, set by `#createTabsBar` */
        tab_compress: null,
        /** @type HTMLElement - lives in `status.tabs_bar`, set by `#createTabsBar` */
        tab_edit: null,
        /** @type HTMLElement */
        panel_merge: null,
        /** @type HTMLInputElement */
        merge_file_input: null,
        /** @type HTMLElement */
        merge_list: null,
        /** @type HTMLInputElement */
        merge_add_page_numbers: null,
        /** @type HTMLElement */
        merge_button: null,
        /** @type HTMLElement */
        panel_split: null,
        /** @type HTMLInputElement */
        split_file_input: null,
        /** @type HTMLElement */
        split_info: null,
        /** @type HTMLElement */
        split_parts: null,
        /** @type HTMLElement */
        split_total: null,
        /** @type HTMLElement */
        split_add_part_btn: null,
        /** @type HTMLElement */
        split_button: null,
        /** @type HTMLElement */
        panel_compress: null,
        /** @type HTMLInputElement */
        compress_file_input: null,
        /** @type HTMLElement */
        compress_info: null,
        /** @type HTMLElement */
        compress_levels: null,
        /** @type HTMLElement */
        compress_button: null,
        /** @type HTMLElement */
        panel_edit: null,
        /** @type HTMLInputElement */
        edit_file_input: null,
        /** @type HTMLElement */
        edit_editor: null,
        /** @type HTMLInputElement - sticky, sets `edit_workspace`'s width - see `#applyEditWidth` */
        edit_width_slider: null,
        /** @type HTMLElement - lives in `status.tools_bar`, set by `#ensureToolsBar` */
        edit_btn_draw: null,
        /** @type HTMLElement - lives in `status.tools_bar`, set by `#ensureToolsBar` */
        edit_btn_add_text: null,
        /** @type HTMLElement - lives in `status.tools_bar`, set by `#ensureToolsBar` */
        edit_btn_redact: null,
        /** @type HTMLElement */
        edit_undo_btn: null,
        /** @type HTMLElement */
        edit_stroke_width_row: null,
        /** @type HTMLInputElement */
        edit_stroke_width_slider: null,
        /** @type HTMLElement */
        edit_stroke_width_value: null,
        /** @type HTMLElement */
        edit_stroke_width_preview_dot: null,
        /** @type HTMLElement */
        edit_prev_page: null,
        /** @type HTMLElement */
        edit_page_label: null,
        /** @type HTMLElement */
        edit_next_page: null,
        /** @type HTMLElement */
        edit_workspace: null,
        /** @type HTMLCanvasElement */
        edit_frame: null,
        /** @type HTMLCanvasElement */
        edit_canvas: null,
        /** @type HTMLElement */
        edit_save_button: null,

        /** @type {HTMLElement} */
        btn_undo: null,

        /** @type {HTMLElement} */
        edit_stroke_width_preview: null,

        /** @type {HTMLElement} - lives in `status.tools_bar`, set by `#ensureToolsBar` */
        edit_btn_add_signature: null,
    }
    status = {
        active_tab: "merge",
        /** @type {Array<{id: string, file: File, name: string, size: number, pages: number, bytes: ArrayBuffer}>} */
        merge_files: [],
        merge_group_id: undefined,
        /** @type {{file: File, name: string, size: number, pages: number, bytes: ArrayBuffer}} */
        split_file: undefined,
        /** @type {Array<{id: string, size: number}>} */
        split_parts: [],
        split_valid: false,
        /** @type {{file: File, name: string, size: number, bytes: ArrayBuffer}} */
        compress_file: undefined,
        /** @type {{file: File, name: string, pages: number, bytes: ArrayBuffer, page_sizes: Array, pdfjsLoadingTask: Object, pdfjsDoc: Object}} */
        edit_file: undefined,
        edit_current_page: 0,
        /** @type {Object} the in-flight PDF.js `RenderTask` for the current page, if any - cancelled before starting a new one */
        edit_render_task: undefined,
        /** @type {Map<number, {deleted: boolean, strokes: Array, texts: Array, redactions: Array}>} */
        edit_page_edits: new Map(),
        edit_active_tool: null,
        edit_draw_color: "#ff3b30", // theme-independent: default ink, baked into the PDF
        /** @type {number} fraction of the page width used as the draw tool's stroke radius - adjustable via `edit_stroke_width_slider` */
        edit_draw_stroke_radius_fraction: PDFEditor.#DRAW_STROKE_RADIUS_FRACTION,
        edit_undo_stack: [],
        /** @type {HTMLElement} an in-progress, not-yet-confirmed `#startPlacingText` overlay, if any */
        edit_placing_text_overlay: undefined,
        /** @type {HTMLElement} an in-progress, not-yet-confirmed `#startPlacingSignature` overlay, if any */
        edit_placing_signature_overlay: undefined,
        /** @type {HTMLElement} an in-progress, not-yet-confirmed `#startPlacingRedaction` overlay, if any - phone-only, see `#addEditCanvasListeners` */
        edit_placing_redaction_overlay: undefined,
        resize_handler: undefined,
        escape_handler: undefined,
        undo_key_handler: undefined,
        /** @type {StickyBar} the tabs + "Scegli file" button + PDF drop target, anchored top - see `#createTabsBar` */
        tabs_bar: null,
        /** @type {StickyBar} the edit tools (draw/add text/signature/redact/delete page), anchored left - created on the first loaded file */
        tools_bar: null,
        /** @type {HTMLDivElement} `UiBuilder.createFloatingContainer` hosting `edit_stroke_width_row` while the draw tool is armed - see `#syncStrokeWidthFloater` */
        stroke_width_floater: null,
    }
    static #COMPRESS_JPEG_QUALITY = { medium: 0.6, high: 0.35 };
    static #DRAW_STROKE_RADIUS_FRACTION = 0.002;
    /** outline width (canvas px) of the redaction rectangle preview/marker - independent of the draw tool's adjustable stroke width */
    static #REDACT_STROKE_WIDTH = 2;
    /** default size (fraction of the canvas) of the rectangle `#startPlacingRedaction` drops on the first tap - phone-only, see `#addEditCanvasListeners` */
    static #REDACT_DEFAULT_WIDTH_FRACTION = 0.3;
    static #REDACT_DEFAULT_HEIGHT_FRACTION = 0.12;
    /** floor (canvas px) `#startPlacingRedaction`'s corner knobs can shrink the rectangle to */
    static #REDACT_MIN_SIZE_PX = 24;
    /** how far (screen px) the `#startPlacingRedaction` rectangle can be dragged before releasing it no longer counts as a tap that confirms it */
    static #REDACT_TAP_SLOP_PX = 6;
    static #ADD_TEXT_FONT_SIZE_FRACTION = 0.028;
    /** Helvetica's ascender (em fraction) - what pdf-lib's `heightAtSize(size, { descender: false })` returns */
    static #HELVETICA_ASCENT_FRACTION = 0.718;
    static #RECENT_TEXTS_STORAGE_KEY = "pe-recent-texts";
    static #RECENT_TEXTS_LIMIT = 8;
    static #PINNED_TEXTS_STORAGE_KEY = "pe-pinned-texts";
    static #EDIT_WIDTH_STORAGE_KEY = "pe-edit-width";
    /** idle time after the last `edit_width_slider` move before re-rendering the page at the new size */
    static #EDIT_WIDTH_RENDER_DELAY_MS = 150;
    static #TEXT_MIN_SCALE = 0.2;
    static #TEXT_MAX_SCALE = 5;
    /** scale change per px of horizontal drag on the scale/rotate handle - matches ImageEditor's own text overlay */
    static #TEXT_SCALE_SENSITIVITY = 0.01;
    /** rotation change (degrees) per px of vertical drag on the scale/rotate handle - matches ImageEditor's own text overlay */
    static #TEXT_ROTATION_SENSITIVITY = 0.5;
    static #TEXT_SCALE_ROTATION_STORAGE_KEY = "pe-text-scale-rotation";
    static #DOWNLOAD_STAGGER_MS = 300;
    static #UNDO_LIMIT = 30;
    static #RECENT_SIGNATURES_STORAGE_KEY = "pe-recent-signatures";
    static #RECENT_SIGNATURES_LIMIT = 6;
    static #PINNED_SIGNATURES_STORAGE_KEY = "pe-pinned-signatures";
    static #SIGNATURE_SCALE_ROTATION_STORAGE_KEY = "pe-signature-scale-rotation";
    /** default signature width, as a fraction of the page width at scale 1 - matches `#ADD_TEXT_FONT_SIZE_FRACTION`'s role for text */
    static #ADD_SIGNATURE_WIDTH_FRACTION = 0.22;
    /** stroke width (CSS px, before devicePixelRatio) of the signature pad's pen */
    static #SIGNATURE_PAD_STROKE_WIDTH = 3;
    /**
     * pdf.js `BinaryDataFactory`: with `useWorkerFetch: false` the worker asks the page for every binary
     * file it needs instead of fetching it itself. Only the wasm image codecs ship with the app (embedded,
     * served by `App/GetPdfJsWasm`, see utils/external_libs/pdfjs_wasm/readme.md) - without them JBIG2/CCITT
     * fax (B/W scans) and JPEG 2000 images don't render. cMaps and standard font data aren't bundled, so
     * those requests fail like a missing file would and pdf.js falls back (system fonts, a console warning).
     */
    static #PdfJsBinaryDataFactory = class PdfJsBinaryDataFactory {
        static #WASM_FILES = new Set(["jbig2.wasm", "openjpeg.wasm"]);
        /** @type {Map<string, Promise<Uint8Array>>} shared by every document: pdf.js drops its compiled codecs on cleanup */
        static #wasm_cache = new Map();
        async fetch({ kind, filename }) {
            // checked here as well as server-side: a rejected `Lobby.postAsync` alerts and never settles
            if (kind !== "wasmUrl" || !PdfJsBinaryDataFactory.#WASM_FILES.has(filename)) {
                throw new Error(`pdf.js "${kind}" data "${filename}" isn't bundled with the app`);
            }
            if (!PdfJsBinaryDataFactory.#wasm_cache.has(filename)) {
                PdfJsBinaryDataFactory.#wasm_cache.set(filename, Lobby.postAsync("App/GetPdfJsWasm", { filename }).then((rsp) => {
                    const binary = atob(rsp.base64);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        bytes[i] = binary.charCodeAt(i);
                    }
                    return bytes;
                }));
            }
            return PdfJsBinaryDataFactory.#wasm_cache.get(filename);
        }
    };
    /** @type {Map<string, HTMLImageElement>} decoded signature images, keyed by their data URL - see `#loadSignatureImage` */
    #signature_image_cache = new Map();
    /** @type {Record<'merge'|'split'|'compress'|'edit', {input: HTMLInputElement, multiple: boolean, onFiles: (files: File[]) => void}>} where each tab's picked/dropped PDFs go - see `#createTabsBar` */
    #file_sources = null;
    /** pending page re-render after an `edit_width_slider` move - see `#applyEditWidth` */
    #edit_width_render_timer = null;
    /** whether a draw/redact mouse gesture is currently in progress on `elements.edit_canvas` - see `#addEditCanvasListeners`/`#stopActiveEditGesture` */
    #edit_dragging = false;
    /** @type {Object} the stroke object being drawn while `#edit_dragging` is true and the "draw" tool is active - already pushed into the current page's `edit.strokes` */
    #edit_current_stroke = null;
    /** @type {{x: number, y: number}} the anchor point of the redaction rectangle being dragged while `#edit_dragging` is true and the "redact" tool is active */
    #edit_redact_start = null;
    async #initialize() {
        const owner = this;
        owner.status.merge_group_id = UiBuilder.newId("pdfeditor-merge-group");
        // radio `name` grouping is document-wide, not scoped to this component's DOM subtree, so a
        // static name would cross-wire two PDFEditor instances mounted at once - make it unique
        owner.status.compress_radio_name = UiBuilder.newId("pe-compress-level");
        owner.elements.compress_levels.querySelectorAll('input[type="radio"]').forEach((radio) => {
            radio.name = owner.status.compress_radio_name;
        });
        owner.#file_sources = {
            merge: { input: owner.elements.merge_file_input, multiple: true, onFiles: (files) => owner.#handleMergeFiles(files) },
            split: { input: owner.elements.split_file_input, multiple: false, onFiles: (files) => owner.#handleSplitFile(files[0]) },
            compress: { input: owner.elements.compress_file_input, multiple: false, onFiles: (files) => owner.#handleCompressFile(files[0]) },
            edit: { input: owner.elements.edit_file_input, multiple: false, onFiles: (files) => owner.#handleEditFile(files[0]) },
        };
        for (const source of Object.values(owner.#file_sources)) {
            owner.#setupFileInput(source);
        }
        owner.#createTabsBar();
        owner.#addEditCanvasListeners();
        // only ever shown inside `status.stroke_width_floater`
        owner.elements.edit_stroke_width_row.remove();
        owner.elements.edit_stroke_width_row.classList.remove("pe-hidden");
        owner.elements.edit_stroke_width_slider.addEventListener("input", () => {
            owner.status.edit_draw_stroke_radius_fraction = Number(owner.elements.edit_stroke_width_slider.value) / 1000;
            owner.#updateStrokeWidthPreview();
        });
        owner.#updateStrokeWidthPreview();
        owner.#applyEditWidth(owner.#loadEditWidth());
        owner.elements.edit_width_slider.addEventListener("input", () => {
            const width = Number(owner.elements.edit_width_slider.value);
            owner.#applyEditWidth(width);
            owner.#saveEditWidth(width);
        });
        owner.#updateMergeButtonState();
        if (owner.options.file != undefined) {
            // load first, then switch tabs: `#setActiveTab` re-measures/re-renders the pdf.js page
            // once the "edit" panel is actually visible, same as a manual tab click after loading
            await owner.#handleEditFile(owner.options.file);
            owner.#setActiveTab("edit");
        }
    }
    async #addEventListeners() {
        const owner = this;
        owner.status.resize_handler = () => {
            if (owner.status.active_tab === "edit" && owner.status.edit_file != undefined) {
                owner.#renderPdfPage(owner.status.edit_current_page + 1).then(() => {
                    owner.#syncCanvasSizes();
                    owner.#redrawEditCanvas();
                });
            }
        };
        window.addEventListener("resize", owner.status.resize_handler);
        owner.status.escape_handler = (event) => {
            if (event.key !== "Escape") {
                return;
            }
            // only swallow the key (stop it reaching e.g. an enclosing MousePopUp/BottomSheet's own
            // Escape-to-close handler) when it actually stopped something here
            if (owner.#stopActiveEditOperations()) {
                event.stopPropagation();
            }
        };
        document.body.addEventListener("keyup", owner.status.escape_handler);
        owner.status.undo_key_handler = (event) => {
            if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") {
                return;
            }
            // leave text fields (e.g. the add-text prompt) their own native undo, and only act while
            // this editor is actually shown on the edit tab with a file loaded
            if (event.target.closest?.("input, textarea, [contenteditable]")
                || !owner.self_ref.isConnected
                || owner.status.active_tab !== "edit"
                || owner.status.edit_file == undefined) {
                return;
            }
            event.preventDefault();
            owner.#editUndo();
        };
        document.addEventListener("keydown", owner.status.undo_key_handler);
    }
    /**
     * `onFiles` receives an array of `File`s (single-element when `multiple` is false)
     * @param {{input: HTMLInputElement, multiple: boolean, onFiles: (files: File[]) => void}} source
     */
    #setupFileInput({ input, multiple, onFiles }) {
        input.multiple = multiple;
        input.addEventListener("change", () => {
            if (input.files.length > 0) {
                onFiles(multiple ? Array.from(input.files) : [input.files[0]]);
            }
            input.value = "";
        });
    }
    /**
     * creates the top StickyBar holding the tabs plus a "Scegli file" button; the bar is also the drop
     * target for PDF files. Both feed the active tab's `#file_sources` entry. The tab buttons replace the
     * old `fw-id` ones, so they're stored back into `elements` for `#setActiveTab`.
     * StickyBar reserves its spot measured with labels: when that doesn't fit (narrow phones) it falls back to icon-only buttons
     */
    #createTabsBar() {
        const owner = this;
        const tab_button = (title, icon_code, key, onClick, with_label) => ({
            title: with_label ? Locale.at(title) : undefined,
            icon_code: icon_code,
            theme: 'ez',
            class: `pe-tab-button pe-tab-${key}`,
            onClick: () => onClick.call({ fwInstanceReference: owner }),
        });
        const buttons = (with_label) => [
            tab_button("Unisci", "e0b3", "merge", owner.onClickTabMerge, with_label),
            tab_button("Dividi", "e0b6", "split", owner.onClickTabSplit, with_label),
            tab_button("Comprimi", "e94d", "compress", owner.onClickTabCompress, with_label),
            tab_button("Modifica", "e3c9", "edit", owner.onClickTabEdit, with_label),
            {
                title: with_label ? Locale.at("Scegli file") : undefined,
                icon_code: "e9fc",
                theme: 'ez',
                class: "pe-browse-button",
                onClick: () => owner.#file_sources[owner.status.active_tab].input.click(),
            },
        ];
        for (const with_label of [true, false]) {
            try {
                owner.status.tabs_bar = new StickyBar({ id: "pdf-editor-tabs", anchor: "left-top", buttons: buttons(with_label) });
                break;
            } catch (error) {
                console.error(error);
            }
        }
        if (owner.status.tabs_bar == null) {
            new Notify({ text: Locale.at("Impossibile mostrare le schede"), type: "error", ms_timeout: 3000 });
            return;
        }
        const bar = owner.status.tabs_bar.elementReference();
        bar.classList.add("pe-tabs-bar");
        owner.elements.tab_merge = bar.querySelector(".pe-tab-merge");
        owner.elements.tab_split = bar.querySelector(".pe-tab-split");
        owner.elements.tab_compress = bar.querySelector(".pe-tab-compress");
        owner.elements.tab_edit = bar.querySelector(".pe-tab-edit");
        owner.elements.tab_merge.classList.add("pe-tab-active");
        // the instructions point at the bar ("Scegli file", drop target): bring it back readable from concise/collapsed
        owner.self_ref.querySelectorAll(".pe-instructions").forEach((instructions) => {
            instructions.addEventListener("click", () => owner.status.tabs_bar.setPhase("full"));
        });

        bar.addEventListener("dragover", (event) => {
            event.preventDefault();
            bar.classList.add("pe-drag-over");
        });
        bar.addEventListener("dragleave", (event) => {
            if (!bar.contains(event.relatedTarget)) {
                bar.classList.remove("pe-drag-over");
            }
        });
        bar.addEventListener("drop", (event) => {
            event.preventDefault();
            bar.classList.remove("pe-drag-over");
            const files = Array.from(event.dataTransfer?.files ?? [])
                .filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
            if (files.length === 0) {
                return;
            }
            const { multiple, onFiles } = owner.#file_sources[owner.status.active_tab];
            onFiles(multiple ? files : [files[0]]);
        });
    }
    #readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
    #formatBytes(bytes) {
        if (bytes < 1024) {
            return `${bytes} B`;
        }
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    #downloadBytes(bytes, file_name) {
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file_name;
        link.click();
        URL.revokeObjectURL(url);
    }
    /**
     * @param {Uint8Array} bytes
     * @returns {string}
     */
    #bytesToBase64(bytes) {
        const CHUNK_SIZE = 0x8000;
        let binary = "";
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE));
        }
        return btoa(binary);
    }
    /**
     * @returns {Promise<{path: string|null, cancelled: boolean}>}
     */
    async #saveBytesOnDevice(bytes, file_name) {
        return await Lobby.postAsync("SaveFile/Save", { fileName: file_name, base64: this.#bytesToBase64(bytes) });
    }
    #setActiveTab(tab) {
        const owner = this;
        const tabs = { merge: owner.elements.tab_merge, split: owner.elements.tab_split, compress: owner.elements.tab_compress, edit: owner.elements.tab_edit };
        const panels = { merge: owner.elements.panel_merge, split: owner.elements.panel_split, compress: owner.elements.panel_compress, edit: owner.elements.panel_edit };
        for (const key of Object.keys(tabs)) {
            tabs[key]?.classList.toggle("pe-tab-active", key === tab);
            panels[key].classList.toggle("pe-hidden", key !== tab);
        }
        owner.status.active_tab = tab;
        // the tools bar is body-level (fixed): hide it with the edit panel
        owner.status.tools_bar?.elementReference().classList.toggle("pe-tools-bar-hidden", tab !== "edit");
        owner.#syncStrokeWidthFloater();
        if (tab === "edit" && owner.status.edit_file != undefined) {
            // the workspace was `display:none` while hidden, so its measured size was stale/zero -
            // re-render the pdf.js page at the now-real size too, in case the window was resized
            // while away from this tab (the resize handler above only runs while already on it)
            setTimeout(() => {
                owner.#renderPdfPage(owner.status.edit_current_page + 1).then(() => {
                    owner.#syncCanvasSizes();
                    owner.#redrawEditCanvas();
                });
            }, 0);
        }
    }

    //#region Merge
    async #handleMergeFiles(files) {
        const owner = this;
        for (const file of files) {
            const entry = { id: UiBuilder.newId("pdfeditor-merge-file"), file, name: file.name, size: file.size, pages: undefined, bytes: undefined };
            owner.status.merge_files.push(entry);
            owner.#renderMergeList();
            try {
                const bytes = await owner.#readFileAsArrayBuffer(file);
                const { PDFDocument } = window.exportsPDFLIB;
                const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
                entry.bytes = bytes;
                entry.pages = pdf.getPageCount();
            } catch (error) {
                console.warn("PDFEditor: invalid PDF discarded", file.name, error);
                owner.status.merge_files = owner.status.merge_files.filter((f) => f.id !== entry.id);
                new Notify({ text: `${file.name}: ${Locale.at("file PDF non valido")}`, type: "error", ms_timeout: 3000 });
            }
            owner.#renderMergeList();
        }
    }
    #renderMergeList() {
        const owner = this;
        const list = owner.elements.merge_list;
        list.replaceChildren();
        owner.status.merge_files.forEach((entry, index) => list.appendChild(owner.#createMergeChip(entry, index)));
        owner.#updateMergeButtonState();
    }
    #createMergeChip(entry, index) {
        const owner = this;
        const row = document.createElement("div");
        row.classList.add("pe-file-chip");
        row.id = entry.id;

        const index_el = document.createElement("div");
        index_el.classList.add("pe-file-chip-index");
        index_el.innerText = `${index + 1}.`;

        const name_el = document.createElement("div");
        name_el.classList.add("pe-file-chip-name");
        name_el.innerText = entry.name;

        const meta_el = document.createElement("div");
        meta_el.classList.add("pe-file-chip-meta");
        meta_el.innerText = entry.pages != undefined
            ? `${entry.pages} ${Locale.at("pag.")} · ${owner.#formatBytes(entry.size)}`
            : Locale.at("caricamento...");

        const remove_el = document.createElement("div");
        remove_el.classList.add("pe-file-chip-remove");
        remove_el.innerText = "✕";
        // stop the drag-start (fired on mousedown, before `click`) from swallowing this button
        remove_el.addEventListener("mousedown", (event) => event.stopPropagation());
        remove_el.addEventListener("click", () => {
            owner.status.merge_files = owner.status.merge_files.filter((f) => f.id !== entry.id);
            owner.#renderMergeList();
        });

        row.append(index_el, name_el, meta_el, remove_el);
        DragAndDrop.makeItDraggable({
            target: row,
            group_id: owner.status.merge_group_id,
            onDrop: (obj) => owner.#reorderMergeFile(obj.start_id, obj.end_id),
        });
        return row;
    }
    /**
     * moves the dragged chip next to the one it was dropped on (before it if dragged forward in
     * the list, after it if dragged backward), then re-syncs `status.merge_files` from the
     * resulting DOM order
     */
    #reorderMergeFile(start_id, end_id) {
        const owner = this;
        const list = owner.elements.merge_list;
        const start_el = document.getElementById(start_id);
        const end_el = document.getElementById(end_id);
        if (start_el == undefined || end_el == undefined || start_el === end_el) {
            return;
        }
        const children = Array.from(list.children);
        const start_index = children.indexOf(start_el);
        const end_index = children.indexOf(end_el);
        if (start_index < 0 || end_index < 0) {
            return;
        }
        if (start_index < end_index) {
            list.insertBefore(start_el, end_el.nextSibling);
        } else {
            list.insertBefore(start_el, end_el);
        }
        const new_order_ids = Array.from(list.children).map((child) => child.id);
        owner.status.merge_files.sort((a, b) => new_order_ids.indexOf(a.id) - new_order_ids.indexOf(b.id));
        owner.#renderMergeList();
    }
    #updateMergeButtonState() {
        const owner = this;
        const ready = owner.status.merge_files.length >= 2 && owner.status.merge_files.every((f) => f.pages != undefined);
        owner.elements.merge_button.classList.toggle("pe-disabled", !ready);
    }
    async #mergePdfs(entries, add_page_numbers) {
        const { PDFDocument, StandardFonts, rgb } = window.exportsPDFLIB;
        const merged = await PDFDocument.create();
        const font = add_page_numbers ? await merged.embedFont(StandardFonts.Helvetica) : undefined;
        const all_pages = [];
        for (const entry of entries) {
            const src = await PDFDocument.load(entry.bytes, { ignoreEncryption: true });
            const copied = await merged.copyPages(src, src.getPageIndices());
            for (const page of copied) {
                merged.addPage(page);
                all_pages.push(page);
            }
        }
        if (add_page_numbers) {
            const font_size = 10;
            const margin_right = 15;
            const label_y = 15;
            all_pages.forEach((page, index) => {
                const { width } = page.getSize();
                const label = `${index + 1} / ${all_pages.length}`;
                // fixed offsets overflow once the page count grows extra digits - measure the
                // actual rendered width so the label stays right-aligned regardless of length
                const label_width = font.widthOfTextAtSize(label, font_size);
                const x = width - label_width - margin_right;
                // an ellipse circumscribing the label's bounding box (scaling each half-axis by
                // sqrt(2) puts the box's corners exactly on the ellipse) still fully covers it,
                // without the harder edges of a rectangle patch
                const half_width = (label_width + 4) / 2;
                const half_height = (font_size + 4) / 2;
                page.drawEllipse({
                    x: x + label_width / 2,
                    y: (label_y + (font_size / 2) - 4),
                    xScale: half_width * Math.SQRT2,
                    yScale: half_height * Math.SQRT2,
                    color: rgb(1, 1, 1), // theme-independent: drawn into the PDF
                });
                page.drawText(label, {
                    x,
                    y: label_y,
                    size: font_size,
                    font,
                    color: rgb(0.27, 0.27, 0.27), // theme-independent: drawn into the PDF
                });
            });
        }
        return await merged.save({ useObjectStreams: true });
    }
    //#endregion

    //#region Split
    async #handleSplitFile(file) {
        const owner = this;
        try {
            const bytes = await owner.#readFileAsArrayBuffer(file);
            const { PDFDocument } = window.exportsPDFLIB;
            const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
            const pages = pdf.getPageCount();
            owner.status.split_file = { file, name: file.name, size: file.size, bytes, pages };
            owner.status.split_parts = [{ id: UiBuilder.newId("pdfeditor-split-part"), size: pages }];
            owner.elements.split_info.innerText = `${file.name} · ${pages} ${Locale.at("pagine")} · ${owner.#formatBytes(file.size)}`;
            owner.#renderSplitParts();
        } catch (error) {
            console.error(error);
            new Notify({ text: Locale.at("file PDF non valido"), type: "error", ms_timeout: 3000 });
        }
    }
    #renderSplitParts() {
        const owner = this;
        const container = owner.elements.split_parts;
        container.replaceChildren();
        owner.status.split_parts.forEach((part, index) => {
            const row = document.createElement("div");
            row.classList.add("pe-split-part-row");

            const label = document.createElement("span");
            label.innerText = `${Locale.at("Parte")} ${index + 1}:`;

            const syncLastInput = () => {
                const parts = owner.status.split_parts;
                const last_index = parts.length - 1;
                if (index === last_index) { return; } // editing the last part itself: leave it as typed
                const total_pages = owner.status.split_file?.pages ?? 0;
                const assigned_before_last = parts.slice(0, last_index).reduce((sum, p) => sum + p.size, 0);
                const last_part = parts[last_index];
                last_part.size = Math.max(total_pages - assigned_before_last, 0);
                const last_input = container.querySelectorAll(".pe-split-part-input")[last_index];
                if (last_input) { last_input.value = `${last_part.size}`; }
                owner.#updateSplitTotal();
            };
            const input = UiBuilder.createInput({
                type: 'number',
                min: '1',
                class: 'pe-split-part-input',
                oninput: () => {
                    part.size = Math.max(1, Math.floor(Number(input.value) || 1));
                    owner.#updateSplitTotal();
                    syncLastInput(); // fires for typing and for the custom arrows alike
                },
                value: `${part.size}`
            });

            row.append(label, input);
            if (owner.status.split_parts.length > 1) {
                const remove_btn = document.createElement("div");
                remove_btn.classList.add("pe-split-part-remove");
                remove_btn.innerText = "✕";
                remove_btn.addEventListener("click", () => {
                    owner.status.split_parts = owner.status.split_parts.filter((p) => p.id !== part.id);
                    owner.#renderSplitParts();
                });
                row.appendChild(remove_btn);
            }
            container.appendChild(row);
        });
        owner.#updateSplitTotal();
    }
    #updateSplitTotal() {
        const owner = this;
        const total_pages = owner.status.split_file?.pages ?? 0;
        const assigned = owner.status.split_parts.reduce((sum, p) => sum + p.size, 0);
        const valid = assigned === total_pages && owner.status.split_parts.length >= 2
            && owner.status.split_parts.every((p) => p.size >= 1);
        owner.elements.split_total.innerText = `${Locale.at("Totale assegnato")}: ${assigned} / ${total_pages}`;
        owner.elements.split_total.classList.toggle("pe-split-total-invalid", assigned !== total_pages);
        owner.elements.split_button.classList.toggle("pe-disabled", !valid);
        owner.status.split_valid = valid;
    }
    async #splitPdf() {
        const owner = this;
        const { PDFDocument } = window.exportsPDFLIB;
        const src = await PDFDocument.load(owner.status.split_file.bytes, { ignoreEncryption: true });
        const base_name = owner.status.split_file.name.replace(/\.pdf$/i, "");
        let cursor = 0;
        for (let i = 0; i < owner.status.split_parts.length; i++) {
            const size = owner.status.split_parts[i].size;
            const indices = Array.from({ length: size }, (_, k) => cursor + k);
            cursor += size;
            const out = await PDFDocument.create();
            const pages = await out.copyPages(src, indices);
            pages.forEach((page) => out.addPage(page));
            const bytes = await out.save({ useObjectStreams: true });
            setTimeout(() => owner.#downloadBytes(bytes, `${base_name}_parte${i + 1}.pdf`), i * PDFEditor.#DOWNLOAD_STAGGER_MS);
        }
    }
    //#endregion

    //#region Compress
    async #handleCompressFile(file) {
        const owner = this;
        try {
            const bytes = await owner.#readFileAsArrayBuffer(file);
            const { PDFDocument } = window.exportsPDFLIB;
            await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false }); // validate it's a real PDF
            owner.status.compress_file = { file, name: file.name, size: file.size, bytes };
            owner.elements.compress_info.innerText = `${file.name} · ${owner.#formatBytes(file.size)}`;
        } catch (error) {
            console.error(error);
            new Notify({ text: Locale.at("file PDF non valido"), type: "error", ms_timeout: 3000 });
        }
    }
    /**
     * always re-saves with object streams (a structural, lossless size reduction); at "medium"/
     * "high" also walks every indirect object and re-encodes plain RGB JPEG (`/DCTDecode`) images
     * in place at a lower quality, skipping anything with a soft mask or a non-RGB color space to
     * avoid corrupting colors it can't safely reconstruct
     */
    async #compressPdf(bytes, level) {
        const { PDFDocument, PDFName, PDFRawStream, PDFArray } = window.exportsPDFLIB;
        const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
        const quality = PDFEditor.#COMPRESS_JPEG_QUALITY[level];
        if (quality != undefined) {
            for (const [, object] of pdfDoc.context.enumerateIndirectObjects()) {
                if (!(object instanceof PDFRawStream)) {
                    continue;
                }
                const subtype = object.dict.lookup(PDFName.of("Subtype"));
                // filters can be chained (e.g. `[/ASCII85Decode /DCTDecode]`) - the image encoding is
                // always the last one in the chain
                let filter = object.dict.lookup(PDFName.of("Filter"));
                if (filter instanceof PDFArray) {
                    filter = filter.size() > 0 ? filter.lookup(filter.size() - 1) : undefined;
                }
                const color_space = object.dict.lookup(PDFName.of("ColorSpace"));
                const has_smask = object.dict.lookup(PDFName.of("SMask")) != undefined;
                if (subtype !== PDFName.of("Image") || filter !== PDFName.of("DCTDecode") || has_smask) {
                    continue;
                }
                if (color_space != undefined && color_space !== PDFName.of("DeviceRGB")) {
                    continue;
                }
                try {
                    const recompressed = await this.#recompressJpegBytes(object.contents, quality);
                    if (recompressed != undefined && recompressed.length < object.contents.length) {
                        object.contents = recompressed;
                    }
                } catch (error) {
                    console.warn("PDFEditor: skipped image recompression", error);
                }
            }
        }
        return await pdfDoc.save({ useObjectStreams: true });
    }
    async #recompressJpegBytes(jpeg_bytes, quality) {
        const blob = new Blob([jpeg_bytes], { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        try {
            const img = await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = url;
            });
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext("2d").drawImage(img, 0, 0);
            const data_url = canvas.toDataURL("image/jpeg", quality);
            const binary = atob(data_url.slice(data_url.indexOf(",") + 1));
            const out = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                out[i] = binary.charCodeAt(i);
            }
            return out;
        } finally {
            URL.revokeObjectURL(url);
        }
    }
    //#endregion

    //#region Edit
    async #handleEditFile(file) {
        const owner = this;
        try {
            const bytes = await owner.#readFileAsArrayBuffer(file);
            const { PDFDocument } = window.exportsPDFLIB;
            const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
            if (owner.status.edit_file?.pdfjsLoadingTask != undefined) {
                await owner.status.edit_file.pdfjsLoadingTask.destroy();
            }
            // the CropBox (falls back to the MediaBox), not getSize()'s MediaBox: it's the area pdf.js
            // actually renders, so the workspace's aspect ratio has to follow it
            const page_sizes = pdf.getPages().map((page) => {
                const { width, height } = page.getCropBox();
                return { width, height };
            });
            // pass pdf.js its own copy of the bytes: `bytes` (the ArrayBuffer) is kept around and
            // re-read later by pdf-lib (`#exportEditedPdf`), and pdf.js's loading task takes
            // ownership of whatever buffer it's handed
            const pdfjsLoadingTask = window.pdfjsLib.getDocument({
                data: bytes.slice(0),
                useWorkerFetch: false,
                BinaryDataFactory: PDFEditor.#PdfJsBinaryDataFactory,
            });
            const pdfjsDoc = await pdfjsLoadingTask.promise;
            owner.status.edit_file = { file, name: file.name, bytes, pages: pdf.getPageCount(), page_sizes, pdfjsLoadingTask, pdfjsDoc };
            owner.status.edit_current_page = 0;
            owner.status.edit_page_edits = new Map();
            owner.status.edit_undo_stack = [];
            owner.#ensureToolsBar();
            owner.#setEditTool(null);
            owner.elements.edit_editor.classList.remove("pe-hidden");
            await owner.#renderEditPage();
        } catch (error) {
            console.error(error);
            new Notify({ text: Locale.at("file PDF non valido"), type: "error", ms_timeout: 3000 });
        }
    }
    async #renderEditPage() {
        const owner = this;
        owner.#discardPendingOverlays();
        const page_number = owner.status.edit_current_page + 1;
        // the overlay canvas maps its 0-1 marks onto the page assuming the pdf.js canvas fills the
        // workspace exactly (no scroll/letterbox): matching the workspace's aspect ratio to the real
        // page makes `#renderPdfPage` (which sizes off this same workspace) fit the whole page to it
        const size = owner.status.edit_file.page_sizes[owner.status.edit_current_page];
        owner.elements.edit_workspace.style.aspectRatio = `${size.width} / ${size.height}`;
        owner.elements.edit_page_label.innerText = `${page_number} / ${owner.status.edit_file.pages}`;
        await owner.#renderPdfPage(page_number);
        owner.#syncCanvasSizes();
        owner.#redrawEditCanvas();
    }
    /**
     * renders `page_number` (1-based) onto `elements.edit_frame` at the workspace's current device-
     * pixel size, so it stays sharp on high-DPI phone screens instead of just its CSS size
     */
    async #renderPdfPage(page_number) {
        const owner = this;
        // pdf.js forbids starting a render on a canvas that's already mid-render - cancel any
        // still-running one left over from a fast page flip before reusing the canvas
        owner.status.edit_render_task?.cancel();
        owner.status.edit_render_task = undefined;
        const page = await owner.status.edit_file.pdfjsDoc.getPage(page_number);
        const canvas = owner.elements.edit_frame;
        const rect = owner.elements.edit_workspace.getBoundingClientRect();
        const unscaled_viewport = page.getViewport({ scale: 1 });
        const device_scale = (rect.width / unscaled_viewport.width) * (window.devicePixelRatio || 1);
        const viewport = page.getViewport({ scale: device_scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const render_task = page.render({ canvasContext: canvas.getContext("2d"), viewport });
        owner.status.edit_render_task = render_task;
        try {
            await render_task.promise;
        } catch (error) {
            if (error?.name !== "RenderingCancelledException") {
                throw error;
            }
        } finally {
            if (owner.status.edit_render_task === render_task) {
                owner.status.edit_render_task = undefined;
            }
        }
    }
    #syncCanvasSizes() {
        const owner = this;
        const canvas = owner.elements.edit_canvas;
        const rect = owner.elements.edit_workspace.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        // keep the slider on the real width (the css default is `100%`, not a fixed px value) - 0 while the panel is hidden
        if (rect.width > 0) {
            owner.elements.edit_width_slider.value = Math.round(rect.width);
        }
    }
    /**
     * sets `edit_workspace`'s width (CSS px) - `undefined` keeps the css default. The page is
     * re-rendered at the new size once the slider stops moving, the same way a window resize does;
     * until then the already-rendered canvases just stretch
     * @param {number} [width]
     */
    #applyEditWidth(width) {
        const owner = this;
        if (width == undefined) {
            return;
        }
        const workspace = owner.elements.edit_workspace;
        workspace.style.width = `${width}px`;
        workspace.style.minWidth = `${width}px`;
        clearTimeout(owner.#edit_width_render_timer);
        owner.#edit_width_render_timer = setTimeout(() => owner.status.resize_handler?.(), PDFEditor.#EDIT_WIDTH_RENDER_DELAY_MS);
    }
    /**
     * @returns {number|undefined} the last width picked with `edit_width_slider`, within the slider's range
     */
    #loadEditWidth() {
        const slider = this.elements.edit_width_slider;
        try {
            const saved = Number(localStorage.getItem(PDFEditor.#EDIT_WIDTH_STORAGE_KEY));
            if (saved > 0) {
                return Math.min(Math.max(saved, Number(slider.min)), Number(slider.max));
            }
        } catch { }
        return undefined;
    }
    #saveEditWidth(width) {
        try {
            localStorage.setItem(PDFEditor.#EDIT_WIDTH_STORAGE_KEY, String(width));
        } catch { }
    }
    #getCurrentPageEdit(create) {
        const owner = this;
        const index = owner.status.edit_current_page;
        let edit = owner.status.edit_page_edits.get(index);
        if (edit == undefined && create) {
            edit = { deleted: false, strokes: [], texts: [], redactions: [], signatures: [] };
            owner.status.edit_page_edits.set(index, edit);
        }
        return edit;
    }
    /**
     * every mark is stored as fractions (0-1) of the page box, so it survives the workspace being
     * resized and maps directly onto the real page's width/height when baked at export time
     */
    #canvasPointFromEvent(event) {
        const canvas = this.elements.edit_canvas;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) / rect.width,
            y: (event.clientY - rect.top) / rect.height,
        };
    }
    #redrawEditCanvas() {
        const owner = this;
        const canvas = owner.elements.edit_canvas;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const edit = owner.#getCurrentPageEdit(false);
        if (edit == undefined) {
            return;
        }
        for (const redaction of edit.redactions) {
            ctx.fillStyle = "#ffffff"; // theme-independent: previews the whiteout baked into the PDF
            ctx.fillRect(redaction.x * canvas.width, redaction.y * canvas.height, redaction.width * canvas.width, redaction.height * canvas.height);
            ctx.strokeStyle = UiBuilder.themeColor("--vscode-charts-red");
            ctx.lineWidth = PDFEditor.#REDACT_STROKE_WIDTH;
            ctx.strokeRect(redaction.x * canvas.width, redaction.y * canvas.height, redaction.width * canvas.width, redaction.height * canvas.height);
        }
        for (const stroke of edit.strokes) {
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.radius_fraction * canvas.width * 2;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            stroke.points.forEach((point, index) => {
                const x = point.x * canvas.width;
                const y = point.y * canvas.height;
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
        }
        for (const text_item of edit.texts) {
            ctx.save();
            // stored x/y are the text's *center* (matching the placement overlay's own centering);
            // translate there and rotate around it so `rotation` (degrees, same sign convention as
            // the placement overlay's CSS `rotate()`) matches what was shown on screen
            ctx.translate(text_item.x * canvas.width, text_item.y * canvas.height);
            ctx.rotate((text_item.rotation ?? 0) * Math.PI / 180);
            const size = text_item.font_size_fraction * canvas.width;
            ctx.fillStyle = text_item.color;
            ctx.font = `${size}px Helvetica`;
            // pdf-lib's drawText lays standard fonts out with plain glyph advances, no kerning pairs -
            // disable kerning here too (and on .pe-text-overlay-preview) so letter spacing matches the export
            ctx.fontKerning = "none";
            ctx.textAlign = "center";
            // canvas has no line-height, and "middle" centers the em box, which leaves the glyphs
            // visibly offset - anchor the baseline half an ascender below the center instead, exactly
            // like the PDF export does, so the canvas matches the exported output
            ctx.textBaseline = "alphabetic";
            ctx.fillText(text_item.text, 0, size * PDFEditor.#HELVETICA_ASCENT_FRACTION / 2);
            ctx.restore();
        }
        for (const signature of edit.signatures ?? []) {
            const image = owner.#signature_image_cache.get(signature.dataUrl);
            if (image == undefined || !image.complete) {
                // not decoded yet (or not requested yet) - `#loadSignatureImage` triggers this same
                // redraw once it resolves, so this pass just skips drawing it
                owner.#loadSignatureImage(signature.dataUrl).then(() => owner.#redrawEditCanvas());
                continue;
            }
            const image_width = signature.width_fraction * canvas.width;
            const image_height = image_width * (signature.natural_height / signature.natural_width);
            ctx.save();
            ctx.translate(signature.x * canvas.width, signature.y * canvas.height);
            ctx.rotate((signature.rotation ?? 0) * Math.PI / 180);
            ctx.drawImage(image, -image_width / 2, -image_height / 2, image_width, image_height);
            ctx.restore();
        }
        if (edit.deleted) {
            // repeated across the page (not just centered) so the stamp stays visible even when a
            // viewer/print only shows part of the page
            const stamp_positions = [
                { x: 0.5, y: 0.5 },
                { x: 0.25, y: 0.20 },
                { x: 0.75, y: 0.25 },
                { x: 0.25, y: 0.85 },
                { x: 0.75, y: 0.80 },
            ];
            for (const stamp_position of stamp_positions) {
                ctx.save();
                ctx.translate(stamp_position.x * canvas.width, stamp_position.y * canvas.height);
                ctx.rotate(-Math.PI / 10);
                ctx.fillStyle = UiBuilder.themeColor("--vscode-errorForeground");
                ctx.globalAlpha = .85;
                ctx.font = `bold ${Math.round(canvas.width * 0.07)}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(Locale.at("PAGINA ELIMINATA"), 0, 0);
                ctx.restore();
            }
        }
    }
    #pushEditUndo() {
        const owner = this;
        const edit = owner.#getCurrentPageEdit(true);
        owner.status.edit_undo_stack.push({ page: owner.status.edit_current_page, snapshot: JSON.parse(JSON.stringify(edit)) });
        if (owner.status.edit_undo_stack.length > PDFEditor.#UNDO_LIMIT) {
            owner.status.edit_undo_stack.shift();
        }
    }
    #setEditTool(tool) {
        const owner = this;
        owner.#discardPendingOverlays();
        owner.status.edit_active_tool = tool;
        // the buttons don't exist until `#ensureToolsBar` runs (first loaded file) - Escape/Undo can get here before that
        owner.elements.edit_btn_draw?.classList.toggle("pe-tool-active", tool === "draw");
        owner.elements.edit_btn_add_text?.classList.toggle("pe-tool-active", tool === "add_text");
        owner.elements.edit_btn_add_signature?.classList.toggle("pe-tool-active", tool === "add_signature");
        owner.elements.edit_btn_redact?.classList.toggle("pe-tool-active", tool === "redact");
        owner.elements.edit_canvas.classList.toggle("pe-edit-tool-active", tool != undefined);
        // a draw/redact drag on the canvas must not also scroll the page behind it
        document.body.classList.toggle("pe-body-scroll-lock", tool != undefined);
        owner.#syncStrokeWidthFloater();
    }
    /**
     * creates the left StickyBar holding the edit tools, once - its buttons replace the old
     * `fw-id` toolbar ones, so they're stored back into `elements` for `#setEditTool`
     */
    #ensureToolsBar() {
        const owner = this;
        if (owner.status.tools_bar != null) {
            return;
        }
        const tool_button = (title, icon_code, key, onClick) => ({
            title: Locale.at(title),
            icon_code: icon_code,
            theme: 'ez',
            class: `pe-tool-button pe-tool-${key}`,
            onClick: () => onClick.call({ fwInstanceReference: owner }),
        });
        try {
            owner.status.tools_bar = new StickyBar({
                id: "pdf-editor-tools",
                anchor: "left-center",
                buttons: [
                    tool_button("Disegna", "e746", "draw", owner.onClickEditDraw),
                    tool_button("Aggiungi testo", "e9f1", "add-text", owner.onClickEditAddText),
                    tool_button("Firma", "f603", "add-signature", owner.onClickAddSignature),
                    tool_button("Elimina area", "f727", "redact", owner.onClickEditRedact),
                    tool_button("Elimina pagina", "f74f", "delete-page", owner.onClickEditDeletePage),
                ],
            });
        } catch (error) {
            console.error(error);
            new Notify({ text: Locale.at("Impossibile mostrare gli strumenti di modifica"), type: "error", ms_timeout: 3000 });
            return;
        }
        const bar = owner.status.tools_bar.elementReference();
        owner.elements.edit_btn_draw = bar.querySelector(".pe-tool-draw");
        owner.elements.edit_btn_add_text = bar.querySelector(".pe-tool-add-text");
        owner.elements.edit_btn_add_signature = bar.querySelector(".pe-tool-add-signature");
        owner.elements.edit_btn_redact = bar.querySelector(".pe-tool-redact");
        bar.classList.toggle("pe-tools-bar-hidden", owner.status.active_tab !== "edit");
    }
    /**
     * opens `edit_stroke_width_row` in a UiBuilder floating container (draggable, minimizable, closable)
     * while the draw tool is armed on the edit tab, and closes it otherwise. The first time it opens
     * beside the "Disegna" button, afterwards wherever the user last dragged it. Closing it by hand
     * (✕ button, Escape, back navigation) disarms the draw tool, like ImageEditor's tool panels
     */
    #syncStrokeWidthFloater() {
        const owner = this;
        const draw_btn = owner.elements.edit_btn_draw;
        const visible = owner.status.edit_active_tool === "draw"
            && owner.status.active_tab === "edit"
            && draw_btn != null;
        if (!visible) {
            owner.#closeStrokeWidthFloater();
            return;
        }
        if (owner.status.stroke_width_floater != null) {
            return;
        }
        const bar_rect = owner.status.tools_bar.elementReference().getBoundingClientRect();
        const btn_rect = draw_btn.getBoundingClientRect();
        const floater = UiBuilder.createFloatingContainer(owner.elements.edit_stroke_width_row, {
            id: "pdf-editor-stroke-width",
            start_location: { left: `${bar_rect.right + 6}px`, top: `${btn_rect.top}px` },
            // above an enclosing BottomSheet/MousePopUp
            style: "z-index: 9999999;",
            onDestroy: () => {
                // `#closeStrokeWidthFloater` clears the reference first: only a manual close gets here with it still set
                if (owner.status.stroke_width_floater !== floater) {
                    return;
                }
                owner.status.stroke_width_floater = null;
                owner.#setEditTool(null);
            },
        });
        owner.status.stroke_width_floater = floater;
    }
    #closeStrokeWidthFloater() {
        const owner = this;
        const floater = owner.status.stroke_width_floater;
        if (floater == null) {
            return;
        }
        owner.status.stroke_width_floater = null;
        // goes through the container's own teardown (listeners, SpaHistory entry)
        floater.querySelector(".floating-container-close")?.click();
    }
    /**
     * syncs the "Spessore" value label and the small dot preview to the slider's current value -
     * the dot's diameter (px) and color mirror what `#addEditCanvasListeners` will actually draw
     */
    #updateStrokeWidthPreview() {
        const owner = this;
        const value = owner.elements.edit_stroke_width_slider.value;
        owner.elements.edit_stroke_width_value.innerText = value;
        const dot = owner.elements.edit_stroke_width_preview_dot;
        dot.style.width = `${value}px`;
        dot.style.height = `${value}px`;
        dot.style.background = owner.status.edit_draw_color;
    }
    /**
     * uses Pointer Events (not mouse events) so drawing/redacting works with touch input, not just
     * a physical mouse - phones/tablets are this app's primary target (see PDFEditor.css's
     * `touch-action: none` on `.pe-edit-tool-active`, which stops the browser from stealing the
     * drag for a page scroll/pinch-zoom instead). `setPointerCapture` keeps delivering move/up
     * events to the canvas even if the finger/cursor strays outside it mid-gesture.
     */
    #addEditCanvasListeners() {
        const owner = this;
        const canvas = owner.elements.edit_canvas;
        canvas.addEventListener("pointerdown", (event) => {
            const tool = owner.status.edit_active_tool;
            // `owner.#edit_dragging` also guards against a second touch point (e.g. a resting palm)
            // landing mid-gesture and corrupting the in-progress stroke/redaction rectangle
            if (tool == undefined || owner.status.edit_file == undefined || owner.#edit_dragging) {
                return;
            }
            const point = owner.#canvasPointFromEvent(event);
            if (tool === "draw") {
                canvas.setPointerCapture(event.pointerId);
                owner.#pushEditUndo();
                owner.#edit_dragging = true;
                owner.#edit_current_stroke = { color: owner.status.edit_draw_color, radius_fraction: owner.status.edit_draw_stroke_radius_fraction, points: [point] };
                owner.#getCurrentPageEdit(true).strokes.push(owner.#edit_current_stroke);
                owner.#redrawEditCanvas();
            } else if (tool === "redact") {
                if (AppStatus.IsPhone) {
                    // a precise click-drag-release rectangle is fiddly with a finger - tap once to
                    // drop a default-sized rectangle with corner resize knobs, tap again (on it or
                    // anywhere else on the canvas) to confirm it where it is
                    if (owner.status.edit_placing_redaction_overlay != undefined) {
                        owner.#confirmPlacingRedaction();
                    } else {
                        owner.#startPlacingRedaction(point);
                    }
                } else {
                    canvas.setPointerCapture(event.pointerId);
                    owner.#edit_dragging = true;
                    owner.#edit_redact_start = point;
                }
            }
        });
        // add text/signature open on `click`, not `pointerdown`: a prompt opened mid-tap would get the
        // rest of that same tap (pointerup/mouseup/click - on touch hit-tested where the finger lifts)
        // on its own backdrop, closing it - or the BottomSheet hosting the editor - right away
        canvas.addEventListener("click", (event) => {
            const tool = owner.status.edit_active_tool;
            if (owner.status.edit_file == undefined || (tool !== "add_text" && tool !== "add_signature")) {
                return;
            }
            const point = owner.#canvasPointFromEvent(event);
            if (tool === "add_text") {
                owner.#promptEditAddText(event, point);
            } else {
                owner.#promptEditAddSignature(event, point);
            }
        });
        canvas.addEventListener("pointermove", (event) => {
            if (!owner.#edit_dragging) {
                return;
            }
            const point = owner.#canvasPointFromEvent(event);
            if (owner.status.edit_active_tool === "draw" && owner.#edit_current_stroke != undefined) {
                owner.#edit_current_stroke.points.push(point);
                owner.#redrawEditCanvas();
            } else if (owner.status.edit_active_tool === "redact" && owner.#edit_redact_start != undefined) {
                owner.#redrawEditCanvas();
                const ctx = canvas.getContext("2d");
                ctx.strokeStyle = UiBuilder.themeColor("--vscode-charts-red");
                ctx.lineWidth = PDFEditor.#REDACT_STROKE_WIDTH;
                ctx.strokeRect(
                    Math.min(owner.#edit_redact_start.x, point.x) * canvas.width,
                    Math.min(owner.#edit_redact_start.y, point.y) * canvas.height,
                    Math.abs(point.x - owner.#edit_redact_start.x) * canvas.width,
                    Math.abs(point.y - owner.#edit_redact_start.y) * canvas.height
                );
            }
        });
        const finish = (event) => {
            if (!owner.#edit_dragging) {
                return;
            }
            owner.#edit_dragging = false;
            if (owner.status.edit_active_tool === "redact" && owner.#edit_redact_start != undefined) {
                const point = owner.#canvasPointFromEvent(event);
                const rect = {
                    x: Math.min(owner.#edit_redact_start.x, point.x),
                    y: Math.min(owner.#edit_redact_start.y, point.y),
                    width: Math.abs(point.x - owner.#edit_redact_start.x),
                    height: Math.abs(point.y - owner.#edit_redact_start.y),
                };
                owner.#edit_redact_start = null;
                if (rect.width > 0.005 && rect.height > 0.005) {
                    owner.#pushEditUndo();
                    owner.#getCurrentPageEdit(true).redactions.push(rect);
                }
                owner.#redrawEditCanvas();
            }
            owner.#edit_current_stroke = null;
        };
        canvas.addEventListener("pointerup", finish);
        canvas.addEventListener("pointercancel", finish);
        // pointer capture (above) means "leave" won't normally fire mid-gesture - kept only as a
        // fallback for a WebView where capture is a no-op
        canvas.addEventListener("pointerleave", finish);
    }
    /**
     * phone-only alternative to the desktop drag-to-draw redaction gesture (see
     * `#addEditCanvasListeners`) - drops a default-sized rectangle, centered on the tapped canvas
     * point, with two corner resize knobs (top-left, bottom-right; each drags its own corner while
     * the opposite one stays put). Appended to `document.body`, like `#startPlacingText`, so it
     * isn't clipped by the workspace. Dragging the rectangle itself moves it; tapping it confirms it via
     * `#confirmPlacingRedaction`; tapping anywhere else on the canvas is handled by
     * `#addEditCanvasListeners`'s own pointerdown, which calls the same method.
     * @param {{x: number, y: number}} point
     */
    #startPlacingRedaction(point) {
        const owner = this;
        owner.#discardPendingOverlays();
        const canvas = owner.elements.edit_canvas;
        const canvas_rect = canvas.getBoundingClientRect();

        const rect = {
            width: canvas_rect.width * PDFEditor.#REDACT_DEFAULT_WIDTH_FRACTION,
            height: canvas_rect.height * PDFEditor.#REDACT_DEFAULT_HEIGHT_FRACTION,
        };
        // anchored the same way `#startPlacingText` is: viewport-relative canvas_rect + the page's
        // current scroll offset, since the overlay is `position: absolute` on document.body
        rect.left = canvas_rect.left + point.x * canvas_rect.width - rect.width / 2 + window.scrollX;
        rect.top = canvas_rect.top + point.y * canvas_rect.height - rect.height / 2 + window.scrollY;

        const overlay = document.createElement("div");
        overlay.classList.add("pe-redact-overlay");

        const fill = document.createElement("div");
        fill.classList.add("pe-redact-overlay-fill");
        overlay.appendChild(fill);

        const knob_tl = document.createElement("div");
        knob_tl.classList.add("pe-redact-overlay-knob", "pe-redact-overlay-knob-tl");
        overlay.appendChild(knob_tl);

        const knob_br = document.createElement("div");
        knob_br.classList.add("pe-redact-overlay-knob", "pe-redact-overlay-knob-br");
        overlay.appendChild(knob_br);

        const applyRect = () => {
            overlay.style.left = `${rect.left}px`;
            overlay.style.top = `${rect.top}px`;
            overlay.style.width = `${rect.width}px`;
            overlay.style.height = `${rect.height}px`;
        };
        applyRect();

        document.body.appendChild(overlay);
        owner.status.edit_placing_redaction_overlay = overlay;

        // `x`/`y` are negated screen deltas (see `MovableUtil.trackMouse`), so `-= x`/`-= y` tracks
        // the pointer moving right/down - dragging the bottom-right knob just grows/shrinks the
        // rectangle from that corner, the top-left one stays fixed
        MovableUtil.trackMouse(knob_br, ({ x, y }) => {
            rect.width = Math.max(PDFEditor.#REDACT_MIN_SIZE_PX, rect.width - x);
            rect.height = Math.max(PDFEditor.#REDACT_MIN_SIZE_PX, rect.height - y);
            applyRect();
        }, undefined, 1, 1);

        // the top-left knob instead has to keep the *bottom-right* corner fixed, so any size change
        // (clamped to the same floor) has to be mirrored into an equal-and-opposite left/top move
        MovableUtil.trackMouse(knob_tl, ({ x, y }) => {
            const new_width = Math.max(PDFEditor.#REDACT_MIN_SIZE_PX, rect.width + x);
            const new_height = Math.max(PDFEditor.#REDACT_MIN_SIZE_PX, rect.height + y);
            rect.left -= new_width - rect.width;
            rect.top -= new_height - rect.height;
            rect.width = new_width;
            rect.height = new_height;
            applyRect();
        }, undefined, 1, 1);

        // dragging the rectangle itself moves it, size unchanged; a tap still confirms it - the click
        // the browser fires at the end of a real drag (mouse) is ignored, a finger's tap jitter isn't
        let dragged_px = 0;
        fill.addEventListener("pointerdown", () => dragged_px = 0);
        MovableUtil.trackMouse(fill, ({ x, y }) => {
            dragged_px += Math.abs(x) + Math.abs(y);
            rect.left -= x;
            rect.top -= y;
            applyRect();
        }, undefined, 1, 1);

        fill.addEventListener("click", () => {
            if (dragged_px > PDFEditor.#REDACT_TAP_SLOP_PX) {
                return;
            }
            owner.#confirmPlacingRedaction();
        });
    }
    /**
     * commits the phone-only `#startPlacingRedaction` overlay's current position/size into this
     * page's edits - the same fractions-of-the-canvas shape the desktop drag-to-draw gesture
     * produces in `#addEditCanvasListeners`'s `finish`, clamped to the canvas bounds since, unlike
     * the desktop gesture, the overlay can be dragged past them
     */
    #confirmPlacingRedaction() {
        const owner = this;
        const overlay = owner.status.edit_placing_redaction_overlay;
        if (overlay == undefined) {
            return;
        }
        const canvas_rect = owner.elements.edit_canvas.getBoundingClientRect();
        const overlay_rect = overlay.getBoundingClientRect();
        const clamp01 = (value) => Math.max(0, Math.min(1, value));
        const x = clamp01((overlay_rect.left - canvas_rect.left) / canvas_rect.width);
        const y = clamp01((overlay_rect.top - canvas_rect.top) / canvas_rect.height);
        const width = clamp01((overlay_rect.right - canvas_rect.left) / canvas_rect.width) - x;
        const height = clamp01((overlay_rect.bottom - canvas_rect.top) / canvas_rect.height) - y;
        overlay.remove();
        owner.status.edit_placing_redaction_overlay = undefined;
        if (width <= 0 || height <= 0) {
            return;
        }
        owner.#pushEditUndo();
        owner.#getCurrentPageEdit(true).redactions.push({ x, y, width, height });
        owner.#redrawEditCanvas();
    }
    /**
     * reuses the same MousePopUp + UiBuilder.createSimpleTextInput prompt ImageEditor's
     * onClickAddText uses, anchored at the click position; prepends two lists of previously-typed
     * texts (persisted in localStorage) so common labels don't need retyping - pinned texts (kept
     * indefinitely) above the plain recent-texts (capped, oldest dropped first)
     */
    #promptEditAddText(event, point) {
        const owner = this;
        const self_aware = { instance: undefined };
        const container = document.createElement("div");
        const closePopup = () => {
            if (self_aware.instance != undefined) {
                self_aware.instance.destroy();
                self_aware.instance = undefined;
            }
        };
        const onPick = (text) => {
            closePopup();
            owner.#startPlacingText(text, point);
        };

        const pinned_list = document.createElement("div");
        pinned_list.classList.add("pe-recent-texts");
        const recent_list = document.createElement("div");
        recent_list.classList.add("pe-recent-texts");

        const renderPinnedList = () => owner.#renderRecentTextRows(pinned_list, owner.#getPinnedTexts(), {
            onPick,
            toggle_icon: "e6f9", // unpin
            onToggle: (text) => {
                owner.#unpinText(text);
                renderPinnedList();
                renderRecentList();
            },
            onRemove: (text) => {
                owner.#removePinnedText(text);
                renderPinnedList();
            },
        });
        const renderRecentList = () => owner.#renderRecentTextRows(recent_list, owner.#getRecentTexts(), {
            onPick,
            toggle_icon: "e6aa", // pin
            onToggle: (text) => {
                owner.#pinText(text);
                renderPinnedList();
                renderRecentList();
            },
            onRemove: (text) => {
                owner.#removeRecentText(text);
                renderRecentList();
            },
        });
        renderPinnedList();
        renderRecentList();
        container.appendChild(pinned_list);
        container.appendChild(recent_list);
        container.appendChild(UiBuilder.createSimpleTextInput({
            next: (user_input) => {
                user_input = user_input.trim();
                closePopup();
                if (user_input.length === 0) {
                    return;
                }
                owner.#saveRecentText(user_input);
                owner.#startPlacingText(user_input, point);
            },
            onCancel: () => closePopup(),
            title: Locale.at("Inserisci il testo da aggiungere"),
            title_cancel: Locale.at("annulla"),
            title_confirm: Locale.at("ok"),
        }));
        // `MousePopUp` calls `afterTitleRow.focus()` on ready - delegate to the text-input overlay's
        // own `.focus()` override (it focuses the actual `<input>`), since `container` is a plain div
        container.focus = () => container.lastElementChild.focus();
        const options = {
            afterTitleRow: container,
            iAmAwareThereAreNoSelections: true,
            event: { clientX: event.clientX, clientY: event.clientY },
            onReady: () => { options.afterTitleRow.focus(); },
        };
        options.afterTitleRow.lastElementChild.style.borderRadius = 0;
        self_aware.instance = new MousePopUp(options);
    }
    /**
     * (re)renders one pinned/recent-texts list into `list_el`: each row shows the text, a
     * pin/unpin toggle and a remove (`f508`) button - shared by both lists in `#promptEditAddText`
     * @param {HTMLElement} list_el
     * @param {string[]} texts
     * @param {Object} handlers
     * @param {(text: string) => void} handlers.onPick
     * @param {(text: string) => void} handlers.onToggle
     * @param {(text: string) => void} handlers.onRemove
     * @param {string} handlers.toggle_icon
     */
    #renderRecentTextRows(list_el, texts, { onPick, onToggle, onRemove, toggle_icon }) {
        list_el.innerHTML = "";
        list_el.classList.toggle("pe-hidden", texts.length === 0);
        for (const text of texts) {
            const row = document.createElement("div");
            row.classList.add("pe-recent-text-row");

            const label = document.createElement("div");
            label.classList.add("pe-recent-text-label");
            label.innerText = text;
            label.addEventListener("click", () => onPick(text));

            const toggle_btn = Icons.create(toggle_icon);
            toggle_btn.classList.add("pe-recent-text-pin");
            toggle_btn.addEventListener("click", (toggle_event) => {
                toggle_event.stopPropagation();
                onToggle(text);
            });

            const remove_btn = Icons.create("f508");
            remove_btn.classList.add("pe-recent-text-remove");
            remove_btn.addEventListener("click", (remove_event) => {
                remove_event.stopPropagation();
                onRemove(text);
            });

            row.append(label, toggle_btn, remove_btn);
            list_el.appendChild(row);
        }
    }
    /**
     * @returns {string[]} previously-typed "add text" values, most recent first - see
     * `#promptEditAddText`
     */
    #getRecentTexts() {
        try {
            const saved = JSON.parse(localStorage.getItem(PDFEditor.#RECENT_TEXTS_STORAGE_KEY));
            return Array.isArray(saved) ? saved : [];
        } catch (e) {
            console.warn(`Failed to load recent texts from localStorage: ${e.message}`);
            return [];
        }
    }
    #setRecentTexts(recent_texts) {
        try {
            localStorage.setItem(PDFEditor.#RECENT_TEXTS_STORAGE_KEY, JSON.stringify(recent_texts));
        } catch (e) {
            console.warn(`Failed to save recent texts to localStorage: ${e.message}`);
        }
    }
    /** records `text` as the most recent "add text" value, deduplicated and capped to `#RECENT_TEXTS_LIMIT` */
    #saveRecentText(text) {
        const owner = this;
        if (owner.#getPinnedTexts().includes(text)) {
            // already pinned (so already one click away) - don't also clutter the recent list
            return;
        }
        const recent_texts = owner.#getRecentTexts().filter((existing) => existing !== text);
        recent_texts.unshift(text);
        recent_texts.length = Math.min(recent_texts.length, PDFEditor.#RECENT_TEXTS_LIMIT);
        owner.#setRecentTexts(recent_texts);
    }
    /** removes `text` from the persisted recent-texts list - see `#promptEditAddText` */
    #removeRecentText(text) {
        const owner = this;
        owner.#setRecentTexts(owner.#getRecentTexts().filter((existing) => existing !== text));
    }
    /**
     * @returns {string[]} pinned "add text" values, most recently pinned first - see
     * `#promptEditAddText`; unlike the recent-texts list, this one is never auto-trimmed
     */
    #getPinnedTexts() {
        try {
            const saved = JSON.parse(localStorage.getItem(PDFEditor.#PINNED_TEXTS_STORAGE_KEY));
            return Array.isArray(saved) ? saved : [];
        } catch (e) {
            console.warn(`Failed to load pinned texts from localStorage: ${e.message}`);
            return [];
        }
    }
    #setPinnedTexts(pinned_texts) {
        try {
            localStorage.setItem(PDFEditor.#PINNED_TEXTS_STORAGE_KEY, JSON.stringify(pinned_texts));
        } catch (e) {
            console.warn(`Failed to save pinned texts to localStorage: ${e.message}`);
        }
    }
    /** moves `text` out of the recent-texts list and into the (uncapped) pinned-texts list */
    #pinText(text) {
        const owner = this;
        owner.#setRecentTexts(owner.#getRecentTexts().filter((existing) => existing !== text));
        const pinned_texts = owner.#getPinnedTexts().filter((existing) => existing !== text);
        pinned_texts.unshift(text);
        owner.#setPinnedTexts(pinned_texts);
    }
    /** moves `text` out of the pinned-texts list and back into the recent-texts list */
    #unpinText(text) {
        const owner = this;
        owner.#setPinnedTexts(owner.#getPinnedTexts().filter((existing) => existing !== text));
        owner.#saveRecentText(text);
    }
    /** permanently removes `text` from the pinned-texts list (without moving it back to recent) */
    #removePinnedText(text) {
        const owner = this;
        owner.#setPinnedTexts(owner.#getPinnedTexts().filter((existing) => existing !== text));
    }
    /**
     * builds the floating placement overlay shared by `#startPlacingText`/`#startPlacingSignature`
     * (not yet appended to the DOM). It holds two sibling boxes: a preview wrapping `content`, the
     * only part that gets rotated/scaled, and a controls box holding the handles, which is only
     * resized to wrap the preview's rotated/scaled bounding box - so the handles themselves never
     * scale or rotate along with the content
     * @param {HTMLElement} content
     * @param {number} anchor_x document-relative
     * @param {number} anchor_y document-relative
     * @param {{x: number, y: number, scale: number, rotation: number}} state read by `applyTransform`
     * @param {(scale: number) => void} [applyScale] when given, called with `state.scale` instead of
     * scaling the preview via CSS `scale()` - text needs this, since `scale()` magnifies glyph
     * advances laid out (and rounded) at the unscaled font size, so the letter spacing wouldn't
     * match the canvas, which draws straight at the final size
     */
    #createPlacementOverlay(content, anchor_x, anchor_y, state, applyScale) {
        const overlay = document.createElement("div");
        overlay.classList.add("pe-text-overlay");
        overlay.style.left = `${anchor_x}px`;
        overlay.style.top = `${anchor_y}px`;

        const preview = document.createElement("div");
        preview.classList.add("pe-text-overlay-preview");
        preview.appendChild(content);
        overlay.appendChild(preview);

        const controls = document.createElement("div");
        controls.classList.add("pe-text-overlay-controls");
        overlay.appendChild(controls);

        const move_handle = Icons.create("f71e");
        move_handle.classList.add("pe-text-overlay-handle");
        controls.appendChild(move_handle);

        const confirm_button = Icons.create("e5ca");
        confirm_button.classList.add("pe-text-overlay-confirm");
        controls.appendChild(confirm_button);

        const scale_rotate_handle = Icons.create("ebee");
        scale_rotate_handle.classList.add("pe-text-overlay-handle", "pe-text-overlay-handle-scale-rotate");
        controls.appendChild(scale_rotate_handle);

        const applyTransform = () => {
            // the overlay only translates, so its (untransformed) center stays the preview's center -
            // which the confirm handlers read back via `overlay.getBoundingClientRect()`
            overlay.style.transform = `translate(-50%, -50%) translate(${state.x}px, ${state.y}px)`;
            let css_scale = state.scale;
            if (applyScale != undefined) {
                applyScale(state.scale);
                css_scale = 1;
            }
            preview.style.transform = `rotate(${state.rotation}deg) scale(${css_scale})`;
            const radians = state.rotation * Math.PI / 180;
            const cos = Math.abs(Math.cos(radians));
            const sin = Math.abs(Math.sin(radians));
            const width = preview.offsetWidth * css_scale;
            const height = preview.offsetHeight * css_scale;
            controls.style.width = `${width * cos + height * sin}px`;
            controls.style.height = `${width * sin + height * cos}px`;
        };

        // double-clicking the scale/rotate handle resets it back to scale 1 / rotation 0
        scale_rotate_handle.addEventListener("dblclick", () => {
            state.scale = 1;
            state.rotation = 0;
            applyTransform();
        });

        return { overlay, move_handle, confirm_button, scale_rotate_handle, applyTransform };
    }
    /**
     * drops a floating text overlay - appended to `document.body` (like ImageEditor's own add-text
     * overlay) so it isn't clipped by the workspace - centered on the canvas point the user clicked.
     * Dragging the move handle repositions it (`MovableUtil.trackMouse`, same as ImageEditor);
     * clicking the checkmark reads the overlay's *current* screen position back into
     * canvas-normalized coordinates and commits it to this page's edits
     * @param {string} text
     * @param {{x: number, y: number}} point
     */
    #startPlacingText(text, point) {
        const owner = this;
        owner.#discardPendingOverlays();
        const canvas = owner.elements.edit_canvas;
        const canvas_rect = canvas.getBoundingClientRect();
        // canvas_rect is viewport-relative, but the overlay is `position: absolute` on document.body
        // (document-relative), so the page's current scroll offset has to be folded in
        const anchor_x = canvas_rect.left + point.x * canvas_rect.width + window.scrollX;
        const anchor_y = canvas_rect.top + point.y * canvas_rect.height + window.scrollY;

        const text_span = document.createElement("div");
        text_span.style = "transform: translate(1px, 0px);font-family: Helvetica;";
        text_span.innerText = text;

        const saved_scale_rotation = owner.#getSavedTextScaleRotation();
        const state = { x: 0, y: 0, scale: saved_scale_rotation.scale, rotation: saved_scale_rotation.rotation };
        const base_font_size = PDFEditor.#ADD_TEXT_FONT_SIZE_FRACTION * canvas_rect.width;
        const { overlay, move_handle, confirm_button, scale_rotate_handle, applyTransform } =
            owner.#createPlacementOverlay(text_span, anchor_x, anchor_y, state, (scale) => {
                overlay.style.fontSize = `${base_font_size * scale}px`;
            });

        document.body.appendChild(overlay);
        owner.status.edit_placing_text_overlay = overlay;
        applyTransform();

        MovableUtil.trackMouse(move_handle, ({ x, y }) => {
            // negated deltas, matching the convention `#createMoveBar`-style drag handles use
            // elsewhere in this codebase (ImageEditor's own text overlay included)
            state.x -= x;
            state.y -= y;
            applyTransform();
        }, undefined, 1, 1);

        MovableUtil.trackMouse(scale_rotate_handle, ({ x, y }) => {
            // x drag rescales the text (dragging the handle further out grows it), y drag rotates it -
            // same convention as ImageEditor's own text overlay
            state.scale = Math.max(
                PDFEditor.#TEXT_MIN_SCALE,
                Math.min(PDFEditor.#TEXT_MAX_SCALE, state.scale - x * PDFEditor.#TEXT_SCALE_SENSITIVITY)
            );
            state.rotation -= y * PDFEditor.#TEXT_ROTATION_SENSITIVITY;
            applyTransform();
        }, undefined, 1, 1);

        MovableUtil.trackMouse(text_span, ({ x, y }) => {
            // dragging the text itself (as opposed to the move handle) pans the page instead of
            // repositioning the overlay - content follows the drag, like a scrollable area dragged
            // with the mouse/finger, so touch users can still scroll past the overlay without
            // accidentally moving it
            window.scrollBy(0, y);
            owner.elements.self_ref.scrollLeft += x;
            // the overlay is appended to document.body, outside .pe-container, so unlike the canvas
            // underneath it, it isn't carried along by that scrollLeft change - translate it by the
            // same amount so it stays anchored to the same point on the canvas
            state.x -= x;
            applyTransform();
        }, undefined, 1, 1);

        confirm_button.addEventListener("click", () => {
            const rect = canvas.getBoundingClientRect();
            const overlay_rect = overlay.getBoundingClientRect();
            const center_x = overlay_rect.left + overlay_rect.width / 2;
            const center_y = overlay_rect.top + overlay_rect.height / 2;
            owner.#pushEditUndo();
            owner.#getCurrentPageEdit(true).texts.push({
                text,
                x: ((center_x - rect.left) / rect.width),
                y: (center_y - rect.top) / rect.height,
                font_size_fraction: PDFEditor.#ADD_TEXT_FONT_SIZE_FRACTION * state.scale,
                rotation: state.rotation,
                color: "#000000", // theme-independent: text color baked into the PDF
            });
            owner.#redrawEditCanvas();
            overlay.remove();
            owner.status.edit_placing_text_overlay = undefined;
            owner.#saveTextScaleRotation(state.scale, state.rotation);
        });
    }
    /**
     * @returns {{scale: number, rotation: number}} the scale/rotation the scale/rotate handle was
     * left at the last time text was placed (see `#startPlacingText`), so the next "add text"
     * starts from there instead of always resetting to scale 1 / rotation 0
     */
    #getSavedTextScaleRotation() {
        try {
            const saved = JSON.parse(localStorage.getItem(PDFEditor.#TEXT_SCALE_ROTATION_STORAGE_KEY));
            if (typeof saved?.scale === "number" && typeof saved?.rotation === "number") {
                return saved;
            }
        } catch (e) {
            console.warn(`Failed to load text scale/rotation from localStorage: ${e.message}`);
        }
        return { scale: 1, rotation: 0 };
    }
    /** persists the scale/rotation the scale/rotate handle was left at - see `#getSavedTextScaleRotation` */
    #saveTextScaleRotation(scale, rotation) {
        try {
            localStorage.setItem(PDFEditor.#TEXT_SCALE_ROTATION_STORAGE_KEY, JSON.stringify({ scale, rotation }));
        } catch (e) {
            console.warn(`Failed to save text scale/rotation to localStorage: ${e.message}`);
        }
    }
    /**
     * discards an in-progress `#startPlacingText` overlay (if any) without committing it - used
     * whenever the placement UI could otherwise be left orphaned: switching page/tool, or
     * destroying the component
     */
    #discardPlacingTextOverlay() {
        const owner = this;
        owner.status.edit_placing_text_overlay?.remove();
        owner.status.edit_placing_text_overlay = undefined;
    }
    /** discards an in-progress `#startPlacingSignature` overlay (if any) without committing it - see `#discardPlacingTextOverlay` */
    #discardPlacingSignatureOverlay() {
        const owner = this;
        owner.status.edit_placing_signature_overlay?.remove();
        owner.status.edit_placing_signature_overlay = undefined;
    }
    /** discards an in-progress `#startPlacingRedaction` overlay (if any) without committing it - see `#discardPlacingTextOverlay` */
    #discardPlacingRedactionOverlay() {
        const owner = this;
        owner.status.edit_placing_redaction_overlay?.remove();
        owner.status.edit_placing_redaction_overlay = undefined;
    }
    /** discards any in-progress placement overlay (text, signature or redaction) - only one can be active at a time */
    #discardPendingOverlays() {
        const owner = this;
        owner.#discardPlacingTextOverlay();
        owner.#discardPlacingSignatureOverlay();
        owner.#discardPlacingRedactionOverlay();
    }
    /**
     * cancels an in-progress canvas gesture (a draw stroke or redact rectangle still being
     * dragged), if any - used when another action (like Undo) interrupts it, so it doesn't keep
     * going or leave a half-formed mark behind
     * @returns {boolean} whether a gesture was actually active and got cancelled
     */
    #stopActiveEditGesture() {
        const owner = this;
        if (!owner.#edit_dragging) {
            return false;
        }
        owner.#edit_dragging = false;
        if (owner.status.edit_active_tool === "draw" && owner.#edit_current_stroke != undefined) {
            // the stroke was already pushed into `edit.strokes` (and an undo snapshot taken) at
            // mousedown, before any of it was drawn - drop both so cancelling it doesn't leave a
            // stray mark or a dead no-op entry on the undo stack
            const edit = owner.#getCurrentPageEdit(false);
            const stroke_index = edit?.strokes.indexOf(owner.#edit_current_stroke) ?? -1;
            if (stroke_index !== -1) {
                edit.strokes.splice(stroke_index, 1);
                owner.status.edit_undo_stack.pop();
            }
        }
        owner.#edit_current_stroke = null;
        owner.#edit_redact_start = null;
        owner.#redrawEditCanvas();
        return true;
    }
    /**
     * stops/discards whatever's currently "in progress" in the edit tab - an armed tool (clearing
     * its `pe-tool-active` state), a mid-drag gesture, and any pending text/signature/redaction
     * placement overlay - none of which are in the undo history yet. Shared by the Undo button and the
     * Escape key (see `onClickEditUndo`/`#addEventListeners`).
     * @returns {boolean} whether anything was actually active and got stopped
     */
    #stopActiveEditOperations() {
        const owner = this;
        const had_active_operation = owner.#edit_dragging
            || owner.status.edit_placing_text_overlay != undefined
            || owner.status.edit_placing_signature_overlay != undefined
            || owner.status.edit_placing_redaction_overlay != undefined
            || owner.status.edit_active_tool != undefined;
        owner.#stopActiveEditGesture();
        owner.#setEditTool(null);
        return had_active_operation;
    }
    //#region Signature
    /**
     * opens a full-screen signature pad (drawing canvas + confirm/cancel/saved-signatures actions),
     * anchored at the canvas `point` the user clicked when the "Firma" tool was active (see
     * `#addEditCanvasListeners`). Confirming a freehand drawing - or picking a saved signature from
     * the list - hands it off to `#startPlacingSignature` for on-page placement.
     */
    #promptEditAddSignature(event, point) {
        const owner = this;
        const pad = document.createElement("div");
        pad.classList.add("pe-signature-pad");

        const canvas_wrap = document.createElement("div");
        canvas_wrap.classList.add("pe-signature-pad-canvas-wrap");
        const canvas = document.createElement("canvas");
        canvas.classList.add("pe-signature-pad-canvas");
        canvas_wrap.appendChild(canvas);

        const list = document.createElement("div");
        list.classList.add("pe-signature-pad-list", "pe-hidden");
        const pinned_list = document.createElement("div");
        pinned_list.classList.add("pe-recent-texts");
        const recent_list = document.createElement("div");
        recent_list.classList.add("pe-recent-texts");
        list.append(pinned_list, recent_list);

        const actions = document.createElement("div");
        actions.classList.add("pe-signature-pad-actions");
        const list_btn = document.createElement("div");
        list_btn.classList.add("ez-button");
        list_btn.innerText = Locale.at("Firme salvate");
        list_btn.appendChild(Icons.create("e179"))
        const cancel_btn = document.createElement("div");
        cancel_btn.classList.add("ez-button");
        cancel_btn.innerText = Locale.at("annulla");
        cancel_btn.appendChild(Icons.create("e5c9"))
        const confirm_btn = document.createElement("div");
        confirm_btn.classList.add("ez-button");
        confirm_btn.innerText = Locale.at("conferma");
        confirm_btn.appendChild(Icons.create("f88b"))
        actions.append(list_btn, cancel_btn, confirm_btn);

        pad.append(canvas_wrap, list, actions);
        document.body.appendChild(pad);

        const close = () => pad.remove();

        const ctx = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        const sizeCanvas = () => {
            const box = canvas_wrap.getBoundingClientRect();
            canvas.width = box.width * dpr;
            canvas.height = box.height * dpr;
            ctx.lineWidth = PDFEditor.#SIGNATURE_PAD_STROKE_WIDTH * dpr;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = "#000000"; // theme-independent: signature ink on the white pad, baked into the PDF
        };
        // the wrap is only just appended - wait a frame so its layout box is real before sizing off it
        requestAnimationFrame(sizeCanvas);

        let drawing = false;
        let has_drawn = false;
        const pointFromEvent = (evt) => {
            const box = canvas.getBoundingClientRect();
            return { x: (evt.clientX - box.left) * (canvas.width / box.width), y: (evt.clientY - box.top) * (canvas.height / box.height) };
        };
        canvas.addEventListener("pointerdown", (evt) => {
            canvas.setPointerCapture(evt.pointerId);
            drawing = true;
            has_drawn = true;
            const start = pointFromEvent(evt);
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
        });
        canvas.addEventListener("pointermove", (evt) => {
            if (!drawing) {
                return;
            }
            const p = pointFromEvent(evt);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        });
        const stopDrawing = () => { drawing = false; };
        canvas.addEventListener("pointerup", stopDrawing);
        canvas.addEventListener("pointercancel", stopDrawing);
        canvas.addEventListener("pointerleave", stopDrawing);

        const placeAndClose = (dataUrl) => {
            close();
            owner.#loadSignatureImage(dataUrl).then((image) => {
                owner.#startPlacingSignature(dataUrl, point, image.naturalWidth, image.naturalHeight);
            });
        };

        const renderPinnedList = () => owner.#renderSignatureRows(pinned_list, owner.#getPinnedSignatures(), {
            onPick: placeAndClose,
            toggle_icon: "e6f9", // unpin
            onToggle: (dataUrl) => {
                owner.#unpinSignature(dataUrl);
                renderPinnedList();
                renderRecentList();
            },
            onRemove: (dataUrl) => {
                owner.#removePinnedSignature(dataUrl);
                renderPinnedList();
            },
        });
        const renderRecentList = () => owner.#renderSignatureRows(recent_list, owner.#getRecentSignatures(), {
            onPick: placeAndClose,
            toggle_icon: "e6aa", // pin
            onToggle: (dataUrl) => {
                owner.#pinSignature(dataUrl);
                renderPinnedList();
                renderRecentList();
            },
            onRemove: (dataUrl) => {
                owner.#removeRecentSignature(dataUrl);
                renderRecentList();
            },
        });
        renderPinnedList();
        renderRecentList();

        list_btn.addEventListener("click", () => {
            const will_show_list = list.classList.contains("pe-hidden");
            list.classList.toggle("pe-hidden", !will_show_list);
            canvas_wrap.classList.toggle("pe-hidden", will_show_list);
            confirm_btn.classList.toggle("pe-hidden", will_show_list);
        });
        cancel_btn.addEventListener("click", close);
        confirm_btn.addEventListener("click", () => {
            const dataUrl = has_drawn ? owner.#trimSignatureCanvas(canvas) : undefined;
            if (dataUrl == undefined) {
                new Notify({ text: Locale.at("Disegna prima una firma"), type: "warning", ms_timeout: 2000 });
                return;
            }
            owner.#saveRecentSignature(dataUrl);
            placeAndClose(dataUrl);
        });
    }
    /**
     * crops `canvas` to the bounding box of its non-transparent pixels (plus a small margin) and
     * returns a PNG data URL - keeps a saved signature small instead of the full pad's size, and
     * keeps its background transparent for compositing over the page
     * @returns {string|undefined} undefined when nothing is drawn on `canvas`
     */
    #trimSignatureCanvas(canvas) {
        const ctx = canvas.getContext("2d");
        const { width, height } = canvas;
        const data = ctx.getImageData(0, 0, width, height).data;
        let min_x = width, min_y = height, max_x = -1, max_y = -1;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (data[(y * width + x) * 4 + 3] !== 0) {
                    if (x < min_x) min_x = x;
                    if (x > max_x) max_x = x;
                    if (y < min_y) min_y = y;
                    if (y > max_y) max_y = y;
                }
            }
        }
        if (max_x < min_x) {
            return undefined;
        }
        const margin = 6;
        min_x = Math.max(0, min_x - margin);
        min_y = Math.max(0, min_y - margin);
        max_x = Math.min(width - 1, max_x + margin);
        max_y = Math.min(height - 1, max_y + margin);
        const trimmed = document.createElement("canvas");
        trimmed.width = max_x - min_x + 1;
        trimmed.height = max_y - min_y + 1;
        trimmed.getContext("2d").drawImage(canvas, min_x, min_y, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height);
        return trimmed.toDataURL("image/png");
    }
    /**
     * (re)renders one pinned/recent-signatures list into `list_el`: each row shows a thumbnail, a
     * pin/unpin toggle and a remove (`f508`) button - mirrors `#renderRecentTextRows`
     * @param {HTMLElement} list_el
     * @param {string[]} data_urls
     * @param {Object} handlers
     * @param {(dataUrl: string) => void} handlers.onPick
     * @param {(dataUrl: string) => void} handlers.onToggle
     * @param {(dataUrl: string) => void} handlers.onRemove
     * @param {string} handlers.toggle_icon
     */
    #renderSignatureRows(list_el, data_urls, { onPick, onToggle, onRemove, toggle_icon }) {
        list_el.innerHTML = "";
        list_el.classList.toggle("pe-hidden", data_urls.length === 0);
        for (const dataUrl of data_urls) {
            const row = document.createElement("div");
            row.classList.add("pe-recent-text-row");

            const thumb = document.createElement("img");
            thumb.classList.add("pe-signature-thumb");
            thumb.src = dataUrl;
            thumb.addEventListener("click", () => onPick(dataUrl));

            const toggle_btn = Icons.create(toggle_icon);
            toggle_btn.classList.add("pe-recent-text-pin");
            toggle_btn.addEventListener("click", (toggle_event) => {
                toggle_event.stopPropagation();
                onToggle(dataUrl);
            });

            const remove_btn = Icons.create("f508");
            remove_btn.classList.add("pe-recent-text-remove");
            remove_btn.addEventListener("click", (remove_event) => {
                remove_event.stopPropagation();
                onRemove(dataUrl);
            });

            row.append(thumb, toggle_btn, remove_btn);
            list_el.appendChild(row);
        }
    }
    /** @returns {string[]} previously-drawn signature data URLs, most recent first - see `#promptEditAddSignature` */
    #getRecentSignatures() {
        try {
            const saved = JSON.parse(localStorage.getItem(PDFEditor.#RECENT_SIGNATURES_STORAGE_KEY));
            return Array.isArray(saved) ? saved : [];
        } catch (e) {
            console.warn(`Failed to load recent signatures from localStorage: ${e.message}`);
            return [];
        }
    }
    #setRecentSignatures(recent_signatures) {
        try {
            localStorage.setItem(PDFEditor.#RECENT_SIGNATURES_STORAGE_KEY, JSON.stringify(recent_signatures));
        } catch (e) {
            console.warn(`Failed to save recent signatures to localStorage: ${e.message}`);
        }
    }
    /** records `dataUrl` as the most recent signature, deduplicated and capped to `#RECENT_SIGNATURES_LIMIT` */
    #saveRecentSignature(dataUrl) {
        const owner = this;
        if (owner.#getPinnedSignatures().includes(dataUrl)) {
            return;
        }
        const recent_signatures = owner.#getRecentSignatures().filter((existing) => existing !== dataUrl);
        recent_signatures.unshift(dataUrl);
        recent_signatures.length = Math.min(recent_signatures.length, PDFEditor.#RECENT_SIGNATURES_LIMIT);
        owner.#setRecentSignatures(recent_signatures);
    }
    /** removes `dataUrl` from the persisted recent-signatures list */
    #removeRecentSignature(dataUrl) {
        const owner = this;
        owner.#setRecentSignatures(owner.#getRecentSignatures().filter((existing) => existing !== dataUrl));
    }
    /** @returns {string[]} pinned signature data URLs, most recently pinned first - never auto-trimmed */
    #getPinnedSignatures() {
        try {
            const saved = JSON.parse(localStorage.getItem(PDFEditor.#PINNED_SIGNATURES_STORAGE_KEY));
            return Array.isArray(saved) ? saved : [];
        } catch (e) {
            console.warn(`Failed to load pinned signatures from localStorage: ${e.message}`);
            return [];
        }
    }
    #setPinnedSignatures(pinned_signatures) {
        try {
            localStorage.setItem(PDFEditor.#PINNED_SIGNATURES_STORAGE_KEY, JSON.stringify(pinned_signatures));
        } catch (e) {
            console.warn(`Failed to save pinned signatures to localStorage: ${e.message}`);
        }
    }
    /** moves `dataUrl` out of the recent-signatures list and into the (uncapped) pinned-signatures list */
    #pinSignature(dataUrl) {
        const owner = this;
        owner.#setRecentSignatures(owner.#getRecentSignatures().filter((existing) => existing !== dataUrl));
        const pinned_signatures = owner.#getPinnedSignatures().filter((existing) => existing !== dataUrl);
        pinned_signatures.unshift(dataUrl);
        owner.#setPinnedSignatures(pinned_signatures);
    }
    /** moves `dataUrl` out of the pinned-signatures list and back into the recent-signatures list */
    #unpinSignature(dataUrl) {
        const owner = this;
        owner.#setPinnedSignatures(owner.#getPinnedSignatures().filter((existing) => existing !== dataUrl));
        owner.#saveRecentSignature(dataUrl);
    }
    /** permanently removes `dataUrl` from the pinned-signatures list (without moving it back to recent) */
    #removePinnedSignature(dataUrl) {
        const owner = this;
        owner.#setPinnedSignatures(owner.#getPinnedSignatures().filter((existing) => existing !== dataUrl));
    }
    /**
     * @returns {Promise<HTMLImageElement>} a decoded `<img>` for `dataUrl`, cached in
     * `#signature_image_cache` so `#redrawEditCanvas` can later draw it synchronously
     */
    #loadSignatureImage(dataUrl) {
        const owner = this;
        const cached = owner.#signature_image_cache.get(dataUrl);
        if (cached != undefined) {
            return cached.complete ? Promise.resolve(cached) : new Promise((resolve, reject) => {
                cached.addEventListener("load", () => resolve(cached), { once: true });
                cached.addEventListener("error", reject, { once: true });
            });
        }
        const image = new Image();
        owner.#signature_image_cache.set(dataUrl, image);
        const promise = new Promise((resolve, reject) => {
            image.addEventListener("load", () => resolve(image), { once: true });
            image.addEventListener("error", reject, { once: true });
        });
        image.src = dataUrl;
        return promise;
    }
    /**
     * drops a floating signature overlay - mirrors `#startPlacingText` but with an `<img>` in place
     * of the text span - anchored on the canvas point the user clicked when opening the signature
     * pad. Dragging/scaling/rotating works the same way; the confirm checkmark commits it to this
     * page's edits.
     * @param {string} dataUrl
     * @param {{x: number, y: number}} point
     * @param {number} natural_width
     * @param {number} natural_height
     */
    #startPlacingSignature(dataUrl, point, natural_width, natural_height) {
        const owner = this;
        owner.#discardPendingOverlays();
        const canvas = owner.elements.edit_canvas;
        const canvas_rect = canvas.getBoundingClientRect();
        const anchor_x = canvas_rect.left + point.x * canvas_rect.width + window.scrollX;
        const anchor_y = canvas_rect.top + point.y * canvas_rect.height + window.scrollY;

        const image_el = document.createElement("img");
        image_el.classList.add("pe-signature-overlay-img");
        image_el.style.width = `${PDFEditor.#ADD_SIGNATURE_WIDTH_FRACTION * canvas_rect.width}px`;

        const saved_scale_rotation = owner.#getSavedSignatureScaleRotation();
        const state = { x: 0, y: 0, scale: saved_scale_rotation.scale, rotation: saved_scale_rotation.rotation };
        const { overlay, move_handle, confirm_button, scale_rotate_handle, applyTransform } =
            owner.#createPlacementOverlay(image_el, anchor_x, anchor_y, state);
        // the controls box is sized off the image's layout height, which is only known once it decodes
        image_el.addEventListener("load", applyTransform, { once: true });
        image_el.src = dataUrl;

        document.body.appendChild(overlay);
        owner.status.edit_placing_signature_overlay = overlay;
        applyTransform();

        MovableUtil.trackMouse(move_handle, ({ x, y }) => {
            state.x -= x;
            state.y -= y;
            applyTransform();
        }, undefined, 1, 1);

        MovableUtil.trackMouse(scale_rotate_handle, ({ x, y }) => {
            state.scale = Math.max(
                PDFEditor.#TEXT_MIN_SCALE,
                Math.min(PDFEditor.#TEXT_MAX_SCALE, state.scale - x * PDFEditor.#TEXT_SCALE_SENSITIVITY)
            );
            state.rotation -= y * PDFEditor.#TEXT_ROTATION_SENSITIVITY;
            applyTransform();
        }, undefined, 1, 1);

        MovableUtil.trackMouse(image_el, ({ x, y }) => {
            window.scrollBy(0, y);
            owner.elements.self_ref.scrollLeft += x;
            state.x -= x;
            applyTransform();
        }, undefined, 1, 1);

        confirm_button.addEventListener("click", () => {
            const rect = canvas.getBoundingClientRect();
            const overlay_rect = overlay.getBoundingClientRect();
            const center_x = overlay_rect.left + overlay_rect.width / 2;
            const center_y = overlay_rect.top + overlay_rect.height / 2;
            owner.#pushEditUndo();
            owner.#getCurrentPageEdit(true).signatures.push({
                dataUrl,
                natural_width,
                natural_height,
                x: (center_x - rect.left) / rect.width,
                y: (center_y - rect.top) / rect.height,
                width_fraction: PDFEditor.#ADD_SIGNATURE_WIDTH_FRACTION * state.scale,
                rotation: state.rotation,
            });
            owner.#redrawEditCanvas();
            overlay.remove();
            owner.status.edit_placing_signature_overlay = undefined;
            owner.#saveSignatureScaleRotation(state.scale, state.rotation);
        });
    }
    /**
     * @returns {{scale: number, rotation: number}} the scale/rotation the scale/rotate handle was
     * left at the last time a signature was placed - see `#getSavedTextScaleRotation`
     */
    #getSavedSignatureScaleRotation() {
        try {
            const saved = JSON.parse(localStorage.getItem(PDFEditor.#SIGNATURE_SCALE_ROTATION_STORAGE_KEY));
            if (typeof saved?.scale === "number" && typeof saved?.rotation === "number") {
                return saved;
            }
        } catch (e) {
            console.warn(`Failed to load signature scale/rotation from localStorage: ${e.message}`);
        }
        return { scale: 1, rotation: 0 };
    }
    /** persists the scale/rotation the scale/rotate handle was left at - see `#getSavedSignatureScaleRotation` */
    #saveSignatureScaleRotation(scale, rotation) {
        try {
            localStorage.setItem(PDFEditor.#SIGNATURE_SCALE_ROTATION_STORAGE_KEY, JSON.stringify({ scale, rotation }));
        } catch (e) {
            console.warn(`Failed to save signature scale/rotation to localStorage: ${e.message}`);
        }
    }
    /**
     * @param {string} dataUrl a `data:image/...;base64,...` URL
     * @returns {Uint8Array}
     */
    #dataUrlToBytes(dataUrl) {
        const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    //#endregion

    #hexToRgbColor(hex, rgb) {
        const clean = (hex ?? "#000000").replace("#", ""); // theme-independent: PDF color conversion
        const normalized = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
        const value = parseInt(normalized, 16);
        return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
    }
    /**
     * bakes every recorded mark onto a fresh load of the original bytes (never the in-progress
     * preview), then removes pages marked deleted from highest index to lowest so earlier removals
     * don't shift the indices still to be removed
     */
    async #exportEditedPdf() {
        const owner = this;
        const { PDFDocument, StandardFonts, rgb, degrees } = window.exportsPDFLIB;
        const pdfDoc = await PDFDocument.load(owner.status.edit_file.bytes, { ignoreEncryption: true });
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();
        const indices_to_remove = [];
        /** @type {Map<string, Object>} embedded pdf-lib PNG image, keyed by its source data URL - a signature reused across pages/spots is only embedded once */
        const embedded_signatures = new Map();
        for (let i = 0; i < pages.length; i++) {
            const edit = owner.status.edit_page_edits.get(i);
            if (edit == undefined) {
                continue;
            }
            if (edit.deleted) {
                indices_to_remove.push(i);
                continue;
            }
            const page = pages[i];
            // edits are normalized to what pdf.js rendered - the CropBox (falls back to the MediaBox) -
            // so map them back onto it, origin included: a CropBox needn't start at (0, 0), and using
            // getSize()'s MediaBox instead shifts and rescales every mark on pages that define one
            const { x: origin_x, y: origin_y, width, height } = page.getCropBox();
            const toPdfX = (normalized_x) => origin_x + normalized_x * width;
            const toPdfY = (normalized_y) => origin_y + height - normalized_y * height;
            for (const redaction of edit.redactions) {
                page.drawRectangle({
                    x: toPdfX(redaction.x),
                    y: toPdfY(redaction.y + redaction.height),
                    width: redaction.width * width,
                    height: redaction.height * height,
                    color: rgb(1, 1, 1), // theme-independent: drawn into the PDF
                });
            }
            for (const stroke of edit.strokes) {
                const color = owner.#hexToRgbColor(stroke.color, rgb);
                for (let p = 1; p < stroke.points.length; p++) {
                    const from = stroke.points[p - 1];
                    const to = stroke.points[p];
                    page.drawLine({
                        start: { x: toPdfX(from.x), y: toPdfY(from.y) },
                        end: { x: toPdfX(to.x), y: toPdfY(to.y) },
                        thickness: Math.max(1, stroke.radius_fraction * width * 2),
                        color,
                    });
                }
            }
            for (const text_item of edit.texts) {
                const size = text_item.font_size_fraction * width;
                // stored x/y are the text's *center* (matching the placement overlay and the
                // canvas preview's textAlign/textBaseline "center"/"middle") - drawText only takes
                // a left-baseline anchor, so offset by half the measured width/height to center it.
                // With a rotation, pdf-lib rotates the glyphs *around that anchor*, not around the
                // center, so the anchor->center offset has to be rotated too, and the angle negated:
                // the page's y-axis points up while the canvas preview's (and the stored `rotation`,
                // which follows CSS's screen-space convention) points down, and mirroring an axis
                // reverses which way a positive angle turns
                const label_width = font.widthOfTextAtSize(text_item.text, size);
                const text_height = font.heightAtSize(size, { descender: false });
                const center_x = toPdfX(text_item.x);
                const center_y = toPdfY(text_item.y);
                const angle_rad = -(text_item.rotation ?? 0) * Math.PI / 180;
                const offset_x = label_width / 2;
                const offset_y = text_height / 2;
                const rotated_offset_x = offset_x * Math.cos(angle_rad) - offset_y * Math.sin(angle_rad);
                const rotated_offset_y = offset_x * Math.sin(angle_rad) + offset_y * Math.cos(angle_rad);
                page.drawText(text_item.text, {
                    x: center_x - rotated_offset_x,
                    y: center_y - rotated_offset_y,
                    size,
                    font,
                    color: owner.#hexToRgbColor(text_item.color, rgb),
                    rotate: degrees(-(text_item.rotation ?? 0)),
                });
            }
            for (const signature of edit.signatures ?? []) {
                let embedded = embedded_signatures.get(signature.dataUrl);
                if (embedded == undefined) {
                    embedded = await pdfDoc.embedPng(owner.#dataUrlToBytes(signature.dataUrl));
                    embedded_signatures.set(signature.dataUrl, embedded);
                }
                // same anchor-to-center rotation math as the text branch above - drawImage's x/y is
                // also a bottom-left anchor that pdf-lib rotates the image around, not its center
                const image_width = signature.width_fraction * width;
                const image_height = image_width * (signature.natural_height / signature.natural_width);
                const center_x = toPdfX(signature.x);
                const center_y = toPdfY(signature.y);
                const angle_rad = -(signature.rotation ?? 0) * Math.PI / 180;
                const offset_x = image_width / 2;
                const offset_y = image_height / 2;
                const rotated_offset_x = offset_x * Math.cos(angle_rad) - offset_y * Math.sin(angle_rad);
                const rotated_offset_y = offset_x * Math.sin(angle_rad) + offset_y * Math.cos(angle_rad);
                page.drawImage(embedded, {
                    x: center_x - rotated_offset_x,
                    y: center_y - rotated_offset_y,
                    width: image_width,
                    height: image_height,
                    rotate: degrees(-(signature.rotation ?? 0)),
                });
            }
        }
        for (let i = indices_to_remove.length - 1; i >= 0; i--) {
            pdfDoc.removePage(indices_to_remove[i]);
        }
        return await pdfDoc.save({ useObjectStreams: true });
    }
    //#endregion

    //#region FrameworkEventListeners
    //@note private methods do not work :: they get mangled
    async onClickClose() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        owner.destroy();
    }
    async onClickTabMerge() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        owner.#setActiveTab("merge");
    }
    async onClickTabSplit() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        owner.#setActiveTab("split");
    }
    async onClickTabCompress() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        owner.#setActiveTab("compress");
    }
    async onClickTabEdit() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        owner.#setActiveTab("edit");
    }
    async onClickMerge() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        if (owner.status.merge_files.length < 2 || owner.status.merge_files.some((f) => f.pages == undefined)) {
            new Notify({ text: Locale.at("Aggiungi almeno due file PDF caricati da unire"), type: "warning", ms_timeout: 2500 });
            return;
        }
        try {
            const bytes = await owner.#mergePdfs(owner.status.merge_files, owner.elements.merge_add_page_numbers.checked);
            owner.#downloadBytes(bytes, "documento_unito.pdf");
            new Notify({ text: Locale.at("PDF uniti correttamente"), type: "ok", ms_timeout: 2000 });
        } catch (error) {
            console.error(error);
            new Notify({ text: Locale.at("Errore durante l'unione dei PDF"), type: "error", ms_timeout: 3000 });
        }
    }
    async onClickSplitAddPart() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        if (owner.status.split_file == undefined) {
            return;
        }
        const parts = owner.status.split_parts;
        const last = parts[parts.length - 1];
        if (last.size < 2) {
            new Notify({ text: Locale.at("Riduci prima un'altra parte: l'ultima ha una sola pagina"), type: "warning", ms_timeout: 2500 });
            return;
        }
        const taken = Math.max(1, Math.floor(last.size / 2));
        last.size -= taken;
        parts.push({ id: UiBuilder.newId("pdfeditor-split-part"), size: taken });
        owner.#renderSplitParts();
    }
    async onClickSplit() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        if (!owner.status.split_valid) {
            new Notify({ text: Locale.at("La somma delle pagine di ogni parte deve corrispondere al totale"), type: "warning", ms_timeout: 2500 });
            return;
        }
        try {
            await owner.#splitPdf();
            new Notify({ text: Locale.at("PDF diviso correttamente"), type: "ok", ms_timeout: 2000 });
        } catch (error) {
            console.error(error);
            new Notify({ text: Locale.at("Errore durante la divisione del PDF"), type: "error", ms_timeout: 3000 });
        }
    }
    async onClickCompress() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        if (owner.status.compress_file == undefined) {
            new Notify({ text: Locale.at("Scegli prima un file PDF"), type: "warning", ms_timeout: 2000 });
            return;
        }
        const level = owner.elements.compress_levels.querySelector(`input[name="${owner.status.compress_radio_name}"]:checked`)?.value ?? "none";
        try {
            const bytes = await owner.#compressPdf(owner.status.compress_file.bytes, level);
            const base_name = owner.status.compress_file.name.replace(/\.pdf$/i, "");
            owner.#downloadBytes(bytes, `${base_name}_compresso.pdf`);
            const before = owner.status.compress_file.size;
            const after = bytes.length;
            const pct = before > 0 ? Math.round((1 - after / before) * 100) : 0;
            const pct_label = pct >= 0 ? `-${pct}%` : `+${Math.abs(pct)}%`;
            new Notify({ text: `${owner.#formatBytes(before)} → ${owner.#formatBytes(after)} (${pct_label})`, type: "ok", ms_timeout: 3500 });
        } catch (error) {
            console.error(error);
            new Notify({ text: Locale.at("Errore durante la compressione del PDF"), type: "error", ms_timeout: 3000 });
        }
    }
    async onClickEditDraw() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        owner.#setEditTool(owner.status.edit_active_tool === "draw" ? null : "draw");
    }
    async onClickEditAddText() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        owner.#setEditTool(owner.status.edit_active_tool === "add_text" ? null : "add_text");
    }
    async onClickAddSignature() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        owner.#setEditTool(owner.status.edit_active_tool === "add_signature" ? null : "add_signature");
    }
    async onClickEditRedact() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        owner.#setEditTool(owner.status.edit_active_tool === "redact" ? null : "redact");
    }
    async onClickEditDeletePage() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        if (owner.status.edit_file == undefined) {
            return;
        }
        owner.#pushEditUndo();
        const edit = owner.#getCurrentPageEdit(true);
        edit.deleted = !edit.deleted;
        owner.#redrawEditCanvas();
    }
    async onClickEditUndo() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        owner.#editUndo();
    }
    /** shared by the Undo button and its CTRL + Z shortcut (see `#addEventListeners`) */
    #editUndo() {
        const owner = this;
        // an in-progress gesture, placement overlay, or armed tool isn't in the undo history yet -
        // the first Undo just stops/discards it, matching what Escape does (see
        // `#stopActiveEditOperations`); a second Undo (nothing left active) then walks the real
        // history
        if (owner.#stopActiveEditOperations()) {
            return;
        }
        const last = owner.status.edit_undo_stack.pop();
        if (last == undefined) {
            return;
        }
        owner.status.edit_page_edits.set(last.page, last.snapshot);
        if (last.page === owner.status.edit_current_page) {
            owner.#redrawEditCanvas();
        }
    }
    async onClickEditPrevPage() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        if (owner.status.edit_file == undefined || owner.status.edit_current_page <= 0) {
            return;
        }
        owner.status.edit_current_page--;
        await owner.#renderEditPage();
    }
    async onClickEditNextPage() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        if (owner.status.edit_file == undefined || owner.status.edit_current_page >= owner.status.edit_file.pages - 1) {
            return;
        }
        owner.status.edit_current_page++;
        await owner.#renderEditPage();
    }
    async onClickEditSave() {
        /** @type PDFEditor */
        const owner = this.fwInstanceReference;
        if (owner.status.edit_file == undefined) {
            new Notify({ text: Locale.at("Scegli prima un file PDF"), type: "warning", ms_timeout: 2000 });
            return;
        }
        try {
            const bytes = await owner.#exportEditedPdf();
            const base_name = owner.status.edit_file.name.replace(/\.pdf$/i, "");
            const saved_file_name = `${base_name}_modificato.pdf`;
            if (AppStatus.IsPhone) {
                const rsp = await owner.#saveBytesOnDevice(bytes, saved_file_name);
                if (rsp.cancelled) {
                    return;
                }
                new Notify({ text: Locale.at("PDF salvato correttamente"), type: "ok", ms_timeout: 2000 });
                owner.#askToOpenSavedFile(rsp.path, saved_file_name, bytes);
                return;
            } else {
                owner.#downloadBytes(bytes, saved_file_name);
            }
            new Notify({ text: Locale.at("PDF salvato correttamente"), type: "ok", ms_timeout: 2000 });
        } catch (error) {
            console.error(error);
            new Notify({ text: Locale.at("Errore durante il salvataggio del PDF"), type: "error", ms_timeout: 3000 });
        }
    }
    /**
     * Prompts the user (after a device save via #saveBytesOnDevice) to open the saved file,
     * and follows up with the native "open with default app" call if they confirm.
     */
    #askToOpenSavedFile(path, fileName, bytes) {
        const owner = this;
        if (path == null) {
            return;
        }
        const body = UiBuilder.createButton({
            theme: "text",
            title: Locale.at("Open it here"),
            icon: "open_in_browser.svg",
            onClick: () => {
                dialog.destroy();
                const file = new File([bytes], fileName, { type: "application/pdf" });
                owner.#handleEditFile(file);
            },
        });
        const dialog = UiBuilder.mockDialog({
            text1: Locale.at("Vuoi aprire il file salvato?"),
            body,
            onConfirm: async () => {
                const rsp = await Lobby.postAsync("SaveFile/Open", { path, fileName });
                if (rsp.opened !== true) {
                    new Notify({ text: Locale.at("Impossibile aprire il file"), type: "warning", ms_timeout: 2000 });
                }
            },
            onDeny: () => { },
        });
    }
    //#endregion

    destroy(timeout_ms = 0) {
        this.#discardPendingOverlays();
        if (this.status.resize_handler != undefined) {
            window.removeEventListener("resize", this.status.resize_handler);
        }
        if (this.status.escape_handler != undefined) {
            document.body.removeEventListener("keyup", this.status.escape_handler);
        }
        if (this.status.undo_key_handler != undefined) {
            document.removeEventListener("keydown", this.status.undo_key_handler);
        }
        clearTimeout(this.#edit_width_render_timer);
        this.#closeStrokeWidthFloater();
        this.status.tabs_bar?.destroy();
        this.status.tools_bar?.destroy();
        this.status.edit_render_task?.cancel();
        this.status.edit_file?.pdfjsLoadingTask?.destroy();
        document.body.classList.remove("pe-body-scroll-lock");
        super.destroy(timeout_ms);
    }
}


//#START RESERVED AREA FOR UI_BUILDER
// setTimeout(() => {
//     const ss = new PDFEditor({});
//     document.body.appendChild(ss.elementReference());
// }, 0);
//#END RESERVED AREA FOR UI_BUILDER