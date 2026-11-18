/**
 * Runs the BallsPhysics simulation and draws the same World both on a <canvas> and on an <svg>
 * (migrated from AlwaysLearn/JavaScript/0_testing.js/balls, 19_eseguibile.js).
 * Mount with `new BouncingBallsDemo(container)`, unmount with `destroy()`.
 *
 * Click = new ball · R = reset · Space = flip gravity (keys work while the demo has focus)
 */
class BouncingBallsDemo {
    static WIDTH = 500;
    static HEIGHT = 300;
    static COLORS = ["tomato", "gold", "mediumseagreen", "dodgerblue", "orchid", "orange"];

    #rafId = 0;
    #lastTime = null;

    /** @param {HTMLElement} container */
    constructor(container) {
        if (typeof debug !== "undefined" && debug) {
            BallsPhysics.selfTest();
        }
        const { WIDTH, HEIGHT } = BouncingBallsDemo;

        this.root = document.createElement("div");
        this.root.className = "cs-demo cs-balls";
        this.root.tabIndex = -1;// focusable, so the keys reach only this demo
        this.root.innerHTML = `
            <div class="cs-balls-views">
                <div>
                    <h3>Canvas</h3>
                    <canvas data-ref="canvas" width="${WIDTH}" height="${HEIGHT}"></canvas>
                </div>
                <div>
                    <h3>SVG (same world)</h3>
                    <svg data-ref="svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg"></svg>
                </div>
            </div>
        `;
        this.canvas = this.root.querySelector('[data-ref="canvas"]');
        this.g = this.canvas.getContext("2d");
        this.svgRenderer = new BallsSvgRenderer(this.root.querySelector('[data-ref="svg"]'));
        this.world = new BallsPhysics.World(WIDTH, HEIGHT);

        // click on the canvas or on the svg = new ball at that point
        const addBallAtClick = (event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const x = (event.clientX - rect.left) * (WIDTH / rect.width);
            const y = (event.clientY - rect.top) * (HEIGHT / rect.height);
            this.addRandomBall(x, y);
        };
        this.canvas.addEventListener("click", addBallAtClick);
        this.svgRenderer.svg.addEventListener("click", addBallAtClick);

        this.root.addEventListener("keydown", event => {
            if (event.key === "r" || event.key === "R") this.reset();
            if (event.key === " ") {
                event.preventDefault();
                this.world.gravity.mul(-1);// space = flip gravity
            }
        });

        container.appendChild(this.root);
        this.root.focus({ preventScroll: true });

        this.reset();
        this.#rafId = requestAnimationFrame(time => this.#loop(time));
    }

    destroy() {
        cancelAnimationFrame(this.#rafId);
        this.#rafId = 0;
        this.root.remove();
    }

    static #randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    addRandomBall(x, y) {
        const rnd = BouncingBallsDemo.#randomBetween;
        const { WIDTH, HEIGHT, COLORS } = BouncingBallsDemo;
        const radius = rnd(10, 30);
        const position = new BallsPhysics.Vector(x ?? rnd(radius, WIDTH - radius),
                                                 y ?? rnd(radius, HEIGHT / 2));
        const velocity = new BallsPhysics.Vector(rnd(-250, 250), rnd(-200, 0));
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.world.add(new BallsPhysics.Ball(position, velocity, radius, color));
    }

    reset() {
        this.world.clear();
        this.svgRenderer.clear();
        for (let i = 0; i < 8; i++) this.addRandomBall();
    }

    drawCanvas() {
        const g = this.g;
        g.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.world.balls.forEach(ball => {
            g.beginPath();
            g.arc(ball.position.x, ball.position.y, ball.radius, 0, Math.PI * 2);
            g.fillStyle = ball.color;
            g.fill();
            g.strokeStyle = "black";
            g.stroke();
        });
    }

    #loop(time) {
        if (!this.#rafId) return;// destroyed
        // dt in seconds; capped so the balls don't "jump" when the tab stays in background
        const dt = this.#lastTime === null ? 0 : Math.min((time - this.#lastTime) / 1000, 1 / 30);
        this.#lastTime = time;

        this.world.step(dt);
        this.drawCanvas();
        this.svgRenderer.renderAll(this.world.balls);
        this.#rafId = requestAnimationFrame(t => this.#loop(t));
    }
}
