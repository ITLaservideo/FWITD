const debug = false;
class App {
    /**
     * Holds references to important HTML elements.
     */
    elements = {
    }
    /**
     * Represents the current status of the application.
     */
    static app_status = {
    };
    constructor() {
        App.init();        
    }
    static async init() {
        App.app_status = await new Promise((resolve) => {
            Lobby.post({ prompt: 3/*app status*/ }, (rsp) => {
                resolve(rsp.ps);
            });
        });
    }
}
