/**
 * Crop/straighten an already-acquired image. This component does NOT gather/capture an image
 * (no camera, no file picker) - a valid image source must be provided via `options.image_src`.
 * @version 1.0
 * @example
 *      const editor = new ImageEditor({
 *          image_src: some_data_url,
 *          onConfirm: (cropped_data_url) => { ... },
 *          onCancel: () => { ... }
 *      });
 *      new BottomSheet({ element: editor.elementReference(), centered: true, onClose: () => editor.destroy() });
 */
class ImageEditor extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options
     * @param {string} options.image_src - required, a valid image source (data URL / URL) to edit
     * @param {Function} [options.onConfirm] - callback(cropped_data_url) called when the user confirms the crop
     * @param {Function} [options.onCancel] - callback() called when the user cancels/closes without confirming
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        console.assert(options.image_src != undefined, "ImageEditor requires options.image_src: provide a valid image before starting the editing");
        this.#initialize();
        this.#addEventListeners();
    }
    /**
     * store here the elements references of the html
     * automatically gathers elements with attribute ` fw-id="xxx" ` after super()
     */
    elements = {
        /**
         * @type Element
         */
        self_ref: this.self_ref,

        /**
         * @type HTMLElement
         */
        crop_wrapper: null,

        /**
         * @type HTMLElement
         */
        crop_area: null,

        /**
         * @type HTMLElement
         */
        img_to_crop: null,

        /**
         * @type HTMLElement
         */
        rotation_value: null,

        /**
         * @type HTMLElement
         */
        rotation_slider: null,

        /**
         * @type HTMLElement
         */
        rotation_area: null,

        /**
         * @type HTMLElement
         */
        btn_flip_h: null,

        /**
         * @type HTMLElement
         */
        btn_flip_v: null,

        /**
         * @type HTMLElement
         */
        btn_color_key: null,

        /**
         * @type HTMLElement
         */
        btn_erase: null,

        /**
         * @type HTMLElement
         */
        btn_restore: null,

        /**
         * @type HTMLElement
         */
        toolbox: null,

        /**
         * @type HTMLElement
         */
        btn_toggle_labels: null,

        /**
         * @type HTMLElement
         */
        toggle_labels_icon: null,

        /**
         * @type HTMLElement
         */
        btn_undo: null,

        /**
         * @type HTMLElement
         */
        btn_redo: null,

        /**
         * @type HTMLElement
         */
        toolbox_top: null,

        /**
         * @type HTMLElement
         */
        export_button: null,

        /**
         * @type HTMLElement
         */
        btn_smoothing: null,
    }
    /**
     * @type {SpeedActions}
     */
    #export_speed_actions = null;
    status = {
        rotation: 0,
        flip_h: false,
        flip_v: false,
        picking_color: false,
        erasing: false,
        restoring: false,
        erase_radius: 20,
        knob_dragging: false,
        labels_compact: true,
        undo_stack: [],
        redo_stack: [],
        /**
         * @type Element
         */
        knob_top_left: undefined,
        /**
         * @type Element
         */
        knob_bottom_right: undefined,
    }
    async #initialize() {
        const owner = this;
        owner.elements.color_pick_cursor = Icons.create("f657");
        owner.elements.color_pick_cursor.classList.add("ie-color-pick-cursor");
        owner.elements.self_ref.appendChild(owner.elements.color_pick_cursor);
        owner.elements.erase_cursor = document.createElement("div");
        owner.elements.erase_cursor.classList.add("ie-erase-cursor");
        owner.elements.self_ref.appendChild(owner.elements.erase_cursor);
        owner.#updateEraseCursorSize();
        owner.#addButtonHints(owner.elements.toolbox, () => owner.status.labels_compact);
        owner.#addButtonHints(owner.elements.toolbox_top, undefined);
        owner.#updateUndoRedoButtonsUI();
        owner.#loadImage(owner.options.image_src, () => owner.#createKnobsAndFrame());
        owner.#addExportSpeedDial();
        owner.#addSmoothingSpeedActions();
    }
    #addExportSpeedDial() {
        const owner = this;
        owner.#export_speed_actions = new SpeedActions({
            target: owner.elements.export_button,
            side: "bottom",
            createButtons: [
                {
                    title: Locale.at("Salva") + " .png",
                    icon_code: "e410",
                    onClick: () => owner.#downloadDataUrl(owner.#cropAndExport(), `cropped-image-${Date.now()}.png`),
                },
                {
                    title: Locale.at("Salva") + " .ico",
                    icon_code: "efa2",
                    onClick: () => owner.#downloadBlob(owner.#buildIco(owner.#cropAndExportCanvas()), `icon-${Date.now()}.ico`),
                },
                {
                    title: Locale.at("Salva") + " .svg",
                    icon_code: "ebbb",
                    onClick: () => owner.#downloadBlob(owner.#buildSvg(owner.#cropAndExportCanvas()), `image-${Date.now()}.svg`),
                },
            ],
        });
        setTimeout(() => {
            owner.elements.export_button.style = '';
        }, 0);
    }
    /**
     * @type {SpeedActions}
     */
    #smoothing_speed_actions = null;
    #addSmoothingSpeedActions() {
        const owner = this;
        owner.#smoothing_speed_actions = new SpeedActions({
            target: owner.elements.btn_smoothing,
            side: "left",
            createButtons: [
                {
                    title: "Supersampling (SSAA)",
                    hint: "Rendering/elaborazione a risoluzione 2-4x, poi downsample: la riduzione media i pixel dei bordi ottenendo una sfumatura naturale.",
                    icon_code: "e3f4",
                    anchor: "bot",
                    onClick: () => {
                        owner.#pushHistory();
                        owner.elements.img_to_crop.src = owner.#applySupersampling();
                    },
                },
                {
                    title: "FXAA / MLAA / SMAA",
                    hint: "Anti-aliasing in post-processing: rileva i bordi ad alto contrasto e li sfuma; veloce, ideale per transizioni di colore nette.",
                    icon_code: "e3f4",
                    anchor: "bot",
                    onClick: () => {
                        owner.#pushHistory();
                        owner.elements.img_to_crop.src = owner.#applyFxaa();
                    },
                },
                {
                    title: "Sfocatura selettiva sui bordi",
                    hint: "Rileva il bordo del ritaglio (dove lo sfondo è stato rimosso), lo dilata in una maschera e sfoca solo quella regione: non tocca il resto dell'immagine.",
                    icon_code: "e3f4",
                    anchor: "bot",
                    onClick: () => {
                        owner.#pushHistory();
                        owner.elements.img_to_crop.src = owner.#applyEdgeAwareBlur();
                    },
                },
            ],
        });
    }
    /**
     * adds a hover hint to each `.ie-tool-button` inside `container`, using its own (localized) label
     * text; `conditionsMet` (if given) gates when the hint is allowed to show - e.g. the sidebar
     * toolbox only needs it while `.ie-labels-compact` hides the label, but `.ie-toolbox-top`
     * buttons never show their label at all, so their hint should always be available
     * @param {Element} container
     * @param {Function} [conditionsMet]
     */
    #addButtonHints(container, conditionsMet) {
        for (const button of container.querySelectorAll(".ie-tool-button")) {
            const label = button.querySelector("span:last-child")?.innerText;
            if (label) {
                UiBuilder.addHint({ hint: label, target: button, anchor: button.parentElement?.classList.contains("ie-toolbox-top") ? "top" : "left", conditionsMet });
            }
        }
    }
    /**
     * opens a UiBuilder floating panel (draggable, minimizable, closable) listing the given
     * instruction lines for the active tool; closing it (✕ button or Escape) calls `on_close`
     * @param {string[]} lines
     * @param {Function} on_close
     */
    #showModeInstructions(lines, on_close) {
        const owner = this;
        const content = document.createElement("div");
        content.classList.add("ie-mode-instructions-content");
        for (const line of lines) {
            const row = document.createElement("div");
            row.innerText = Locale.at(line);
            content.appendChild(row);
        }
        owner.elements.mode_instructions = UiBuilder.createFloatingContainer(content, {
            id: "image-editor-tool-hint",
            direction: "vertical",
            style: "min-width:220px;",
            onDestroy: () => on_close(),
        });
    }
    /**
     * closes the tool-hint panel opened by `#showModeInstructions`, if still open
     */
    #hideModeInstructions() {
        const owner = this;
        if (owner.elements.mode_instructions == undefined) {
            return;
        }
        const container = owner.elements.mode_instructions;
        owner.elements.mode_instructions = undefined;
        container.querySelector(".floating-container-close")?.click();
    }
    /**
     * swaps the image being edited; `on_loaded` runs once the new image has finished loading
     * @param {string} src
     * @param {Function} on_loaded
     */
    #loadImage(src, on_loaded) {
        const owner = this;
        const img = owner.elements.img_to_crop;
        owner.status.original_image_src = src;
        owner.status.original_image_element = new Image();
        owner.status.original_image_element.src = src;
        img.src = src;
        if (img.complete) {
            on_loaded();
        } else {
            img.addEventListener("load", on_loaded, { once: true });
        }
    }
    async #addEventListeners() {
        const owner = this;
        const push_rotation_history = () => {
            owner.#pushHistory();
        };
        owner.elements.rotation_slider.addEventListener("mousedown", push_rotation_history);
        owner.elements.rotation_slider.addEventListener("touchstart", push_rotation_history);
        owner.elements.rotation_slider.addEventListener("input", (event) => {
            const rotation = Number(event.target.value);
            owner.status.rotation = rotation;
            owner.elements.rotation_value.innerText = `${rotation}°`;
            owner.#applyImageTransform();
        });
        owner.elements.rotation_area.addEventListener("wheel", (event) => {
            event.preventDefault();
            owner.#stepRotation(event.deltaY < 0 ? 1 : -1);
        }, { passive: false });
        owner.elements.rotation_area.addEventListener("keydown", (event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                owner.#toggleFlip("h");
            } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                owner.#toggleFlip("v");
            }
        });
        owner.status.undo_redo_key_handler = (event) => {
            if (!event.ctrlKey) {
                return;
            }
            const key = event.key.toLowerCase();
            if (key === "z") {
                event.preventDefault();
                owner.#undo();
            } else if (key === "y") {
                event.preventDefault();
                owner.#redo();
            }
        };
        document.addEventListener("keydown", owner.status.undo_redo_key_handler);
        owner.elements.self_ref.addEventListener("dragover", (event) => {
            event.preventDefault();
            owner.elements.crop_wrapper.classList.add("ie-drag-over");
        });
        owner.elements.self_ref.addEventListener("dragleave", (event) => {
            if (!owner.elements.self_ref.contains(event.relatedTarget)) {
                owner.elements.crop_wrapper.classList.remove("ie-drag-over");
            }
        });
        owner.elements.self_ref.addEventListener("drop", (event) => {
            event.preventDefault();
            owner.elements.crop_wrapper.classList.remove("ie-drag-over");
            if (owner.status.knob_dragging) {
                return;
            }
            const file = Array.from(event.dataTransfer?.files ?? []).find((f) => f.type.startsWith("image/"));
            if (file == undefined) {
                return;
            }
            owner.#pushHistory();
            const reader = new FileReader();
            reader.onload = () => {
                owner.#loadImage(String(reader.result), () => owner.#resetAll());
            };
            reader.readAsDataURL(file);
        });
    }
    /**
     * (re)applies rotation + flip as CSS individual transform properties on the preview image
     */
    #applyImageTransform() {
        const owner = this;
        const img = owner.elements.img_to_crop;
        img.style.rotate = `${owner.status.rotation}deg`;
        img.style.scale = `${owner.status.flip_h ? -1 : 1} ${owner.status.flip_v ? -1 : 1}`;
    }
    /**
     * nudges the rotation by `delta` degrees, clamped to the slider's [-90, 90] range
     * @param {number} delta
     */
    #stepRotation(delta) {
        const owner = this;
        const slider = owner.elements.rotation_slider;
        const rotation = Math.max(Number(slider.min), Math.min(Number(slider.max), owner.status.rotation + delta));
        if (rotation === owner.status.rotation) {
            return;
        }
        owner.#pushHistory();
        owner.status.rotation = rotation;
        slider.value = rotation;
        owner.elements.rotation_value.innerText = `${rotation}°`;
        owner.#applyImageTransform();
    }
    #createKnobsAndFrame() {
        const owner = this;
        const crop_area = owner.elements.crop_area;
        const crop_wrapper = owner.elements.crop_wrapper;
        owner.status.knob_top_left = owner.#createKnob("ie-knob-top-left");
        owner.status.knob_bottom_right = owner.#createKnob("ie-knob-bottom-right");
        owner.elements.crop_frame = document.createElement("div");
        owner.elements.crop_frame.classList.add("ie-crop-frame");
        owner.elements.crop_move_bar = owner.#createMoveBar();
        crop_area.appendChild(owner.elements.crop_frame);
        crop_area.appendChild(owner.elements.crop_move_bar);
        crop_wrapper.appendChild(owner.status.knob_top_left);
        crop_wrapper.appendChild(owner.status.knob_bottom_right);
        owner.#updateCropFrame();
    }
    /**
     * horizontal bar sitting on the crop rectangle's top edge; dragging it translates the whole crop area
     */
    #createMoveBar() {
        const owner = this;
        const bar = document.createElement("div");
        bar.classList.add("ie-crop-move-bar");
        const push_move_history = () => {
            owner.#pushHistory();
        };
        bar.addEventListener("mousedown", push_move_history);
        bar.addEventListener("touchstart", push_move_history);
        MovableUtil.trackMouse(bar, ({ x, y }) => {
            owner.#translateCropBy(-x, -y);
        }, undefined, 1, 1);
        return bar;
    }
    /**
     * @param {string} anchor_class `ie-knob-top-left` or `ie-knob-bottom-right`
     */
    #createKnob(anchor_class) {
        const owner = this;
        const knob = document.createElement("div");
        knob.classList.add("ie-knob", anchor_class);
        knob.coordinates_reading = {};
        const set_dragging = () => {
            if (owner.status.knob_dragging) {
                return;
            }
            owner.status.knob_dragging = true;
            owner.#pushHistory();
        };
        knob.addEventListener("mousedown", set_dragging);
        knob.addEventListener("touchstart", set_dragging);
        MovableUtil.makeItMovable(knob, knob, false, knob.coordinates_reading, () => {
            owner.#updateCropFrame();
        }, () => {
            owner.#snapKnobToWrapper(knob);
            owner.#enforceMinCropSize(knob);
            owner.status.knob_dragging = false;
        });
        return knob;
    }
    /**
     * minimum allowed size, in px, of the cropped area
     */
    static #MIN_CROP_SIZE = 50;
    /**
     * clamps the knob's center back onto the crop_wrapper border if it was dragged outside of it
     * @param {Element} knob
     */
    #snapKnobToWrapper(knob) {
        const owner = this;
        const wrapper_rect = owner.elements.crop_wrapper.getBoundingClientRect();
        const knob_rect = knob.getBoundingClientRect();
        const knob_center_x = knob_rect.left + knob_rect.width / 2;
        const knob_center_y = knob_rect.top + knob_rect.height / 2;
        const clamped_x = Math.min(Math.max(knob_center_x, wrapper_rect.left), wrapper_rect.right);
        const clamped_y = Math.min(Math.max(knob_center_y, wrapper_rect.top), wrapper_rect.bottom);
        const delta_x = clamped_x - knob_center_x;
        const delta_y = clamped_y - knob_center_y;
        if (delta_x == 0 && delta_y == 0) {
            return;
        }
        const reading = knob.coordinates_reading;
        reading.diff_x = (reading.diff_x ?? 0) - delta_x;
        reading.diff_y = (reading.diff_y ?? 0) - delta_y;
        knob.style.transform = `translate(${-reading.diff_x}px, ${-reading.diff_y}px)`;
        owner.#updateCropFrame();
    }
    /**
     * pulls the just-moved knob back so the crop rectangle never shrinks below the minimum size
     * @param {Element} knob
     */
    #enforceMinCropSize(knob) {
        const owner = this;
        const img = owner.elements.img_to_crop;
        const min_size = ImageEditor.#MIN_CROP_SIZE;
        const ktl = owner.status.knob_top_left.coordinates_reading;
        const kbr = owner.status.knob_bottom_right.coordinates_reading;
        const is_top_left = knob === owner.status.knob_top_left;
        const reading = knob.coordinates_reading;
        let changed = false;
        if (is_top_left) {
            const x2 = -(kbr.diff_x ?? 0);
            const x1_max = img.clientWidth + x2 - min_size;
            const x1 = -(ktl.diff_x ?? 0);
            if (x1 > x1_max) {
                reading.diff_x = -x1_max;
                changed = true;
            }
            const y2 = -(kbr.diff_y ?? 0);
            const y1_max = img.clientHeight + y2 - min_size;
            const y1 = -(ktl.diff_y ?? 0);
            if (y1 > y1_max) {
                reading.diff_y = -y1_max;
                changed = true;
            }
        } else {
            const x2_min = min_size - img.clientWidth + (-(ktl.diff_x ?? 0));
            const x2 = -(kbr.diff_x ?? 0);
            if (x2 < x2_min) {
                reading.diff_x = -x2_min;
                changed = true;
            }
            const y2_min = min_size - img.clientHeight + (-(ktl.diff_y ?? 0));
            const y2 = -(kbr.diff_y ?? 0);
            if (y2 < y2_min) {
                reading.diff_y = -y2_min;
                changed = true;
            }
        }
        if (!changed) {
            return;
        }
        knob.style.transform = `translate(${-(reading.diff_x ?? 0)}px, ${-(reading.diff_y ?? 0)}px)`;
        owner.#updateCropFrame();
    }
    /**
     * reads how much each knob has been dragged away from its starting corner
     */
    #readCropRect() {
        const owner = this;
        const img = owner.elements.img_to_crop;
        const ktl = owner.status.knob_top_left.coordinates_reading;
        const kbr = owner.status.knob_bottom_right.coordinates_reading;
        const x1 = -(ktl.diff_x ?? 0);
        const y1 = -(ktl.diff_y ?? 0);
        const x2 = -(kbr.diff_x ?? 0);
        const y2 = -(kbr.diff_y ?? 0);
        return {
            x1: x1,
            y1: y1,
            width: Math.max(1, img.clientWidth - x1 + x2),
            height: Math.max(1, img.clientHeight - y1 + y2),
        };
    }
    #updateCropFrame() {
        const owner = this;
        const rect = owner.#readCropRect();
        const frame = owner.elements.crop_frame;
        frame.style.left = `${rect.x1}px`;
        frame.style.top = `${rect.y1}px`;
        frame.style.width = `${rect.width}px`;
        frame.style.height = `${rect.height}px`;
        const move_bar = owner.elements.crop_move_bar;
        move_bar.style.left = `${rect.x1}px`;
        move_bar.style.top = `${rect.y1}px`;
        move_bar.style.width = `${rect.width}px`;
    }
    /**
     * shifts both knobs by the same amount, translating the crop rectangle without resizing it;
     * the shift is clamped so the rectangle stays within the image bounds
     * @param {number} delta_x
     * @param {number} delta_y
     */
    #translateCropBy(delta_x, delta_y) {
        const owner = this;
        const img = owner.elements.img_to_crop;
        const rect = owner.#readCropRect();
        delta_x = Math.min(Math.max(delta_x, -rect.x1), img.clientWidth - (rect.x1 + rect.width));
        delta_y = Math.min(Math.max(delta_y, -rect.y1), img.clientHeight - (rect.y1 + rect.height));
        if (delta_x == 0 && delta_y == 0) {
            return;
        }
        const ktl = owner.status.knob_top_left.coordinates_reading;
        const kbr = owner.status.knob_bottom_right.coordinates_reading;
        ktl.diff_x = (ktl.diff_x ?? 0) - delta_x;
        ktl.diff_y = (ktl.diff_y ?? 0) - delta_y;
        kbr.diff_x = (kbr.diff_x ?? 0) - delta_x;
        kbr.diff_y = (kbr.diff_y ?? 0) - delta_y;
        owner.status.knob_top_left.style.transform = `translate(${-ktl.diff_x}px, ${-ktl.diff_y}px)`;
        owner.status.knob_bottom_right.style.transform = `translate(${-kbr.diff_x}px, ${-kbr.diff_y}px)`;
        owner.#updateCropFrame();
    }
    /**
     * bakes the current rotation + crop rectangle into a full-resolution canvas
     * @returns {HTMLCanvasElement}
     */
    #cropAndExportCanvas() {
        const owner = this;
        const img = owner.elements.img_to_crop;
        const rect = owner.#readCropRect();
        const scale_x = img.naturalWidth / img.clientWidth;
        const scale_y = img.naturalHeight / img.clientHeight;

        const rotated = document.createElement("canvas");
        rotated.width = img.naturalWidth;
        rotated.height = img.naturalHeight;
        const rotated_ctx = rotated.getContext("2d");
        rotated_ctx.translate(rotated.width / 2, rotated.height / 2);
        rotated_ctx.rotate(owner.status.rotation * Math.PI / 180);
        rotated_ctx.scale(owner.status.flip_h ? -1 : 1, owner.status.flip_v ? -1 : 1);
        rotated_ctx.drawImage(img, -rotated.width / 2, -rotated.height / 2);

        const output = document.createElement("canvas");
        output.width = Math.max(1, Math.round(rect.width * scale_x));
        output.height = Math.max(1, Math.round(rect.height * scale_y));
        output.getContext("2d").drawImage(
            rotated,
            rect.x1 * scale_x, rect.y1 * scale_y, rect.width * scale_x, rect.height * scale_y,
            0, 0, output.width, output.height
        );
        return output;
    }
    /**
     * bakes the current rotation + crop rectangle into a full-resolution PNG data URL
     * @returns {string}
     */
    #cropAndExport() {
        const owner = this;
        return owner.#cropAndExportCanvas().toDataURL("image/png");
    }
    /**
     * square pixel sizes baked into an exported .ico, matching the standard Windows icon set
     */
    static #ICO_SIZES = [16, 32, 48, 64, 128, 256];
    /**
     * decodes a `data:image/png;base64,...` URL into raw PNG bytes
     * @param {string} data_url
     * @returns {Uint8Array}
     */
    static #pngDataUrlToBytes(data_url) {
        const binary = atob(data_url.slice(data_url.indexOf(",") + 1));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    /**
     * packs one PNG-encoded frame per `#ICO_SIZES` entry into a single multi-resolution .ico file;
     * the ICO format allows each directory entry to hold a plain PNG instead of a raw bitmap
     * @param {HTMLCanvasElement} source_canvas
     * @returns {Blob}
     */
    #buildIco(source_canvas) {
        const sizes = ImageEditor.#ICO_SIZES;
        const frames = sizes.map((size) => {
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            canvas.getContext("2d").drawImage(source_canvas, 0, 0, size, size);
            return ImageEditor.#pngDataUrlToBytes(canvas.toDataURL("image/png"));
        });

        const header_size = 6 + frames.length * 16;
        const buffer = new Uint8Array(header_size + frames.reduce((sum, frame) => sum + frame.length, 0));
        const view = new DataView(buffer.buffer);
        view.setUint16(0, 0, true); // reserved
        view.setUint16(2, 1, true); // type: icon
        view.setUint16(4, frames.length, true);

        let entry_offset = 6;
        let data_offset = header_size;
        frames.forEach((frame, index) => {
            const size = sizes[index];
            buffer[entry_offset] = size >= 256 ? 0 : size; // width (0 == 256px)
            buffer[entry_offset + 1] = size >= 256 ? 0 : size; // height (0 == 256px)
            buffer[entry_offset + 2] = 0; // color count
            buffer[entry_offset + 3] = 0; // reserved
            view.setUint16(entry_offset + 4, 1, true); // color planes
            view.setUint16(entry_offset + 6, 32, true); // bits per pixel
            view.setUint32(entry_offset + 8, frame.length, true); // frame byte size
            view.setUint32(entry_offset + 12, data_offset, true); // frame offset
            buffer.set(frame, data_offset);
            entry_offset += 16;
            data_offset += frame.length;
        });

        return new Blob([buffer], { type: "image/x-icon" });
    }
    /**
     * wraps the cropped raster image in a minimal SVG container (an embedded PNG, since this editor
     * does not vector-trace the pixels)
     * @param {HTMLCanvasElement} source_canvas
     * @returns {Blob}
     */
    #buildSvg(source_canvas) {
        const width = source_canvas.width;
        const height = source_canvas.height;
        const data_url = source_canvas.toDataURL("image/png");
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image width="${width}" height="${height}" href="${data_url}"/></svg>`;
        return new Blob([svg], { type: "image/svg+xml" });
    }
    /**
     * triggers a browser download of a Blob
     * @param {Blob} blob
     * @param {string} file_name
     */
    #downloadBlob(blob, file_name) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file_name;
        link.click();
        URL.revokeObjectURL(url);
    }
    /**
     * restores rotation, flip, crop knobs and any pixel-level editing (background removal, erasing)
     * back to the image's starting state
     */
    #resetAll() {
        const owner = this;
        if (owner.status.picking_color) {
            owner.status.stop_color_picking();
        }
        if (owner.status.erasing) {
            owner.status.stop_erasing();
        }
        if (owner.status.restoring) {
            owner.status.stop_restoring();
        }
        owner.elements.img_to_crop.src = owner.status.original_image_src;
        owner.status.rotation = 0;
        owner.status.flip_h = false;
        owner.status.flip_v = false;
        owner.elements.rotation_slider.value = 0;
        owner.elements.rotation_value.innerText = "0°";
        owner.#applyImageTransform();
        owner.#updateFlipButtonsUI();
        for (const knob of [owner.status.knob_top_left, owner.status.knob_bottom_right]) {
            knob.coordinates_reading.diff_x = 0;
            knob.coordinates_reading.diff_y = 0;
            knob.style.transform = "";
        }
        owner.#updateCropFrame();
    }
    #updateFlipButtonsUI() {
        const owner = this;
        owner.elements.btn_flip_h.classList.toggle("ie-tool-active", owner.status.flip_h);
        owner.elements.btn_flip_v.classList.toggle("ie-tool-active", owner.status.flip_v);
    }
    /**
     * @param {"h"|"v"} axis
     */
    #toggleFlip(axis) {
        const owner = this;
        owner.#pushHistory();
        if (axis === "h") {
            owner.status.flip_h = !owner.status.flip_h;
        } else {
            owner.status.flip_v = !owner.status.flip_v;
        }
        owner.#applyImageTransform();
        owner.#updateFlipButtonsUI();
    }
    /**
     * triggers a browser download of a data URL
     * @param {string} data_url
     * @param {string} file_name
     */
    #downloadDataUrl(data_url, file_name) {
        const link = document.createElement("a");
        link.href = data_url;
        link.download = file_name;
        link.click();
    }
    /**
     * max number of undo steps kept around; each step holds a full-resolution PNG data URL
     */
    static #HISTORY_LIMIT = 20;
    /**
     * @returns {Object} a snapshot of everything undo/redo needs to restore: the current pixels,
     * rotation, flip and crop-knob offsets
     */
    #captureSnapshot() {
        const owner = this;
        return {
            image_src: owner.elements.img_to_crop.src,
            rotation: owner.status.rotation,
            flip_h: owner.status.flip_h,
            flip_v: owner.status.flip_v,
            knob_top_left: { ...owner.status.knob_top_left.coordinates_reading },
            knob_bottom_right: { ...owner.status.knob_bottom_right.coordinates_reading },
        };
    }
    /**
     * pushes the current state onto the undo stack; call this right before making an editing change.
     * a no-op before the knobs exist (nothing to restore back to yet)
     */
    #pushHistory() {
        const owner = this;
        if (owner.status.knob_top_left == undefined) {
            return;
        }
        owner.status.undo_stack.push(owner.#captureSnapshot());
        if (owner.status.undo_stack.length > ImageEditor.#HISTORY_LIMIT) {
            owner.status.undo_stack.shift();
        }
        owner.status.redo_stack.length = 0;
        owner.#updateUndoRedoButtonsUI();
    }
    /**
     * greys out (and disables clicks on) the undo/redo buttons when their respective stack is empty
     */
    #updateUndoRedoButtonsUI() {
        const owner = this;
        owner.elements.btn_undo.classList.toggle("ie-tool-disabled", owner.status.undo_stack.length === 0);
        owner.elements.btn_redo.classList.toggle("ie-tool-disabled", owner.status.redo_stack.length === 0);
    }
    /**
     * applies a previously captured snapshot back onto the image/rotation/flip/crop state
     * @param {Object} snapshot
     */
    #restoreSnapshot(snapshot) {
        const owner = this;
        owner.elements.img_to_crop.src = snapshot.image_src;
        owner.status.rotation = snapshot.rotation;
        owner.status.flip_h = snapshot.flip_h;
        owner.status.flip_v = snapshot.flip_v;
        owner.elements.rotation_slider.value = snapshot.rotation;
        owner.elements.rotation_value.innerText = `${snapshot.rotation}°`;
        owner.#applyImageTransform();
        owner.#updateFlipButtonsUI();
        const ktl = owner.status.knob_top_left;
        const kbr = owner.status.knob_bottom_right;
        ktl.coordinates_reading.diff_x = snapshot.knob_top_left.diff_x ?? 0;
        ktl.coordinates_reading.diff_y = snapshot.knob_top_left.diff_y ?? 0;
        ktl.style.transform = `translate(${-ktl.coordinates_reading.diff_x}px, ${-ktl.coordinates_reading.diff_y}px)`;
        kbr.coordinates_reading.diff_x = snapshot.knob_bottom_right.diff_x ?? 0;
        kbr.coordinates_reading.diff_y = snapshot.knob_bottom_right.diff_y ?? 0;
        kbr.style.transform = `translate(${-kbr.coordinates_reading.diff_x}px, ${-kbr.coordinates_reading.diff_y}px)`;
        owner.#updateCropFrame();
    }
    #undo() {
        const owner = this;
        if (owner.status.undo_stack.length === 0) {
            return;
        }
        if (owner.status.picking_color) {
            owner.status.stop_color_picking();
        }
        if (owner.status.erasing) {
            owner.status.stop_erasing();
        }
        if (owner.status.restoring) {
            owner.status.stop_restoring();
        }
        owner.status.redo_stack.push(owner.#captureSnapshot());
        owner.#restoreSnapshot(owner.status.undo_stack.pop());
        owner.#updateUndoRedoButtonsUI();
    }
    #redo() {
        const owner = this;
        if (owner.status.redo_stack.length === 0) {
            return;
        }
        if (owner.status.picking_color) {
            owner.status.stop_color_picking();
        }
        if (owner.status.erasing) {
            owner.status.stop_erasing();
        }
        if (owner.status.restoring) {
            owner.status.stop_restoring();
        }
        owner.status.undo_stack.push(owner.#captureSnapshot());
        owner.#restoreSnapshot(owner.status.redo_stack.pop());
        owner.#updateUndoRedoButtonsUI();
    }
    /**
     * enters "pick a color to remove" mode: hides the cursor over the image, shows the colorize
     * icon following the pointer, and waits for a click on the image to sample the color to key out
     */
    #startColorPicking() {
        const owner = this;
        if (owner.status.picking_color) {
            return;
        }
        owner.status.picking_color = true;
        owner.elements.self_ref.classList.add("ie-picking-color");
        owner.elements.btn_color_key.classList.add("ie-tool-active");
        const move_handler = (event) => {
            owner.elements.color_pick_cursor.style.left = `${event.clientX}px`;
            owner.elements.color_pick_cursor.style.top = `${event.clientY}px`;
        };
        const click_handler = (event) => {
            event.preventDefault();
            owner.#removeSimpleBackground(event.clientX, event.clientY);
            stop_picking();
        };
        const stop_picking = () => {
            if (!owner.status.picking_color) {
                return;
            }
            owner.status.picking_color = false;
            owner.status.stop_color_picking = undefined;
            owner.elements.self_ref.classList.remove("ie-picking-color");
            owner.elements.btn_color_key.classList.remove("ie-tool-active");
            document.removeEventListener("mousemove", move_handler);
            owner.elements.img_to_crop.removeEventListener("click", click_handler);
            owner.#hideModeInstructions();
        };
        owner.status.stop_color_picking = stop_picking;
        document.addEventListener("mousemove", move_handler);
        owner.elements.img_to_crop.addEventListener("click", click_handler, { once: true });
        owner.#showModeInstructions([
            "Clicca sull'immagine per selezionare il colore da rimuovere",
            "Esc per annullare",
        ], stop_picking);
    }
    /**
     * radius, in source-image px, sampled around the clicked point to determine the key color
     */
    static #COLOR_KEY_SAMPLE_RADIUS = 3;
    /**
     * max CIE76 ΔE (LAB) distance from the key color considered part of the background
     */
    static #COLOR_KEY_TOLERANCE = 18;
    /**
     * sRGB (0-255) -> linear-light (0-1) lookup table, precomputed to avoid a Math.pow per pixel/channel
     */
    static #LINEAR_LUT = Array.from({ length: 256 }, (_, c) => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    /**
     * converts an 8-bit sRGB color to CIE L*a*b* (D65 white point)
     * @param {number} r
     * @param {number} g
     * @param {number} b
     */
    static #rgbToLab(r, g, b) {
        const lr = ImageEditor.#LINEAR_LUT[r] * 100;
        const lg = ImageEditor.#LINEAR_LUT[g] * 100;
        const lb = ImageEditor.#LINEAR_LUT[b] * 100;
        const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / 95.047;
        const y = (lr * 0.2126 + lg * 0.7152 + lb * 0.0722) / 100.0;
        const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / 108.883;
        const fx = x > 0.008856 ? Math.cbrt(x) : (7.787 * x) + 16 / 116;
        const fy = y > 0.008856 ? Math.cbrt(y) : (7.787 * y) + 16 / 116;
        const fz = z > 0.008856 ? Math.cbrt(z) : (7.787 * z) + 16 / 116;
        return {
            l: (116 * fy) - 16,
            a: 500 * (fx - fy),
            b: 200 * (fy - fz),
        };
    }
    /**
     * CIE76 ΔE: euclidean distance between two LAB colors
     */
    static #labDistance(c1, c2) {
        const dl = c1.l - c2.l;
        const da = c1.a - c2.a;
        const db = c1.b - c2.b;
        return Math.sqrt(dl * dl + da * da + db * db);
    }
    /**
     * averages the RGB color of a (radius*2+1) square centered at (cx, cy), clamped to the canvas bounds
     */
    static #averageColorAt(ctx, cx, cy, radius, canvas_width, canvas_height) {
        const sample_x = Math.max(0, Math.min(canvas_width - 1, cx - radius));
        const sample_y = Math.max(0, Math.min(canvas_height - 1, cy - radius));
        const sample_w = Math.min(radius * 2 + 1, canvas_width - sample_x);
        const sample_h = Math.min(radius * 2 + 1, canvas_height - sample_y);
        const sample_data = ctx.getImageData(sample_x, sample_y, sample_w, sample_h).data;
        let sum_r = 0, sum_g = 0, sum_b = 0;
        const pixel_count = sample_data.length / 4;
        for (let i = 0; i < sample_data.length; i += 4) {
            sum_r += sample_data[i];
            sum_g += sample_data[i + 1];
            sum_b += sample_data[i + 2];
        }
        return { r: sum_r / pixel_count, g: sum_g / pixel_count, b: sum_b / pixel_count };
    }
    /**
     * relative positions (as fractions of the image size) of the corners and edge midpoints,
     * sampled as likely-background regions alongside the point the user actually clicked
     */
    static #BACKGROUND_SAMPLE_POINTS = [
        { fx: 0, fy: 0 }, { fx: 1, fy: 0 }, { fx: 0, fy: 1 }, { fx: 1, fy: 1 }, // corners
        { fx: 0.5, fy: 0 }, { fx: 0.5, fy: 1 }, { fx: 0, fy: 0.5 }, { fx: 1, fy: 0.5 }, // edge midpoints
    ];
    /**
     * max LAB distance from the clicked color for a corner/edge sample to be trusted as the same background
     */
    static #COLOR_MODEL_CLUSTER_TOLERANCE = 30;
    /**
     * samples the user-clicked region plus the image corners and edge midpoints, discarding any
     * corner/edge sample that doesn't match the clicked color, to build a small set of representative
     * background colors instead of relying on a single averaged key color
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} canvas_width
     * @param {number} canvas_height
     * @param {{x: number, y: number}} click_point
     * @returns {Array<{l: number, a: number, b: number}>}
     */
    #buildBackgroundColorModel(ctx, canvas_width, canvas_height, click_point) {
        const radius = ImageEditor.#COLOR_KEY_SAMPLE_RADIUS;
        const click_color = ImageEditor.#averageColorAt(ctx, click_point.x, click_point.y, radius, canvas_width, canvas_height);
        const click_lab = ImageEditor.#rgbToLab(Math.round(click_color.r), Math.round(click_color.g), Math.round(click_color.b));
        const model = [click_lab];
        for (const { fx, fy } of ImageEditor.#BACKGROUND_SAMPLE_POINTS) {
            const cx = Math.round(fx * (canvas_width - 1));
            const cy = Math.round(fy * (canvas_height - 1));
            const color = ImageEditor.#averageColorAt(ctx, cx, cy, radius, canvas_width, canvas_height);
            const lab = ImageEditor.#rgbToLab(Math.round(color.r), Math.round(color.g), Math.round(color.b));
            if (ImageEditor.#labDistance(lab, click_lab) <= ImageEditor.#COLOR_MODEL_CLUSTER_TOLERANCE) {
                model.push(lab);
            }
        }
        return model;
    }
    /**
     * maps a viewport point to the corresponding pixel in the un-rotated, un-flipped source image
     * @param {number} client_x
     * @param {number} client_y
     */
    #getNaturalPixelFromClientPoint(client_x, client_y) {
        const owner = this;
        const img = owner.elements.img_to_crop;
        const crop_area_rect = owner.elements.crop_area.getBoundingClientRect();
        const center_x = crop_area_rect.left + img.offsetLeft + img.offsetWidth / 2;
        const center_y = crop_area_rect.top + img.offsetTop + img.offsetHeight / 2;
        const dx = client_x - center_x;
        const dy = client_y - center_y;
        const rad = -owner.status.rotation * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        let local_x = dx * cos - dy * sin;
        let local_y = dx * sin + dy * cos;
        if (owner.status.flip_h) {
            local_x = -local_x;
        }
        if (owner.status.flip_v) {
            local_y = -local_y;
        }
        const scale_x = img.naturalWidth / img.clientWidth;
        const scale_y = img.naturalHeight / img.clientHeight;
        return {
            x: Math.round((local_x + img.offsetWidth / 2) * scale_x),
            y: Math.round((local_y + img.offsetHeight / 2) * scale_y),
        };
    }
    /**
     * builds a background color model from the clicked point plus the image corners/edges, and removes
     * (makes transparent) every pixel of the source image matching any color in that model
     * @param {number} client_x
     * @param {number} client_y
     */
    #removeSimpleBackground(client_x, client_y) {
        const owner = this;
        owner.#pushHistory();
        const img = owner.elements.img_to_crop;
        const point = owner.#getNaturalPixelFromClientPoint(client_x, client_y);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const model = owner.#buildBackgroundColorModel(ctx, canvas.width, canvas.height, point);

        const image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = image_data.data;
        const tolerance = ImageEditor.#COLOR_KEY_TOLERANCE;
        for (let i = 0; i < data.length; i += 4) {
            const pixel_lab = ImageEditor.#rgbToLab(data[i], data[i + 1], data[i + 2]);
            let min_distance = Infinity;
            for (const model_color of model) {
                const distance = ImageEditor.#labDistance(pixel_lab, model_color);
                if (distance < min_distance) {
                    min_distance = distance;
                }
            }
            if (min_distance <= tolerance) {
                data[i + 3] = 0;
            }
        }
        ctx.putImageData(image_data, 0, 0);
        img.src = canvas.toDataURL("image/png");
    }
    /**
     * upscale factor used by `#applySupersampling`
     */
    static #SSAA_SCALE = 3;
    /**
     * Supersampling (SSAA): draws the image onto a canvas `#SSAA_SCALE`x larger (smoothed upscale),
     * then draws that back down to the original size (smoothed downscale). The downscale pass
     * averages several source pixels into each destination pixel, softening jagged edges.
     * @returns {string} a PNG data URL, same dimensions as the source image
     */
    #applySupersampling() {
        const owner = this;
        const img = owner.elements.img_to_crop;
        const scale = ImageEditor.#SSAA_SCALE;

        const upscaled = document.createElement("canvas");
        upscaled.width = img.naturalWidth * scale;
        upscaled.height = img.naturalHeight * scale;
        const up_ctx = upscaled.getContext("2d");
        up_ctx.imageSmoothingEnabled = true;
        up_ctx.imageSmoothingQuality = "high";
        up_ctx.drawImage(img, 0, 0, upscaled.width, upscaled.height);

        const output = document.createElement("canvas");
        output.width = img.naturalWidth;
        output.height = img.naturalHeight;
        const out_ctx = output.getContext("2d");
        out_ctx.imageSmoothingEnabled = true;
        out_ctx.imageSmoothingQuality = "high";
        out_ctx.drawImage(upscaled, 0, 0, output.width, output.height);
        return output.toDataURL("image/png");
    }
    /**
     * minimum normalized (0-1) luma contrast, among a pixel and its 4 neighbors, needed before
     * `#applyFxaa` treats that pixel as being on an edge
     */
    static #FXAA_EDGE_THRESHOLD = 0.1;
    /**
     * max amount (0-1) an edge pixel is blended toward its neighbor average, reached once contrast >= 1
     */
    static #FXAA_BLEND_STRENGTH = 0.75;
    /**
     * FXAA-style post-process anti-aliasing: for every pixel, compares its luma against its 4
     * orthogonal neighbors; where the local contrast crosses `#FXAA_EDGE_THRESHOLD`, blends the pixel
     * towards the neighbor average proportionally to that contrast. Flat areas (no contrast) are
     * left untouched, unlike a uniform blur.
     * @returns {string} a PNG data URL, same dimensions as the source image
     */
    #applyFxaa() {
        const owner = this;
        const img = owner.elements.img_to_crop;
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const src = ctx.getImageData(0, 0, w, h);
        const data = src.data;
        const out = ctx.createImageData(w, h);
        const out_data = out.data;
        const luma_at = (i) => (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                const i_n = y > 0 ? i - w * 4 : i;
                const i_s = y < h - 1 ? i + w * 4 : i;
                const i_w = x > 0 ? i - 4 : i;
                const i_e = x < w - 1 ? i + 4 : i;
                const l_c = luma_at(i);
                const l_min = Math.min(l_c, luma_at(i_n), luma_at(i_s), luma_at(i_w), luma_at(i_e));
                const l_max = Math.max(l_c, luma_at(i_n), luma_at(i_s), luma_at(i_w), luma_at(i_e));
                const contrast = l_max - l_min;

                out_data[i] = data[i];
                out_data[i + 1] = data[i + 1];
                out_data[i + 2] = data[i + 2];
                out_data[i + 3] = data[i + 3];
                if (contrast < ImageEditor.#FXAA_EDGE_THRESHOLD) {
                    continue;
                }
                const blend = Math.min(1, contrast) * ImageEditor.#FXAA_BLEND_STRENGTH;
                for (let c = 0; c < 3; c++) {
                    const neighbor_avg = (data[i_n + c] + data[i_s + c] + data[i_w + c] + data[i_e + c]) / 4;
                    out_data[i + c] = data[i + c] * (1 - blend) + neighbor_avg * blend;
                }
            }
        }
        ctx.putImageData(out, 0, 0);
        return canvas.toDataURL("image/png");
    }
    /**
     * Sobel gradient magnitude (on the 0-1 normalized alpha channel) above which a pixel is
     * considered part of a cutout boundary, for `#applyEdgeAwareBlur`
     */
    static #EDGE_BLUR_SOBEL_THRESHOLD = 0.25;
    /**
     * radius, in px, the edge mask is grown by before blurring, so the blur covers the whole
     * rough boundary rather than just the single-pixel-wide edge line
     */
    static #EDGE_BLUR_DILATE_RADIUS = 2;
    /**
     * box-blur radius, in px, applied within the (dilated) edge mask
     */
    static #EDGE_BLUR_RADIUS = 2;
    /**
     * grows a boolean mask by `radius` px: a pixel becomes `true` if any pixel within `radius`
     * (chebyshev distance) is `true` in the source mask
     * @param {Uint8Array} mask
     * @param {number} w
     * @param {number} h
     * @param {number} radius
     * @returns {Uint8Array}
     */
    static #dilateMask(mask, w, h, radius) {
        const out = new Uint8Array(mask.length);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let found = false;
                for (let dy = -radius; dy <= radius && !found; dy++) {
                    const sy = y + dy;
                    if (sy < 0 || sy >= h) {
                        continue;
                    }
                    for (let dx = -radius; dx <= radius; dx++) {
                        const sx = x + dx;
                        if (sx >= 0 && sx < w && mask[sy * w + sx]) {
                            found = true;
                            break;
                        }
                    }
                }
                out[y * w + x] = found ? 1 : 0;
            }
        }
        return out;
    }
    /**
     * Selective/edge-aware blur: runs a Sobel operator on the image's alpha channel to find the
     * boundary left by background removal/erasing, dilates that boundary mask so it covers the
     * whole rough edge, then box-blurs only the pixels inside the (dilated) mask - everywhere else
     * (including high-contrast edges that are part of the subject itself) is left untouched.
     * The blurred alpha is then snapped back to a hard 0/255 cutoff at its own midpoint, so only
     * the color channels stay smoothed near the boundary while the silhouette itself remains crisp
     * - no soft/semi-transparent fringe bleeds past where the original edge was.
     * @returns {string} a PNG data URL, same dimensions as the source image
     */
    #applyEdgeAwareBlur() {
        const owner = this;
        const img = owner.elements.img_to_crop;
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const src = ctx.getImageData(0, 0, w, h);
        const data = src.data;
        const alpha = new Float32Array(w * h);
        for (let p = 0, i = 0; p < data.length; p += 4, i++) {
            alpha[i] = data[p + 3] / 255;
        }
        const at = (x, y) => alpha[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];

        const mask = new Uint8Array(w * h);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const gx = -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)
                    + at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1);
                const gy = -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)
                    + at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);
                mask[y * w + x] = Math.hypot(gx, gy) >= ImageEditor.#EDGE_BLUR_SOBEL_THRESHOLD ? 1 : 0;
            }
        }
        const dilated = ImageEditor.#dilateMask(mask, w, h, ImageEditor.#EDGE_BLUR_DILATE_RADIUS);

        const radius = ImageEditor.#EDGE_BLUR_RADIUS;
        const out = ctx.createImageData(w, h);
        const out_data = out.data;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = y * w + x;
                const p = idx * 4;
                if (!dilated[idx]) {
                    out_data[p] = data[p];
                    out_data[p + 1] = data[p + 1];
                    out_data[p + 2] = data[p + 2];
                    out_data[p + 3] = data[p + 3];
                    continue;
                }
                let sum_r = 0, sum_g = 0, sum_b = 0, sum_a = 0, count = 0;
                for (let dy = -radius; dy <= radius; dy++) {
                    const sy = Math.min(h - 1, Math.max(0, y + dy));
                    for (let dx = -radius; dx <= radius; dx++) {
                        const sx = Math.min(w - 1, Math.max(0, x + dx));
                        const sp = (sy * w + sx) * 4;
                        const sa = data[sp + 3];
                        // weight color by alpha so fully-erased (0,0,0,0) neighbors don't drag the
                        // averaged color towards black
                        sum_r += data[sp] * sa;
                        sum_g += data[sp + 1] * sa;
                        sum_b += data[sp + 2] * sa;
                        sum_a += sa;
                        count++;
                    }
                }
                const avg_alpha = sum_a / count;
                const color_weight = sum_a || 1;
                out_data[p] = sum_r / color_weight;
                out_data[p + 1] = sum_g / color_weight;
                out_data[p + 2] = sum_b / color_weight;
                // hard cutoff at the blurred alpha's own midpoint: keeps the silhouette crisp
                out_data[p + 3] = avg_alpha >= 127.5 ? 255 : 0;
            }
        }
        ctx.putImageData(out, 0, 0);
        return canvas.toDataURL("image/png");
    }
    /**
     * min/max/step, in on-screen px, for the eraser brush radius adjusted via mouse wheel
     */
    static #ERASE_RADIUS_MIN = 5;
    static #ERASE_RADIUS_MAX = 150;
    static #ERASE_RADIUS_STEP = 5;
    /**
     * how often, in ms, an in-progress erase stroke is baked back into `img.src` while dragging;
     * committing on every mousemove would mean an expensive PNG re-encode per event
     */
    static #ERASE_COMMIT_THROTTLE_MS = 80;
    /**
     * source-image px of movement away from the stroke's starting point needed, while holding shift,
     * before the stroke locks onto a single axis
     */
    static #ERASE_AXIS_LOCK_THRESHOLD = 5;
    /**
     * resizes the floating brush-size cursor to match the current erase radius
     */
    #updateEraseCursorSize() {
        const owner = this;
        const diameter = owner.status.erase_radius * 2;
        owner.elements.erase_cursor.style.width = `${diameter}px`;
        owner.elements.erase_cursor.style.height = `${diameter}px`;
    }
    /**
     * punches a transparent circular hole, in source-image px, at (x, y) with the given radius
     */
    #eraseAt(ctx, x, y, radius) {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    /**
     * erases a series of overlapping circles between two source-image points, so fast drags
     * don't leave gaps between the individually-sampled mousemove positions
     */
    #eraseStroke(ctx, from, to, radius) {
        const owner = this;
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius * 0.5)));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            owner.#eraseAt(ctx, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, radius);
        }
    }
    /**
     * bakes the working erase canvas into `img.src`; pass `throttled = true` while a stroke is still
     * in progress so the (expensive) PNG re-encode doesn't run on every single mousemove event
     */
    #commitEraseCanvas(throttled) {
        const owner = this;
        const now = Date.now();
        if (throttled && owner.status.last_erase_commit != undefined
            && (now - owner.status.last_erase_commit) < ImageEditor.#ERASE_COMMIT_THROTTLE_MS) {
            return;
        }
        owner.status.last_erase_commit = now;
        owner.elements.img_to_crop.src = owner.status.erase_canvas.toDataURL("image/png");
    }
    /**
     * enters freehand erase mode: hides the cursor over the image, shows a circular brush-size
     * preview that follows the pointer and resizes on wheel scroll, and lets the user click-drag
     * over the image to punch transparent holes into it
     */
    #startErasing() {
        const owner = this;
        if (owner.status.erasing) {
            return;
        }
        owner.status.erasing = true;
        owner.elements.self_ref.classList.add("ie-erasing");
        owner.elements.btn_erase.classList.add("ie-tool-active");

        const img = owner.elements.img_to_crop;
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        owner.status.erase_canvas = canvas;

        let is_drawing = false;
        let last_point = null;
        let stroke_anchor = null;
        let axis_lock = null;

        const natural_radius = () => {
            const scale_x = img.naturalWidth / img.clientWidth;
            const scale_y = img.naturalHeight / img.clientHeight;
            return owner.status.erase_radius * ((scale_x + scale_y) / 2);
        };
        /**
         * while shift is held, locks the stroke onto whichever axis moved further away from its
         * starting point first, then freezes the other axis at its starting value for the rest of the stroke
         */
        const applyAxisLock = (point, event) => {
            if (!event.shiftKey) {
                axis_lock = null;
                return point;
            }
            if (axis_lock == null) {
                const dx = Math.abs(point.x - stroke_anchor.x);
                const dy = Math.abs(point.y - stroke_anchor.y);
                if (Math.max(dx, dy) < ImageEditor.#ERASE_AXIS_LOCK_THRESHOLD) {
                    return point;
                }
                axis_lock = dx >= dy ? "x" : "y";
            }
            return axis_lock === "x"
                ? { x: point.x, y: stroke_anchor.y }
                : { x: stroke_anchor.x, y: point.y };
        };
        const move_handler = (event) => {
            owner.elements.erase_cursor.style.left = `${event.clientX}px`;
            owner.elements.erase_cursor.style.top = `${event.clientY}px`;
            if (!is_drawing) {
                return;
            }
            const point = applyAxisLock(owner.#getNaturalPixelFromClientPoint(event.clientX, event.clientY), event);
            owner.#eraseStroke(ctx, last_point, point, natural_radius());
            last_point = point;
            owner.#commitEraseCanvas(true);
        };
        const wheel_handler = (event) => {
            event.preventDefault();
            const step = event.deltaY < 0 ? ImageEditor.#ERASE_RADIUS_STEP : -ImageEditor.#ERASE_RADIUS_STEP;
            owner.status.erase_radius = Math.max(
                ImageEditor.#ERASE_RADIUS_MIN,
                Math.min(ImageEditor.#ERASE_RADIUS_MAX, owner.status.erase_radius + step)
            );
            owner.#updateEraseCursorSize();
        };
        const mousedown_handler = (event) => {
            if (event.button !== 0) {
                return;
            }
            event.preventDefault();
            owner.#pushHistory();
            is_drawing = true;
            last_point = owner.#getNaturalPixelFromClientPoint(event.clientX, event.clientY);
            stroke_anchor = last_point;
            axis_lock = null;
            owner.#eraseAt(ctx, last_point.x, last_point.y, natural_radius());
            owner.#commitEraseCanvas(true);
        };
        const mouseup_handler = () => {
            if (!is_drawing) {
                return;
            }
            is_drawing = false;
            last_point = null;
            stroke_anchor = null;
            axis_lock = null;
            owner.#commitEraseCanvas(false);
        };
        const stop_erasing = () => {
            if (!owner.status.erasing) {
                return;
            }
            if (is_drawing) {
                owner.#commitEraseCanvas(false);
            }
            owner.status.erasing = false;
            owner.status.stop_erasing = undefined;
            owner.status.erase_canvas = undefined;
            owner.elements.self_ref.classList.remove("ie-erasing");
            owner.elements.btn_erase.classList.remove("ie-tool-active");
            document.removeEventListener("mousemove", move_handler);
            document.removeEventListener("mouseup", mouseup_handler);
            img.removeEventListener("wheel", wheel_handler);
            img.removeEventListener("mousedown", mousedown_handler);
            owner.#hideModeInstructions();
        };
        owner.status.stop_erasing = stop_erasing;
        document.addEventListener("mousemove", move_handler);
        document.addEventListener("mouseup", mouseup_handler);
        img.addEventListener("wheel", wheel_handler, { passive: false });
        img.addEventListener("mousedown", mousedown_handler);
        owner.#showModeInstructions([
            "Trascina per cancellare",
            "Rotellina del mouse per ridimensionare il pennello",
            "Tieni premuto Shift per bloccare l'asse",
            "Esc per uscire",
        ], stop_erasing);
    }
    /**
     * scratch canvas reused by `#restoreAt` to build an alpha-correct circular patch before
     * compositing it onto the working canvas; drawing straight into a `ctx.clip()`'d circle with
     * `"copy"` compositing looks correct in the center but leaves a gray fringe around the
     * anti-aliased edge (partial-coverage boundary pixels get composited against transparent
     * black instead of blending against whatever was already there)
     * @type {HTMLCanvasElement}
     */
    #restore_patch_canvas = null;
    /**
     * paints back, in source-image px, a circular patch of `source_img` at (x, y) with the given
     * radius; unlike `#eraseAt` this fully replaces the pixels within the circle rather than
     * blending, so it also restores any transparency previously punched by erase/color-key.
     * Built in 2 steps on an offscreen patch canvas to keep the edge anti-aliasing correct: fill
     * the circle (`source-over`), then draw `source_img` with `"source-in"` so only the circle's
     * (possibly partial, at the boundary) alpha survives; the patch is then composited onto `ctx`
     * with the default `"source-over"`, so the boundary blends against the existing destination
     * pixels instead of against transparent black.
     */
    #restoreAt(ctx, x, y, radius, source_img) {
        const owner = this;
        const size = Math.ceil(radius * 2);
        owner.#restore_patch_canvas ??= document.createElement("canvas");
        const patch = owner.#restore_patch_canvas;
        patch.width = size;
        patch.height = size;
        const patch_ctx = patch.getContext("2d");
        patch_ctx.beginPath();
        patch_ctx.arc(radius, radius, radius, 0, Math.PI * 2);
        patch_ctx.fill();
        patch_ctx.globalCompositeOperation = "source-in";
        patch_ctx.drawImage(source_img, x - radius, y - radius, size, size, 0, 0, size, size);
        ctx.drawImage(patch, x - radius, y - radius);
    }
    /**
     * restores a series of overlapping circles between two source-image points, so fast drags
     * don't leave gaps between the individually-sampled mousemove positions
     */
    #restoreStroke(ctx, from, to, radius, source_img) {
        const owner = this;
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius * 0.5)));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            owner.#restoreAt(ctx, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, radius, source_img);
        }
    }
    /**
     * bakes the working restore canvas into `img.src`; pass `throttled = true` while a stroke is
     * still in progress so the (expensive) PNG re-encode doesn't run on every single mousemove event
     */
    #commitRestoreCanvas(throttled) {
        const owner = this;
        const now = Date.now();
        if (throttled && owner.status.last_restore_commit != undefined
            && (now - owner.status.last_restore_commit) < ImageEditor.#ERASE_COMMIT_THROTTLE_MS) {
            return;
        }
        owner.status.last_restore_commit = now;
        owner.elements.img_to_crop.src = owner.status.restore_canvas.toDataURL("image/png");
    }
    /**
     * enters freehand restore mode, the opposite brush of `#startErasing`: hides the cursor over the
     * image, shows the same circular brush-size preview, and lets the user click-drag over the image
     * to paint the pristine `original_image_element` pixels back wherever erase/color-key removed them
     */
    #startRestoring() {
        const owner = this;
        if (owner.status.restoring) {
            return;
        }
        owner.status.restoring = true;
        owner.elements.self_ref.classList.add("ie-restoring");
        owner.elements.btn_restore.classList.add("ie-tool-active");

        const img = owner.elements.img_to_crop;
        const source_img = owner.status.original_image_element;
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        owner.status.restore_canvas = canvas;

        let is_drawing = false;
        let last_point = null;
        let stroke_anchor = null;
        let axis_lock = null;

        const natural_radius = () => {
            const scale_x = img.naturalWidth / img.clientWidth;
            const scale_y = img.naturalHeight / img.clientHeight;
            return owner.status.erase_radius * ((scale_x + scale_y) / 2);
        };
        const applyAxisLock = (point, event) => {
            if (!event.shiftKey) {
                axis_lock = null;
                return point;
            }
            if (axis_lock == null) {
                const dx = Math.abs(point.x - stroke_anchor.x);
                const dy = Math.abs(point.y - stroke_anchor.y);
                if (Math.max(dx, dy) < ImageEditor.#ERASE_AXIS_LOCK_THRESHOLD) {
                    return point;
                }
                axis_lock = dx >= dy ? "x" : "y";
            }
            return axis_lock === "x"
                ? { x: point.x, y: stroke_anchor.y }
                : { x: stroke_anchor.x, y: point.y };
        };
        const move_handler = (event) => {
            owner.elements.erase_cursor.style.left = `${event.clientX}px`;
            owner.elements.erase_cursor.style.top = `${event.clientY}px`;
            if (!is_drawing) {
                return;
            }
            const point = applyAxisLock(owner.#getNaturalPixelFromClientPoint(event.clientX, event.clientY), event);
            owner.#restoreStroke(ctx, last_point, point, natural_radius(), source_img);
            last_point = point;
            owner.#commitRestoreCanvas(true);
        };
        const wheel_handler = (event) => {
            event.preventDefault();
            const step = event.deltaY < 0 ? ImageEditor.#ERASE_RADIUS_STEP : -ImageEditor.#ERASE_RADIUS_STEP;
            owner.status.erase_radius = Math.max(
                ImageEditor.#ERASE_RADIUS_MIN,
                Math.min(ImageEditor.#ERASE_RADIUS_MAX, owner.status.erase_radius + step)
            );
            owner.#updateEraseCursorSize();
        };
        const mousedown_handler = (event) => {
            if (event.button !== 0) {
                return;
            }
            event.preventDefault();
            owner.#pushHistory();
            is_drawing = true;
            last_point = owner.#getNaturalPixelFromClientPoint(event.clientX, event.clientY);
            stroke_anchor = last_point;
            axis_lock = null;
            owner.#restoreAt(ctx, last_point.x, last_point.y, natural_radius(), source_img);
            owner.#commitRestoreCanvas(true);
        };
        const mouseup_handler = () => {
            if (!is_drawing) {
                return;
            }
            is_drawing = false;
            last_point = null;
            stroke_anchor = null;
            axis_lock = null;
            owner.#commitRestoreCanvas(false);
        };
        const stop_restoring = () => {
            if (!owner.status.restoring) {
                return;
            }
            if (is_drawing) {
                owner.#commitRestoreCanvas(false);
            }
            owner.status.restoring = false;
            owner.status.stop_restoring = undefined;
            owner.status.restore_canvas = undefined;
            owner.elements.self_ref.classList.remove("ie-restoring");
            owner.elements.btn_restore.classList.remove("ie-tool-active");
            document.removeEventListener("mousemove", move_handler);
            document.removeEventListener("mouseup", mouseup_handler);
            img.removeEventListener("wheel", wheel_handler);
            img.removeEventListener("mousedown", mousedown_handler);
            owner.#hideModeInstructions();
        };
        owner.status.stop_restoring = stop_restoring;
        document.addEventListener("mousemove", move_handler);
        document.addEventListener("mouseup", mouseup_handler);
        img.addEventListener("wheel", wheel_handler, { passive: false });
        img.addEventListener("mousedown", mousedown_handler);
        owner.#showModeInstructions([
            "Trascina per ripristinare l'originale",
            "Rotellina del mouse per ridimensionare il pennello",
            "Tieni premuto Shift per bloccare l'asse",
            "Esc per uscire",
        ], stop_restoring);
    }
    // owner.self_ref;//access element reference here
    // owner.elementReference();//alternative way to access element reference
    // owner.destroy();//call destroy method when needed
    // owner.options;//access building options here

    /**
     * @param {number} [timeout_ms]
     */
    destroy(timeout_ms = 0) {
        const owner = this;
        document.removeEventListener("keydown", owner.status.undo_redo_key_handler);
        owner.#export_speed_actions?.destroy();
        owner.#smoothing_speed_actions?.destroy();
        super.destroy(timeout_ms);
    }

    //#region FrameworkEventListeners
    //@note private methods do not work :: they get mangled
    async onClickCancel() {
        /**
         * @type ImageEditor
         */
        const owner = this.fwInstanceReference;
        if (typeof owner.options.onCancel === "function") {
            owner.options.onCancel();
        }
        owner.destroy();
    }
    async onClickConfirm() {
        /**
         * @type ImageEditor
         */
        const owner = this.fwInstanceReference;
        const cropped_data_url = owner.#cropAndExport();
        if (typeof owner.options.onConfirm === "function") {
            owner.options.onConfirm(cropped_data_url);
        }
        owner.destroy();
    }
    async onClickReset() {
        /**
         * @type ImageEditor
         */
        const owner = this.fwInstanceReference;
        owner.#pushHistory();
        owner.#resetAll();
    }
    async onClickRotationStepDown() {
        /**
         * @type ImageEditor
         */
        const owner = this.fwInstanceReference;
        owner.#stepRotation(-1);
    }
    async onClickRotationReset() {
        /**
         * @type ImageEditor
         */
        const owner = this.fwInstanceReference;
        owner.status.rotation = 0;
        owner.status.flip_h = false;
        owner.status.flip_v = false;
        owner.elements.rotation_slider.value = 0;
        owner.elements.rotation_value.innerText = "0°";
        owner.#applyImageTransform();
    }
    async onClickRotationStepUp() {
        /**
         * @type ImageEditor
         */
        const owner = this.fwInstanceReference;
        owner.#stepRotation(1);
    }
    async onClickToggleLabels() {
        /**
         * @type ImageEditor
         */
        const owner = this.fwInstanceReference;
        owner.status.labels_compact = !owner.status.labels_compact;
        owner.elements.toolbox.classList.toggle("ie-labels-compact", owner.status.labels_compact);
        // owner.elements.btn_toggle_labels.classList.toggle("ie-tool-active", owner.status.labels_compact);
        owner.elements.toggle_labels_icon.innerText = String.fromCodePoint(owner.status.labels_compact ? 0xf3d2 : 0xf8ab);
    }
    async onClickFlipHorizontal() {
        /**
         * @type ImageEditor
         */
        const owner = this.fwInstanceReference;
        owner.#toggleFlip("h");
    }
    async onClickFlipVertical() {
        /**
         * @type ImageEditor
         */
        const owner = this.fwInstanceReference;
        owner.#toggleFlip("v");
    }
    async onClickRemoveBackground() {
        /**
         * @type ImageEditor
         */
        const owner = this.fwInstanceReference;
        if (owner.status.erasing) {
            owner.status.stop_erasing();
        }
        if (owner.status.restoring) {
            owner.status.stop_restoring();
        }
        if (owner.status.picking_color) {
            owner.status.stop_color_picking();
        } else {
            owner.#startColorPicking();
        }
    }
    async onClickErase() {
        /**
         * @type ImageEditor
         */
        const owner = this.fwInstanceReference;
        if (owner.status.picking_color) {
            owner.status.stop_color_picking();
        }
        if (owner.status.restoring) {
            owner.status.stop_restoring();
        }
        if (owner.status.erasing) {
            owner.status.stop_erasing();
        } else {
            owner.#startErasing();
        }
    }
    async onClickRestore() {
        /**
         * @type ImageEditor
         */
        const owner = this.fwInstanceReference;
        if (owner.status.picking_color) {
            owner.status.stop_color_picking();
        }
        if (owner.status.erasing) {
            owner.status.stop_erasing();
        }
        if (owner.status.restoring) {
            owner.status.stop_restoring();
        } else {
            owner.#startRestoring();
        }
    }
    async onClickUndo() {
        /**
         * @type ImageEditor
         */
        const owner = this.fwInstanceReference;
        owner.#undo();
    }
    async onClickRedo() {
        /**
         * @type ImageEditor
         */
        const owner = this.fwInstanceReference;
        owner.#redo();
    }
    //#endregion
}
//#START RESERVED AREA FOR UI_BUILDER
// setTimeout(() => {
//     const canvas = document.createElement("canvas");
//     canvas.width = 640;
//     canvas.height = 480;
//     const ctx = canvas.getContext("2d");
//     const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
//     gradient.addColorStop(0, "#4e8cff");
//     gradient.addColorStop(1, "#ff5e7e");
//     ctx.fillStyle = gradient;
//     ctx.fillRect(0, 0, canvas.width, canvas.height);
//     ctx.fillStyle = "#ffffff";
//     ctx.font = "40px sans-serif";
//     ctx.textAlign = "center";
//     ctx.fillText("mock image", canvas.width / 2, canvas.height / 2);
//     const mock_image_src = canvas.toDataURL("image/png");

//     const editor = new ImageEditor({
//         image_src: mock_image_src,
//         onConfirm: (cropped_data_url) => {
//             console.log("cropped image", cropped_data_url);
//             editor.destroy();
//         },
//         onCancel: () => {
//             editor.destroy();
//         }
//     });
//     document.body.appendChild(editor.elementReference());
// }, 0);
//#END RESERVED AREA FOR UI_BUILDER