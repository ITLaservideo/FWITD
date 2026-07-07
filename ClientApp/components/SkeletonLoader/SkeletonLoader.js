/**
 * @version 1.0
 */
class SkeletonLoader extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options
     * @param {'lines'|'table'|'card'} [options.variant='lines'] - shape preset: paragraph-style lines, a table (header + body rows/columns), or avatar+lines cards
     * @param {number} [options.rows=3] - number of lines / table body rows / cards
     * @param {number} [options.columns=4] - number of columns, only used when variant is 'table'
     * @param {boolean} [options.avatar=true] - show a circular avatar bone before the lines, only used when variant is 'card'
     * @param {string} [options.width='100%'] - CSS width applied to the root element
     * @param {Function|Array<Function>} [options.onClose] - callback(s) to be called on destroy
     * @param {Function} [options.onReady] - callback to be called when component is ready
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        this.#initialize();
    }
    /**
     * store here the elements references of the html
     * automatically gathers elements with attribute ` fw-id="xxx" ` after super()
     */
    elements = {
        /**
         * @type HTMLElement
         */
        self_ref: this.self_ref,
    }
    #initialize() {
        const owner = this;
        const variant = owner.options.variant ?? "lines";
        owner.self_ref.style.width = owner.options.width ?? "100%";
        switch (variant) {
            case "table":
                owner.#buildTable(owner.options.rows ?? 3, owner.options.columns ?? 4);
                break;
            case "card":
                owner.#buildCards(owner.options.rows ?? 3, owner.options.avatar ?? true);
                break;
            case "lines":
            default:
                owner.#buildLines(owner.options.rows ?? 3);
                break;
        }
    }
    /**
     * @param {number} [width_percent] - defaults to the css class's own 100% width when omitted
     */
    #createLineBone(width_percent) {
        const bone = document.createElement("div");
        bone.className = "skeleton-bone skeleton-line";
        if (width_percent != undefined) {
            bone.style.width = `${width_percent}%`;
        }
        return bone;
    }
    /**
     * @param {number} rows
     */
    #buildLines(rows) {
        const owner = this;
        for (let i = 0; i < rows; i++) {
            const is_last_line = i === rows - 1;
            owner.self_ref.appendChild(owner.#createLineBone(is_last_line ? 60 : undefined));
        }
    }
    /**
     * @param {number} rows
     * @param {number} columns
     */
    #buildTable(rows, columns) {
        const owner = this;
        const header = document.createElement("div");
        header.className = "skeleton-table-row skeleton-table-header";
        for (let c = 0; c < columns; c++) {
            const cell = document.createElement("div");
            cell.className = "skeleton-bone skeleton-cell";
            header.appendChild(cell);
        }
        owner.self_ref.appendChild(header);
        for (let r = 0; r < rows; r++) {
            const row = document.createElement("div");
            row.className = "skeleton-table-row";
            for (let c = 0; c < columns; c++) {
                const cell = document.createElement("div");
                cell.className = "skeleton-bone skeleton-cell";
                row.appendChild(cell);
            }
            owner.self_ref.appendChild(row);
        }
    }
    /**
     * @param {number} rows
     * @param {boolean} avatar
     */
    #buildCards(rows, avatar) {
        const owner = this;
        for (let i = 0; i < rows; i++) {
            const card = document.createElement("div");
            card.className = "skeleton-card";
            if (avatar) {
                const avatar_bone = document.createElement("div");
                avatar_bone.className = "skeleton-bone skeleton-avatar";
                card.appendChild(avatar_bone);
            }
            const lines_container = document.createElement("div");
            lines_container.className = "skeleton-card-lines";
            lines_container.appendChild(owner.#createLineBone(80));
            lines_container.appendChild(owner.#createLineBone(50));
            card.appendChild(lines_container);
            owner.self_ref.appendChild(card);
        }
    }
    // owner.self_ref;//access element reference here
    // owner.elementReference();//alternative way to access element reference
    // owner.destroy();//call destroy method when needed
    // owner.options;//access building options here
}

// usage: mount it while waiting on Lobby.post(...), then swap it out for the real content
// const skeleton = new SkeletonLoader({ variant: "table", rows: 5, columns: 4 });
// container.appendChild(skeleton.elementReference());
// Lobby.post({...}, (rsp) => {
//     skeleton.destroy();
//     container.appendChild(buildRealContent(rsp));
// });

//#START RESERVED AREA FOR UI_BUILDER :: N skeletons across all variants; half "resolve"
// const mock_container = document.createElement("div");
// mock_container.style.display = "flex";
// mock_container.style.flexDirection = "column";
// mock_container.style.gap = "24px";
// mock_container.style.padding = "20px";
// document.body.appendChild(mock_container);

// const total_mocks = 6;
// const resolving_count = 3; // mocks[0..resolving_count) resolve, the rest never do
// for (let i = 0; i < total_mocks; i++) {
//     const variant = ["lines", "table", "card"][i % 3];
//     const skeleton = new SkeletonLoader({ variant, rows: 3, columns: 4 });
//     mock_container.appendChild(skeleton.elementReference());
//     if (i < resolving_count) {
//         const delay_ms = 9000 + Math.random() * 2000; // ~10s, jittered
//         setTimeout(() => {
//             const resolved = document.createElement("div");
//             resolved.textContent = `mock #${i} (${variant}) resolved after ${Math.round(delay_ms / 1000)}s`;
//             skeleton.destroy();
//             mock_container.appendChild(resolved);
//         }, delay_ms);
//     }
// }
//#END RESERVED AREA FOR UI_BUILDER