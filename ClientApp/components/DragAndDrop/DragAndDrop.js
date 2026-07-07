if (window.configurations == undefined) {
    window.configurations = {};
}
window.configurations.debug_dand = true;
class DoubleClickBehaviour {
    static double_click_status = {
        /**
         * @type Element
         */
        last_target: null,
        /**
         * @type Date
         */
        last_click: new Date()
    };
    static trigger() {
        const now = new Date();
        if (now - DoubleClickBehaviour.double_click_status.last_click > 500) {
            DoubleClickBehaviour.double_click_status.last_click = new Date();
            if (window.configurations.debug_dand) {
                new Notify({
                    text: "NOT DCLICK LP " + new Date().getMilliseconds(),
                    event: { clientX: 750, clientY: 50 },
                    ms_timeout: 2000,
                    style: 3,
                    type: 1
                });
            }
            return false;
        }
        DoubleClickBehaviour.double_click_status.last_click = new Date(new Date() - 1000);
        if (window.configurations.debug_dand) {
            new Notify({
                text: "DOUBLE CLICK LP " + new Date().getMilliseconds(),
                event: { clientX: 750, clientY: 75 },
                ms_timeout: 2000,
                style: 3,
                type: 0
            });
        }
        return true;
    }
}
class DragAndDrop {
    static template_src = {}
    static #dragging = false;
    static #lastTargetIDHovered;
    static #targetIDGrabbed;
    static #preview_visible = false;
    static #html_placeholder;
    static #group_id_drag_in_progress;
    static #preview_img;
    static #drop_animation = false;
    static #mainStatus = {
        dragging: {
            options: null,
            last_valid_target_hovered: null,
            last_event_listener_added_on_body_moveElement: null,
            start_drag_date: null
        }
    }
    /**
     * Number
     */
    static #offset_preview = 0;
    /**
     * Number
     */
    static #offset_top = 50;
    /**
     * Number
     */
    static #offset_left = 50;
    static #styles = {
        0: 'style-aim',
        1: 'style-glow'
    }
    static isReceiver(target) {
        return target.getAttribute("d_a_d_c_is_receiver") != "false";
    }
    /**
     * @type Element
     */
    static #self_ref;
    /**
     * @asyncReturn #group_id
     * @param {Object} options
     * @param {Element} options.target
     * @param {Element} [options.target_to_grab]
     * @param {boolean} [options.is_receiver=true]
     * @param {string} [options.group_id]
     * @param {string} [options.img_src]
     * @param {Object} [options.img_offset]
     * @param {Number} [options.img_offset.x]
     * @param {Number} [options.img_offset.y]
     * @param {Number} [options.img_style] (int) 0-1
     * @param {Function} [options.onDragStart] (target)
     * @param {Number} [options.onDragEnd] (target)
     * @param {Function} [options.onDrop] (start_id, end_id, event)
     * @param {Function} [options.doClick] callback when dropping on itself //within 200ms
     * @param {Function} [options.onDropSameContainer] callback when dropping on itself //after 200ms
     * @param {Function} [options.onMouseEnter] (target)
     * @param {Function} [options.onMouseLeave] (target) 
     * @deprecated
     * @param {Object} [options.img_size] (target)
     * @param {Number} [options.img_size.width] (target)
     * @param {Number} [options.img_size.height] (target)
     */
    static makeItDraggable(options) {
        console.assert(options.onDrop != undefined, "on drop not provided\nthe drop is triggered by the one who is getting dragged");
        return new Promise(async (resolve, reject) => {
            const is_receiver = options.is_receiver ?? true;
            if (!is_receiver) {
                options.target.setAttribute("d_a_d_c_is_receiver", "false");
            }
            if (options.group_id == undefined) {
                options.group_id = UiBuilder.newAttributeId("drag_and_drop_collection_compatibility");
            }
            options.target.setAttribute("drag_and_drop_collection_compatibility", `${options.group_id}`)
            const target_to_grab = options.target_to_grab ?? options.target;
            target_to_grab.setAttribute("draggable", "false");
            if (target_to_grab.id == "") {
                console.warn("drag and drop requires an id to the element to grab\n auto-assigning an id");
                target_to_grab.id = UiBuilder.newId("danddaaID");
            }
            if (options.target.id == "") {
                console.warn("drag and drop requires an id to the target\n auto-assigning an id");
                options.target.id = UiBuilder.newId("danddaaID");
            }
            if (options.img_src != undefined) {
                DragAndDrop.template_src[target_to_grab.id] = options.img_src;
            } else {
                DragAndDrop.template_src[target_to_grab.id] = "Icons/inventory.svg";
            }
            //DragAndDrop.coordinates;
            const moveElement = (event) => {
                //let x = (DragAndDrop.coordinates.x - event.screenX);
                //let y = (DragAndDrop.coordinates.y - event.screenY);
                const mock_event = {
                    target: event.target
                };
                DragAndDrop.#mainStatus.dragging.mock_event = mock_event;
                if (event.type == "touchmove") {
                    event.preventDefault();
                    const touch = event.touches[0];
                    mock_event.clientX = touch.clientX;
                    mock_event.clientY = touch.clientY;
                } else {
                    mock_event.clientX = event.clientX;
                    mock_event.clientY = event.clientY;
                }
                DragAndDrop.#self_ref.style.left = `${mock_event.clientX - DragAndDrop.#offset_left}px`;
                DragAndDrop.#self_ref.style.top = `${mock_event.clientY - DragAndDrop.#offset_top}px`;
                //DragAndDrop.#self_ref.style['transform'] = `translate(${-x}px, ${-y}px)`;
                if (!DragAndDrop.#preview_visible) {
                    DragAndDrop.#preview_visible = true;
                    if (options.refreshImgSrc != undefined) {
                        DragAndDrop.#preview_img.setAttribute("src", options.refreshImgSrc());
                    } else {
                        DragAndDrop.#preview_img.setAttribute("src", DragAndDrop.template_src[options.target.id]);
                    }
                    DragAndDrop.#self_ref.style['display'] = "flex";
                }
                if (event.type == "touchmove") {
                    let some_target = document.elementFromPoint(mock_event.clientX, mock_event.clientY);
                    if (some_target) {
                        let max_iterations = 3;
                        let some_target_found = false;
                        while (max_iterations > 0 && some_target != undefined) {
                            max_iterations--;
                            if (some_target.attributes["drag_and_drop_collection_compatibility"] != undefined) {
                                if (DragAndDrop.#mainStatus.dragging.last_valid_target_hovered == some_target) {
                                    return;
                                }
                                onMouseEnter(some_target);
                                some_target_found = true;
                                break;
                            }
                            some_target = some_target.parentElement;
                        }
                    }
                    return; //can't be a touchmove without moving
                }
                if (event.buttons != 0) { //this is for mouse still dragging
                    return;
                }

                // new Notify({
                //     text: "move element as mouse triggers the end",
                //     event: { clientX: 450, clientY: 450 },
                //     ms_timeout: 2000,
                //     style: 3,
                //     type: 1
                // });
                DragAndDrop.#consumeDragEnd();
                DragAndDrop.#draggingEnded();
                DragAndDrop.#cleanVisualFeedBacks();
            };
            /**
             * 
             * @param {Number} x 
             * @param {Number} y 
             * @param {EventTarget} event_target The read-only target property of the dispatched.
             */
            const onDragStart = (x, y, event_target) => {
                document.body.appendChild(DragAndDrop.#self_ref);
                DragAndDrop.#draggingStarted();
                DragAndDrop.#mainStatus.dragging.options = options;
                DragAndDrop.#group_id_drag_in_progress = options.group_id;
                if (options.img_offset != undefined) {
                    DragAndDrop.#offset_left = options.img_offset.x + DragAndDrop.#offset_preview;
                    DragAndDrop.#offset_top = options.img_offset.y + DragAndDrop.#offset_preview;
                }
                DragAndDrop.#self_ref.style.left = `${x - DragAndDrop.#offset_left}px`;
                DragAndDrop.#self_ref.style.top = `${y - DragAndDrop.#offset_top}px`;
                /*if (DragAndDrop.#self_ref.style['transform'] != '') {
                    const current_transform = DragAndDrop.#self_ref.style['transform'].match(/-?\d+/g).map(Number);
                    DragAndDrop.coordinates = { x: event.screenX - current_transform[0], y: event.screenY - current_transform[1] };
                } else {
                    DragAndDrop.coordinates = { x: event.screenX, y: event.screenY };
                }*/
                DragAndDrop.#targetIDGrabbed = options.target.id;
                options.target.classList.add("DandD-in-progress");
                DragAndDrop.#mainStatus.dragging.last_event_listener_added_on_body_moveElement = moveElement;
                document.body.addEventListener("mousemove", moveElement);
                document.body.addEventListener("touchmove", moveElement);
                if (options.onDragStart != undefined) {
                    options.onDragStart(event_target);
                }
                DragAndDrop.#self_ref.classList.add(DragAndDrop.#styles[options.img_style ?? 0])
                if (options.img_size != undefined) {
                    DragAndDrop.#preview_img.style['width'] = `${options.img_size.width}px`;
                    DragAndDrop.#preview_img.style['height'] = `${options.img_size.height}px`;
                } else {
                    DragAndDrop.#preview_img.style['width'] = '';
                    DragAndDrop.#preview_img.style['height'] = '';
                }
            }
            target_to_grab.addEventListener("mousedown", (event) => {
                if (event.button != 0 || options.target.classList.contains("disabled")) {
                    return;
                }
                onDragStart(event.clientX, event.clientY, event.target);
                if (DoubleClickBehaviour.trigger()) {
                    if (options.onDoubleClick != undefined) {
                        options.onDoubleClick(options.target, event);
                    }
                }
            });

            target_to_grab.addEventListener("touchstart", (event) => {
                event.preventDefault();
                const touch = event.touches[0];
                onDragStart(touch.clientX, touch.clientY, event.target);
                if (DoubleClickBehaviour.trigger()) {
                    if (options.onDoubleClick != undefined) {
                        options.onDoubleClick(options.target, event);
                    }
                }
            });
            // target_to_grab.addEventListener("mouseup", () => {
            //     DragAndDrop.#draggingEnded();
            // });
            const onMouseEnter = (target) => {
                if (!DragAndDrop.isReceiver(target)) {
                    return;
                };
                options.target.id_mouse_enter = requestAnimationFrame(() => {
                    options.target.id_mouse_enter = undefined;
                    if (target.getAttribute("drag_and_drop_collection_compatibility") == DragAndDrop.#group_id_drag_in_progress && DragAndDrop.#group_id_drag_in_progress != undefined) {
                        if (DragAndDrop.#mainStatus.dragging.last_valid_target_hovered != target) {
                            DragAndDrop.#cleanVisualFeedBacks();
                        }
                        DragAndDrop.#mainStatus.dragging.last_valid_target_hovered = target;


                        // new Notify({
                        //     text: "new target settato",
                        //     event: { clientX: (490 + DragAndDrop.inc), clientY: 300 },
                        //     ms_timeout: 2000,
                        //     style: 3,
                        //     type: 1
                        // });
                        DragAndDrop.inc++;
                        DragAndDrop.#lastTargetIDHovered = target.id;
                        //target.classList.add("DandD-can-drop-here");
                        target.classList.toggle("DandD-can-drop-here", true);
                        DragAndDrop.#preview_img.setAttribute("is-droppable", "true");
                        target.style['cursor'] = "url(/Icons/place_item.svg) 15 15, crosshair";
                        options.onMouseEnter?.(target);
                    }
                });
            }
            const onMouseLeave = (target) => {
                if (DragAndDrop.#dragging) {
                    DragAndDrop.#lastTargetIDHovered = undefined;

                    if (options.target.id_mouse_enter != undefined) {
                        const don_t_forget_me = options.target.id_mouse_enter;
                        options.target.id_mouse_enter = undefined;
                        cancelAnimationFrame(don_t_forget_me);
                    } else {
                        requestAnimationFrame(() => {
                            DragAndDrop.#preview_img.removeAttribute("is-droppable");
                            DragAndDrop.#cleanVisualFeedBacks();
                            // target.classList.remove("DandD-can-drop-here");
                            // target.style['cursor'] = '';
                            if (options.onMouseLeave != undefined) {
                                options.onMouseLeave(target);
                            }
                        });
                    }
                }
            }
            options.target.addEventListener("mouseenter", (event) => {
                if (!DragAndDrop.#dragging) {
                    return;
                }
                const target = event.target;
                onMouseEnter(target);
            });
            options.target.addEventListener("mouseleave", (event) => {
                const target = event.target;
                onMouseLeave(target);
            });
            if (options.scroll_while_drag != undefined && !options.scroll_while_drag.target.classList.contains("d-and-d-while-dragging-scroll-too-is-initialized")) {//todo support touch screens also
                /**
                 * @type Element
                 */
                const container = options.scroll_while_drag.target;
                container.classList.toggle("d-and-d-while-dragging-scroll-too-is-initialized", true);
                const rect = container.getBoundingClientRect();
                let interval;
                const scrollContainer = () => {
                    if (window.configurations.debug_dand) {
                        console.warn("are you scrolling the container?")
                    }
                    if (DragAndDrop.#dragging != true || DragAndDrop.scrolling_interval_id != undefined) {
                        return;
                    }
                    if (DragAndDrop.mouseY <= (container.offsetHeight * 0.10)) {
                        container.scrollBy(0, -5);
                    } else if (DragAndDrop.mouseY >= (container.offsetHeight * 0.90)) {
                        container.scrollBy(0, 5);
                    }
                };
                container.addEventListener('mousedown', (event) => {
                    if (event.button === 0) { // Check if left mouse button is pressed
                        clearInterval(interval);
                        interval = setInterval(scrollContainer, 25);
                    }
                });
                container.addEventListener('mousemove', (event) => {
                    DragAndDrop.mouseY = event.clientY - rect.top;
                });
                container.addEventListener('mouseup', () => {
                    clearInterval(interval);
                    interval = undefined;
                });

                container.addEventListener('mouseleave', () => {
                    clearInterval(interval);
                    interval = undefined;
                });
                container.addEventListener('mouseenter', (event) => {
                    if (event.button === 0 && DragAndDrop.#dragging && interval == undefined) { // Check if left mouse button is pressed
                        clearInterval(interval);
                        interval = setInterval(scrollContainer, 25);
                    }
                });
                container.addEventListener('touchstart', (event) => {
                    clearInterval(interval);
                    interval = setInterval(scrollContainer, 25);
                });
                container.addEventListener('touchmove', (event) => {
                    const touch = event.touches[0];
                    DragAndDrop.mouseY = touch.clientY - rect.top;
                });
                container.addEventListener('touchend', () => {
                    clearInterval(interval);
                    interval = undefined;
                });
                /*TBD
                // the drag can end (mouseup/touchend) anywhere in the document, not just
                // while the pointer is still over this container, in which case the
                // container-scoped listeners above never fire and `interval` would keep
                // running forever (and keep `container`/`rect` alive if the container is
                // later removed from the DOM). Make sure it's always cleared when the
                // drag actually ends, mirroring the body-level cleanup used elsewhere in
                // this file (see load()).
                document.body.addEventListener('mouseup', () => {
                    clearInterval(interval);
                    interval = undefined;
                });
                document.body.addEventListener('touchend', () => {
                    clearInterval(interval);
                    interval = undefined;
                });
                document.body.addEventListener('touchcancel', () => {
                    clearInterval(interval);
                    interval = undefined;
                });
                */
            }


            // new Notify({
            //     text: ("drag and drop inizializzato " + new Date().getMilliseconds()),
            //     event: { clientX: (490), clientY: 300 },
            //     ms_timeout: 2000,
            //     style: 3,
            //     type: 1
            // });
            resolve(options.group_id);
        });
    }
    static inc = 0;
    static #consumeDragEnd() {
        const options = DragAndDrop.#mainStatus.dragging.options;
        const last_valid_target_hovered = DragAndDrop.#mainStatus.dragging.last_valid_target_hovered;
        const moveElement = DragAndDrop.#mainStatus.dragging.last_event_listener_added_on_body_moveElement;
        const mock_event = DragAndDrop.#mainStatus.dragging.mock_event;
        if (options == undefined || last_valid_target_hovered == undefined || moveElement == undefined) {
            return;
        }
        if (!DragAndDrop.isReceiver(last_valid_target_hovered)) {
            return;
        };
        if (last_valid_target_hovered == (options.target_to_grab ?? options.target)) {
            try {
                const x = mock_event.clientX;
                const y = mock_event.clientY;
                const rect = options.target.getBoundingClientRect();

                const within_its_bounds =
                    x >= rect.left &&
                    x <= rect.right &&
                    y >= rect.top &&
                    y <= rect.bottom;

                if (within_its_bounds) {
                    // alert("within bounds")
                    options.onDropSameContainer(mock_event);
                } else {
                    // alert("out of bounds")
                }
            } catch (error) { }
            return;
        }
        DragAndDrop.#mainStatus.dragging.options = null;
        DragAndDrop.#mainStatus.dragging.last_valid_target_hovered = null;
        DragAndDrop.#mainStatus.dragging.last_event_listener_added_on_body_moveElement = null;
        DragAndDrop.#mainStatus.dragging.mock_event = null;
        if (options.onDragEnd != undefined) {
            options.onDragEnd(last_valid_target_hovered);
        }
        document.body.removeEventListener("mousemove", moveElement);
        document.body.removeEventListener("touchmove", moveElement);
        // new Notify({
        //     text: "move element removed and consumed " + new Date().getMilliseconds(),
        //     event: { clientX: 350, clientY: 600 },
        //     ms_timeout: 2000,
        //     style: 3,
        //     type: 1
        // });
        if (DragAndDrop.#lastTargetIDHovered != undefined && DragAndDrop.#targetIDGrabbed != undefined && DragAndDrop.#lastTargetIDHovered != DragAndDrop.#targetIDGrabbed) {
            const start_id = DragAndDrop.#targetIDGrabbed;
            const end_id = DragAndDrop.#lastTargetIDHovered;
            setTimeout(() => {
                options.onDrop({ start_id: start_id, end_id: end_id, event: mock_event });
            }, 0);
            DragAndDrop.#targetIDGrabbed = undefined;
            DragAndDrop.#lastTargetIDHovered = undefined;
        }
        setTimeout(() => {
            DragAndDrop.#self_ref.style['transform'] = '';
        }, 0);
    }
    static #cleanVisualFeedBacks() {
        const drop_here_children = document.getElementsByClassName("DandD-can-drop-here");
        const ops = [];
        for (let i = 0; i < drop_here_children.length; i++) {
            const element = drop_here_children[i];
            ops.push(() => {
                element.classList.remove("DandD-can-drop-here");
                element.style['cursor'] = '';
            });
        }
        consumeOps(ops);
    }
    static #draggingStarted() {
        DragAndDrop.#dragging = true;
        window.DragAndDropBusy = true;
        document.body.style['cursor'] = "no-drop;";
        document.body.classList.add("DandD-disable-user-select-important");
        DragAndDrop.#self_ref.className = "drag-and-drop-preview";
        if (DragAndDrop.container_to_scroll_on_drag != undefined) {
            DragAndDrop.container_to_scroll_on_drag.classList.toggle("d-and-d-display-onHoverScroll", true);
        }
        DragAndDrop.#mainStatus.dragging.start_drag_date = new Date();

        // new Notify({
        //     text: "dragging started " + new Date().getMilliseconds(),
        //     event: { clientX: 500, clientY: 500 },
        //     ms_timeout: 2000,
        //     style: 3,
        //     type: 1
        // });
    }
    static #draggingEnded() {
        const dragging_visual_feedback = document.getElementsByClassName("DandD-in-progress");
        const ops = [];
        for (let index = 0; index < dragging_visual_feedback.length; index++) {
            ops.push(() => {
                const element = dragging_visual_feedback[index];
                element.classList.toggle("DandD-in-progress", false);
            });
        }
        try {
            if (new Date() - DragAndDrop.#mainStatus.dragging.start_drag_date < 200) { //less than 200ms
                const options = DragAndDrop.#mainStatus.dragging.options;
                const mock_event = DragAndDrop.#mainStatus.dragging.mock_event;
                const x = mock_event.clientX;
                const y = mock_event.clientY;
                const rect = options.target.getBoundingClientRect();

                const within_its_bounds =
                    x >= rect.left &&
                    x <= rect.right &&
                    y >= rect.top &&
                    y <= rect.bottom;

                if (within_its_bounds) {
                    // alert("within bounds " + window.Locale.parseDateConvertToReadable(DragAndDrop.#mainStatus.dragging.start_drag_date, { tipo: 101 }))
                    options.doClick(mock_event);
                } else {
                    // alert("out of bounds" + window.Locale.parseDateConvertToReadable(DragAndDrop.#mainStatus.dragging.start_drag_date, { tipo: 101 }))
                }
            }
        } catch (error) { }
        DragAndDrop.#dragging = false;
        window.DragAndDropBusy = false;
        DragAndDrop.#group_id_drag_in_progress = undefined;
        DragAndDrop.#preview_visible = false;
        ops.push(() => {
            document.body.classList.remove("DandD-disable-user-select-important");
            DragAndDrop.#self_ref.style['display'] = "";
            DragAndDrop.#self_ref.style['transform'] = '';
        });
        consumeOps(ops);

        // new Notify({
        //     text: "draggingEnded " + new Date().getMilliseconds(),
        //     event: { clientX: 700, clientY: 500 },
        //     ms_timeout: 2000,
        //     style: 3,
        //     type: 1
        // });
        const moveElement = DragAndDrop.#mainStatus.dragging.last_event_listener_added_on_body_moveElement;
        DragAndDrop.#mainStatus.dragging.options = null;
        DragAndDrop.#mainStatus.dragging.last_valid_target_hovered = null;
        DragAndDrop.#mainStatus.dragging.last_event_listener_added_on_body_moveElement = null;
        DragAndDrop.#mainStatus.dragging.mock_event = null;
        DragAndDrop.#targetIDGrabbed = undefined;
        DragAndDrop.#lastTargetIDHovered = undefined;
        document.body.removeEventListener("mousemove", moveElement);
        document.body.removeEventListener("touchmove", moveElement);
    }
    static async load() {
        const tmp_div = document.createElement("div");
        const text_html_localized = Locale.localizeHTML(`${injector_html}`);
        tmp_div.innerHTML = policy.createHTML(text_html_localized);
        DragAndDrop.#html_placeholder = tmp_div.firstElementChild;
        DragAndDrop.#self_ref = (DragAndDrop.#html_placeholder).cloneNode(true);
        DragAndDrop.#preview_img = DragAndDrop.#self_ref.getElementsByClassName("dadp-img")[0];
        setTimeout(() => {
            try {
                const style = getComputedStyle(DragAndDrop.#preview_img);
                DragAndDrop.#offset_preview = (Number(style.getPropertyValue('--gap').match(/[0-9]+/)) + Number(style.getPropertyValue('--offset').match(/[0-9]+/)));
            } catch (error) { }
            if (DragAndDrop.#offset_preview == undefined || DragAndDrop.#offset_preview == NaN) {
                DragAndDrop.#offset_preview = 0;
            }
        }, 0);
        document.body.appendChild(DragAndDrop.#self_ref);

        document.body.addEventListener("mouseup", (event) => {
            DragAndDrop.#consumeDragEnd();
            DragAndDrop.#draggingEnded();
            DragAndDrop.#cleanVisualFeedBacks();
        });

        document.body.addEventListener("touchend", (event) => {
            DragAndDrop.#consumeDragEnd();
            DragAndDrop.#draggingEnded();
            DragAndDrop.#cleanVisualFeedBacks();
        });
        document.body.addEventListener("touchcancel", (event) => {
            DragAndDrop.#draggingEnded();
            DragAndDrop.#cleanVisualFeedBacks();
        });
    }
}
function consumeOps(ops) {
    requestAnimationFrame(() => {
        for (let i = 0; i < ops.length; i++) {
            ops[i]();
        }
    });
}
DragAndDrop.load();
window.DragAndDrop = DragAndDrop;
new Notify({
    text: "drag and drop VERSION 11 -- " + new Date().getMilliseconds(),
    event: { clientX: 450, clientY: 150 },
    ms_timeout: 2000,
    style: 3,
    type: 1
});
