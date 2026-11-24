/**
 * Draws the objects of BallsPhysics in 3D with three.js (global `THREE`, bundled from
 * `utils/external_libs/three.js` by JSProvider because this file uses it).
 * Like BallsSvgRenderer, a mesh is created once per Ball and then only moved.
 *
 * The world's (x, y) maps to three's (x, -y, 0) (three's y points up). The perspective camera
 * looks straight at the z = 0 plane from a distance chosen so that plane fills exactly
 * width x height: a click maps to world coordinates the same way as on the 2D canvas/svg,
 * while the lighting and the shadows on the wall behind the balls show the depth.
 */
class BallsThreeRenderer {
    static CAMERA_DISTANCE = 600;
    /** z of the back wall: behind the biggest ball (radius 30), so it can catch the shadows */
    static WALL_Z = -40;

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {number} width world width
     * @param {number} height world height
     */
    constructor(canvas, width, height) {
        this.canvas = canvas;
        /** Ball -> THREE.Mesh already created */
        this.elements = new WeakMap();
        /** css color -> THREE.MeshStandardMaterial, shared by the balls of the same color */
        this.materials = new Map();

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio || 1);
        this.renderer.setSize(width, height, false);// false: the css keeps sizing it like the other views
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        canvas.style.width = `${width}px`;// the width/height attributes are now multiplied by devicePixelRatio

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color("#ffffff");

        const distance = BallsThreeRenderer.CAMERA_DISTANCE;
        const fov = THREE.MathUtils.radToDeg(2 * Math.atan((height / 2) / distance));
        this.camera = new THREE.PerspectiveCamera(fov, width / height, 1, distance * 3);
        this.camera.position.set(width / 2, -height / 2, distance);
        this.camera.lookAt(width / 2, -height / 2, 0);

        // back wall, bigger than the frame since it's farther than the z = 0 plane
        const wall = new THREE.Mesh(
            new THREE.PlaneGeometry(width * 2, height * 2),
            new THREE.MeshStandardMaterial({ color: "#f2f2f2" })
        );
        wall.position.set(width / 2, -height / 2, BallsThreeRenderer.WALL_Z);
        wall.receiveShadow = true;
        this.scene.add(wall);

        this.scene.add(new THREE.HemisphereLight("#ffffff", "#888888", 1.2));
        const light = new THREE.DirectionalLight("#ffffff", 2);
        light.position.set(width * 0.25, 150, 350);// top left, in front
        light.target.position.set(width / 2, -height / 2, 0);
        light.castShadow = true;
        light.shadow.mapSize.set(1024, 1024);
        Object.assign(light.shadow.camera, { left: -width, right: width, top: height, bottom: -height, near: 1, far: 1500 });
        this.scene.add(light, light.target);

        this.balls = new THREE.Group();
        this.scene.add(this.balls);
        this.sphere = new THREE.SphereGeometry(1, 32, 16);// unit sphere, scaled by each ball's radius
    }

    renderAll(objects) {
        objects.forEach(o => this.#place(o));
        this.renderer.render(this.scene, this.camera);
    }

    // instanceof, not `object.constructor.name`: the minifier mangles the class names inside BallsPhysics
    #place(object) {
        if (object instanceof BallsPhysics.Ball) {
            let mesh = this.elements.get(object);
            if (!mesh) {
                mesh = new THREE.Mesh(this.sphere, this.#material(object.color));
                mesh.castShadow = true;
                this.balls.add(mesh);
                this.elements.set(object, mesh);
            }
            mesh.scale.setScalar(object.radius);
            mesh.position.set(object.position.x, -object.position.y, 0);
        } else {
            console.warn("BallsThreeRenderer: don't know how to draw", object);
        }
    }

    #material(color) {
        let material = this.materials.get(color);
        if (!material) {
            material = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 });
            this.materials.set(color, material);
        }
        return material;
    }

    // Removes every ball from the scene (for the reset).
    clear() {
        this.balls.clear();
        this.elements = new WeakMap();
    }

    // Frees the GPU resources; the webview allows only a few live WebGL contexts, so release it right away.
    dispose() {
        this.clear();
        this.scene.traverse(node => {
            if (node.isMesh && node.geometry !== this.sphere) {
                node.geometry.dispose();
                node.material.dispose();
            }
        });
        this.sphere.dispose();
        this.materials.forEach(material => material.dispose());
        this.materials.clear();
        this.renderer.dispose();
        this.renderer.forceContextLoss();
    }
}
