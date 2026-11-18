/**
 * 2D physics library: Vector, Ball, World (migrated from AlwaysLearn/JavaScript/0_testing.js/balls, 19_libreria_fisiche.js).
 * It doesn't draw anything: rendering is done by BouncingBallsDemo (canvas) and BallsSvgRenderer (svg).
 * Wrapped in a namespace because every file of the page ends up in the same global script.
 */
const BallsPhysics = (() => {
    function typeName(type) {
        return typeof type === "string" ? type : type.name;
    }

    function checkType(what, type) {
        const ok = typeof type === "string"
            ? typeof what === type           // primitive types: "number", "string", ...
            : what instanceof type;          // classes: Vector, Ball, ...
        if (!ok) {
            throw new TypeError("this is NoT of type: " + typeName(type) + " (got " + what + ")");
        }
    }

    class Vector {
        x = 0;
        y = 0;
        constructor(x, y) {
            if (x) { this.x = x; }//undefined = false
            if (y) { this.y = y; }//NaN = false
        }
        // set(otherVector) or set(x, y)
        set(pointOrX, y) {
            if (pointOrX instanceof Vector) {
                this.x = pointOrX.x;
                this.y = pointOrX.y;
            } else {
                checkType(pointOrX, "number");
                checkType(y, "number");
                this.x = pointOrX;
                this.y = y;
            }
            return this;    //java-like chaining
        }
        add(displacement) {
            checkType(displacement, Vector);
            this.x += displacement.x;
            this.y += displacement.y;
            return this;
        }
        sub(displacement) {
            checkType(displacement, Vector);
            this.x -= displacement.x;
            this.y -= displacement.y;
            return this;
        }
        mul(scale) {
            checkType(scale, "number");
            this.x *= scale;
            this.y *= scale;
            return this;
        }
        dot(v) {
            checkType(v, Vector);
            return this.x * v.x + this.y * v.y;
        }
        clone() {
            return new Vector(this.x, this.y);
        }
        // length 1, same direction
        normalize() {
            const length = this.len();
            if (length > 0) {
                this.mul(1 / length);
            }
            return this;
        }
        len() {
            return Math.sqrt(this.squaredLen());
        }
        squaredLen() {
            return this.x * this.x + this.y * this.y;
        }
        distance(v) {
            checkType(v, Vector);
            return Math.sqrt(this.squaredDistance(v));
        }
        squaredDistance(v) {
            checkType(v, Vector);
            return (this.x - v.x) * (this.x - v.x) + (this.y - v.y) * (this.y - v.y);
        }
        toString() {
            return "Vector: ( " + this.x + ", " + this.y + " )";
        }
    }

    // A ball: position and velocity are Vectors (pixels and pixels/second).
    class Ball {
        constructor(position, velocity, radius, color = "tomato") {
            checkType(position, Vector);
            checkType(velocity, Vector);
            checkType(radius, "number");
            this.position = position;
            this.velocity = velocity;
            this.radius = radius;
            this.color = color;
        }
        // the bigger, the heavier (circle area, without PI)
        get mass() {
            return this.radius * this.radius;
        }
        update(dt, gravity) {
            this.velocity.add(gravity.clone().mul(dt));          // v = v + g * dt
            this.position.add(this.velocity.clone().mul(dt));    // p = p + v * dt
        }
    }

    // The "world": holds the balls, applies gravity, bounces on the walls and between balls.
    class World {
        gravity = new Vector(0, 600);   // downwards
        bounce = 0.85;                  // 1 = perfect bounce, 0 = no bounce
        floorFriction = 0.99;
        balls = [];

        constructor(width, height) {
            checkType(width, "number");
            checkType(height, "number");
            this.width = width;
            this.height = height;
        }
        add(ball) {
            checkType(ball, Ball);
            this.balls.push(ball);
            return this;
        }
        clear() {
            this.balls = [];
        }
        step(dt) {
            this.balls.forEach(b => b.update(dt, this.gravity));
            // every pair only once
            for (let i = 0; i < this.balls.length; i++) {
                for (let j = i + 1; j < this.balls.length; j++) {
                    this.collide(this.balls[i], this.balls[j]);
                }
            }
            this.balls.forEach(b => this.bounceOnWalls(b));
        }
        bounceOnWalls(ball) {
            const p = ball.position, v = ball.velocity, r = ball.radius;
            if (p.x - r < 0) { p.x = r; v.x = Math.abs(v.x) * this.bounce; }
            if (p.x + r > this.width) { p.x = this.width - r; v.x = -Math.abs(v.x) * this.bounce; }
            if (p.y - r < 0) { p.y = r; v.y = Math.abs(v.y) * this.bounce; }
            if (p.y + r > this.height) {
                p.y = this.height - r;
                v.y = -Math.abs(v.y) * this.bounce;
                v.x *= this.floorFriction;
            }
        }
        // Elastic collision between two balls (with energy loss = bounce).
        collide(a, b) {
            const delta = b.position.clone().sub(a.position);
            const dist = delta.len();
            const minDist = a.radius + b.radius;
            if (dist === 0 || dist >= minDist) return;   // not touching

            const normal = delta.mul(1 / dist);          // direction from a to b, length 1
            const totalMass = a.mass + b.mass;

            // 1) push them apart so they don't stay overlapped (the lighter one moves more)
            const overlap = minDist - dist;
            a.position.sub(normal.clone().mul(overlap * b.mass / totalMass));
            b.position.add(normal.clone().mul(overlap * a.mass / totalMass));

            // 2) if they're getting closer, exchange momentum along the normal
            const approachSpeed = b.velocity.clone().sub(a.velocity).dot(normal);
            if (approachSpeed > 0) return;               // already moving apart
            const impulse = -(1 + this.bounce) * approachSpeed / (1 / a.mass + 1 / b.mass);
            a.velocity.sub(normal.clone().mul(impulse / a.mass));
            b.velocity.add(normal.clone().mul(impulse / b.mass));
        }
    }

    // small test of the Vector class (see the browser console)
    function selfTest() {
        const v1 = new Vector(10, 10);
        const v2 = new Vector();             //undefined = false -> (0, 0)
        const v3 = new Vector(0 / 0, 0 / 0); //NaN = false -> (0, 0)
        v2.set(20, 20).add(new Vector(10, 10));   // chaining -> (30, 30)
        console.log(v1.toString(), v2.toString(), v3.toString());
        console.log("distance v1-v2:", v1.distance(v2), "| v2 normalized:", v2.clone().normalize().toString());
    }

    return Object.freeze({ Vector, Ball, World, selfTest });
})();
