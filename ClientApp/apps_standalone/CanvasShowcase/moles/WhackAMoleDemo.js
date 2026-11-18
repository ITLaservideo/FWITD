/*
  Migrated from AlwaysLearn/JavaScript/0_testing.js/moles (16_moles.js), exam exercise 2018_6_25:

  Implementare il gioco "caccia alle talpe". Il gioco prevede una griglia di lato N dove si alternano casualmente erba, la
  testa di una talpa, il fondoschiena di una talpa. Se il giocatore clicca l'erba non succede nulla, se clicca la testa di una
  talpa ottiene 100 punti, se clicca il fondoschiena ne perde 200. Il gioco termina se il punteggio scende sotto 0 punti,
  segnalando al giocatore che ha perso, o se sale oltre i 1000 punti, segnalando al giocatore che ha vinto. Il punteggio
  deve essere sempre visibile.

  Upgrades over the first version:
  - moles pop up one at a time and stay for a limited time (the whole grid doesn't change every second)
  - a hit mole goes back underground: no infinite points by clicking the same head
  - a real game over: timers and clicks stop
  - growing difficulty: the more points you have, the faster the moles
  - "+100" / "-200" feedback, progress bar, play again button, best time saved
  - images are SVG sprites (MolesSprites) instead of PNGs
*/

/**
 * Whack-a-mole on an N x N grid. Mount with `new WhackAMoleDemo(container)`, unmount with `destroy()`.
 */
class WhackAMoleDemo {
    static WIN_SCORE = 1000;   // wins when it goes ABOVE 1000
    static LOSE_SCORE = 0;     // loses when it goes BELOW 0
    static HEAD_CHANCE = 0.65; // chance of a head popping up instead of a rear
    static RECORD_STORAGE_KEY = "talpaRecord";

