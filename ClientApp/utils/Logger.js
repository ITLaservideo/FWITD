/**
 * @fileoverview Logger Module - Comprehensive logging and reporting system
 * 
 * This module provides a robust logging utility that captures application events
 * with timestamps and dynamic properties. It implements an in-memory buffer with
 * periodic persistence to localStorage, ensuring log data is retained even after
 * page reloads while maintaining optimal performance through automatic flushing.
 * 
 * The Logger class follows a singleton pattern, maintaining a single instance
 * throughout the application lifecycle. It supports both simple string messages
 * and complex structured log entries with multiple properties.
 * 
 * @module Logger
 * @version 1.0
 * 
 * @example
 * // Simple logging
 * Logger.log("User clicked button");
 * 
 * @example
 * // Structured logging with properties
 * Logger.log({ what: "User action", action: "login", status: "success", user: "john" });
 * 
 * @example
 * // Generate and print logs to PDF
 * Logger.printLogs(true, true); // All in one table, open in new window
 * 
 * @example
 * // Add logs using alias method
 * Logger.add({ event: "page_load", duration: 1250 });
 */

/**
 * @class Logger
 * @description A comprehensive logging system that captures timestamped log entries
 * with dynamic properties, persists them to browser storage, and generates formatted
 * PDF reports.
 * 
 * Features:
 * - Automatic timestamp generation in ISO format (yyyy-MM-DD HH:mm:ss)
 * - In-memory buffer with periodic flush and save operations
 * - localStorage persistence for log retention across sessions
 * - Flexible logging format supporting both strings and objects
 * - PDF generation with grouping and formatting options
 * - Singleton pattern for unified log management
 * - Automatic cleanup through 15-minute save intervals
 */
class Logger {
    /**
     * Creates a new Logger instance and initializes the automatic save interval.
     * 
     * Initializes:
     * - Empty logs array for in-memory buffering
     * - 15-minute interval timer for automatic persistence to localStorage
     * 
     * The constructor is called automatically when the Logger class is first used.
     * Due to the singleton pattern, only one instance exists throughout the application.
     * 
     * @constructor
     */
    constructor() {
        /**
         * @private
         * @type {Array<Object>}
         * @description In-memory buffer storing log entries before they are persisted to localStorage.
         * Each entry is an object with at least a 'when' timestamp property.
         */
        this.logs = [];
        this.#startInterval();
    }
    /**
     * Static method to log an entry with automatic timestamp generation.
     * 
     * This is the primary method for recording events in the application. It accepts
     * either a simple string message or a structured object containing multiple properties.
     * 
     * A 'when' property containing an ISO 8601 formatted timestamp (yyyy-MM-DD HH:mm:ss)
     * is automatically added to every log entry.
     * 
     * Behavior:
     * - String input: Converted to { when: timestamp, what: string }
     * - Object input: timestamp and original properties merged: { when: timestamp, ...data }
     * - Entries stored in in-memory buffer for later persistence
     * - Singleton instance created on first call if not yet initialized
     * 
     * @static
     * @param {Object|String} data - The log entry data
     * @param {String} data - Simple log message (e.g., "User logged in")
     * @param {Object} data - Structured log object with custom properties
     * @param {String} [data.what] - Description of the event (recommended property)
     * @param {String} [data.action] - The action that occurred
     * @param {String} [data.status] - Status of the action (e.g., "success", "error")
     * @param {String} [data.user] - Identifier of the user (optional)
     * @param {*} [data.*] - Any other custom properties relevant to the log
     * 
     * @returns {void}
     * 
     * @example
     * // String logging
     * Logger.log("Application started");
     * // Results in: { when: "2026-06-08 14:23:45", what: "Application started" }
     * 
     * @example
     * // Object logging with multiple properties
     * Logger.log({
     *     what: "User action",
     *     action: "login",
     *     status: "success",
     *     user: "john_doe",
     *     device: "desktop",
     *     duration: 2500
     * });
     * // Results in: { when: "2026-06-08 14:23:46", what: "User action", action: "login", ... }
     * 
     * @example
     * // Shorthand form
     * Logger.log({ action: "button_click", component: "sidebar" });
     */
    static log(data) {
        const timestamp = new Date().toISOString().replace("T", " ").slice(0, -5); // Format yyyy-MM-DD HH-mm-ssss
        if (typeof data == 'string') {
            Logger.#addLog({ when: timestamp, what: data });
        } else {
            Logger.#addLog({ when: timestamp, ...data });
        }
    }
    /**
     * Alias method for logging entries with automatic timestamp generation.
     * 
     * This method is functionally identical to Logger.log() and provides an alternative
     * naming convention for developers who prefer the semantics of "adding" logs rather
     * than "logging" them. Both methods share the same implementation.
     * 
     * @static
     * @param {Object|String} data - The log entry data (same format as Logger.log())
     * @returns {void}
     * 
     * @see Logger.log
     * 
     * @example
     * Logger.add({ event: "page_load", duration: 1250 });
     * Logger.add("Database connection established");
     */
    static add(data) {
        Logger.log(data);
    }
    /**
     * Permanently deletes all logged data with user confirmation.
     * 
     * This method displays a confirmation dialog to prevent accidental data loss.
     * If the user confirms the deletion, it performs the following actions:
     * - Clears the in-memory logs buffer
     * - Removes the 'TheIlocalLogger_data' entry from localStorage
     * - Displays a success notification to the user
     * 
     * If the user cancels, no action is taken and all logs are preserved.
     * 
     * Data Deletion Scope:
     * - In-memory buffer: Cleared immediately
     * - Persistent storage: localStorage entry removed
     * - Action: Irreversible once confirmed
     * 
     * @static
     * @param {Event} event - DOM event object that triggered the deletion request.
     *                        Used for context in the confirmation dialog.
     * @returns {void}
     * 
     * @important This action is PERMANENT and cannot be undone. Always confirm with user.
     * 
     * @example
     * // Bind to a delete button
     * deleteButton.addEventListener('click', (event) => {
     *     Logger.permaDeleteData(event);
     * });
     * 
     * @note Requires UiBuilder.ask() and UiBuilder.Notify() to be available globally
     * for displaying the confirmation dialog and notification.
     */
    static permaDeleteData(event) {
        UiBuilder.mockDialog({
            text1: "Are you sure you want to permanently delete all logs?\n\nThis action cannot be undone.",
            onConfirm: () => {
                Logger.instance.logs = [];
                localStorage.removeItem("TheIlocalLogger_data");
                UiBuilder.Notify("Logs have been permanently deleted.");
            },
            onDeny: () => {
            },
            prefer_selection: 0
        });
    }

