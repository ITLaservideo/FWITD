/**
 * The "1.uptrend" shape (AlwaysLearn/analizi/personal/trading/strategies/manual strats/data/1.uptrend.png)
 * and its mirrored downtrend:
 *
 *        up                          down
 *                 f              a
 *               / |                \
 *             / : g                 b ----------- c
 *     e ----/--:-/------ d          :\            |
 *     :   /   :/         |          e -\--------- d
 *     b -/----/--------- c            \ :\
 *      /      ^ midline                 \ :g
 *    a          (x = 2ab)                 \|
 *                                          f
 *
 * Starting position: ab = ag = ef = 45deg, eb = dc = fg = 1000,
 * horizontal catheti from a: ab = 1000, ag = 3 * ab, ac = 5 * ab.
 * Dotted midline at x = 2 * ab, from bg to ef.
 * Control: b moves only along Y (it pivots the trend line around a); the downtrend is the mirror.
 * Constraints: a = (0, 0), b.x locked, c.x and d.x locked, |cd| = |fg| = |eb| = 1000 locked
 * (b, c, d, e, f, g are placed relative to their own a).
 * Mode "both": a starts at (0, -500) and a' at (0, 500): 1000 apart on Y (locked), so the two trend lines cross;
 * b and b' move independently; the a-a' connecting line moves both shapes by -500..+500 on Y.
 *
 * Mount with `new UptrendShapeDemo(container)`, unmount with `destroy()`.
 */
class UptrendShapeDemo {
    /** horizontal cathetus of ab (b.x - a.x, locked) */
    static AB_X = 1000;
    /** horizontal cathetus of ag: ag = 3 * ab */
    static AG_X = 3 * UptrendShapeDemo.AB_X;
    /** horizontal cathetus of ac: ac = 5 * ab (c.x - a.x = d.x - a.x, locked) */
    static AC_X = 5 * UptrendShapeDemo.AB_X;
    /** x of the dotted vertical line connecting bg and ef, from a: 2 * ab */
    static MID_X = 2 * UptrendShapeDemo.AB_X;
    /** locked lengths of the vertical segments eb, dc, fg (and so of the midline) */
    static HEIGHT = 1000;
    /** rise of ab at the start: 45deg */
    static START_RISE = UptrendShapeDemo.AB_X;
    /** the rise is clamped to +-AB_X * tan(85deg), so the trend line never becomes vertical */
    static RISE_LIMIT = Math.round(UptrendShapeDemo.AB_X * Math.tan(85 * Math.PI / 180));
    /**
     * angle lock (on by default): a trend steeper than +-45deg means the market closed and gapped,
     * not a trend - so the angle stays within +-LOCKED_ANGLE, i.e. |rise| <= AB_X * tan(45deg) = AB_X
     */
    static LOCKED_ANGLE = 45;
    static LOCKED_RISE_LIMIT = Math.round(UptrendShapeDemo.AB_X * Math.tan(UptrendShapeDemo.LOCKED_ANGLE * Math.PI / 180));
    /** mode "both": starting points of a and a' (1000 apart on Y, a' above: the two trend lines cross) */
    static BOTH_START = { up: { x: 0, y: -500 }, down: { x: 0, y: 500 } };
    /** mode "both": the a-a' connecting line moves both shapes by +-OFFSET_LIMIT on Y */
    static OFFSET_LIMIT = 500;
    static MODES = ["up", "down", "both"];

    static COLORS = {
        background: "#000000",
        grid: "#262626",
        axis: "#4a4a4a",
        up: "#3d8bfd",
        upFaint: "#3d8bfd99",
        down: "#f5a623",
        downFaint: "#f5a62399",
        link: "#d8d8d8",
        label: "#ffffff",
        dim: "#9a9a9a",
        handle: "#ffd166",
    };
    /** label offsets in px from each point of the uptrend, as in the reference picture; the downtrend mirrors them */
    static LABEL_OFFSETS = {
        a: [6, 18], b: [6, 22], c: [6, 22], d: [8, -10], e: [-22, 6], f: [12, -6], g: [12, 8],
    };
    static HANDLE_HIT_PX = 14;
    static LINK_HIT_PX = 8;