    /**
     * cell type -> sprite and points.
     * A getter, not a static field: the page's files are concatenated in no guaranteed order,
     * so MolesSprites may not be defined yet when this class is
     */
    static get SYMBOLS() {
        return WhackAMoleDemo.#symbols ??= {
            grass: { img: MolesSprites.grass, points: 0 },
            head: { img: MolesSprites.head, points: 100 },
            rear: { img: MolesSprites.rear, points: -200 },
        };
    }
    static #symbols = null;

    score = 0;
    running = false;
    spawnTimer = null;
    startTime = 0;
    /** @type {Array<{img: HTMLImageElement, wrapper: HTMLElement, type: string, hideTimer: number|null, flashTimer: number|null}>} */
    cells = [];

    /**
     * @param {HTMLElement} container
     * @param {Object} [options]
     * @param {number} [options.size=4] grid side N (was the `size` attribute of the original <script> tag)
     */
    constructor(container, options = {}) {
        let n = parseInt(options.size);
        if (isNaN(n) || n < 2) { n = 4; }
        this.N = n;

        this.root = document.createElement("div");
        this.root.className = "cs-demo cs-moles";
        this.root.innerHTML = `
            <div class="cs-moles-header">
                <h1 data-ref="score"></h1>
                <progress data-ref="progress" max="${WhackAMoleDemo.WIN_SCORE}" value="0"></progress>
                <p data-ref="message">Hit the heads (+100), avoid the rears (-200). Get above ${WhackAMoleDemo.WIN_SCORE}!</p>
                <button data-ref="start">Start</button>
            </div>
            <div class="cs-moles-grid" data-ref="grid"></div>
        `;
        const ref = (name) => this.root.querySelector(`[data-ref="${name}"]`);
        this.h1 = ref("score");
        this.progressBar = ref("progress");
        this.message = ref("message");
        this.startButton = ref("start");
        this.grid = ref("grid");
        this.grid.style.gridTemplateColumns = `repeat(${this.N}, 1fr)`;

        for (let i = 0; i < this.N * this.N; i++) {
            this.cells.push(this.createCell());
        }
        this.updateScore();

        this.startButton.addEventListener("click", () => {
            this.h1.classList.remove("win", "lose");
            this.start();
        });

        container.appendChild(this.root);
    }

    destroy() {
        this.running = false;
        clearTimeout(this.spawnTimer);
        this.cells.forEach(cell => {
            clearTimeout(cell.hideTimer);
            clearTimeout(cell.flashTimer);
        });
        this.root.remove();
    }

    // ---------------------------------------------------------------
    // Cells
    // ---------------------------------------------------------------

    createCell() {
        const wrapper = document.createElement("div");
        wrapper.className = "cs-moles-cell";
        const img = document.createElement("img");
        img.src = WhackAMoleDemo.SYMBOLS.grass.img;
        img.draggable = false;
        img.alt = "";
        wrapper.appendChild(img);
        this.grid.appendChild(wrapper);

        const cell = { img, wrapper, type: "grass", hideTimer: null, flashTimer: null };
        // pointerdown instead of click: reacts immediately (mouse and touch), fairer in a reflex game
        wrapper.addEventListener("pointerdown", () => this.hit(cell));
        return cell;
    }

    setType(cell, type) {
        cell.type = type;
        cell.img.src = WhackAMoleDemo.SYMBOLS[type].img;
        cell.wrapper.classList.toggle("up", type !== "grass");
    }

    hide(cell) {
        clearTimeout(cell.hideTimer);
        this.setType(cell, "grass");
    }

    updateScore() {
        this.h1.textContent = "score: " + this.score;
        this.progressBar.value = Math.max(0, this.score);
    }

    // ---------------------------------------------------------------
    // Game logic
    // ---------------------------------------------------------------

    /** 0 at the start, 1 close to winning */
    difficulty() {
        return Math.min(Math.max(this.score / WhackAMoleDemo.WIN_SCORE, 0), 1);
    }

    spawnMole() {
        if (!this.running) return;

        const free = this.cells.filter(c => c.type === "grass");
        if (free.length > 0) {
            const cell = free[Math.floor(Math.random() * free.length)];
            const type = Math.random() < WhackAMoleDemo.HEAD_CHANCE ? "head" : "rear";
            this.setType(cell, type);
            const duration = 1500 - 800 * this.difficulty();     // from 1.5s to 0.7s
            cell.hideTimer = setTimeout(() => this.hide(cell), duration);
        }

        const next = 800 - 450 * this.difficulty();              // from 0.8s to 0.35s
        this.spawnTimer = setTimeout(() => this.spawnMole(), next);
    }

    hit(cell) {
        if (!this.running || cell.type === "grass") return;      // grass does nothing

        const points = WhackAMoleDemo.SYMBOLS[cell.type].points;
        this.score += points;
        this.showPoints(cell, points);
        cell.wrapper.classList.add(points > 0 ? "hit-good" : "hit-bad");
        clearTimeout(cell.flashTimer);
        cell.flashTimer = setTimeout(() => cell.wrapper.classList.remove("hit-good", "hit-bad"), 250);
        this.hide(cell);   // hit: back underground
        this.updateScore();

        if (this.score < WhackAMoleDemo.LOSE_SCORE) this.end(false);
        else if (this.score > WhackAMoleDemo.WIN_SCORE) this.end(true);
    }

    showPoints(cell, points) {
        const label = document.createElement("span");
        label.className = "cs-moles-points " + (points > 0 ? "good" : "bad");
        label.textContent = (points > 0 ? "+" : "") + points;
        cell.wrapper.appendChild(label);
        label.addEventListener("animationend", () => label.remove());
    }

    start() {
        this.score = 0;
        this.updateScore();
        this.cells.forEach(cell => this.hide(cell));
        this.running = true;
        this.startTime = performance.now();
        this.message.textContent = "Go!";
        this.startButton.hidden = true;
        this.grid.classList.remove("over");
        this.spawnMole();
    }

    end(won) {
        this.running = false;
        clearTimeout(this.spawnTimer);
        this.cells.forEach(cell => this.hide(cell));
        this.grid.classList.add("over");

        const seconds = (performance.now() - this.startTime) / 1000;
        if (won) {
            const record = this.readRecord();
            const isNewRecord = record === null || seconds < record;
            if (isNewRecord) this.saveRecord(seconds);
            this.message.innerHTML = `<b>you won</b> in ${seconds.toFixed(1)} seconds! ` +
                (isNewRecord ? "New record!" : `(record: ${record.toFixed(1)} s)`);
            this.h1.classList.add("win");
        } else {
            this.message.innerHTML = `<b>you lost</b>: the score went below ${WhackAMoleDemo.LOSE_SCORE}.`;
            this.h1.classList.add("lose");
        }
        this.startButton.textContent = "Play again";
        this.startButton.hidden = false;
    }

    // best time to win (localStorage can be blocked: try/catch)
    readRecord() {
        try {
            const value = parseFloat(localStorage.getItem(WhackAMoleDemo.RECORD_STORAGE_KEY));
            return isNaN(value) ? null : value;
        } catch (e) {
            return null;
        }
    }
    saveRecord(seconds) {
        try { localStorage.setItem(WhackAMoleDemo.RECORD_STORAGE_KEY, seconds); } catch (e) { /* ignore */ }
    }
}