    /**
     * Generates a formatted report of all logged entries and initiates printing.
     * 
     * This method prepares all accumulated logs for display and printing. It:
     * 1. Saves any pending in-memory logs to localStorage persistence
     * 2. Flushes the in-memory buffer
     * 3. Retrieves all previously saved logs from localStorage
     * 4. Formats them as HTML tables
     * 5. Either opens in a new window or creates a hidden iframe for printing
     * 
     * The method supports two table generation modes:
     * - Single combined table: All logs displayed with all possible columns
     * - Grouped tables: Logs grouped by their property structure (different column sets)
     * 
     * Print Destination Options:
     * - open_in_new_window = true: Opens in browser's new window/tab
     * - open_in_new_window = false: Creates hidden iframe for direct printing
     * 
     * @static
     * @param {Boolean} [all_in_one=false] - Table generation mode
     *                                      true: Single combined table with all columns
     *                                      false: Separate grouped tables by column structure
     * @param {Boolean} [open_in_new_window=false] - Print destination
     *                                             true: Open in new browser window/tab
     *                                             false: Use hidden iframe
     * @returns {void}
     * 
     * @note Triggers browser print dialog automatically via iframe.contentWindow.print()
     * @note Returns without action if no logs are available (displays alert)
     * 
     * @example
     * // Print all logs in one combined table, in new window
     * Logger.printLogs(true, true);
     * 
     * @example
     * // Print logs grouped by structure, using hidden iframe
     * Logger.printLogs(false, false);
     * 
     * @example
     * // Default: grouped tables in hidden iframe
     * Logger.printLogs();
     * 
     * @see #saveLogs
     * @see #flushLogs
     * @see #printToPDF
     */
    static printLogs(all_in_one = false, open_in_new_window = false) {
        Logger.instance.#saveLogs();
        Logger.instance.#flushLogs();
        const savedLogs = JSON.parse(localStorage.getItem("TheIlocalLogger_data")) || [];
        //console.log(savedLogs);
        Logger.#printToPDF(savedLogs, all_in_one, open_in_new_window);
    }