    /**
     * rise of each shape's ab, measured in its own trend direction: up = b above a, down = b below a.
     * Independent, so in mode "both" b and b' move on their own
     */
    rise = { up: UptrendShapeDemo.START_RISE, down: UptrendShapeDemo.START_RISE };
    /** mode "both": vertical offset of the a-a' connecting line */
    offset = 0;
    /** true: angles within +-LOCKED_ANGLE (see there) */
    angleLocked = true;
    /** @type {"up"|"down"|"both"} */
    mode = "up";
    /** mode "both": which b the arrow keys move (the last one dragged or edited) */
    #activeKey = "up";
    /** world -> screen: x = ox + wx * scale, y = oy - wy * scale (world Y points up) */
    view = { scale: 1, ox: 0, oy: 0 };
    /** @type {null | {mode: "b", key: "up"|"down", dir: number, ay: number} | {mode: "link", startOffset: number, startY: number} | {mode: "pan", x: number, y: number}} */
    #drag = null;
    /** @type {null|"up"|"down"|"link"} */
    #hover = null;
    #renderQueued = 0;
    #resizeObserver = null;
    #fitted = false;

    /** @param {HTMLElement} container */
    constructor(container) {
        this.root = document.createElement("div");
        this.root.className = "cs-demo cs-uptrend";
        this.root.tabIndex = -1;// focusable, so the keys reach only this demo
        const group = (key) => `
            <div class="cs-uptrend-group cs-uptrend-group-${key}" data-ref="group_${key}">
                <span class="cs-uptrend-group-name" data-ref="name_${key}">ab</span>
                <label>Δy <input type="number" data-ref="rise_${key}" step="10"></label>
                <label>angle <input type="number" data-ref="angle_${key}" step="0.5" min="-85" max="85">°</label>
            </div>`;
        this.root.innerHTML = `
            <div class="cs-uptrend-toolbar">
                <div class="cs-uptrend-mode" role="radiogroup" data-ref="modes">
                    <button data-mode="up" title="uptrend (1)">Up</button>
                    <button data-mode="down" title="mirrored downtrend (2)">Down</button>
                    <button data-mode="both" title="both, 1000 apart on Y (3)">Both</button>
                </div>
                ${group("up")}
                ${group("down")}
                <label data-ref="offset_label" title="moves both shapes on Y (PgUp / PgDn)">a↔a′ offset
                    <input type="number" data-ref="offset" step="10" min="-${UptrendShapeDemo.OFFSET_LIMIT}" max="${UptrendShapeDemo.OFFSET_LIMIT}">
                </label>
                <button class="cs-uptrend-lock" data-ref="lock" title="beyond ±45° the market closed and gapped: not a trend (L)"></button>
                <button data-ref="reset" title="back to 45°, offset 0 (R)">Reset</button>
                <button data-ref="fit" title="fit the shapes in view (F, double click)">Fit</button>
            </div>
            <div class="cs-uptrend-readout" data-ref="lengths"></div>
            <div class="cs-uptrend-readout cs-uptrend-points" data-ref="points"></div>
            <div class="cs-uptrend-stage" data-ref="stage">
                <canvas data-ref="canvas"></canvas>
            </div>
        `;
        const ref = (name) => this.root.querySelector(`[data-ref="${name}"]`);
        this.stage = ref("stage");
        this.canvas = ref("canvas");
        this.ctx = this.canvas.getContext("2d");
        this.offsetInput = ref("offset");
        this.offsetLabel = ref("offset_label");
        this.modeButtons = ref("modes");
        this.lengthsEl = ref("lengths");
        this.pointsEl = ref("points");
        /** per shape: its input group; the inputs show the shape's own signed values (the downtrend's are negative) */
        this.groups = {};
        for (const key of ["up", "down"]) {
            const dir = key === "up" ? 1 : -1;
            const g = { root: ref(`group_${key}`), name: ref(`name_${key}`), rise: ref(`rise_${key}`), angle: ref(`angle_${key}`) };
            this.groups[key] = g;
            g.rise.addEventListener("input", () => {
                const value = Number(g.rise.value);
                if (g.rise.value !== "" && Number.isFinite(value)) this.setRise(key, dir * value, { except: g.rise });
            });
            g.angle.addEventListener("input", () => {
                const deg = Number(g.angle.value);
                if (g.angle.value !== "" && Number.isFinite(deg)) {
                    const rise = UptrendShapeDemo.AB_X * Math.tan(Math.max(-85, Math.min(85, deg)) * Math.PI / 180);
                    this.setRise(key, dir * rise, { except: g.angle });
                }
            });
            [g.rise, g.angle].forEach(input => {
                input.addEventListener("focus", () => { this.#activeKey = key; });
                input.addEventListener("change", () => this.#syncInputs());
            });
        }
        this.offsetInput.addEventListener("input", () => {
            const value = Number(this.offsetInput.value);
            if (this.offsetInput.value !== "" && Number.isFinite(value)) this.setOffset(value, { syncInput: false });
        });
        this.offsetInput.addEventListener("change", () => this.#syncInputs());
        this.modeButtons.addEventListener("click", event => {
            const mode = event.target.closest("[data-mode]")?.dataset.mode;
            if (mode) this.setMode(mode);
        });
        this.lockButton = ref("lock");
        this.lockButton.addEventListener("click", () => this.setAngleLocked(!this.angleLocked));
        ref("reset").addEventListener("click", () => this.reset());
        ref("fit").addEventListener("click", () => this.fit());
        this.#addPointerListeners();
        this.root.addEventListener("keydown", event => this.#onKeyDown(event));

        // the stage gets its size from the layout: (re)size the canvas, the first time also fit the shape
        this.#resizeObserver = new ResizeObserver(() => this.#onResize());
        this.#resizeObserver.observe(this.stage);

        container.appendChild(this.root);
        this.root.focus({ preventScroll: true });
        this.setAngleLocked(this.angleLocked);
        this.setMode(this.mode);
    }

    destroy() {
        this.#resizeObserver?.disconnect();
        cancelAnimationFrame(this.#renderQueued);
        this.#renderQueued = 0;
        this.root.remove();
    }

    // ---------------------------------------------------------------
    // Geometry
    // ---------------------------------------------------------------

    /**
     * Every point follows from a and the rise of ab:
     * - b.x is locked (AB_X from a), so the trend line is a -> b
     * - g is on that line with ag = 3 * ab (horizontal cathetus)
     * - bc is horizontal and c.x is locked -> c.y = b.y; d is HEIGHT beyond c (|dc| locked)
     * - e is HEIGHT beyond b (|eb| locked), f is HEIGHT beyond g (|fg| locked):
     *   so ef stays parallel to the trend line and ed stays horizontal
     * "beyond" = up for the uptrend (dir 1), down for the mirrored downtrend (dir -1)
     * @param {number} rise rise of ab in the shape's own trend direction
     * @param {{x: number, y: number}} [a]
     * @param {1|-1} [dir] 1 = uptrend, -1 = mirrored downtrend
     */
    static solve(rise, a = { x: 0, y: 0 }, dir = 1) {
        const { AB_X, AG_X, AC_X, HEIGHT } = UptrendShapeDemo;
        const dy = dir * rise;
        const h = dir * HEIGHT;
        const gy = a.y + dy * AG_X / AB_X;
        return {
            a: { x: a.x, y: a.y },
            b: { x: a.x + AB_X, y: a.y + dy },
            c: { x: a.x + AC_X, y: a.y + dy },
            d: { x: a.x + AC_X, y: a.y + dy + h },
            e: { x: a.x + AB_X, y: a.y + dy + h },
            f: { x: a.x + AG_X, y: gy + h },
            g: { x: a.x + AG_X, y: gy },
        };
    }

    /** the dotted vertical line at MID_X from a: from the bg line to the ef line (always HEIGHT long) */
    static midline(rise, a = { x: 0, y: 0 }, dir = 1) {
        const { AB_X, MID_X, HEIGHT } = UptrendShapeDemo;
        const y = a.y + dir * rise * MID_X / AB_X;
        return [{ x: a.x + MID_X, y }, { x: a.x + MID_X, y: y + dir * HEIGHT }];
    }

    /** the shapes visible in the current mode, with their points */
    #shapes() {
        const both = this.mode === "both";
        const start = UptrendShapeDemo.BOTH_START;
        const list = [];
        if (this.mode !== "down") {
            list.push({ key: "up", dir: 1, a: both ? { x: start.up.x, y: start.up.y + this.offset } : { x: 0, y: 0 }, suffix: "" });
        }
        if (this.mode !== "up") {
            list.push({ key: "down", dir: -1, a: both ? { x: start.down.x, y: start.down.y + this.offset } : { x: 0, y: 0 }, suffix: both ? "′" : "" });
        }
        return list.map(s => ({
            ...s,
            rise: this.rise[s.key],
            points: UptrendShapeDemo.solve(this.rise[s.key], s.a, s.dir),
            mid: UptrendShapeDemo.midline(this.rise[s.key], s.a, s.dir),
        }));
    }

    /** signed angle of a shape's ab (= ag = ef) in degrees, measured from the X axis */
    angleDeg(key) {
        const dir = key === "up" ? 1 : -1;
        return Math.atan2(dir * this.rise[key], UptrendShapeDemo.AB_X) * 180 / Math.PI;
    }

    /**
     * @param {"up"|"down"} key
     * @param {number} rise rise of ab in the shape's own trend direction
     * @param {{except?: HTMLInputElement}} [opts] the input being typed in, not to rewrite
     */
    setRise(key, rise, { except = null } = {}) {
        const limit = this.angleLocked ? UptrendShapeDemo.LOCKED_RISE_LIMIT : UptrendShapeDemo.RISE_LIMIT;
        const clamped = Math.max(-limit, Math.min(limit, rise));
        this.rise[key] = Math.round(clamped * 100) / 100;
        this.#activeKey = key;
        // a typed value past the bound: rewrite that input too, so it shows what the shape really uses
        this.#syncInputs(clamped === rise ? except : null);
        this.#updateReadout();
        this.requestRender();
    }

    /** @param {boolean} locked true: angles within +-LOCKED_ANGLE; locking pulls steeper trends back to the bound */
    setAngleLocked(locked) {
        this.angleLocked = locked;
        const bound = locked ? UptrendShapeDemo.LOCKED_ANGLE : 85;
        this.lockButton.classList.toggle("active", locked);
        this.lockButton.setAttribute("aria-pressed", String(locked));
        this.lockButton.innerHTML = locked
            ? `<span class="f-icon-i">&#xe897;</span> angle ±${UptrendShapeDemo.LOCKED_ANGLE}°`
            : `<span class="f-icon-i">&#xe898;</span> angle unlocked`;
        for (const key of ["up", "down"]) {
            this.groups[key].angle.min = String(-bound);
            this.groups[key].angle.max = String(bound);
        }
        const active = this.#activeKey;
        this.setRise("up", this.rise.up);
        this.setRise("down", this.rise.down);
        this.#activeKey = active;
    }

    /** mode "both": moves both shapes on Y, clamped to +-OFFSET_LIMIT */
    setOffset(offset, { syncInput = true } = {}) {
        const limit = UptrendShapeDemo.OFFSET_LIMIT;
        this.offset = Math.round(Math.max(-limit, Math.min(limit, offset)));
        if (syncInput) this.offsetInput.value = String(this.offset);
        this.#updateReadout();
        this.requestRender();
    }

    /** @param {"up"|"down"|"both"} mode */
    setMode(mode) {
        if (!UptrendShapeDemo.MODES.includes(mode)) return;
        this.mode = mode;
        this.modeButtons.querySelectorAll("[data-mode]").forEach(button => {
            const active = button.dataset.mode === mode;
            button.classList.toggle("active", active);
            button.setAttribute("aria-checked", String(active));
        });
        this.groups.up.root.hidden = mode === "down";
        this.groups.down.root.hidden = mode === "up";
        this.groups.down.name.textContent = mode === "both" ? "a′b′" : "ab";
        this.offsetLabel.hidden = mode !== "both";
        if (mode !== "both") this.#activeKey = mode;
        this.#syncInputs();
        this.#updateReadout();
        this.fit();
    }

    reset() {
        this.rise = { up: UptrendShapeDemo.START_RISE, down: UptrendShapeDemo.START_RISE };
        this.offset = 0;
        this.#syncInputs();
        this.#updateReadout();
        this.fit();
    }

    /** @param {HTMLInputElement|null} [except] the input being typed in, not to rewrite */
    #syncInputs(except = null) {
        const write = (input, value) => { if (input !== except) input.value = value; };
        for (const key of ["up", "down"]) {
            const dir = key === "up" ? 1 : -1;
            write(this.groups[key].rise, String(dir * this.rise[key]));
            write(this.groups[key].angle, this.angleDeg(key).toFixed(2));
        }
        write(this.offsetInput, String(this.offset));
    }

    #updateReadout() {
        const len = (u, v) => Math.hypot(v.x - u.x, v.y - u.y);
        const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString("en-US");
        const shapes = this.#shapes();
        const lines = shapes.map(s => {
            const p = s.points, n = (name) => name + s.suffix;
            return `${n("a")}${n("b")} = ${n("a")}${n("g")} = ${n("e")}${n("f")}: <b>${this.angleDeg(s.key).toFixed(2)}°</b> · ` +
                `|${n("a")}${n("b")}| ${fmt(len(p.a, p.b))} · |${n("a")}${n("g")}| ${fmt(len(p.a, p.g))} · ` +
                `|${n("e")}${n("f")}| ${fmt(len(p.e, p.f))} · |${n("b")}${n("c")}| ${fmt(len(p.b, p.c))}`;
        });
        const locked = this.mode === "both"
            ? `|eb| = |dc| = |fg| = |midline| = Δy aa′ = ${fmt(UptrendShapeDemo.HEIGHT)} locked · offset ${fmt(this.offset)}`
            : `|eb| = |dc| = |fg| = |midline| = ${fmt(UptrendShapeDemo.HEIGHT)} locked`;
        this.lengthsEl.innerHTML = lines.join("<br>") + `<br><span class="cs-uptrend-locked">${locked}</span>`;
        this.pointsEl.textContent = shapes
            .map(s => Object.entries(s.points).map(([name, pt]) => `${name}${s.suffix}(${fmt(pt.x)}, ${fmt(pt.y)})`).join("  "))
            .join("\n");
    }

    // ---------------------------------------------------------------
    // View
    // ---------------------------------------------------------------

    toScreen(pt) {
        const v = this.view;
        return { x: v.ox + pt.x * v.scale, y: v.oy - pt.y * v.scale };
    }
    toWorld(x, y) {
        const v = this.view;
        return { x: (x - v.ox) / v.scale, y: (v.oy - y) / v.scale };
    }

    /** css size of the stage */
    #size() {
        return { w: this.stage.clientWidth, h: this.stage.clientHeight };
    }

    #visiblePoints() {
        return this.#shapes().flatMap(s => Object.values(s.points));
    }

    /** same scale on both axes (45deg must look like 45deg), shapes centered with room for the labels */
    fit() {
        const { w, h } = this.#size();
        if (w === 0 || h === 0) return;
        const points = this.#visiblePoints();
        const xs = points.map(p => p.x), ys = points.map(p => p.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
        const pad = 48;
        const scale = Math.min((w - 2 * pad) / Math.max(maxX - minX, 1), (h - 2 * pad) / Math.max(maxY - minY, 1));
        this.view = {
            scale,
            ox: w / 2 - (minX + maxX) / 2 * scale,
            oy: h / 2 + (minY + maxY) / 2 * scale,
        };
        this.requestRender();
    }

    #allInView() {
        const { w, h } = this.#size();
        return this.#visiblePoints().every(pt => {
            const s = this.toScreen(pt);
            return s.x >= 0 && s.x <= w && s.y >= 0 && s.y <= h;
        });
    }

    #onResize() {
        const { w, h } = this.#size();
        if (w === 0 || h === 0) return;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.round(w * dpr);
        this.canvas.height = Math.round(h * dpr);
        if (!this.#fitted) {
            this.#fitted = true;
            this.fit();
        } else {
            this.requestRender();
        }
    }

    // ---------------------------------------------------------------
    // Input
    // ---------------------------------------------------------------

    #eventPos(event) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    /** distance in px from `p` to the segment u-v */
    static #distanceToSegment(p, u, v) {
        const dx = v.x - u.x, dy = v.y - u.y;
        const len2 = dx * dx + dy * dy;
        const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - u.x) * dx + (p.y - u.y) * dy) / len2));
        return Math.hypot(p.x - (u.x + t * dx), p.y - (u.y + t * dy));
    }

    /**
     * what is under the pointer: a b handle (first) or, in mode "both", the a-a' connecting line
     * @returns {null | {target: "b", shape: Object} | {target: "link"}}
     */
    #hitTest(pos) {
        const shapes = this.#shapes();
        for (const shape of shapes) {
            const b = this.toScreen(shape.points.b);
            if (Math.hypot(pos.x - b.x, pos.y - b.y) <= UptrendShapeDemo.HANDLE_HIT_PX) {
                return { target: "b", shape };
            }
        }
        if (this.mode === "both") {
            const u = this.toScreen(shapes[0].points.a), v = this.toScreen(shapes[1].points.a);
            if (UptrendShapeDemo.#distanceToSegment(pos, u, v) <= UptrendShapeDemo.LINK_HIT_PX) {
                return { target: "link" };
            }
        }
        return null;
    }

    #addPointerListeners() {
        const canvas = this.canvas;
        canvas.addEventListener("pointerdown", event => {
            if (event.button !== 0) return;
            const pos = this.#eventPos(event);
            canvas.setPointerCapture(event.pointerId);
            const hit = this.#hitTest(pos);
            if (hit?.target === "b") {
                this.#drag = { mode: "b", key: hit.shape.key, dir: hit.shape.dir, ay: hit.shape.a.y };
                this.#hover = hit.shape.key;
                this.#activeKey = hit.shape.key;
            } else if (hit?.target === "link") {
                this.#drag = { mode: "link", startOffset: this.offset, startY: this.toWorld(pos.x, pos.y).y };
                this.#hover = "link";
            } else {
                this.#drag = { mode: "pan", x: pos.x, y: pos.y };
            }
            this.#updateCursor();
            this.requestRender();
        });
        canvas.addEventListener("pointermove", event => {
            const pos = this.#eventPos(event);
            const drag = this.#drag;
            if (drag?.mode === "b") {
                // b.x is locked: only Y follows the pointer; only this shape's b moves
                this.setRise(drag.key, Math.round(drag.dir * (this.toWorld(pos.x, pos.y).y - drag.ay)));
            } else if (drag?.mode === "link") {
                this.setOffset(drag.startOffset + Math.round(this.toWorld(pos.x, pos.y).y - drag.startY));
            } else if (drag?.mode === "pan") {
                this.view.ox += pos.x - drag.x;
                this.view.oy += pos.y - drag.y;
                drag.x = pos.x;
                drag.y = pos.y;
                this.requestRender();
            } else {
                const hit = this.#hitTest(pos);
                const hover = hit?.target === "b" ? hit.shape.key : hit?.target ?? null;
                if (hover !== this.#hover) {
                    this.#hover = hover;
                    this.#updateCursor();
                    this.requestRender();
                }
            }
        });
        const end = () => {
            const moved_shape = this.#drag?.mode === "b" || this.#drag?.mode === "link";
            this.#drag = null;
            this.#updateCursor();
            if (moved_shape && !this.#allInView()) this.fit();
            this.requestRender();
        };
        canvas.addEventListener("pointerup", end);
        canvas.addEventListener("pointercancel", end);
        canvas.addEventListener("dblclick", () => this.fit());
        // zoom around the pointer
        canvas.addEventListener("wheel", event => {
            event.preventDefault();
            const pos = this.#eventPos(event);
            const before = this.toWorld(pos.x, pos.y);
            const factor = Math.pow(1.1, -event.deltaY / 100);
            this.view.scale = Math.max(0.005, Math.min(50, this.view.scale * factor));
            this.view.ox = pos.x - before.x * this.view.scale;
            this.view.oy = pos.y + before.y * this.view.scale;
            this.requestRender();
        }, { passive: false });
    }

    #updateCursor() {
        const drag = this.#drag;
        this.canvas.style.cursor = (drag && drag.mode !== "pan") || (!drag && this.#hover)
            ? "ns-resize"
            : drag?.mode === "pan" ? "grabbing" : "grab";
    }

    #onKeyDown(event) {
        if (event.target.tagName === "INPUT") return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const step = event.shiftKey ? 100 : 10;
        // ↑ moves the active b up on screen: for the downtrend that means less rise
        const key = this.#activeKey;
        const dir = key === "up" ? 1 : -1;
        switch (event.key) {
            case "ArrowUp": event.preventDefault(); this.setRise(key, this.rise[key] + dir * step); break;
            case "ArrowDown": event.preventDefault(); this.setRise(key, this.rise[key] - dir * step); break;
            case "PageUp": event.preventDefault(); if (this.mode === "both") this.setOffset(this.offset + step); break;
            case "PageDown": event.preventDefault(); if (this.mode === "both") this.setOffset(this.offset - step); break;
            case "1": this.setMode("up"); break;
            case "2": this.setMode("down"); break;
            case "3": this.setMode("both"); break;
            case "l": case "L": this.setAngleLocked(!this.angleLocked); break;
            case "r": case "R": this.reset(); break;
            case "f": case "F": this.fit(); break;
        }
    }

    // ---------------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------------

    requestRender() {
        if (this.#renderQueued) return;
        this.#renderQueued = requestAnimationFrame(() => {
            this.#renderQueued = 0;
            this.render();
        });
    }

    /** grid step in world units: the smallest "nice" step at least 40px apart */
    #gridStep() {
        for (const step of [10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000]) {
            if (step * this.view.scale >= 40) return step;
        }
        return 100000;
    }

    render() {
        const ctx = this.ctx;
        const { w, h } = this.#size();
        if (w === 0 || h === 0) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = UptrendShapeDemo.COLORS.background;
        ctx.fillRect(0, 0, w, h);
        this.#drawGrid(w, h);

        const shapes = this.#shapes();
        shapes.forEach(shape => this.#drawShape(shape));
        if (this.mode === "both") {
            this.#drawLink(shapes[0], shapes[1]);
        }
        shapes.forEach(shape => this.#drawPoints(shape));
        shapes.forEach(shape => this.#drawLabels(shape));
    }

    #drawShape(shape) {
        const ctx = this.ctx;
        const C = UptrendShapeDemo.COLORS;
        const color = shape.key === "up" ? C.up : C.down;
        const faint = shape.key === "up" ? C.upFaint : C.downFaint;
        const s = Object.fromEntries(Object.entries(shape.points).map(([k, pt]) => [k, this.toScreen(pt)]));
        const segment = (u, v) => { ctx.moveTo(u.x, u.y); ctx.lineTo(v.x, v.y); };

        // angle arc at a
        const arcR = Math.min(60, Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) * 0.6);
        const angle = Math.atan2(shape.dir * shape.rise, UptrendShapeDemo.AB_X);
        ctx.beginPath();
        ctx.strokeStyle = C.dim;
        ctx.lineWidth = 1;
        ctx.arc(s.a.x, s.a.y, arcR, 0, -angle, angle > 0);
        ctx.stroke();
        ctx.fillStyle = C.dim;
        ctx.font = "12px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`${(angle * 180 / Math.PI).toFixed(1)}°`, s.a.x + arcR + 6, s.a.y - (angle >= 0 ? 10 : -10));

        // eb: not drawn in the picture, but its length is locked -> dashed construction line
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = faint;
        segment(s.e, s.b);
        ctx.stroke();
        // midline at 2ab from a, from bg to ef: dotted
        const [m1, m2] = shape.mid.map(pt => this.toScreen(pt));
        ctx.beginPath();
        ctx.setLineDash([1.5, 4]);
        ctx.lineCap = "round";
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        segment(m1, m2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineCap = "butt";

        // the shape
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        segment(s.a, s.g);      // trend line a -> b -> g
        segment(s.e, s.f);      // parallel e -> f
        segment(s.f, s.g);
        segment(s.e, s.d);      // box b c d e
        segment(s.d, s.c);
        segment(s.c, s.b);
        ctx.stroke();

        // locked lengths
        ctx.fillStyle = C.dim;
        ctx.font = "11px sans-serif";
        ctx.textAlign = "left";
        const lockLabel = (u, v, dx) => ctx.fillText(`${UptrendShapeDemo.HEIGHT}`, (u.x + v.x) / 2 + dx, (u.y + v.y) / 2);
        lockLabel(s.d, s.c, 8);
        lockLabel(s.f, s.g, 8);
        ctx.textAlign = "right";
        lockLabel(s.e, s.b, -8);
    }

    /** mode "both": the a-a' line (Δy locked at HEIGHT) that moves both shapes on Y */
    #drawLink(up, down) {
        const ctx = this.ctx;
        const C = UptrendShapeDemo.COLORS;
        const u = this.toScreen(up.points.a), v = this.toScreen(down.points.a);
        const active = this.#hover === "link" || this.#drag?.mode === "link";
        ctx.beginPath();
        ctx.strokeStyle = C.link;
        ctx.lineWidth = active ? 3 : 2;
        ctx.moveTo(u.x, u.y);
        ctx.lineTo(v.x, v.y);
        ctx.stroke();
        // grip in the middle, with up/down arrows: it moves only on Y
        const mx = (u.x + v.x) / 2, my = (u.y + v.y) / 2;
        ctx.fillStyle = C.link;
        ctx.beginPath();
        ctx.arc(mx, my, active ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fill();
        for (const dir of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(mx, my + dir * 20);
            ctx.lineTo(mx - 4, my + dir * 13);
            ctx.lineTo(mx + 4, my + dir * 13);
            ctx.closePath();
            ctx.fill();
        }
        ctx.fillStyle = C.dim;
        ctx.font = "11px sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(`Δy ${UptrendShapeDemo.HEIGHT}`, mx - 10, my);
    }

    #drawPoints(shape) {
        const ctx = this.ctx;
        const C = UptrendShapeDemo.COLORS;
        const color = shape.key === "up" ? C.up : C.down;
        for (const [name, point] of Object.entries(shape.points)) {
            if (name === "b") continue;
            const pt = this.toScreen(point);
            ctx.beginPath();
            ctx.fillStyle = color;
            if (name === "a") {
                ctx.rect(pt.x - 4, pt.y - 4, 8, 8);// anchored point
            } else {
                ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
            }
            ctx.fill();
        }
        // b: draggable along Y only
        const b = this.toScreen(shape.points.b);
        const active = this.#hover === shape.key || (this.#drag?.mode === "b" && this.#drag.key === shape.key);
        ctx.beginPath();
        ctx.fillStyle = C.handle;
        ctx.arc(b.x, b.y, active ? 7 : 5.5, 0, Math.PI * 2);
        ctx.fill();
        if (active) {
            ctx.beginPath();
            ctx.strokeStyle = C.handle;
            ctx.lineWidth = 1;
            ctx.arc(b.x, b.y, 12, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.fillStyle = C.handle;
        for (const dir of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(b.x, b.y + dir * 22);
            ctx.lineTo(b.x - 4, b.y + dir * 15);
            ctx.lineTo(b.x + 4, b.y + dir * 15);
            ctx.closePath();
            ctx.fill();
        }
    }

    #drawLabels(shape) {
        const ctx = this.ctx;
        ctx.fillStyle = UptrendShapeDemo.COLORS.label;
        ctx.font = "18px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        for (const [name, point] of Object.entries(shape.points)) {
            const pt = this.toScreen(point);
            const [dx, dy] = UptrendShapeDemo.LABEL_OFFSETS[name];
            // mirrored: a label below its point goes above it (12 ~ the cap height, the y is the text baseline)
            const y = shape.dir === 1 ? dy : 12 - dy;
            ctx.fillText(name + shape.suffix, pt.x + dx, pt.y + y);
        }
    }

    #drawGrid(w, h) {
        const ctx = this.ctx;
        const C = UptrendShapeDemo.COLORS;
        const step = this.#gridStep();
        const topLeft = this.toWorld(0, 0), bottomRight = this.toWorld(w, h);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.strokeStyle = C.grid;
        for (let x = Math.ceil(topLeft.x / step) * step; x <= bottomRight.x; x += step) {
            const sx = Math.round(this.toScreen({ x, y: 0 }).x) + 0.5;
            ctx.moveTo(sx, 0); ctx.lineTo(sx, h);
        }
        for (let y = Math.ceil(bottomRight.y / step) * step; y <= topLeft.y; y += step) {
            const sy = Math.round(this.toScreen({ x: 0, y }).y) + 0.5;
            ctx.moveTo(0, sy); ctx.lineTo(w, sy);
        }
        ctx.stroke();
        // axes through the origin
        const origin = this.toScreen({ x: 0, y: 0 });
        ctx.beginPath();
        ctx.strokeStyle = C.axis;
        ctx.moveTo(Math.round(origin.x) + 0.5, 0); ctx.lineTo(Math.round(origin.x) + 0.5, h);
        ctx.moveTo(0, Math.round(origin.y) + 0.5); ctx.lineTo(w, Math.round(origin.y) + 0.5);
        ctx.stroke();
    }
}
