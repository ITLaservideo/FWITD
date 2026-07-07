class MovableUtil {
    static makeItMovable(grabbing_element, who_to_move, has_text = true, reading = {}, onElementMoved = undefined, onMovementEnded = undefined) {
        grabbing_element.style['cursor'] = 'grab';
        const monitor = (e) => {
            MovableUtil.#movingStartFeedback(grabbing_element);
            let coordinates;
            const mock_event = {
                e: e.touches != undefined ? e.touches[0] : e
            };
            if (who_to_move.style['transform'] != '') {
                const current_transform = who_to_move.style['transform'].match(/-?\d+/g).map(Number);
                coordinates = { x: mock_event.e.screenX - current_transform[0], y: mock_event.e.screenY - current_transform[1] };
            } else {
                coordinates = { x: mock_event.e.screenX, y: mock_event.e.screenY };
            }
            const track_move = (event) => {
                const mocking_event = {
                    event: event.touches != undefined ? event.touches[0] : event
                }
                if (who_to_move.executed_mouse_tracking == undefined) {
                    let x = (coordinates.x - mocking_event.event.screenX);
                    x = x - (x % (has_text ? 10 : 1)); // text is blurred otherwise, need to test on different monitors
                    let y = (coordinates.y - mocking_event.event.screenY);
                    y = y - (y % (has_text ? 10 : 1)); // text is blurred otherwise, need to test on different monitors
                    who_to_move.style['transform'] = `translate(${-x}px, ${-y}px)`;
                    who_to_move.executed_mouse_tracking = 'true';
                    reading.diff_x = x;
                    reading.diff_y = y;
                    if (onElementMoved != undefined) {
                        onElementMoved();
                    }
                    setTimeout(() => {
                        who_to_move.executed_mouse_tracking = undefined;
                    }, 15);
                    if (mocking_event.event.buttons == 0 && mocking_event.event.touches == undefined) {
                        action_ended({ button: 0 });
                    }
                }
            }
            const action_ended = (event) => {
                if (event.button != 0 && event.touches != undefined && event.type != "touchend") {
                    return;
                }
                MovableUtil.#movingEndFeedback(grabbing_element);
                document.body.removeEventListener("mouseup", action_ended);
                document.body.removeEventListener("mousemove", track_move);
                document.body.removeEventListener("touchend", action_ended);
                document.body.removeEventListener("touchmove", track_move);
                if (onMovementEnded != undefined) {
                    onMovementEnded();
                }
            }
            document.body.addEventListener("mouseup", action_ended);
            document.body.addEventListener("mousemove", track_move);
            document.body.addEventListener("touchend", action_ended);
            document.body.addEventListener("touchmove", track_move);
        }
        grabbing_element.onmousedown = (e) => {
            if (e.button != 0) {
                return;
            }
            monitor(e);
        }
        grabbing_element.addEventListener("touchstart", (e) => {
            monitor(e);
        });
    }
    static trackMouse(grabbing_element, callback, ifNotMoved = () => { }, sensibilityX = 1, stepper = 15) {
        grabbing_element.style['cursor'] = 'grab';
        const monitor = (e) => {
            const mock_event = {
                e: e.touches != undefined ? e.touches[0] : e
            }
            let moved = false;
            MovableUtil.#movingStartFeedback(grabbing_element, "ns-resize");
            let start_coordinates = { x: mock_event.e.screenX, y: mock_event.e.screenY };
            let x_leftover = 0;
            let y_leftover = 0;
            const t_on_mouse_move = (event) => {
                if (window.DragAndDropBusy == true) {
                    return;
                }
                const mocking_event = {
                    event: event.touches != undefined ? event.touches[0] : event
                }
                if (grabbing_element.executed_mouse_tracking == undefined) {
                    let x = (start_coordinates.x - mocking_event.event.screenX);
                    x = x + x_leftover;
                    x_leftover = (x % (stepper * sensibilityX));
                    x = x - (x % (stepper * sensibilityX));
                    let y = (start_coordinates.y - mocking_event.event.screenY);
                    y = y + y_leftover;
                    y_leftover = (y % stepper);
                    y = y - (y % stepper);
                    callback({ x: x, y: y });
                    moved = true;
                    start_coordinates = { x: (mocking_event.event.screenX), y: (mocking_event.event.screenY) };
                    grabbing_element.executed_mouse_tracking = 'true';
                    setTimeout(() => {
                        grabbing_element.executed_mouse_tracking = undefined;
                    }, 50);
                    if (mocking_event.event.buttons == 0 && mocking_event.event.touches == undefined) {
                        t_on_mouse_up({ button: 0 });
                    }
                }
            }
            const t_on_mouse_up = (event) => {
                if (event.button != 0 && event.touches != undefined && event.type != "touchend") {
                    return;
                }
                MovableUtil.#movingEndFeedback(grabbing_element);
                if (!moved) {
                    setTimeout(() => {
                        ifNotMoved();
                    }, 0);
                }
                document.body.removeEventListener("mouseup", t_on_mouse_up);
                document.body.removeEventListener("mousemove", t_on_mouse_move);

                document.body.removeEventListener("touchend", t_on_mouse_up);
                // document.body.removeEventListener("touchcancel  ", t_on_mouse_up);
                document.body.removeEventListener("touchmove", t_on_mouse_move);
            }
            document.body.addEventListener("mouseup", t_on_mouse_up);
            document.body.addEventListener("mousemove", t_on_mouse_move);

            document.body.addEventListener("touchend", t_on_mouse_up);
            // document.body.addEventListener("touchcancel  ", t_on_mouse_up);
            document.body.addEventListener("touchmove", t_on_mouse_move);
        }
        grabbing_element.onmousedown = (e) => {
            if (e.button != 0) {
                return;
            }
            monitor(e);
        }
        grabbing_element.addEventListener("touchstart", (e) => {
            monitor(e);
        });
    }
    static repeatActionOnHold(target, action, timespan_ms = 1000) {
        const status = { id_interval: undefined };
        const on_mouse_up = (event) => {
            if (event.button != 0) {
                return;
            }
            if (status.id_interval != undefined) {
                clearInterval(status.id_interval);
                document.body.removeEventListener("mouseup", on_mouse_up);
                document.body.removeEventListener("mousemove", t_on_mouse_move);
            }
        };
        const t_on_mouse_move = (event) => {
            if (event.buttons == 0) {
                on_mouse_up({ button: 0 });
            }
        }
        target.addEventListener("mousedown", (event) => {
            if (event.button != 0) {
                return;
            }
            document.body.addEventListener("mousemove", t_on_mouse_move);
            document.body.addEventListener("mouseup", on_mouse_up);
            const don_t_forget_event = event;
            action(don_t_forget_event);
            status.id_interval = setInterval(() => {
                action(don_t_forget_event);
            }, timespan_ms);;
        });
    }
    /**
     * 
     * @param {Element} element 
     * @param {string} css_rule_cursor all !important
     */
    static #movingStartFeedback(element, css_rule_cursor = "move") {
        if (element == undefined) {
            return;
        }
        let tag = undefined;
        if (element.id.length > 0) {
            tag = `#${element.id}`;
        } else if (element.classList.length > 0) {
            tag = `.${element.classList[0]}`;
        }
        if (tag == undefined) {
            return;
        }
        const cursorStyle = document.createElement('style');
        cursorStyle.innerHTML = `${tag}{cursor: ${css_rule_cursor}!important;
                                        -webkit-user-select: none !important;
                                        /* Safari */
                                        -khtml-user-select: none !important;
                                        /* Konqueror HTML */
                                        -moz-user-select: none !important;
                                        /* Old versions of Firefox */
                                        -ms-user-select: none !important;
                                        /* Internet Explorer/Edge */
                                        user-select: none !important;
                                        -webkit-user-drag: none !important;
                                        }`;
        cursorStyle.id = `${tag}cursor-style-override-move`;
        document.head.appendChild(cursorStyle);
    }
    static #movingEndFeedback(element) {
        let tag = undefined;
        if (element.id.length > 0) {
            tag = `#${element.id}`;
        } else if (element.classList.length > 0) {
            tag = `.${element.classList[0]}`;
        }
        if (tag == undefined) {
            return;
        }
        try {
            document.getElementById(`${tag}cursor-style-override-move`).remove();
        } catch (error) {
        }
    }
}