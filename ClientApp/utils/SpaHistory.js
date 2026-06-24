class SpaHistory {
    static #historyStack = [];
    /**
     * 
     * @param {Function} state 
     */
    static pushState(state) {
        SpaHistory.#historyStack.push(state);
    }
    /**
     * 
     * @param {Function} state 
     */
    static popState(state = undefined) {
        if (state) {
            SpaHistory.#historyStack = SpaHistory.#historyStack.filter( cb => cb !== state );
            return true;
        } else {
            const callback = SpaHistory.#historyStack.pop();
            if (callback) {
                callback();
                return true;
            }
            return false;
        }
    }
    static clear() {
        SpaHistory.#historyStack = [];
    }
}