    /**
     * Initializes the automatic log persistence interval.
     * 
     * Creates a recurring interval that executes every 15 minutes (900,000 milliseconds)
     * to automatically:
     * 1. Save in-memory logs to localStorage persistence
     * 2. Flush (clear) the in-memory buffer
     * 
     * This ensures logs are persisted regularly without requiring manual intervention,
     * preventing data loss if the browser crashes or tab is closed unexpectedly.
     * 
     * Interval Behavior:
     * - Executes every 15 minutes (900,000 ms)
     * - Runs continuously throughout the application lifecycle
     * - Independent of manual log or print operations
     * 
     * @private
     * @returns {void}
     * 
     * @note The interval ID is not stored, making it persistent for the session
     * 
     * @see #saveLogs
     * @see #flushLogs
     */
    #startInterval() {
        setInterval(() => {
            this.#saveLogs();
            this.#flushLogs();
        }, 15 * 60 * 1000); // 15 minutes
    }

    /**
     * Static private method to add a log entry to the in-memory buffer.
     * 
     * This internal method handles the core logic of storing log entries in the
     * in-memory buffer. It ensures a singleton Logger instance exists before
     * adding the entry.
     * 
     * Singleton Pattern:
     * - If Logger.instance doesn't exist, creates a new Logger instance
     * - Subsequent calls use the same instance throughout the app lifecycle
     * - Guarantees only one Logger manages all application logging
     * 
     * Memory Management:
     * - Stores entries in the instance's logs array
     * - Entries remain in memory until #saveLogs or #flushLogs are called
     * - Called automatically by Logger.log() and Logger.add()
     * 
     * @private
     * @static
     * @param {Object} entry - The log entry object with at least a 'when' timestamp
     * @returns {void}
     * 
     * @note Should not be called directly; use Logger.log() or Logger.add() instead
     * 
     * @see Logger.log
     * @see Logger.add
     * @see #saveLogs
     */
    static #addLog(entry) {
        if (!Logger.instance) Logger.instance = new Logger();
        Logger.instance.logs.push(entry);
    }

    /**
     * Persists in-memory logs to browser localStorage.
     * 
     * This method implements the persistence layer of the logging system. It:
     * 1. Retrieves any previously saved logs from localStorage
     * 2. Combines them with the current in-memory buffer
     * 3. Writes the merged array back to localStorage
     * 
     * Storage Details:
     * - localStorage Key: "TheIlocalLogger_data"
     * - Format: JSON stringified array of log objects
     * - Cumulative: Appends to existing logs, never overwrites
     * 
     * Use Cases:
     * - Called automatically every 15 minutes by #startInterval
     * - Called before printing logs to ensure all data is available
     * - Can be called manually to force persistence
     * 
     * Persistence Guarantees:
     * - Data survives browser refresh
     * - Data survives tab closure and reopening
     * - Data persists until browser cache is cleared or user calls Logger.permaDeleteData()
     * 
     * @private
     * @returns {void}
     * 
     * @note Does NOT clear the in-memory buffer (see #flushLogs for that)
     * @note Uses JSON.parse/stringify for serialization/deserialization
     * 
     * @see #flushLogs
     * @see #startInterval
     */
    #saveLogs() {
        const savedLogs = JSON.parse(localStorage.getItem("TheIlocalLogger_data")) || [];
        localStorage.setItem("TheIlocalLogger_data", JSON.stringify([...savedLogs, ...this.logs]));
    }

    /**
     * Clears the in-memory log buffer.
     * 
     * This method empties the in-memory logs array after they have been persisted
     * to localStorage. It prevents unbounded memory growth by regularly clearing
     * logged entries from RAM while keeping them permanently stored.
     * 
     * Memory Management Strategy:
     * - Typical flow: #saveLogs() → #flushLogs()
     * - Saves current entries to persistent storage first
     * - Then clears memory to free up RAM
     * - Prevents memory leaks from long-running applications
     * 
     * Timing:
     * - Automatically called every 15 minutes with #saveLogs
     * - Called before printing logs to ensure fresh data load
     * - Called after permaDeleteData to confirm deletion
     * 
     * @private
     * @returns {void}
     * 
     * @important Always call #saveLogs before #flushLogs to prevent data loss
     * @note Safe to call multiple times (reassigns to empty array each time)
     * 
     * @see #saveLogs
     * @see #startInterval
     * @see printLogs
     */
    #flushLogs() {
        this.logs = [];
    }

    /**
     * Generates formatted HTML tables from logs and triggers printing.
     * 
     * This private method is the core PDF/print generation engine. It:
     * 1. Validates that logs exist (alerts if empty)
     * 2. Generates HTML tables based on the specified mode
     * 3. Creates either a new window or hidden iframe
     * 4. Renders the HTML with styling
     * 5. Triggers the browser's print dialog
     * 
     * Supported Modes:
     * 
     * Mode 1: All-in-One Table (all_in_one = true)
     * - Collects all unique column names across all logs
     * - Creates single table with all columns
     * - Empty cells for logs lacking certain properties
     * - Useful when logs have similar structures
     * 
     * Mode 2: Grouped Tables (all_in_one = false)
     * - Groups logs by their property structure
     * - Creates separate table for each unique column set
     * - Minimal empty cells, cleaner organization
     * - Better for heterogeneous log structures
     * 
     * Output Destinations:
     * 
     * Window Mode (open_in_new_window = true):
     * - Opens a new browser window/tab
     * - Renders HTML with print stylesheet
     * - User can print or save from new window
     * - Browser print dialog triggered automatically
     * 
     * Iframe Mode (open_in_new_window = false):
     * - Creates hidden iframe in current document
     * - Renders content within iframe
     * - Triggers print dialog
     * - Removes iframe after 250ms delay
     * 
     * HTML Output Structure:
     * - Report title and tables enclosed in styled containers
     * - CSS formatting: borders, padding, alternating backgrounds
     * - Responsive layout suitable for both screen and print
     * - Monospace fonts for better data alignment
     * 
     * @private
     * @static
     * @param {Array<Object>} logs - Array of log entry objects to format
     * @param {Boolean} [all_in_one=true] - Table generation mode
     *                                     true: Single combined table
     *                                     false: Grouped tables
     * @param {Boolean} [open_in_new_window=false] - Print destination
     *                                             true: New browser window
     *                                             false: Hidden iframe
     * @returns {void}
     * 
     * @throws {Alert} If no logs are available
     * 
     * @example
     * // Generate report with combined table in new window
     * const logs = [...]; // Retrieved from localStorage
     * Logger.#printToPDF(logs, true, true);
     * 
     * @example
     * // Generate grouped report in hidden iframe
     * Logger.#printToPDF(logs, false, false);
     * 
     * @note 250ms timeout allows iframe to render before printing
     * @note Iframe is automatically removed after print dialog closes
     * 
     * @see printLogs
     */
    static #printToPDF(logs, all_in_one = true, open_in_new_window = false) {
        if (!logs.length) {
            alert("No logs available to print.");
            return;
        }

        let tablesHtml = '';

        if (all_in_one) {
            // Gather all unique columns from all logs
            const allColumnsSet = new Set();
            logs.forEach(log => {
                Object.keys(log).forEach(key => allColumnsSet.add(key));
            });
            const allColumns = Array.from(allColumnsSet);//.sort();

            // Create rows for each log
            const tableRows = logs.map(log => {
                return `<tr>${allColumns.map(col => `<td>${log[col] || ""}</td>`).join("")}</tr>`;
            }).join("");

            // Generate the single combined table
            tablesHtml = `
            <h3>All Logs Combined</h3>
            <table>
                <thead>
                    <tr>${allColumns.map(col => `<th>${col}</th>`).join("")}</tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <br/>
        `;
        } else {
            // Group logs by their key sets
            const groups = {};
            logs.forEach(log => {
                const keySet = Object.keys(log).sort().join('|');
                if (!groups[keySet]) {
                    groups[keySet] = [];
                }
                groups[keySet].push(log);
            });

            // Generate HTML for each group
            tablesHtml = Object.entries(groups).map(([keySet, groupLogs]) => {
                const columns = Object.keys(groupLogs[0]);
                const tableRows = groupLogs.map(log =>
                    `<tr>${columns.map(col => `<td>${log[col] || ""}</td>`).join("")}</tr>`
                ).join("");

                return `
                <h3>Log Group: ${columns.join(', ')}</h3>
                <table>
                    <thead>
                        <tr>${columns.map(col => `<th>${col}</th>`).join("")}</tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                <br/>
            `;
            }).join("");
        }

        if (open_in_new_window) {
            const printWindow = window.open("", "_blank");
            printWindow.document.write(`
            <html>
            <head>
                <title>Log Report</title>
                <style>
                    body { font-family: Arial, sans-serif; font-size:small; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid black; padding: 2px; text-align: left; }
                    th { background-color: #d2d2d2;font-size:8px; }
                </style>
            </head>
            <body>
                <h2>Log Report</h2>
                ${tablesHtml}
                <script>window.print();</script>
            </body>
            </html>
        `);
            printWindow.document.close();
        } else {
            // Create iframe for inline printing
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.width = '0px';
            iframe.style.height = '0px';
            iframe.style.border = 'none';

            document.body.appendChild(iframe);

            const doc = iframe.contentDocument || iframe.contentWindow.document;

            const htmlContent = `
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; font-size:small; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { border: 1px solid black; padding: 2px; text-align: left; font-size:12px; }
                    th { background-color: #d2d2d2;font-size:8px; }
                </style>
            </head>
            <body>
                <h2>Log Report</h2>
                ${tablesHtml}
            </body>
            </html>
        `;

            doc.open();
            doc.write(htmlContent);
            doc.close();

            setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                iframe.remove();
            }, 250);
        }
    }

}

/**
 * INITIALIZATION EXAMPLES
 * ========================
 * These lines demonstrate the Logger being used on application startup.
 * They serve as both initialization markers and version/activity tracking.
 */

// Initialize logger with version information
Logger.log({ 'start version': AppStatus.VERSION, "action": "App Started" });

// Example: Log user authentication event
// Logger.log({ action: "Login", status: "Success", device: "Windows" });

// Example: Log simple message without additional specifications
// Logger.log("simple message without specifications");

// Uncomment to test log printing functionality
// Logger.printLogs();