/**
 * Draws the objects of BallsPhysics inside an <svg> (migrated from 19_svg_renderer.js).
 * Unlike the canvas, SVG is made of DOM elements: instead of redrawing everything every frame,
 * a <circle> is created once per Ball and then only its attributes are updated.
 */
class BallsSvgRenderer {
    static SVG_NS = "http://www.w3.org/2000/svg";

    /** @param {SVGSVGElement} svg */
    constructor(svg) {
        this.svg = svg;
        /** Ball -> <circle> already created */
        this.elements = new WeakMap();
    }

    renderAll(objects) {
        objects.forEach(o => this.render(o));
    }

    // instanceof, not `object.constructor.name`: the minifier mangles the class names inside BallsPhysics
    render(object) {
        if (object instanceof BallsPhysics.Ball) {
            let svgBuffer = this.elements.get(object);
            if (!svgBuffer) {
                svgBuffer = document.createElementNS(BallsSvgRenderer.SVG_NS, "circle");
                svgBuffer.setAttribute("stroke", "black");
                svgBuffer.setAttribute("fill", object.color);
                this.svg.appendChild(svgBuffer);
                this.elements.set(object, svgBuffer);
            }
            svgBuffer.setAttribute("r", object.radius);
            svgBuffer.setAttribute("cx", object.position.x);
            svgBuffer.setAttribute("cy", object.position.y);
        } else {
            console.warn("BallsSvgRenderer: don't know how to draw", object);
        }
    }

    // Removes every circle from the svg (for the reset).
    clear() {
        this.svg.replaceChildren();
        this.elements = new WeakMap();
    }
}
