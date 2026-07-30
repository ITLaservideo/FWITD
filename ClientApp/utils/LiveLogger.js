class LiveLogger {
    static initialized = false;
    /**
     * @type {ListBox} reassign it `this.addItem(text, { color: "var(--vscode-charts-green)" });`
     */
    static listbox = null;
    static init() {
        if (LiveLogger.initialized) {
            return;
        } LiveLogger.initialized = true;
        /**
         * Pushed to directly from the C# side (FM32_25/Ui.cs :: Ui.log) via ExecuteScriptAsync,
         * independently of any App instance, so it has to live at module/window scope.
         */
        window.live_logger = {
            /***
             * @required window.live_logger?.log(
             */
            log(text, type_log) {
                if (LiveLogger.listbox == undefined) {
                    // type_log matches FM32_25/Ui.cs :: Ui.TypeLog's ToString() values
                    switch (type_log) {
                        case "warn":
                            console.warn(`BE:${text}`);
                            break;
                        case "danger":
                            console.error(`BE:${text}`);
                            break;
                        case "success":
                            console.log(`BE✓:${text}`);
                            break;
                        default:
                            console.log(`BE:${text}`);
                            break;
                    }
                    return;
                }
                // type_log matches FM32_25/Ui.cs :: Ui.TypeLog's ToString() values
                switch (type_log) {
                    case "warn":
                        LiveLogger.listbox.addItem(text, { color: "var(--vscode-editorWarning-foreground)" });
                        break;
                    case "danger":
                        LiveLogger.listbox.addItem(text, { color: "var(--vscode-errorForeground)" });
                        break;
                    case "success":
                        LiveLogger.listbox.addItem(text, { color: "var(--vscode-charts-green)" });
                        break;
                    case "info":
                        LiveLogger.listbox.addItem(text, { color: "var(--vscode-editorInfo-foreground)" });
                        break;
                    case "none":
                    default:
                        LiveLogger.listbox.addItem(text);
                        break;
                }
            }
        };
    }
    static log(text, type_log) {
        window.live_logger.log(text, type_log);
    }

} LiveLogger.init();