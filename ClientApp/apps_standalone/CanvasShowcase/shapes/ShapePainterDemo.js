/**
 * Shape Painter: drag on the canvas to draw shapes.
 * Challenge mode: trace the dashed target shape as precisely as you can.
 * (migrated from AlwaysLearn/JavaScript/0_testing.js/shapes)
 * Mount with `new ShapePainterDemo(container)`, unmount with `destroy()`.
 */
class ShapePainterDemo {
    static TOOLS = ["line", "rect", "circle", "triangle", "star", "free"];
    static CHALLENGE_SHAPES = ["rect", "circle", "triangle", "star"];
    static ROUNDS = 5;
    static BEST_STORAGE_KEY = "shapePainterBest";

    state = {
        tool: "rect",
        shapes: [],      // everything drawn and kept
        current: null,   // shape being dragged right now
        challenge: null, // { round, score, target, savedShapes, waiting }
    };
    #roundTimer = null;

    /** @param {HTMLElement} container */
    constructor(container) {
        this.root = document.createElement("div");
        this.root.className = "cs-demo cs-shapes";
        this.root.tabIndex = -1;// focusable, so the keys reach only this demo
        this.root.innerHTML = `
            <div class="cs-shapes-toolbar" data-ref="tools">
                <!-- data-tool is read by ShapePainterDemo -->
                <button data-tool="line">1 Line</button>
                <button data-tool="rect" class="active">2 Rectangle</button>
                <button data-tool="circle">3 Circle</button>
                <button data-tool="triangle">4 Triangle</button>
                <button data-tool="star">5 Star</button>
                <button data-tool="free">6 Freehand</button>
            </div>

            <div class="cs-shapes-toolbar">
                <label>Color <input type="color" data-ref="color" value="#e63946"></label>
                <label>Size <input type="range" data-ref="size" min="1" max="30" value="4"></label>
                <label><input type="checkbox" data-ref="fill"> Fill</label>
                <div class="cs-shapes-sep"></div>
                <button data-ref="undo">Undo</button>
                <button data-ref="clear">Clear</button>
                <div class="cs-shapes-sep"></div>
                <button data-ref="challenge">Start challenge</button>
            </div>

            <div class="cs-shapes-status" data-ref="status">Pick a shape and drag on the canvas.</div>

            <canvas data-ref="board" width="800" height="500"></canvas>

            <div class="cs-shapes-help">
                Keys: 1–6 pick a shape · F toggles fill · Ctrl+Z undo · C clears<br>
                Challenge: a dashed shape appears. Trace it as closely as you can. ${ShapePainterDemo.ROUNDS} rounds, max ${ShapePainterDemo.ROUNDS * 100} points.
            </div>
        `;
        const ref = (name) => this.root.querySelector(`[data-ref="${name}"]`);
        this.canvas = ref("board");
        this.ctx = this.canvas.getContext("2d");
        this.statusEl = ref("status");
        this.colorInput = ref("color");
        this.sizeInput = ref("size");
        this.fillInput = ref("fill");
        this.challengeBtn = ref("challenge");

        this.#addInputListeners();
        ref("tools").addEventListener("click", event => {
            const tool = event.target.dataset.tool;
            if (tool && !this.state.challenge) this.selectTool(tool);
        });
        ref("undo").addEventListener("click", () => this.undo());
        ref("clear").addEventListener("click", () => this.clearBoard());
        this.challengeBtn.addEventListener("click", () => (this.state.challenge ? this.endChallenge(true) : this.startChallenge()));
        this.root.addEventListener("keydown", event => this.#onKeyDown(event));

        container.appendChild(this.root);
        this.root.focus({ preventScroll: true });
        this.redraw();
    }

    destroy() {
        clearTimeout(this.#roundTimer);
        this.state.challenge = null;
        this.root.remove();
    }

    // ---------------------------------------------------------------
    // Drawing
    // ---------------------------------------------------------------

    // Every shape is stored as a plain object:
    // { type, x1, y1, x2, y2, color, size, fill, points }
    // For circle and star, (x1, y1) is the center and (x2, y2) sets the radius.
    // For line, rect and triangle, (x1, y1) and (x2, y2) are opposite corners.

    static radius(s) {
        return Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    }

    // Bounding box: used for drawing triangles and for challenge scoring.
    static box(s) {
        if (s.type === "circle" || s.type === "star") {
            const r = ShapePainterDemo.radius(s);
            return { left: s.x1 - r, top: s.y1 - r, w: 2 * r, h: 2 * r };
        }
        return {
            left: Math.min(s.x1, s.x2),
            top: Math.min(s.y1, s.y2),
            w: Math.abs(s.x2 - s.x1),
            h: Math.abs(s.y2 - s.y1),
        };
    }

    // Builds the path for a shape without painting it.
    tracePath(s) {
        const ctx = this.ctx;
        ctx.beginPath();
        switch (s.type) {
            case "line":
                ctx.moveTo(s.x1, s.y1);
                ctx.lineTo(s.x2, s.y2);
                break;

            case "rect": {
                const b = ShapePainterDemo.box(s);
                ctx.rect(b.left, b.top, b.w, b.h);
                break;
            }

            case "circle":
                ctx.arc(s.x1, s.y1, ShapePainterDemo.radius(s), 0, Math.PI * 2);
                break;

            case "triangle": {
                const b = ShapePainterDemo.box(s);
                ctx.moveTo(b.left + b.w / 2, b.top);     // top middle
                ctx.lineTo(b.left + b.w, b.top + b.h);   // bottom right
                ctx.lineTo(b.left, b.top + b.h);         // bottom left
                ctx.closePath();
                break;
            }

            case "star": {
                const spikes = 5;
                const outer = ShapePainterDemo.radius(s);
                const inner = outer * 0.45;
                // Alternate outer and inner points around the center.
                for (let i = 0; i < spikes * 2; i++) {
                    const r = i % 2 === 0 ? outer : inner;
                    const angle = -Math.PI / 2 + (i * Math.PI) / spikes;
                    const px = s.x1 + Math.cos(angle) * r;
                    const py = s.y1 + Math.sin(angle) * r;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                break;
            }

            case "free":
                s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
                break;
        }
    }

    drawShape(s, dashed = false) {
        const ctx = this.ctx;
        this.tracePath(s);
        ctx.lineWidth = s.size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.setLineDash(dashed ? [10, 8] : []);

        const canFill = s.type !== "line" && s.type !== "free";
        if (s.fill && canFill) {
            ctx.fillStyle = s.color;
            ctx.fill();
        }
        ctx.strokeStyle = s.color;
        ctx.stroke();
        ctx.setLineDash([]);
    }

    redraw() {
        const state = this.state;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (state.challenge) this.drawShape(state.challenge.target, true);
        state.shapes.forEach(s => this.drawShape(s));
        if (state.current) this.drawShape(state.current);
    }

    // ---------------------------------------------------------------
    // Mouse / touch input (pointer events handle both)
    // ---------------------------------------------------------------

    // Converts page coordinates to canvas pixels, even if CSS shrinks the canvas.
    canvasPos(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (event.clientY - rect.top) * (this.canvas.height / rect.height),
        };
    }

    #addInputListeners() {
        const canvas = this.canvas;
        canvas.addEventListener("pointerdown", event => {
            const state = this.state;
            if (state.challenge && state.challenge.waiting) return;
            const p = this.canvasPos(event);
            canvas.setPointerCapture(event.pointerId);
            state.current = {
                type: state.tool,
                x1: p.x, y1: p.y, x2: p.x, y2: p.y,
                color: this.colorInput.value,
                size: Number(this.sizeInput.value),
                fill: this.fillInput.checked,
                points: [p],
            };
        });

        canvas.addEventListener("pointermove", event => {
            const current = this.state.current;
            if (!current) return;
            const p = this.canvasPos(event);
            current.x2 = p.x;
            current.y2 = p.y;
            if (current.type === "free") current.points.push(p);
            this.redraw();
        });

        canvas.addEventListener("pointerup", () => this.finishShape());
        canvas.addEventListener("pointercancel", () => { this.state.current = null; this.redraw(); });
    }

    finishShape() {
        const s = this.state.current;
        if (!s) return;
        this.state.current = null;

        // Ignore simple clicks that would create an invisible shape.
        const tooSmall = s.type === "free" ? s.points.length < 2 : Math.hypot(s.x2 - s.x1, s.y2 - s.y1) < 4;
        if (tooSmall) { this.redraw(); return; }

        this.state.shapes.push(s);
        this.redraw();
        if (this.state.challenge) this.scoreAttempt(s);
    }

    // ---------------------------------------------------------------
    // Toolbar and keyboard
    // ---------------------------------------------------------------

    selectTool(tool) {
        this.state.tool = tool;
        this.root.querySelectorAll("[data-tool]").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.tool === tool);
        });
    }

    undo() {
        if (this.state.challenge) return;
        this.state.shapes.pop();
        this.redraw();
    }

    clearBoard() {
        if (this.state.challenge) return;
        this.state.shapes = [];
        this.redraw();
    }

    #onKeyDown(event) {
        if (event.target.tagName === "INPUT" && event.target.type !== "checkbox") return;
        const key = event.key.toLowerCase();
        const ctrl = event.ctrlKey || event.metaKey;
        if (ctrl && key === "z") {
            event.preventDefault();
            this.undo();
        } else if (ctrl || event.altKey) {
            return;// leave Ctrl+C & co. alone
        } else if (event.key >= "1" && event.key <= "6" && !this.state.challenge) {
            this.selectTool(ShapePainterDemo.TOOLS[Number(event.key) - 1]);
        } else if (key === "f") {
            this.fillInput.checked = !this.fillInput.checked;
        } else if (key === "c") {
            this.clearBoard();
        }
    }

    // ---------------------------------------------------------------
    // Challenge mode
    // ---------------------------------------------------------------

    static #randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    randomTarget() {
        const rnd = ShapePainterDemo.#randomBetween;
        const shapes = ShapePainterDemo.CHALLENGE_SHAPES;
        const type = shapes[Math.floor(Math.random() * shapes.length)];
        const base = { type, color: "#888", size: 3, fill: false, points: [] };
        const { width, height } = this.canvas;

        if (type === "circle" || type === "star") {
            const r = rnd(50, 150);
            const cx = rnd(r + 10, width - r - 10);
            const cy = rnd(r + 10, height - r - 10);
            return { ...base, x1: cx, y1: cy, x2: cx + r, y2: cy };
        }
        const w = rnd(100, 350);
        const h = rnd(80, 300);
        const x = rnd(10, width - w - 10);
        const y = rnd(10, height - h - 10);
        return { ...base, x1: x, y1: y, x2: x + w, y2: y + h };
    }

    // "Intersection over union" of two boxes: 1 = identical, 0 = no overlap.
    static overlap(a, b) {
        const ix = Math.max(0, Math.min(a.left + a.w, b.left + b.w) - Math.max(a.left, b.left));
        const iy = Math.max(0, Math.min(a.top + a.h, b.top + b.h) - Math.max(a.top, b.top));
        const inter = ix * iy;
        const union = a.w * a.h + b.w * b.h - inter;
        return union > 0 ? inter / union : 0;
    }

    startChallenge() {
        this.state.challenge = { round: 0, score: 0, target: null, savedShapes: this.state.shapes, waiting: false };
        this.state.shapes = [];
        this.challengeBtn.textContent = "Stop challenge";
        this.challengeBtn.classList.add("active");
        this.nextRound();
    }

    nextRound() {
        const c = this.state.challenge;
        c.round++;
        c.waiting = false;
        c.target = this.randomTarget();
        this.state.shapes = [];
        this.selectTool(c.target.type);
        this.statusEl.innerHTML = `Round ${c.round}/${ShapePainterDemo.ROUNDS}: trace the <b>${c.target.type}</b>! (score: ${c.score})`;
        this.redraw();
    }

    scoreAttempt(shape) {
        const c = this.state.challenge;
        const points = Math.round(ShapePainterDemo.overlap(ShapePainterDemo.box(shape), ShapePainterDemo.box(c.target)) * 100);
        c.score += points;
        c.waiting = true;

        const verdict = points >= 90 ? "Perfect!" : points >= 70 ? "Great!" : points >= 40 ? "Not bad." : "Keep practicing.";
        this.statusEl.innerHTML = `${verdict} <b>+${points}</b> points (total: ${c.score})`;

        this.#roundTimer = setTimeout(() => {
            if (this.state.challenge !== c) return; // challenge was stopped meanwhile
            if (c.round >= ShapePainterDemo.ROUNDS) this.endChallenge(false);
            else this.nextRound();
        }, 1200);
    }

    endChallenge(stoppedEarly) {
        const c = this.state.challenge;
        clearTimeout(this.#roundTimer);
        this.state.challenge = null;
        this.state.shapes = c.savedShapes;
        this.challengeBtn.textContent = "Start challenge";
        this.challengeBtn.classList.remove("active");

        if (stoppedEarly) {
            this.statusEl.textContent = "Challenge stopped. Back to free drawing.";
        } else {
            const max = ShapePainterDemo.ROUNDS * 100;
            let best = 0;
            try { best = Number(localStorage.getItem(ShapePainterDemo.BEST_STORAGE_KEY)) || 0; } catch (e) { /* storage blocked */ }
            const isRecord = c.score > best;
            if (isRecord) {
                try { localStorage.setItem(ShapePainterDemo.BEST_STORAGE_KEY, c.score); } catch (e) { /* ignore */ }
            }
            this.statusEl.innerHTML = isRecord
                ? `Finished! <b>${c.score}</b>/${max}: new best score!`
                : `Finished! <b>${c.score}</b>/${max} (best: ${best})`;
        }
        this.redraw();
    }
}
