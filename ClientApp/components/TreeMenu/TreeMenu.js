/**
 * @typedef {Object} TreeMenuNode
 * @property {string} id - stable and unique across the whole tree: expansion, selection, focus and persisted state are keyed by it
 * @property {string} label
 * @property {boolean} [hasChildren] - true = expandable, children are requested lazily from `options.provider.getChildren`
 * @property {Array<TreeMenuNode>} [children] - eager children; an empty array is an empty folder
 * @property {string} [icon] - code point from https://fonts.google.com/icons, e.g. `e873`; folders/leaves get a default one
 * @property {string} [iconExpanded] - code point used while the node is expanded
 * @property {string} [description] - dimmed secondary text after the label
 * @property {string} [tooltip] - defaults to the label
 * @property {TreeMenuDecoration} [decoration]
 * @property {boolean} [disabled] - visible and focusable, but can't be activated, renamed, deleted or dragged
 * @property {boolean} [draggable] - default true (only meaningful when `options.onDrop` is set)
 * @property {*} [data] - free payload for the caller, never read by the tree
 */
/**
 * @typedef {Object} TreeMenuDecoration
 * @property {string|number} [badge] - a number is drawn as a pill, a string (e.g. `M`, `U`) as a colored letter
 * @property {string} [color] - CSS color for the label and the badge letter
 * @property {string} [tooltip] - appended to the row tooltip
 * @property {boolean} [propagate] - ancestors get tinted with `color` and a dot, so a collapsed folder shows that something inside needs attention
 */
/**
 * @typedef {Object} TreeMenuAction
 * @property {string} icon - code point from https://fonts.google.com/icons
 * @property {string} title
 * @property {(node: TreeMenuNode) => boolean} [when] - show the action only on the rows where it returns true
 * @property {(node: TreeMenuNode, event: MouseEvent) => void} run
 */

/**
 * @version 1.0
 * Virtualized, lazy-loading tree modeled on the VS Code explorer. The design behind each behavior is in readme.md
 */
class TreeMenu extends FrameworkGC(`${injector_html}`) {
    /**
     * @param {Object} options
     * @param {Function|Array<Function>} [options.onClose] - FrameworkGC::callback(s) to be called on destroy
     * @param {Function} [options.onReady] - FrameworkGC::callback to be called when component is ready
     * @param {string} [options.id] - key for the persisted state (expanded nodes, scroll position); nothing is persisted without it
     * @param {boolean} [options.persistState] - default true when `options.id` is set
     * @param {string} [options.title] - header title; the header is shown only when `title` or `headerActions` is set
     * @param {Array<TreeMenuNode>} [options.nodes] - eager roots with nested `children`; alternative to `options.provider`, update later with `setNodes()`
     * @param {Object} [options.provider] - lazy data source
     * @param {(node: TreeMenuNode|null) => Promise<Array<TreeMenuNode>>} options.provider.getChildren - children of `node`, or the roots when `node` is null
     * @param {(id: string) => Promise<string|null>} [options.provider.getParent] - parent id of a node, needed only by `reveal()` for nodes not loaded yet
     * @param {Array<string>} [options.expanded] - ids expanded on first load, when there's no persisted state
     * @param {boolean} [options.multiSelect] - default true
     * @param {boolean} [options.expandOnClick] - a click on a folder row toggles it, default true (the twistie always toggles)
     * @param {"foldersFirst"|"none"|((a: TreeMenuNode, b: TreeMenuNode) => number)} [options.sort] - default "foldersFirst" (then natural, case-insensitive)
     * @param {"filter"|"highlight"} [options.findMode] - default "filter": typing hides non-matching rows; "highlight" only moves focus between matches
     * @param {boolean} [options.compactFolders] - merge chains of single-child folders into one row (`src/main/java`), default false
     * @param {Object<string, Array<string>>} [options.nesting] - file nesting rules, e.g. `{ "*.js": ["${base}.min.js"] }`: `${base}` is what the `*` of the key matched
     * @param {boolean} [options.stickyScroll] - parents of the top visible row stick to the top, default true
     * @param {number} [options.maxStickyRows] - default 5
     * @param {"hover"|"always"|"none"} [options.indentGuides] - default "hover"
     * @param {"compact"|"comfortable"} [options.density] - default "compact" (22px rows); "comfortable" = 32px rows and always visible row actions, for touch
     * @param {number} [options.rowHeight] - px, overrides the density row height
     * @param {number} [options.indent] - px per level, default 12
     * @param {boolean} [options.showIcons] - default true
     * @param {string} [options.emptyText] - shown when the tree has no roots
     * @param {Array<TreeMenuAction>} [options.inlineActions] - buttons shown on the hovered/focused row
     * @param {Array<{icon: string, title: string, run: (event: MouseEvent) => void}>} [options.headerActions] - header buttons, before the built-in collapse all / refresh
     * @param {(name: string, node: TreeMenuNode|null, parent: TreeMenuNode|null) => string|undefined} [options.validateName] - live validation while renaming/creating (`node` is null when creating): return an error message to block the commit. Empty names and sibling duplicates are already rejected
     * @param {(node: TreeMenuNode, meta: {pinned: boolean, side: boolean}) => void} [options.onActivate] - leaf opened: single click = preview (pinned false), double click / Enter = pinned, Ctrl+Enter / middle click = side
     * @param {(nodes: Array<TreeMenuNode>) => void} [options.onSelectionChange]
     * @param {boolean} [options.bookmarks] - right click > "Add to Bookmarks" pins nodes into a "Bookmarks" branch at the top of the tree, saved in localStorage; default true, needs `options.id` (the storage key)
     * @param {(nodes: Array<TreeMenuNode>, event: MouseEvent|KeyboardEvent, position: {clientX: number, clientY: number}) => void} [options.onContextMenu] - e.g. open a `MousePopUp` with `event: position`; `nodes` is empty when right-clicking the empty area.
     * Replaces the built-in (bookmarks) menu on normal rows: use `isBookmarked()` / `addBookmark()` / `removeBookmark()` to offer the same entries. Rows inside "Bookmarks" always get the built-in menu
     * @param {(node: TreeMenuNode, newLabel: string) => Promise<TreeMenuNode|void>} [options.onRename] - enables F2 / `rename()`. Throw to reject (the message is shown under the input). Return the updated node when its id changes (e.g. ids are paths), nothing to just relabel it
     * @param {(parent: TreeMenuNode|null, label: string, isFolder: boolean) => Promise<TreeMenuNode|void>} [options.onCreate] - enables `createNode()`; return the created node to have it inserted and selected, throw to reject
     * @param {(nodes: Array<TreeMenuNode>) => void} [options.onDelete] - Delete key; the caller confirms, deletes, then calls `removeNode()` / `refresh()`
     * @param {(nodes: Array<TreeMenuNode>, target: TreeMenuNode|null, meta: {copy: boolean}) => Promise<void>|void} [options.onDrop] - enables drag & drop; target null = root. The caller moves the data, then calls `refresh()`
     * @param {(nodes: Array<TreeMenuNode>, target: TreeMenuNode|null) => boolean} [options.canDrop] - extra veto on top of the built-in checks (onto itself, into own descendant, into current parent)
     */
    constructor(options) {
        super(options);
        console.assert(this.elements != null, "missing owner.elements container of the ref elements");
        this.#initialize();
        this.#addEventListeners();
    }
    /**
     * store here the elements references of the html
     * automatically gathers elements with attribute ` fw-id="xxx" ` after super()
     */
    elements = {
        /** @type HTMLElement */
        self_ref: this.self_ref,
        /** @type HTMLElement */
        header: null,
        /** @type HTMLElement */
        title: null,
        /** @type HTMLElement */
        header_actions: null,
        /** @type HTMLElement */
        find_bar: null,
        /** @type HTMLInputElement */
        find_input: null,
        /** @type HTMLElement */
        find_count: null,
        /** @type HTMLElement */
        find_mode_button: null,
        /** @type HTMLElement */
        find_close_button: null,
        /** @type HTMLElement */
        viewport: null,
        /** @type HTMLElement */
        canvas: null,
        /** @type HTMLElement */
        sticky: null,
        /** @type HTMLElement */
        state: null,
    }

    static #ICON = {
        twistie: "e5cc",
        folder: "e2c7",
        folder_open: "e2c8",
        file: "e873",
        error: "e000",
        collapse_all: "e5d6",
        refresh: "e5d5",
        bookmark: "e866",
        bookmark_border: "e867",
        delete: "e872",
    };
    /** id of the virtual "Bookmarks" root; its children are shortcuts with id `#BOOKMARK_PREFIX + <original id>` */
    static #BOOKMARKS_ID = "tree-menu://bookmarks";
    static #BOOKMARK_PREFIX = "tree-menu://bookmark/";
    /** rows rendered above/below the viewport */
    static #ROW_BUFFER = 10;
    static #DRAG_EXPAND_DELAY_MS = 500;
    static #DRAG_EDGE_PX = 24;
    static #REFRESH_DEBOUNCE_MS = 30;
    static #SAVE_DEBOUNCE_MS = 300;
    static #collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    static #instance_counter = 0;

    /**
     * id -> record; `children` is null until loaded, `parentId` null for roots
     * @type {Map<string, {id: string, node: TreeMenuNode, parentId: string|null, children: Array<string>|null, loading: Promise|null, error: string|null, stale: boolean}>}
     */
    #items = new Map();
    /** pseudo record holding the roots */
    #root = { id: null, node: null, parentId: null, children: null, loading: null, error: null, stale: false };
    #expanded = new Set();
    #selected = new Set();
    #selectionDirty = false;
    #focusedId = null;
    #focusHint = 0;
    #anchorId = null;
    #activeId = null;
    /**
     * flattened visible rows; `parentRow` is the index of the parent row (-1 at root level)
     * @type {Array<{key: string, kind: "node"|"error"|"edit", id: string|null, chain: Array<string>, level: number, parentRow: number, posinset: number, setsize: number}>}
     */
    #rows = [];
    /** any id shown by a row (every member of a compacted chain) -> row index */
    #indexById = new Map();
    /** row key -> element currently showing it */
    #rendered = new Map();
    #rowPool = [];
    #stickyElements = [];
    #stickyCount = 0;
    #rowHeight = 22;
    #multi = true;
    #domId = "";
    #renderQueued = false;
    #rebuildQueued = false;
    #decorationsDirty = true;
    /** @type {Map<string, string>} ancestor id -> color propagated from a decorated descendant */
    #propagated = new Map();
    #find = { open: false, text: "", mode: "filter", matches: new Map(), visible: null, forceOpen: null, collapsed: new Set() };
    #edit = null;
    #drag = null;
    #pendingRefresh = null;
    #pendingScroll = null;
    #restorePending = false;
    #saveTimer = 0;
    #stateKey = "";
    /** @type {Array<{id: string, label: string, icon?: string, folder: boolean, path: string}>} pinned nodes, in pin order */
    #bookmarks = [];
    #bookmarksKey = "";
    #lastStateText = null;
    #resizeObserver = null;
    #destroyed = false;

    async #initialize() {
        const owner = this;
        const options = owner.options;
        owner.#domId = `tree-menu-${++TreeMenu.#instance_counter}`;
        owner.#multi = options.multiSelect !== false;
        owner.#find.mode = options.findMode === "highlight" ? "highlight" : "filter";
        owner.#rowHeight = options.rowHeight ?? (options.density === "comfortable" ? 32 : 22);

        const root = owner.self_ref;
        root.style.setProperty("--tree-row-height", `${owner.#rowHeight}px`);
        root.style.setProperty("--tree-indent", `${options.indent ?? 12}px`);
        root.dataset.guides = options.indentGuides ?? "hover";
        root.dataset.density = options.density ?? "compact";

        const viewport = owner.elements.viewport;
        viewport.setAttribute("aria-label", options.title ?? Locale.at("Tree"));
        if (owner.#multi) {
            viewport.setAttribute("aria-multiselectable", "true");
        }
        owner.elements.sticky.setAttribute("aria-hidden", "true");
        owner.#buildHeader();
        owner.#updateFindModeButton();
        UiBuilder.addHint({ hint: Locale.at("Close"), target: owner.elements.find_close_button });

        if (options.id != null && options.persistState !== false) {
            owner.#stateKey = `TreeMenu:${options.id}`;
        }
        // bookmarks are user data, not view state: kept even with persistState false
        if (options.id != null && options.bookmarks !== false) {
            owner.#bookmarksKey = `TreeMenu:${options.id}:bookmarks`;
            owner.#bookmarks = owner.#loadBookmarks();
        }
        const saved = owner.#loadState();
        for (const id of saved?.expanded ?? options.expanded ?? []) {
            owner.#expanded.add(id);
        }
        owner.#restorePending = true;

        if (Array.isArray(options.nodes)) {
            owner.#ingest(owner.#root, options.nodes);
        } else {
            await owner.#loadChildren(owner.#root);
            await owner.#restoreExpanded(owner.#root);
        }
        owner.#restorePending = false;
        owner.#afterDataChange();
        if (saved?.top != null) {
            owner.#pendingScroll = { id: saved.top, mode: "top" };
        }
        owner.#queueRender(true);
    }
    async #addEventListeners() {
        const owner = this;
        const viewport = owner.elements.viewport;
        const canvas = owner.elements.canvas;

        viewport.addEventListener("scroll", () => {
            owner.#queueRender();
            owner.#scheduleSave();
        });
        viewport.addEventListener("focus", () => {
            owner.#ensureRows();
            if (owner.#focusedId == null || !owner.#indexById.has(owner.#focusedId)) {
                const first_selected = [...owner.#selected].find(id => owner.#indexById.has(id));
                owner.#focusedId = first_selected ?? owner.#rows.find(row => row.kind === "node")?.id ?? null;
            }
            owner.#queueRender();
        });
        viewport.addEventListener("keydown", (e) => owner.#onKeyDown(e));
        viewport.addEventListener("contextmenu", (e) => owner.#onContextMenu(e));
        viewport.addEventListener("mousedown", (e) => {
            if (e.button === 1) {
                e.preventDefault();// no autoscroll on middle click
            }
        });
        canvas.addEventListener("click", (e) => owner.#onRowClick(e, -1));
        canvas.addEventListener("dblclick", (e) => owner.#onRowDoubleClick(e));
        canvas.addEventListener("auxclick", (e) => {
            if (e.button !== 1) {
                return;
            }
            const row = owner.#rowFromEvent(e);
            if (row?.kind === "node" && !TreeMenu.#isFolder(owner.#items.get(row.id).node)) {
                owner.#activate(row.id, { pinned: true, side: true });
            }
        });
        // clicks outside any row (below the last one) clear the selection
        viewport.addEventListener("click", (e) => {
            if (e.target === viewport && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                owner.#setSelected([]);
            }
        });
        owner.elements.sticky.addEventListener("click", (e) => {
            const row_el = e.target.closest(".tree-menu-row");
            if (row_el == null) {
                return;
            }
            const slot = owner.#stickyElements.indexOf(row_el);
            owner.#onRowClick(e, slot);
        });

        canvas.addEventListener("dragstart", (e) => owner.#onDragStart(e));
        canvas.addEventListener("dragend", () => owner.#endDrag());
        viewport.addEventListener("dragover", (e) => owner.#onDragOver(e));
        viewport.addEventListener("dragleave", (e) => {
            if (owner.#drag != null && !viewport.contains(e.relatedTarget)) {
                clearTimeout(owner.#drag.expandTimer);
                owner.#drag.hoverIndex = -1;
                owner.#setDropTarget(undefined);
            }
        });
        viewport.addEventListener("drop", (e) => owner.#onDrop(e));

        const input = owner.elements.find_input;
        input.addEventListener("input", () => {
            owner.#find.text = input.value.trim();
            owner.#applyFind(true);
        });
        input.addEventListener("keydown", (e) => {
            e.stopPropagation();
            if (e.key === "Escape") {
                e.preventDefault();
                owner.#closeFind();
            } else if (e.key === "Enter") {
                e.preventDefault();
                owner.#gotoMatch(e.shiftKey ? -1 : 1);
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                owner.elements.viewport.focus();
                if (owner.#find.matches.size > 0) {
                    owner.#gotoMatch(1);
                }
            }
        });
        owner.elements.find_mode_button.addEventListener("click", () => {
            owner.#find.mode = owner.#find.mode === "filter" ? "highlight" : "filter";
            owner.#updateFindModeButton();
            owner.#applyFind(false);
            input.focus();
        });
        owner.elements.find_close_button.addEventListener("click", () => owner.#closeFind());

        owner.#resizeObserver = new ResizeObserver(() => owner.#queueRender());
        owner.#resizeObserver.observe(viewport);
    }

    //#region data
    static #isFolder(node) {
        return node != null && (node.hasChildren === true || Array.isArray(node.children));
    }
    static #errorText(e) {
        return e?.message ?? `${e}`;
    }
    #rec(id) {
        return id == null ? this.#root : this.#items.get(id);
    }
    #isExpandable(rec) {
        return rec?.node != null && (TreeMenu.#isFolder(rec.node) || (rec.children?.length ?? 0) > 0);
    }
    #isRowExpanded(id) {
        const find = this.#find;
        if (find.forceOpen?.has(id) && !find.collapsed.has(id)) {
            return true;
        }
        return this.#expanded.has(id);
    }
    #sortNodes(nodes) {
        const sort = this.options.sort ?? "foldersFirst";
        if (sort === "none") {
            return nodes.slice();
        }
        if (typeof sort === "function") {
            return nodes.slice().sort(sort);
        }
        return nodes.slice().sort((a, b) =>
            (TreeMenu.#isFolder(b) - TreeMenu.#isFolder(a)) || TreeMenu.#collator.compare(a.label ?? "", b.label ?? ""));
    }
    /**
     * groups siblings by `options.nesting`: the nested ones are moved under their primary
     * @returns {{top: Array<TreeMenuNode>, nestedOf: Map<string, Array<TreeMenuNode>>}}
     */
    #applyNesting(nodes) {
        const rules = this.options.nesting;
        const nested_of = new Map();
        if (rules == null) {
            return { top: nodes, nestedOf: nested_of };
        }
        const files = nodes.filter(node => !TreeMenu.#isFolder(node));
        const by_label = new Map(files.map(node => [node.label, node]));
        const nested_ids = new Set();
        // shorter labels first, so `X.js` claims `X.min.js` before `X.min.js` is tried as a primary
        const primaries = files.slice().sort((a, b) => (a.label?.length ?? 0) - (b.label?.length ?? 0));
        for (const primary of primaries) {
            if (nested_ids.has(primary.id)) {
                continue;
            }
            for (const [pattern, child_patterns] of Object.entries(rules)) {
                const base = TreeMenu.#globCapture(pattern, primary.label ?? "");
                if (base == null) {
                    continue;
                }
                for (const child_pattern of child_patterns) {
                    const resolved = child_pattern.replaceAll("${base}", base);
                    let candidates = [by_label.get(resolved)].filter(Boolean);
                    if (resolved.includes("*")) {
                        const rx = TreeMenu.#globToRegExp(resolved);
                        candidates = files.filter(node => rx.test(node.label ?? ""));
                    }
                    for (const candidate of candidates) {
                        if (candidate === primary || nested_ids.has(candidate.id) || nested_of.has(candidate.id)) {
                            continue;
                        }
                        nested_ids.add(candidate.id);
                        if (!nested_of.has(primary.id)) {
                            nested_of.set(primary.id, []);
                        }
                        nested_of.get(primary.id).push(candidate);
                    }
                }
            }
        }
        return { top: nodes.filter(node => !nested_ids.has(node.id)), nestedOf: nested_of };
    }
    static #globToRegExp(glob) {
        const escaped = glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
        return new RegExp(`^${escaped}$`, "i");
    }
    /** @returns {string|null} what the single `*` of `pattern` matched, null when `label` doesn't match */
    static #globCapture(pattern, label) {
        const star = pattern.indexOf("*");
        if (star < 0) {
            return pattern.toLowerCase() === label.toLowerCase() ? "" : null;
        }
        const prefix = pattern.slice(0, star);
        const suffix = pattern.slice(star + 1);
        const rx = new RegExp(`^${TreeMenu.#escapeRegExp(prefix)}(.+)${TreeMenu.#escapeRegExp(suffix)}$`, "i");
        return label.match(rx)?.[1] ?? null;
    }
    static #escapeRegExp(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    /**
     * replaces the children of `parent` with `nodes`, keeping the records (and their state) of the ids still present
     * @param {Object} parent
     * @param {Array<TreeMenuNode>} nodes
     * @param {{nesting?: boolean, stale?: boolean}} opts - `stale`: loaded but collapsed folders get re-fetched on their next expand
     */
    #ingest(parent, nodes, { nesting = true, stale = false, sort = true } = {}) {
        const owner = this;
        const previous = parent.children ?? [];
        const valid = (nodes ?? []).filter(node => node?.id != null);
        const sorted = sort ? owner.#sortNodes(valid) : valid;
        const grouped = nesting ? owner.#applyNesting(sorted) : { top: sorted, nestedOf: new Map() };
        const keep = new Set();
        if (parent === owner.#root) {
            keep.add(TreeMenu.#BOOKMARKS_ID);// not part of the provider data, re-added by #syncBookmarks
        }
        const ids = [];
        for (const node of grouped.top) {
            ids.push(node.id);
            keep.add(node.id);
            owner.#upsert(node, parent.id, grouped.nestedOf.get(node.id), stale);
        }
        for (const id of previous) {
            if (!keep.has(id)) {
                owner.#forget(id);
            }
        }
        parent.children = ids;
        parent.error = null;
        owner.#decorationsDirty = true;
        if (parent === owner.#root) {
            owner.#syncBookmarks();
        }
    }
    #upsert(node, parent_id, nested_nodes, stale) {
        const owner = this;
        let rec = owner.#items.get(node.id);
        if (rec == undefined) {
            rec = { id: node.id, node: node, parentId: parent_id, children: null, loading: null, error: null, stale: false };
            owner.#items.set(node.id, rec);
        } else {
            rec.node = node;
            rec.parentId = parent_id;
        }
        if (Array.isArray(node.children)) {
            owner.#ingest(rec, node.children, { stale });
        } else if (nested_nodes?.length) {
            owner.#ingest(rec, nested_nodes, { nesting: false, stale });
        } else if (!TreeMenu.#isFolder(node) && rec.children != null) {
            // was a nesting primary, nothing nested anymore
            for (const id of rec.children) {
                owner.#forget(id);
            }
            rec.children = null;
        } else if (stale && rec.children != null && !owner.#expanded.has(rec.id)) {
            rec.stale = true;
        }
    }
    #forget(id) {
        const owner = this;
        const rec = owner.#items.get(id);
        if (rec == undefined) {
            return;
        }
        for (const child_id of rec.children ?? []) {
            owner.#forget(child_id);
        }
        owner.#items.delete(id);
        if (owner.#selected.delete(id)) {
            owner.#selectionDirty = true;
        }
        if (owner.#anchorId === id) {
            owner.#anchorId = null;
        }
    }
    #loadChildren(rec) {
        const owner = this;
        if (rec.children != null) {
            return Promise.resolve();
        }
        if (rec.loading != null) {
            return rec.loading;
        }
        const provider = owner.options.provider;
        if (provider?.getChildren == undefined) {
            rec.children = [];
            return Promise.resolve();
        }
        rec.error = null;
        rec.loading = (async () => {
            try {
                const nodes = await provider.getChildren(rec.node);
                if (!owner.#destroyed) {
                    owner.#ingest(rec, nodes);
                }
            } catch (e) {
                rec.error = TreeMenu.#errorText(e);
            } finally {
                rec.loading = null;
                owner.#afterDataChange();
            }
        })();
        owner.#queueRender(true);
        return rec.loading;
    }
    /** re-fetches `rec` and, recursively, its expanded descendants; the old children stay visible meanwhile */
    async #reload(rec) {
        const owner = this;
        const provider = owner.options.provider;
        if (rec.loading != null) {
            await rec.loading;
        }
        if (provider?.getChildren == undefined || (rec !== owner.#root && !TreeMenu.#isFolder(rec.node)) || TreeMenu.#isInternal(rec.id)) {
            return;
        }
        if (rec.children == null) {
            if (rec === owner.#root || owner.#expanded.has(rec.id)) {
                await owner.#loadChildren(rec);
            }
            return;
        }
        try {
            const nodes = await provider.getChildren(rec.node);
            if (owner.#destroyed || (rec !== owner.#root && owner.#items.get(rec.id) !== rec)) {
                return;
            }
            owner.#ingest(rec, nodes, { stale: true });
            rec.stale = false;
        } catch (e) {
            rec.error = TreeMenu.#errorText(e);
            for (const id of rec.children ?? []) {
                owner.#forget(id);
            }
            rec.children = null;
        }
        owner.#afterDataChange();
        const expanded_children = (rec.children ?? []).filter(id => owner.#expanded.has(id) && owner.#items.get(id)?.children != null);
        await Promise.all(expanded_children.map(id => owner.#reload(owner.#items.get(id))));
    }
    async #restoreExpanded(rec) {
        const owner = this;
        const ids = (rec.children ?? []).filter(id => owner.#expanded.has(id));
        await Promise.all(ids.map(async (id) => {
            const child = owner.#items.get(id);
            if (child == undefined || !owner.#isExpandable(child)) {
                return;
            }
            await owner.#loadChildren(child);
            await owner.#restoreExpanded(child);
        }));
    }
    /** rebuilds the rows keeping the top visible row where it is, so rows inserted above don't make the view jump */
    #afterDataChange() {
        const owner = this;
        const anchor = owner.#captureAnchor();
        owner.#syncBookmarks();// labels/icons of bookmarked nodes may have changed
        owner.#decorationsDirty = true;
        owner.#refreshFind();
        owner.#queueRender(true);
        owner.#ensureRows();
        owner.#restoreAnchor(anchor);
    }
    //#endregion

    //#region bookmarks
    /** the "Bookmarks" branch and its shortcuts: never handed to the caller's callbacks */
    static #isInternal(id) {
        return typeof id === "string" && (id === TreeMenu.#BOOKMARKS_ID || id.startsWith(TreeMenu.#BOOKMARK_PREFIX));
    }
    static #isBookmarkEntry(id) {
        return typeof id === "string" && id.startsWith(TreeMenu.#BOOKMARK_PREFIX);
    }
    #bookmarksEnabled() {
        return this.#bookmarksKey !== "";
    }
    #loadBookmarks() {
        try {
            const list = JSON.parse(localStorage.getItem(this.#bookmarksKey) ?? "[]");
            return Array.isArray(list) ? list.filter(b => typeof b?.id === "string" && !TreeMenu.#isInternal(b.id)) : [];
        } catch {
            return [];
        }
    }
    #saveBookmarks() {
        try {
            localStorage.setItem(this.#bookmarksKey, JSON.stringify(this.#bookmarks));
        } catch {
            // storage unavailable/full: bookmarks last until the page is closed
        }
    }
    /** (re)builds the "Bookmarks" branch as first root from `#bookmarks`, or removes it when there are none */
    #syncBookmarks() {
        const owner = this;
        const root = owner.#root;
        if (!owner.#bookmarksEnabled() || root.children == null) {
            return;
        }
        const branch_id = TreeMenu.#BOOKMARKS_ID;
        const others = root.children.filter(id => id !== branch_id);
        if (owner.#bookmarks.length === 0) {
            owner.#forget(branch_id);
            root.children = others;
            return;
        }
        let snapshots_changed = false;
        const entries = owner.#bookmarks.map(bookmark => {
            // a loaded original wins over the stored snapshot, which gets refreshed with it
            const live = owner.#items.get(bookmark.id)?.node;
            if (live != undefined && (live.label !== bookmark.label || live.icon !== bookmark.icon)) {
                bookmark.label = live.label;
                bookmark.icon = live.icon;
                snapshots_changed = true;
            }
            const label = bookmark.label ?? bookmark.id;
            return {
                id: TreeMenu.#BOOKMARK_PREFIX + bookmark.id,
                label,
                icon: bookmark.icon ?? (bookmark.folder ? TreeMenu.#ICON.folder : TreeMenu.#ICON.file),
                description: bookmark.path,
                tooltip: bookmark.path ? `${bookmark.path}/${label}` : label,
                draggable: false,
            };
        });
        if (snapshots_changed) {
            owner.#saveBookmarks();
        }
        let branch = owner.#items.get(branch_id);
        if (branch == undefined) {
            branch = { id: branch_id, node: null, parentId: null, children: null, loading: null, error: null, stale: false };
            owner.#items.set(branch_id, branch);
        }
        branch.node = { id: branch_id, label: Locale.at("Bookmarks"), icon: TreeMenu.#ICON.bookmark, hasChildren: true, draggable: false };
        owner.#ingest(branch, entries, { nesting: false, sort: false });
        root.children = [branch_id, ...others];
    }
    /** original ids the context menu acts on: the selection when `id` is part of it, shortcuts resolved to their original */
    #bookmarkTargets(id) {
        const owner = this;
        const ids = owner.#selected.has(id)
            ? [...owner.#selected].sort((a, b) => (owner.#indexById.get(a) ?? Infinity) - (owner.#indexById.get(b) ?? Infinity))
            : [id];
        const targets = ids
            .filter(cid => cid !== TreeMenu.#BOOKMARKS_ID)
            .map(cid => TreeMenu.#isBookmarkEntry(cid) ? cid.slice(TreeMenu.#BOOKMARK_PREFIX.length) : cid);
        return [...new Set(targets)];
    }
    #showBookmarkMenu(id, position) {
        const owner = this;
        const action_titles = [];
        const next = [];
        const text_svgs = [];
        if (id === TreeMenu.#BOOKMARKS_ID) {
            action_titles.push(Locale.at("Remove all Bookmarks"));
            next.push(() => owner.removeBookmark(owner.#bookmarks.map(b => b.id)));
            text_svgs.push(TreeMenu.#ICON.delete);
        } else {
            const targets = owner.#bookmarkTargets(id);
            if (targets.every(target => owner.isBookmarked(target))) {
                action_titles.push(Locale.at("Remove from Bookmarks"));
                next.push(() => owner.removeBookmark(targets));
                text_svgs.push(TreeMenu.#ICON.bookmark_border);
            } else {
                action_titles.push(Locale.at("Add to Bookmarks"));
                next.push(() => owner.addBookmark(targets));
                text_svgs.push(TreeMenu.#ICON.bookmark);
            }
        }
        const title_node = owner.#items.get(id)?.node;
        const selected_count = owner.#selected.has(id) ? owner.#selected.size : 1;
        new MousePopUp({
            title: selected_count > 1 ? `${selected_count} ${Locale.at("items")}` : (title_node?.label ?? ""),
            style: "plain",
            action_titles,
            next,
            text_svgs,
            event: position,
        });
    }
    /** a shortcut was activated: reveal the original and, for leaves, activate it */
    async #openBookmark(entry_id, meta) {
        const owner = this;
        const original_id = entry_id.slice(TreeMenu.#BOOKMARK_PREFIX.length);
        const bookmark = owner.#bookmarks.find(b => b.id === original_id);
        const found = await owner.reveal(original_id);
        const node = owner.#items.get(original_id)?.node;
        if (found && node != undefined) {
            owner.elements.viewport.focus();
            if (!TreeMenu.#isFolder(node)) {
                owner.#activate(original_id, meta);
            }
            return;
        }
        if (bookmark != undefined && !bookmark.folder) {
            // not reachable in the tree (lazy branch never loaded, no provider.getParent): the caller can still open it by id
            owner.options.onActivate?.({ id: bookmark.id, label: bookmark.label, icon: bookmark.icon }, meta);
            return;
        }
        new Notify({ text: `${Locale.at("Bookmarked item not found")}: ${bookmark?.label ?? original_id}`, type: "error", ms_timeout: 3000 });
    }
    //#endregion

    //#region decorations
    #computePropagated() {
        const owner = this;
        owner.#decorationsDirty = false;
        const propagated = new Map();
        for (const rec of owner.#items.values()) {
            const decoration = rec.node.decoration;
            if (!decoration?.propagate || !decoration.color) {
                continue;
            }
            for (let id = rec.parentId; id != null && !propagated.has(id); id = owner.#items.get(id)?.parentId) {
                propagated.set(id, decoration.color);
            }
        }
        owner.#propagated = propagated;
    }
    //#endregion

    //#region rows
    #queueRender(rebuild = false) {
        const owner = this;
        if (rebuild) {
            owner.#rebuildQueued = true;
        }
        if (owner.#renderQueued || owner.#destroyed) {
            return;
        }
        owner.#renderQueued = true;
        requestAnimationFrame(() => owner.#render());
    }
    #ensureRows() {
        if (this.#rebuildQueued) {
            this.#rebuildRows();
        }
    }
    /** flattens the visible part of the tree into `#rows` */
    #rebuildRows() {
        const owner = this;
        owner.#rebuildQueued = false;
        if (owner.#decorationsDirty) {
            owner.#computePropagated();
        }
        const rows = [];
        const index_by_id = new Map();
        const find = owner.#find;
        const filtering = find.visible != null;
        const edit = owner.#edit;
        const compact = owner.options.compactFolders === true;

        const walk = (parent_rec, level, parent_row, parent_matched) => {
            let ids = parent_rec.children ?? [];
            if (filtering && !parent_matched) {
                ids = ids.filter(id => find.visible.has(id));
            }
            const create_here = edit?.kind === "create" && edit.parentId === parent_rec.id;
            let create_at = -1;
            if (create_here) {
                create_at = edit.isFolder ? 0 : ids.findIndex(id => !TreeMenu.#isFolder(owner.#items.get(id).node));
                if (create_at < 0) {
                    create_at = ids.length;
                }
            }
            const setsize = ids.length + (create_here ? 1 : 0);
            for (let i = 0; i <= ids.length; i++) {
                if (i === create_at) {
                    rows.push({ key: "edit", kind: "edit", id: null, chain: [], level, parentRow: parent_row, posinset: i + 1, setsize });
                }
                if (i === ids.length) {
                    break;
                }
                const chain = [ids[i]];
                let tail = ids[i];
                while (compact) {
                    const tail_rec = owner.#items.get(tail);
                    if (!TreeMenu.#isFolder(tail_rec.node) || tail_rec.children?.length !== 1 || edit?.parentId === tail || edit?.id === tail) {
                        break;
                    }
                    const only = tail_rec.children[0];
                    if (!TreeMenu.#isFolder(owner.#items.get(only)?.node) || edit?.id === only
                        || (filtering && !parent_matched && !find.visible.has(only))) {
                        break;
                    }
                    tail = only;
                    chain.push(only);
                }
                const matched = parent_matched || (filtering && chain.some(id => find.matches.has(id)));
                const row_index = rows.length;
                rows.push({
                    key: `n:${tail}`, kind: "node", id: tail, chain, level, parentRow: parent_row,
                    posinset: (create_at >= 0 && create_at <= i) ? i + 2 : i + 1, setsize,
                });
                for (const id of chain) {
                    index_by_id.set(id, row_index);
                }
                const tail_rec = owner.#items.get(tail);
                if (owner.#isExpandable(tail_rec) && owner.#isRowExpanded(tail)) {
                    if (tail_rec.error != null) {
                        rows.push({ key: `e:${tail}`, kind: "error", id: tail, chain: [], level: level + 1, parentRow: row_index, posinset: 1, setsize: 1 });
                    } else {
                        walk(tail_rec, level + 1, row_index, matched);
                    }
                }
            }
        };
        walk(owner.#root, 0, -1, false);
        owner.#rows = rows;
        owner.#indexById = index_by_id;
        owner.elements.canvas.style.height = `${rows.length * owner.#rowHeight}px`;

        // the focused node got hidden (collapsed/filtered ancestor) or removed: move focus to the closest visible row
        if (owner.#focusedId != null && !index_by_id.has(owner.#focusedId)) {
            let id = owner.#items.get(owner.#focusedId)?.parentId ?? null;
            if (owner.#items.has(owner.#focusedId)) {
                while (id != null && !index_by_id.has(id)) {
                    id = owner.#items.get(id)?.parentId ?? null;
                }
            }
            if (id == null) {
                const fallback = rows[Math.min(owner.#focusHint, rows.length - 1)];
                id = fallback?.kind === "node" ? fallback.id : null;
            }
            owner.#focusedId = id;
        }
        if (owner.#selectionDirty) {
            owner.#selectionDirty = false;
            owner.#emitSelection();
        }
    }
    #render() {
        const owner = this;
        owner.#renderQueued = false;
        if (owner.#destroyed) {
            return;
        }
        owner.#ensureRows();
        const viewport = owner.elements.viewport;
        const h = owner.#rowHeight;
        const rows = owner.#rows;
        if (owner.#pendingScroll != null && viewport.clientHeight > 0) {
            const pending = owner.#pendingScroll;
            owner.#pendingScroll = null;
            const index = owner.#indexById.get(pending.id);
            if (index != undefined) {
                if (pending.mode === "top") {
                    viewport.scrollTop = index * h;
                } else {
                    owner.#scrollToIndex(index);
                }
            }
        }
        const view_h = viewport.clientHeight || h * 30;
        const first = Math.max(0, Math.floor(viewport.scrollTop / h) - TreeMenu.#ROW_BUFFER);
        const last = Math.min(rows.length, Math.ceil((viewport.scrollTop + view_h) / h) + TreeMenu.#ROW_BUFFER);
        const context = owner.#paintContext();

        // rows keep their element while they stay in range: an inline edit input never gets moved (and blurred) by a scroll
        const next = new Map();
        const missing = [];
        for (let i = first; i < last; i++) {
            const key = rows[i].key;
            const el = owner.#rendered.get(key);
            if (el != undefined) {
                owner.#rendered.delete(key);
                next.set(key, el);
                owner.#paintRow(el, rows[i], i, context);
            } else {
                missing.push(i);
            }
        }
        for (const el of owner.#rendered.values()) {
            el.remove();
            owner.#rowPool.push(el);
        }
        for (const i of missing) {
            const el = owner.#rowPool.pop() ?? owner.#createRowElement();
            if (el.parentElement !== owner.elements.canvas) {
                owner.elements.canvas.appendChild(el);
            }
            next.set(rows[i].key, el);
            owner.#paintRow(el, rows[i], i, context);
        }
        owner.#rendered = next;

        const focused_index = owner.#indexById.get(owner.#focusedId);
        if (focused_index != undefined) {
            owner.#focusHint = focused_index;
        }
        const focused_el = focused_index != undefined ? next.get(rows[focused_index].key) : undefined;
        if (focused_el != undefined) {
            viewport.setAttribute("aria-activedescendant", focused_el.id);
        } else {
            viewport.removeAttribute("aria-activedescendant");
        }
        viewport.classList.toggle("drop-root", owner.#drag?.targetId === null);
        owner.#renderSticky(context);
        owner.#renderState();
    }
    #paintContext() {
        const owner = this;
        const rows = owner.#rows;
        const focused_index = owner.#indexById.get(owner.#focusedId) ?? -1;
        let active_guide = -1;
        if (focused_index >= 0) {
            const focused = rows[focused_index];
            const rec = focused.kind === "node" ? owner.#items.get(focused.id) : null;
            active_guide = (owner.#isExpandable(rec) && owner.#isRowExpanded(focused.id)) ? focused_index : focused.parentRow;
        }
        const drop_target = owner.#drag?.targetId;
        return {
            activeGuide: active_guide,
            dropIndex: drop_target != null ? (owner.#indexById.get(drop_target) ?? -1) : -1,
        };
    }
    #createRowElement() {
        const el = document.createElement("div");
        const guides = document.createElement("div");
        guides.className = "tree-menu-guides";
        const twistie = document.createElement("div");
        const icon = document.createElement("div");
        const label = document.createElement("div");
        label.className = "tree-menu-label";
        const description = document.createElement("span");
        description.className = "tree-menu-description";
        const filler = document.createElement("div");
        filler.className = "tree-menu-filler";
        const actions = document.createElement("div");
        actions.className = "tree-menu-actions";
        const decoration = document.createElement("div");
        el.append(guides, twistie, icon, label, description, filler, actions, decoration);
        el.setAttribute("role", "treeitem");
        el.treeParts = { guides, twistie, icon, label, description, actions, decoration };
        return el;
    }
    #paintRow(el, row, index, context) {
        const owner = this;
        const parts = el.treeParts;
        const edit = owner.#edit;
        el.style.transform = `translateY(${index * owner.#rowHeight}px)`;
        el.style.setProperty("--level", row.level);
        el.dataset.index = index;
        el.id = `${owner.#domId}-${index}`;
        el.setAttribute("aria-level", row.level + 1);
        el.setAttribute("aria-setsize", row.setsize);
        el.setAttribute("aria-posinset", row.posinset);

        const ancestors = new Array(row.level);
        for (let a = row.parentRow, depth = row.level - 1; a >= 0 && depth >= 0; a = owner.#rows[a].parentRow, depth--) {
            ancestors[depth] = a;
        }
        while (parts.guides.childElementCount < row.level) {
            const guide = document.createElement("span");
            guide.className = "tree-menu-guide";
            guide.style.setProperty("--depth", parts.guides.childElementCount);
            parts.guides.appendChild(guide);
        }
        while (parts.guides.childElementCount > row.level) {
            parts.guides.lastElementChild.remove();
        }
        for (let depth = 0; depth < row.level; depth++) {
            parts.guides.children[depth].classList.toggle("active", ancestors[depth] === context.activeGuide);
        }

        const classes = ["tree-menu-row"];
        if (context.dropIndex >= 0 && (index === context.dropIndex || ancestors.includes(context.dropIndex))) {
            classes.push("drop-target");
        }
        const hosts_edit = edit != null && (row.kind === "edit" || (row.kind === "node" && edit.kind === "rename" && row.chain.includes(edit.id)));
        if (hosts_edit) {
            classes.push("editing");
            if (edit.container.parentElement !== el) {
                el.insertBefore(edit.container, parts.label);
            }
        } else if (edit?.container.parentElement === el) {
            edit.container.remove();
        }
        parts.label.hidden = hosts_edit;
        parts.description.hidden = hosts_edit;
        parts.label.style.color = "";
        parts.actions.replaceChildren();
        parts.decoration.className = "tree-menu-decoration";
        parts.decoration.textContent = "";
        parts.decoration.style.color = "";
        el.removeAttribute("aria-expanded");
        el.removeAttribute("aria-selected");
        el.removeAttribute("aria-disabled");

        if (row.kind === "error") {
            const message = `${Locale.at("Failed to load")}: ${owner.#items.get(row.id)?.error ?? ""} · ${Locale.at("click to retry")}`;
            classes.push("error-row");
            parts.twistie.className = "tree-menu-twistie f-icon-i leaf";
            owner.#paintIcon(parts.icon, TreeMenu.#ICON.error);
            parts.label.replaceChildren(message);
            parts.description.textContent = "";
            el.title = message;
            el.draggable = false;
            el.className = classes.join(" ");
            return;
        }
        if (row.kind === "edit") {
            parts.twistie.className = "tree-menu-twistie f-icon-i leaf";
            owner.#paintIcon(parts.icon, edit?.isFolder ? TreeMenu.#ICON.folder : TreeMenu.#ICON.file);
            el.title = "";
            el.draggable = false;
            el.className = classes.join(" ");
            return;
        }

        const rec = owner.#items.get(row.id);
        const node = rec.node;
        const is_folder = TreeMenu.#isFolder(node);
        const expandable = owner.#isExpandable(rec);
        const expanded = expandable && owner.#isRowExpanded(row.id);
        const known_empty = rec.children != null && rec.children.length === 0 && rec.loading == null;
        const selected = row.chain.some(id => owner.#selected.has(id));
        const states = {
            folder: is_folder,
            expanded: expanded,
            selected: selected,
            focused: row.chain.includes(owner.#focusedId),
            active: row.chain.includes(owner.#activeId),
            disabled: node.disabled === true,
        };
        for (const [name, on] of Object.entries(states)) {
            if (on) {
                classes.push(name);
            }
        }
        if (expandable) {
            el.setAttribute("aria-expanded", `${expanded}`);
        }
        el.setAttribute("aria-selected", `${selected}`);
        if (node.disabled) {
            el.setAttribute("aria-disabled", "true");
        }

        parts.twistie.className = `tree-menu-twistie f-icon-i${!expandable || known_empty ? " leaf" : ""}${rec.loading != null ? " loading" : ""}`;
        parts.twistie.textContent = TreeMenu.#glyph(TreeMenu.#ICON.twistie);
        const icon = (expanded && node.iconExpanded) || node.icon
            || (is_folder ? (expanded ? TreeMenu.#ICON.folder_open : TreeMenu.#ICON.folder) : TreeMenu.#ICON.file);
        owner.#paintIcon(parts.icon, icon);

        const label_text = row.chain.map(id => owner.#items.get(id).node.label ?? "").join("/");
        if (!hosts_edit) {
            parts.label.replaceChildren();
            row.chain.forEach((id, k) => {
                if (k > 0) {
                    const separator = document.createElement("span");
                    separator.className = "tree-menu-separator";
                    separator.textContent = "/";
                    parts.label.appendChild(separator);
                }
                const segment = document.createElement("span");
                segment.className = "tree-menu-segment";
                segment.dataset.id = id;
                if (row.chain.length > 1 && owner.#selected.has(id)) {
                    segment.classList.add("selected-segment");
                }
                TreeMenu.#appendHighlighted(segment, owner.#items.get(id).node.label ?? "", owner.#find.matches.get(id));
                parts.label.appendChild(segment);
            });
        }
        const decoration = node.decoration;
        const color = decoration?.color ?? owner.#propagated.get(row.id);
        parts.label.style.color = color ?? "";
        parts.description.textContent = node.description ?? "";
        if (decoration?.badge != null && decoration.badge !== "") {
            parts.decoration.textContent = `${decoration.badge}`;
            if (typeof decoration.badge === "number") {
                parts.decoration.classList.add("badge");
            } else {
                parts.decoration.style.color = color ?? "";
            }
        } else if (color != undefined && decoration?.color == undefined) {
            parts.decoration.classList.add("dot");
            parts.decoration.style.color = color;
        }
        if (!node.disabled && !hosts_edit && !TreeMenu.#isInternal(row.id)) {
            (owner.options.inlineActions ?? []).forEach((action, k) => {
                if (action.when != undefined && !action.when(node)) {
                    return;
                }
                const button = Icons.create(action.icon);
                button.classList.add("tree-menu-icon-button");
                button.dataset.action = k;
                button.title = action.title ?? "";
                parts.actions.appendChild(button);
            });
        }
        el.title = [node.tooltip ?? label_text, decoration?.tooltip].filter(Boolean).join("\n");
        el.draggable = owner.options.onDrop != undefined && !node.disabled && node.draggable !== false && !hosts_edit;
        el.className = classes.join(" ");
    }
    #paintIcon(icon_el, code) {
        if (this.options.showIcons === false) {
            icon_el.className = "tree-menu-icon none";
            return;
        }
        icon_el.className = "tree-menu-icon f-icon-i";
        icon_el.textContent = TreeMenu.#glyph(code);
    }
    static #glyph(code) {
        return String.fromCodePoint(parseInt(code, 16));
    }
    static #appendHighlighted(target, text, indices) {
        if (!indices?.length) {
            target.append(text);
            return;
        }
        const matched = new Set(indices);
        let run = "";
        let run_matched = false;
        const flush = () => {
            if (run === "") {
                return;
            }
            if (run_matched) {
                const mark = document.createElement("span");
                mark.className = "tree-menu-match";
                mark.textContent = run;
                target.appendChild(mark);
            } else {
                target.append(run);
            }
            run = "";
        };
        for (let i = 0; i < text.length; i++) {
            if (matched.has(i) !== run_matched) {
                flush();
                run_matched = matched.has(i);
            }
            run += text[i];
        }
        flush();
    }
    /** parents of the top visible row stay pinned to the top of the viewport */
    #renderSticky(context) {
        const owner = this;
        const sticky = owner.elements.sticky;
        const rows = owner.#rows;
        const h = owner.#rowHeight;
        const scroll_top = owner.elements.viewport.scrollTop;
        const indexes = [];
        if (owner.options.stickyScroll !== false && scroll_top > 0) {
            const max = owner.options.maxStickyRows ?? 5;
            while (indexes.length < max) {
                const position = scroll_top + indexes.length * h;
                const under = Math.floor(position / h);
                if (under >= rows.length) {
                    break;
                }
                let ancestor = under;
                while (ancestor >= 0 && rows[ancestor].level > indexes.length) {
                    ancestor = rows[ancestor].parentRow;
                }
                if (ancestor < 0 || rows[ancestor].level !== indexes.length) {
                    break;
                }
                if (ancestor === under) {
                    // the row itself is partially scrolled out: it sticks only while its children follow
                    const has_children_below = rows[under + 1]?.parentRow === under;
                    if (!(under * h < position && has_children_below)) {
                        break;
                    }
                }
                indexes.push(ancestor);
            }
        }
        owner.#stickyCount = indexes.length;
        while (owner.#stickyElements.length < indexes.length) {
            const el = owner.#createRowElement();
            el.removeAttribute("role");
            owner.#stickyElements.push(el);
        }
        indexes.forEach((index, slot) => {
            const el = owner.#stickyElements[slot];
            owner.#paintRow(el, rows[index], index, context);
            el.removeAttribute("id");
            el.style.transform = "";
            el.draggable = false;
            if (el.parentElement !== sticky) {
                sticky.appendChild(el);
            }
        });
        for (let slot = indexes.length; slot < owner.#stickyElements.length; slot++) {
            owner.#stickyElements[slot].remove();
        }
        sticky.style.width = `${owner.elements.viewport.clientWidth}px`;
    }
    #renderState() {
        const owner = this;
        const root = owner.#root;
        let text = "";
        let retry = false;
        if (root.error != null) {
            text = `${Locale.at("Failed to load")}: ${root.error}`;
            retry = true;
        } else if (root.children == null) {
            text = Locale.at("Loading…");
        } else if (owner.#rows.length === 0) {
            text = owner.#find.text !== "" ? Locale.at("No results") : (owner.options.emptyText ?? Locale.at("Nothing to show"));
        }
        const state_key = `${text}|${retry}`;
        if (state_key === owner.#lastStateText) {
            return;
        }
        owner.#lastStateText = state_key;
        const state = owner.elements.state;
        state.replaceChildren();
        if (text !== "") {
            const message = document.createElement("span");
            message.textContent = text;
            state.appendChild(message);
        }
        if (retry) {
            const button = document.createElement("button");
            button.className = "twj-button";
            button.textContent = Locale.at("Retry");
            button.addEventListener("click", () => owner.refresh());
            state.appendChild(button);
        }
        state.classList.toggle("visible", text !== "");
    }
    #scrollToIndex(index) {
        const owner = this;
        const row = owner.#rows[index];
        if (row == undefined) {
            return;
        }
        const viewport = owner.elements.viewport;
        const view_h = viewport.clientHeight;
        if (view_h === 0) {
            // not attached/visible yet: retried on the next render with a size
            if (row.kind === "node") {
                owner.#pendingScroll = { id: row.id, mode: "reveal" };
            }
            return;
        }
        const h = owner.#rowHeight;
        const top = index * h;
        const sticky_h = owner.options.stickyScroll !== false ? Math.min(row.level, owner.options.maxStickyRows ?? 5) * h : 0;
        if (top < viewport.scrollTop - view_h || top > viewport.scrollTop + 2 * view_h) {
            viewport.scrollTop = top - view_h / 2 + h / 2;// far away: center it
        } else if (top < viewport.scrollTop + sticky_h) {
            viewport.scrollTop = top - sticky_h;
        } else if (top + h > viewport.scrollTop + view_h) {
            viewport.scrollTop = top + h - view_h;
        }
        owner.#queueRender();
    }
    #captureAnchor() {
        const owner = this;
        const scroll_top = owner.elements.viewport.scrollTop;
        if (scroll_top <= 0) {
            return null;
        }
        const index = Math.floor(scroll_top / owner.#rowHeight);
        const row = owner.#rows[index];
        return row == undefined ? null : { key: row.key, offset: scroll_top - index * owner.#rowHeight };
    }
    #restoreAnchor(anchor) {
        const owner = this;
        if (anchor == null) {
            return;
        }
        const index = owner.#rows.findIndex(row => row.key === anchor.key);
        if (index >= 0) {
            owner.elements.viewport.scrollTop = index * owner.#rowHeight + anchor.offset;
        }
    }
    //#endregion

    //#region selection / focus
    #emitSelection() {
        this.options.onSelectionChange?.(this.getSelection());
    }
    #setSelected(ids) {
        const owner = this;
        const next = new Set(ids);
        if (next.size === owner.#selected.size && [...next].every(id => owner.#selected.has(id))) {
            return;
        }
        owner.#selected = next;
        owner.#emitSelection();
        owner.#queueRender();
    }
    #selectRange(from_id, to_id) {
        const owner = this;
        const from = owner.#indexById.get(from_id) ?? owner.#indexById.get(to_id);
        const to = owner.#indexById.get(to_id);
        if (from == undefined || to == undefined) {
            return;
        }
        const ids = [];
        for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
            if (owner.#rows[i].kind === "node") {
                ids.push(owner.#rows[i].id);
            }
        }
        owner.#setSelected(ids);
    }
    #moveFocusTo(index, { extend = false, keepSelection = false } = {}) {
        const owner = this;
        const row = owner.#rows[index];
        if (row?.kind !== "node") {
            return;
        }
        owner.#focusedId = row.id;
        if (extend) {
            owner.#selectRange(owner.#anchorId ?? row.id, row.id);
        } else if (!keepSelection) {
            owner.#anchorId = row.id;
            owner.#setSelected([row.id]);
        }
        owner.#scrollToIndex(index);
        owner.#queueRender();
    }
    /** closest node row from `index` going in `direction`, then the other way */
    #nearestNodeRow(index, direction) {
        const rows = this.#rows;
        index = Math.max(0, Math.min(rows.length - 1, index));
        for (let i = index; i >= 0 && i < rows.length; i += direction) {
            if (rows[i].kind === "node") {
                return i;
            }
        }
        for (let i = index; i >= 0 && i < rows.length; i -= direction) {
            if (rows[i].kind === "node") {
                return i;
            }
        }
        return -1;
    }
    #activate(id, meta) {
        if (TreeMenu.#isBookmarkEntry(id)) {
            this.#openBookmark(id, meta);
            return;
        }
        const node = this.#items.get(id)?.node;
        if (node == undefined || node.disabled) {
            return;
        }
        this.options.onActivate?.(node, meta);
    }
    #toggleRow(index, recursive = false) {
        const owner = this;
        const row = owner.#rows[index];
        if (row?.kind !== "node") {
            return;
        }
        if (owner.#isRowExpanded(row.id)) {
            owner.collapse(row.id, { recursive });
        } else {
            for (const id of row.chain) {
                owner.#expanded.add(id);
            }
            owner.expand(row.id, { recursive });
        }
    }
    //#endregion

    //#region mouse / keyboard
    #rowFromEvent(e) {
        const row_el = e.target.closest?.(".tree-menu-row");
        if (row_el == null) {
            return undefined;
        }
        this.#ensureRows();
        return this.#rows[Number(row_el.dataset.index)];
    }
    /**
     * @param {MouseEvent} e
     * @param {number} sticky_slot - slot of the clicked sticky row, -1 for the normal rows
     */
    #onRowClick(e, sticky_slot) {
        const owner = this;
        if (e.target.closest(".tree-menu-edit")) {
            return;
        }
        const row = owner.#rowFromEvent(e);
        if (row == undefined) {
            return;
        }
        const index = owner.#indexById.get(row.id) ?? Number(e.target.closest(".tree-menu-row").dataset.index);
        if (sticky_slot >= 0) {
            owner.elements.viewport.focus();
        }
        if (row.kind === "error") {
            owner.expand(row.id);
            return;
        }
        if (row.kind !== "node") {
            return;
        }
        const action_el = e.target.closest("[data-action]");
        if (action_el != null) {
            owner.options.inlineActions?.[Number(action_el.dataset.action)]?.run(owner.#items.get(row.id).node, e);
            return;
        }
        if (e.target.closest(".tree-menu-twistie")) {
            owner.#toggleRow(index, e.altKey);
            return;
        }
        if (sticky_slot >= 0) {
            // scroll so the clicked parent lands right under the sticky rows above it
            owner.elements.viewport.scrollTop = (index - sticky_slot) * owner.#rowHeight;
        }
        const id = e.target.closest(".tree-menu-segment")?.dataset.id ?? row.id;
        const node = owner.#items.get(id).node;
        const ctrl = e.ctrlKey || e.metaKey;
        owner.#focusedId = id;
        if (ctrl && owner.#multi) {
            const next = new Set(owner.#selected);
            next.has(id) ? next.delete(id) : next.add(id);
            owner.#anchorId = id;
            owner.#setSelected(next);
            owner.#queueRender();
            return;
        }
        if (e.shiftKey && owner.#multi) {
            owner.#selectRange(owner.#anchorId ?? id, id);
            owner.#queueRender();
            return;
        }
        owner.#anchorId = id;
        owner.#setSelected([id]);
        if (TreeMenu.#isFolder(node)) {
            if (owner.options.expandOnClick !== false) {
                owner.#toggleRow(index, e.altKey);
            }
        } else if (e.detail < 2) {// the second click of a double click is handled by dblclick
            owner.#activate(id, { pinned: false, side: false });
        }
        owner.#queueRender();
    }
    #onRowDoubleClick(e) {
        const owner = this;
        if (e.target.closest(".tree-menu-edit, .tree-menu-twistie, [data-action]")) {
            return;
        }
        const row = owner.#rowFromEvent(e);
        if (row?.kind !== "node") {
            return;
        }
        const id = e.target.closest(".tree-menu-segment")?.dataset.id ?? row.id;
        if (!TreeMenu.#isFolder(owner.#items.get(id).node)) {
            owner.#activate(id, { pinned: true, side: false });
        } else if (owner.options.expandOnClick === false) {
            owner.#toggleRow(owner.#indexById.get(id));
        }
    }
    /** @param {string|null} id - node right-clicked, null for the empty area */
    #hasContextMenu(id) {
        const internal = TreeMenu.#isInternal(id);
        return (this.options.onContextMenu != undefined && !internal) || (id != null && this.#bookmarksEnabled());
    }
    /** the caller's menu for normal rows when it has one, the built-in bookmarks menu otherwise */
    #openContextMenu(id, e, position) {
        const owner = this;
        if (owner.options.onContextMenu != undefined && !TreeMenu.#isInternal(id)) {
            owner.options.onContextMenu(id == null ? [] : owner.getSelection(), e, position);
        } else {
            owner.#showBookmarkMenu(id, position);
        }
    }
    #onContextMenu(e) {
        const owner = this;
        if (e.target.closest(".tree-menu-edit")) {
            return;
        }
        const row = owner.#rowFromEvent(e);
        const id = row?.kind === "node" ? (e.target.closest(".tree-menu-segment")?.dataset.id ?? row.id) : null;
        if (row?.kind === "error" || !owner.#hasContextMenu(id)) {
            return;// browser default menu
        }
        e.preventDefault();
        if (id != null) {
            if (!owner.#selected.has(id)) {
                owner.#anchorId = id;
                owner.#setSelected([id]);
            }
            owner.#focusedId = id;
        } else {
            owner.#setSelected([]);
        }
        owner.#queueRender();
        owner.#openContextMenu(id, e, { clientX: e.clientX, clientY: e.clientY });
    }
    #openContextMenuForFocused(e) {
        const owner = this;
        const id = owner.#focusedId;
        const index = owner.#indexById.get(id);
        if (index == undefined || !owner.#hasContextMenu(id)) {
            return;
        }
        if (!owner.#selected.has(id)) {
            owner.#setSelected([id]);
        }
        const el = owner.#rendered.get(owner.#rows[index].key);
        const rect = (el ?? owner.elements.viewport).getBoundingClientRect();
        owner.#openContextMenu(id, e, { clientX: rect.left + 24 + owner.#rows[index].level * (owner.options.indent ?? 12), clientY: rect.bottom });
    }
    /** @param {KeyboardEvent} e */
    #onKeyDown(e) {
        const owner = this;
        if (e.target !== owner.elements.viewport) {
            return;
        }
        owner.#ensureRows();
        const rows = owner.#rows;
        const index = owner.#indexById.get(owner.#focusedId) ?? -1;
        const row = rows[index];
        const rec = row?.kind === "node" ? owner.#items.get(row.id) : null;
        const ctrl = e.ctrlKey || e.metaKey;
        let handled = true;
        switch (e.key) {
            case "ArrowDown":
            case "ArrowUp":
            case "Home":
            case "End":
            case "PageDown":
            case "PageUp": {
                if (rows.length === 0) {
                    break;
                }
                const page = Math.max(1, Math.floor(owner.elements.viewport.clientHeight / owner.#rowHeight) - 1);
                const target = {
                    ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: rows.length - 1, PageDown: index + page, PageUp: index - page,
                }[e.key];
                const direction = (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "End") ? -1 : 1;
                owner.#moveFocusTo(owner.#nearestNodeRow(target, direction), { extend: e.shiftKey && owner.#multi, keepSelection: ctrl });
                break;
            }
            case "ArrowRight": {
                if (!owner.#isExpandable(rec)) {
                    break;
                }
                if (!owner.#isRowExpanded(row.id)) {
                    owner.#toggleRow(index);
                } else if (rec.error != null) {
                    owner.expand(row.id);// retry
                } else if (rows[index + 1]?.parentRow === index) {
                    owner.#moveFocusTo(owner.#nearestNodeRow(index + 1, 1), { keepSelection: ctrl });
                }
                break;
            }
            case "ArrowLeft": {
                if (row == undefined) {
                    break;
                }
                if (owner.#isExpandable(rec) && owner.#isRowExpanded(row.id)) {
                    owner.collapse(row.id);
                } else if (row.parentRow >= 0) {
                    owner.#moveFocusTo(row.parentRow, { keepSelection: ctrl });
                }
                break;
            }
            case "Enter": {
                if (rec == null) {
                    break;
                }
                if (ctrl) {
                    owner.#activate(owner.#focusedId, { pinned: true, side: true });
                } else if (TreeMenu.#isFolder(rec.node)) {
                    owner.#toggleRow(index);
                } else {
                    owner.#activate(owner.#focusedId, { pinned: true, side: false });
                }
                break;
            }
            case " ": {
                if (rec == null) {
                    break;
                }
                if (ctrl && owner.#multi) {
                    const next = new Set(owner.#selected);
                    next.has(owner.#focusedId) ? next.delete(owner.#focusedId) : next.add(owner.#focusedId);
                    owner.#setSelected(next);
                } else {
                    owner.#anchorId = owner.#focusedId;
                    owner.#setSelected([owner.#focusedId]);
                    if (!TreeMenu.#isFolder(rec.node)) {
                        owner.#activate(owner.#focusedId, { pinned: false, side: false });
                    }
                }
                break;
            }
            case "*": {
                const parent = owner.#rec(rec?.parentId ?? null);
                for (const id of parent?.children ?? []) {
                    if (owner.#isExpandable(owner.#items.get(id))) {
                        owner.expand(id);
                    }
                }
                break;
            }
            case "a":
            case "A": {
                if (!ctrl || !owner.#multi) {
                    handled = false;
                    break;
                }
                owner.#setSelected(rows.filter(r => r.kind === "node").map(r => r.id));
                break;
            }
            case "f":
            case "F": {
                handled = ctrl;
                if (ctrl) {
                    owner.#openFind("");
                }
                break;
            }
            case "F2": {
                owner.rename();
                break;
            }
            case "Delete": {
                // on shortcuts, Delete unpins: the original is never deleted from inside "Bookmarks"
                const pinned = [...owner.#selected].filter(id => TreeMenu.#isBookmarkEntry(id));
                if (pinned.length > 0) {
                    owner.removeBookmark(pinned.map(id => id.slice(TreeMenu.#BOOKMARK_PREFIX.length)));
                    break;
                }
                const nodes = owner.getSelection().filter(node => !node.disabled);
                if (owner.options.onDelete == undefined || nodes.length === 0) {
                    handled = false;
                    break;
                }
                owner.options.onDelete(nodes);
                break;
            }
            case "Escape": {
                if (owner.#find.open) {
                    owner.#closeFind();
                } else if (owner.#selected.size > 0) {
                    owner.#setSelected([]);
                } else {
                    handled = false;
                }
                break;
            }
            case "ContextMenu": {
                owner.#openContextMenuForFocused(e);
                break;
            }
            case "F10": {
                handled = e.shiftKey;
                if (e.shiftKey) {
                    owner.#openContextMenuForFocused(e);
                }
                break;
            }
            default:
                handled = false;
        }
        if (!handled && e.key.length === 1 && e.key !== " " && !ctrl && !e.altKey) {
            owner.#openFind(e.key);// type-ahead
            handled = true;
        }
        if (handled) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
    //#endregion

    //#region find
    /** @returns {Array<number>|null} indices of `label` matched by `query`: contiguous when possible, else as a subsequence */
    static #match(query, label) {
        const q = query.toLowerCase();
        const l = label.toLowerCase();
        const at = l.indexOf(q);
        if (at >= 0) {
            return Array.from({ length: q.length }, (_, k) => at + k);
        }
        const indices = [];
        for (let i = 0, j = 0; i < l.length && j < q.length; i++) {
            if (l[i] === q[j]) {
                indices.push(i);
                j++;
            }
        }
        return indices.length === q.length ? indices : null;
    }
    #computeFind() {
        const owner = this;
        const find = owner.#find;
        find.matches = new Map();
        find.visible = null;
        find.forceOpen = null;
        if (find.text === "") {
            find.collapsed.clear();
            return;
        }
        for (const [id, rec] of owner.#items) {
            const indices = TreeMenu.#match(find.text, rec.node.label ?? "");
            if (indices != null) {
                find.matches.set(id, indices);
            }
        }
        if (find.mode !== "filter") {
            return;
        }
        // matches plus all their ancestors stay visible, and the ancestors are opened without touching #expanded
        find.visible = new Set();
        find.forceOpen = new Set();
        for (const id of find.matches.keys()) {
            find.visible.add(id);
            for (let p = owner.#items.get(id).parentId; p != null && !find.forceOpen.has(p); p = owner.#items.get(p)?.parentId) {
                find.forceOpen.add(p);
                find.visible.add(p);
            }
        }
    }
    /** re-runs the current search on newly loaded nodes, without moving the focus */
    #refreshFind() {
        if (this.#find.text === "") {
            return;
        }
        this.#computeFind();
        this.#updateFindCount();
    }
    #applyFind(move_focus) {
        const owner = this;
        const find = owner.#find;
        owner.#computeFind();
        owner.#queueRender(true);
        owner.#ensureRows();
        owner.#updateFindCount();
        if (!move_focus || find.matches.size === 0) {
            return;
        }
        const index = owner.#indexById.get(owner.#focusedId) ?? -1;
        const focused_matches = index >= 0 && owner.#rows[index].chain.some(id => find.matches.has(id));
        if (!focused_matches) {
            owner.#focusedId = null;
            owner.#gotoMatch(1);
        }
    }
    #gotoMatch(direction) {
        const owner = this;
        owner.#ensureRows();
        const rows = owner.#rows;
        const start = owner.#indexById.get(owner.#focusedId) ?? (direction > 0 ? -1 : 0);
        for (let k = 1; k <= rows.length; k++) {
            const i = (start + direction * k + rows.length * 2) % rows.length;
            if (rows[i].kind === "node" && rows[i].chain.some(id => owner.#find.matches.has(id))) {
                owner.#moveFocusTo(i, { keepSelection: true });
                return;
            }
        }
    }
    #updateFindCount() {
        const owner = this;
        const find = owner.#find;
        const count = find.matches.size;
        owner.elements.find_count.textContent = find.text === "" ? ""
            : count === 0 ? Locale.at("No results") : `${count} ${Locale.at(count === 1 ? "result" : "results")}`;
        owner.elements.find_bar.classList.toggle("no-matches", find.text !== "" && count === 0);
    }
    #updateFindModeButton() {
        const owner = this;
        const filter = owner.#find.mode === "filter";
        owner.elements.find_mode_button.classList.toggle("checked", filter);
        owner.elements.find_mode_button.title = filter ? Locale.at("Filter mode: non-matching rows are hidden") : Locale.at("Highlight mode: matches are only highlighted");
    }
    #openFind(initial_text) {
        const owner = this;
        const input = owner.elements.find_input;
        owner.#find.open = true;
        owner.elements.find_bar.classList.add("open");
        if (initial_text !== "") {
            input.value += initial_text;
            owner.#find.text = input.value.trim();
            owner.#applyFind(true);
        }
        input.focus();
    }
    #closeFind() {
        const owner = this;
        owner.#find.open = false;
        owner.#find.text = "";
        owner.elements.find_input.value = "";
        owner.elements.find_bar.classList.remove("open");
        owner.#applyFind(false);
        owner.elements.viewport.focus();
        const index = owner.#indexById.get(owner.#focusedId);
        if (index != undefined) {
            owner.#scrollToIndex(index);
        }
    }
    //#endregion

    //#region inline edit
    #beginEdit(edit) {
        const owner = this;
        if (owner.#edit?.busy) {
            return;// the previous edit is still being committed
        }
        owner.#cancelEdit(false);
        const input = document.createElement("input");
        input.type = "text";
        input.className = "tree-menu-edit-input";
        input.spellcheck = false;
        input.autocomplete = "off";
        const error = document.createElement("div");
        error.className = "tree-menu-edit-error";
        const container = document.createElement("div");
        container.className = "tree-menu-edit";
        container.append(input, error);
        input.value = edit.id != null ? (owner.#items.get(edit.id).node.label ?? "") : "";
        owner.#edit = { ...edit, container, input, error, busy: false };

        input.addEventListener("input", () => owner.#validateEdit());
        input.addEventListener("keydown", (e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
                e.preventDefault();
                owner.#commitEdit(false);
            } else if (e.key === "Escape") {
                e.preventDefault();
                owner.#cancelEdit(true);
            }
        });
        input.addEventListener("blur", () => {
            if (owner.#edit?.input === input) {
                owner.#commitEdit(true);
            }
        });
        for (const type of ["click", "dblclick", "mousedown", "contextmenu"]) {
            container.addEventListener(type, (e) => e.stopPropagation());
        }

        owner.#queueRender(true);
        owner.#ensureRows();
        const index = edit.kind === "create" ? owner.#rows.findIndex(row => row.kind === "edit") : owner.#indexById.get(edit.id);
        owner.#scrollToIndex(index);
        owner.#render();// synchronously, so the input is in the DOM and can take the focus
        input.focus();
        const dot = input.value.lastIndexOf(".");
        input.setSelectionRange(0, dot > 0 && !edit.isFolder ? dot : input.value.length);
    }
    /** @returns {string} the validation error, "" when valid */
    #validateEdit() {
        const owner = this;
        const edit = owner.#edit;
        if (edit == null) {
            return "";
        }
        const value = edit.input.value.trim();
        let message = "";
        if (value === "") {
            message = Locale.at("A name must be provided");
        } else {
            const siblings = owner.#rec(edit.parentId)?.children ?? [];
            const duplicate = siblings.some(id => id !== edit.id && !TreeMenu.#isInternal(id)
                && owner.#items.get(id)?.node.label?.toLowerCase() === value.toLowerCase());
            if (duplicate) {
                message = `${Locale.at("An item with this name already exists here")}: ${value}`;
            }
        }
        if (message === "" && owner.options.validateName != undefined) {
            const node = edit.id != null ? owner.#items.get(edit.id)?.node ?? null : null;
            const parent = edit.parentId != null ? owner.#items.get(edit.parentId)?.node ?? null : null;
            message = owner.options.validateName(value, node, parent) ?? "";
        }
        owner.#showEditError(message);
        return message;
    }
    #showEditError(message) {
        const edit = this.#edit;
        if (edit == null) {
            return;
        }
        edit.error.textContent = message;
        edit.input.classList.toggle("invalid", message !== "");
    }
    async #commitEdit(from_blur) {
        const owner = this;
        const edit = owner.#edit;
        if (edit == null || edit.busy) {
            return;
        }
        const value = edit.input.value.trim();
        const unchanged = edit.kind === "rename" && value === owner.#items.get(edit.id)?.node.label;
        if (unchanged || (edit.kind === "create" && value === "")) {
            owner.#cancelEdit(!from_blur);
            return;
        }
        const error = owner.#validateEdit();
        if (error !== "") {
            if (from_blur) {
                owner.#cancelEdit(false);
            }
            return;
        }
        edit.busy = true;
        edit.input.readOnly = true;
        let new_id = null;
        try {
            if (edit.kind === "rename") {
                const node = owner.#items.get(edit.id).node;
                const result = await owner.options.onRename(node, value);
                if (result?.id != null && result.id !== edit.id) {
                    owner.#replaceNode(edit.id, result);
                } else {
                    owner.updateNode({ ...(result ?? {}), id: edit.id, label: result?.label ?? value });
                }
                new_id = result?.id ?? edit.id;
            } else {
                const parent = edit.parentId != null ? owner.#items.get(edit.parentId)?.node ?? null : null;
                const created = await owner.options.onCreate(parent, value, edit.isFolder);
                if (created?.id != null) {
                    owner.addNode(edit.parentId, created);
                    new_id = created.id;
                }
            }
        } catch (e) {
            // keep the input open with the error, so the name can be fixed
            edit.busy = false;
            edit.input.readOnly = false;
            owner.#showEditError(TreeMenu.#errorText(e));
            if (!from_blur) {
                edit.input.focus();
            }
            return;
        }
        owner.#edit = null;
        edit.container.remove();
        owner.#queueRender(true);
        // committed by a blur: the user already moved on (e.g. clicked another row), don't take the selection back
        if (new_id != null && !from_blur) {
            owner.#focusedId = new_id;
            owner.#anchorId = new_id;
            owner.#setSelected([new_id]);
            owner.#ensureRows();
            owner.#scrollToIndex(owner.#indexById.get(new_id));
            owner.elements.viewport.focus();
        }
    }
    #cancelEdit(refocus) {
        const owner = this;
        const edit = owner.#edit;
        if (edit == null || edit.busy) {
            return;
        }
        owner.#edit = null;// before remove(): the blur it fires must not commit
        edit.container.remove();
        owner.#queueRender(true);
        if (refocus) {
            owner.elements.viewport.focus();
        }
    }
    #replaceNode(old_id, node) {
        const owner = this;
        const parent_id = owner.#items.get(old_id)?.parentId ?? null;
        const was_expanded = owner.#expanded.delete(old_id);
        owner.removeNode(old_id);
        owner.addNode(parent_id, node);
        if (was_expanded) {
            owner.#expanded.add(node.id);
        }
    }
    //#endregion

    //#region drag & drop
    /** @param {DragEvent} e */
    #onDragStart(e) {
        const owner = this;
        const row = owner.#rowFromEvent(e);
        if (owner.options.onDrop == undefined || row?.kind !== "node") {
            e.preventDefault();
            return;
        }
        const id = e.target.closest?.(".tree-menu-segment")?.dataset.id ?? row.id;
        if (!owner.#selected.has(id)) {
            owner.#anchorId = id;
            owner.#setSelected([id]);
        }
        owner.#focusedId = id;
        const nodes = owner.getSelection().filter(node => !node.disabled && node.draggable !== false);
        if (nodes.length === 0) {
            e.preventDefault();
            return;
        }
        owner.#drag = { ids: nodes.map(node => node.id), targetId: undefined, hoverIndex: -1, expandTimer: 0 };
        e.dataTransfer.effectAllowed = "copyMove";
        e.dataTransfer.setData("text/plain", nodes.map(node => node.label).join("\n"));
        const ghost = document.createElement("div");
        ghost.className = "tree-menu-drag-ghost";
        ghost.textContent = nodes.length === 1 ? nodes[0].label : `${nodes.length} ${Locale.at("items")}`;
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, -12, -12);
        setTimeout(() => ghost.remove(), 0);
    }
    /** @param {DragEvent} e */
    #onDragOver(e) {
        const owner = this;
        const drag = owner.#drag;
        if (drag == null) {
            return;// external drags aren't handled
        }
        owner.#ensureRows();
        const viewport = owner.elements.viewport;
        const rect = viewport.getBoundingClientRect();
        if (e.clientY < rect.top + TreeMenu.#DRAG_EDGE_PX) {
            viewport.scrollTop -= owner.#rowHeight;
        } else if (e.clientY > rect.bottom - TreeMenu.#DRAG_EDGE_PX) {
            viewport.scrollTop += owner.#rowHeight;
        }
        const index = Math.floor((e.clientY - owner.elements.canvas.getBoundingClientRect().top) / owner.#rowHeight);
        const row = owner.#rows[index];
        // a folder is a target itself, anything else drops into its parent
        let target_index = -1;
        if (row != undefined) {
            const is_folder = row.kind === "node" && TreeMenu.#isFolder(owner.#items.get(row.id).node);
            target_index = is_folder ? index : row.parentRow;
        }
        if (index !== drag.hoverIndex) {
            clearTimeout(drag.expandTimer);
            drag.hoverIndex = index;
            if (row?.kind === "node" && target_index === index && !owner.#isRowExpanded(row.id)) {
                const hover_id = row.id;
                drag.expandTimer = setTimeout(() => {
                    const hover_index = owner.#indexById.get(hover_id);
                    if (owner.#drag === drag && hover_index != undefined && !owner.#isRowExpanded(hover_id)) {
                        owner.#toggleRow(hover_index);
                    }
                }, TreeMenu.#DRAG_EXPAND_DELAY_MS);
            }
        }
        const target_id = target_index >= 0 ? owner.#rows[target_index].id : null;
        if (!owner.#canDropOn(target_id)) {
            e.dataTransfer.dropEffect = "none";
            owner.#setDropTarget(undefined);
            return;
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = (e.ctrlKey || e.altKey) ? "copy" : "move";
        owner.#setDropTarget(target_id);
    }
    #canDropOn(target_id) {
        const owner = this;
        const drag = owner.#drag;
        if (TreeMenu.#isInternal(target_id)) {
            return false;
        }
        for (const id of drag.ids) {
            if (id === target_id) {
                return false;
            }
            for (let p = owner.#items.get(target_id)?.parentId; p != null; p = owner.#items.get(p)?.parentId) {
                if (p === id) {
                    return false;// into its own descendant
                }
            }
        }
        if (drag.ids.every(id => (owner.#items.get(id)?.parentId ?? null) === target_id)) {
            return false;// already there
        }
        if (owner.options.canDrop != undefined) {
            const target = target_id != null ? owner.#items.get(target_id).node : null;
            return owner.options.canDrop(drag.ids.map(id => owner.#items.get(id).node), target) !== false;
        }
        return true;
    }
    /** @param {string|null|undefined} target_id - null = root, undefined = no valid target */
    #setDropTarget(target_id) {
        const drag = this.#drag;
        if (drag == null || drag.targetId === target_id) {
            return;
        }
        drag.targetId = target_id;
        this.#queueRender();
    }
    /** @param {DragEvent} e */
    async #onDrop(e) {
        const owner = this;
        const drag = owner.#drag;
        if (drag == null || drag.targetId === undefined) {
            return;
        }
        e.preventDefault();
        const nodes = drag.ids.map(id => owner.#items.get(id)?.node).filter(Boolean);
        const target = drag.targetId != null ? owner.#items.get(drag.targetId)?.node ?? null : null;
        const copy = e.ctrlKey || e.altKey;
        owner.#endDrag();
        try {
            await owner.options.onDrop(nodes, target, { copy });
        } catch (err) {
            console.error(err);
        }
    }
    #endDrag() {
        const owner = this;
        if (owner.#drag == null) {
            return;
        }
        clearTimeout(owner.#drag.expandTimer);
        owner.#drag = null;
        owner.#queueRender();
    }
    //#endregion

    //#region header / persistence
    #buildHeader() {
        const owner = this;
        const options = owner.options;
        owner.elements.header.classList.toggle("hidden", options.title == undefined && options.headerActions == undefined);
        owner.elements.title.textContent = options.title ?? "";
        const actions = [...(options.headerActions ?? [])];
        actions.push({ icon: TreeMenu.#ICON.collapse_all, title: Locale.at("Collapse All"), run: () => owner.collapseAll() });
        if (options.provider?.getChildren != undefined) {
            actions.push({ icon: TreeMenu.#ICON.refresh, title: Locale.at("Refresh"), run: () => owner.refresh() });
        }
        for (const action of actions) {
            const button = Icons.create(action.icon);
            button.classList.add("tree-menu-icon-button");
            button.addEventListener("click", (e) => action.run(e));
            UiBuilder.addHint({ hint: action.title, target: button });
            owner.elements.header_actions.appendChild(button);
        }
    }
    #loadState() {
        if (this.#stateKey === "") {
            return null;
        }
        try {
            return JSON.parse(localStorage.getItem(this.#stateKey) ?? "null");
        } catch {
            return null;
        }
    }
    #scheduleSave() {
        const owner = this;
        if (owner.#stateKey === "") {
            return;
        }
        clearTimeout(owner.#saveTimer);
        owner.#saveTimer = setTimeout(() => owner.#saveState(), TreeMenu.#SAVE_DEBOUNCE_MS);
    }
    #saveState() {
        const owner = this;
        if (owner.#stateKey === "") {
            return;
        }
        // ids no longer in the tree are dropped, unless the restore that may still load them is in progress
        const expanded = [...owner.#expanded].filter(id => owner.#restorePending || owner.#items.has(id));
        const top_row = owner.#rows[Math.floor(owner.elements.viewport.scrollTop / owner.#rowHeight)];
        try {
            localStorage.setItem(owner.#stateKey, JSON.stringify({ expanded, top: top_row?.kind === "node" ? top_row.id : null }));
        } catch {
            // storage unavailable/full: the tree just won't remember its state
        }
    }
    //#endregion

    //#region public API
    /** @returns {TreeMenuNode|undefined} */
    getNode(id) {
        return this.#items.get(id)?.node;
    }
    /** @returns {Array<TreeMenuNode>} selected nodes, in visual order (shortcuts inside "Bookmarks" excluded) */
    getSelection() {
        const owner = this;
        return [...owner.#selected]
            .filter(id => !TreeMenu.#isInternal(id))
            .sort((a, b) => (owner.#indexById.get(a) ?? Infinity) - (owner.#indexById.get(b) ?? Infinity))
            .map(id => owner.#items.get(id)?.node)
            .filter(Boolean);
    }
    /** @param {Array<string>} ids */
    setSelection(ids) {
        this.#setSelected(ids.filter(id => this.#items.has(id)));
    }
    /** @returns {TreeMenuNode|undefined} */
    getFocused() {
        return this.#items.get(this.#focusedId)?.node;
    }
    focus() {
        this.elements.viewport.focus();
    }
    /**
     * @param {string} id
     * @param {{recursive?: boolean}} [opts]
     */
    async expand(id, { recursive = false } = {}) {
        const owner = this;
        const rec = owner.#items.get(id);
        if (!owner.#isExpandable(rec)) {
            return;
        }
        owner.#expanded.add(id);
        owner.#find.collapsed.delete(id);
        owner.#queueRender(true);
        owner.#scheduleSave();
        if (rec.stale) {
            rec.stale = false;
            owner.#reload(rec);// shows the cached children right away, updates them when fresh
        }
        await owner.#loadChildren(rec);
        const children = rec.children ?? [];
        if (owner.options.compactFolders && children.length === 1 && TreeMenu.#isFolder(owner.#items.get(children[0])?.node)) {
            // a compacted row is expanded as a whole: open the single child too, or the row would look collapsed
            await owner.expand(children[0], { recursive });
        }
        if (recursive) {
            await Promise.all(children.filter(cid => owner.#isExpandable(owner.#items.get(cid))).map(cid => owner.expand(cid, { recursive: true })));
        }
    }
    /**
     * @param {string} id
     * @param {{recursive?: boolean}} [opts] - also collapse every loaded descendant
     */
    collapse(id, { recursive = false } = {}) {
        const owner = this;
        const collapse_one = (cid) => {
            owner.#expanded.delete(cid);
            if (owner.#find.forceOpen?.has(cid)) {
                owner.#find.collapsed.add(cid);
            }
            if (recursive) {
                for (const child_id of owner.#items.get(cid)?.children ?? []) {
                    collapse_one(child_id);
                }
            }
        };
        collapse_one(id);
        // the focus was inside: it moves onto the collapsed row
        for (let p = owner.#items.get(owner.#focusedId)?.parentId; p != null; p = owner.#items.get(p)?.parentId) {
            if (p === id) {
                owner.#focusedId = id;
                break;
            }
        }
        owner.#queueRender(true);
        owner.#scheduleSave();
    }
    collapseAll() {
        const owner = this;
        owner.#expanded.clear();
        owner.#find.collapsed = new Set(owner.#find.forceOpen ?? []);
        let top = owner.#focusedId;
        while (owner.#items.get(top)?.parentId != null) {
            top = owner.#items.get(top).parentId;
        }
        owner.#focusedId = top;
        owner.#queueRender(true);
        owner.#ensureRows();
        owner.#scrollToIndex(owner.#indexById.get(top));
        owner.#scheduleSave();
    }
    /**
     * re-fetches a subtree from the provider (and its expanded descendants) keeping expansion, selection, focus and scroll.
     * Calls made in the same burst are coalesced into one reload
     * @param {string|null} [id] - null/omitted = the whole tree
     * @returns {Promise<void>}
     */
    refresh(id = null) {
        const owner = this;
        if (owner.#pendingRefresh == null) {
            const pending = { ids: new Set(), promise: null };
            pending.promise = new Promise(resolve => setTimeout(async () => {
                owner.#pendingRefresh = null;
                const ids = pending.ids.has(null) ? [null] : [...pending.ids].filter(cid => {
                    for (let p = owner.#items.get(cid)?.parentId; p != null; p = owner.#items.get(p)?.parentId) {
                        if (pending.ids.has(p)) {
                            return false;// an ancestor is reloaded anyway
                        }
                    }
                    return true;
                });
                if (pending.ids.has(null)) {
                    owner.#root.error = null;
                }
                await Promise.all(ids.map(cid => {
                    const rec = owner.#rec(cid);
                    return rec != undefined ? owner.#reload(rec) : null;
                }));
                resolve();
            }, TreeMenu.#REFRESH_DEBOUNCE_MS));
            owner.#pendingRefresh = pending;
        }
        owner.#pendingRefresh.ids.add(id ?? null);
        return owner.#pendingRefresh.promise;
    }
    /**
     * replaces the roots of an eager tree (`options.nodes`), keeping the state of the ids still present
     * @param {Array<TreeMenuNode>} nodes
     */
    setNodes(nodes) {
        this.#ingest(this.#root, nodes);
        this.#afterDataChange();
    }
    /**
     * merges `patch` into the node with the same id and re-sorts its siblings
     * @param {Partial<TreeMenuNode> & {id: string}} patch
     */
    updateNode(patch) {
        const owner = this;
        const rec = owner.#items.get(patch.id);
        if (rec == undefined) {
            return;
        }
        rec.node = { ...rec.node, ...patch };
        if (Array.isArray(patch.children)) {
            owner.#ingest(rec, patch.children);
        }
        const parent = owner.#rec(rec.parentId);
        if (parent?.children != null) {
            parent.children = owner.#sortNodes(parent.children.map(id => owner.#items.get(id).node)).map(node => node.id);
        }
        owner.#afterDataChange();
    }
    /**
     * @param {string|null} parent_id - null = root
     * @param {TreeMenuNode} node
     */
    addNode(parent_id, node) {
        const owner = this;
        const parent = owner.#rec(parent_id);
        if (parent?.children == null) {
            owner.#queueRender(true);// not loaded yet: it will come with the next load
            return;
        }
        // re-ingest the logical children (nested ones included) so sorting and nesting apply to the new node too
        const nodes = [];
        for (const id of parent.children) {
            if (TreeMenu.#isInternal(id)) {
                continue;
            }
            const rec = owner.#items.get(id);
            nodes.push(rec.node);
            if (!TreeMenu.#isFolder(rec.node)) {
                nodes.push(...(rec.children ?? []).map(cid => owner.#items.get(cid).node));
            }
        }
        nodes.push(node);
        owner.#ingest(parent, nodes, { nesting: parent === owner.#root || TreeMenu.#isFolder(parent.node) });
        owner.#afterDataChange();
    }
    /** @param {string} id */
    removeNode(id) {
        const owner = this;
        const rec = owner.#items.get(id);
        if (rec == undefined) {
            return;
        }
        const parent = owner.#rec(rec.parentId);
        if (parent?.children != null) {
            parent.children = parent.children.filter(cid => cid !== id);
            if (parent.children.length === 0 && parent !== owner.#root && !TreeMenu.#isFolder(parent.node)) {
                parent.children = null;// a nesting primary with nothing nested left
            }
        }
        owner.#forget(id);
        owner.#afterDataChange();
    }
    /**
     * expands the ancestors of a node, scrolls it into view (centered when it was far away) and optionally selects/focuses it
     * @param {string} id
     * @param {{select?: boolean, focus?: boolean, expand?: boolean}} [opts]
     * @returns {Promise<boolean>} false when the node can't be found
     */
    async reveal(id, { select = true, focus = true, expand = false } = {}) {
        const owner = this;
        if (!owner.#items.has(id) && owner.options.provider?.getParent != undefined) {
            // walk up to a loaded ancestor, then load back down
            const path = [];
            let current = id;
            while (current != null && !owner.#items.has(current)) {
                path.unshift(current);
                current = await owner.options.provider.getParent(current);
            }
            let parent = owner.#rec(current ?? null);
            for (const step of path) {
                if (parent == undefined) {
                    break;
                }
                if (parent !== owner.#root) {
                    owner.#expanded.add(parent.id);
                }
                await owner.#loadChildren(parent);
                parent = owner.#items.get(step);
            }
        }
        const rec = owner.#items.get(id);
        if (rec == undefined) {
            return false;
        }
        const ancestors = [];
        for (let p = rec.parentId; p != null; p = owner.#items.get(p)?.parentId) {
            ancestors.unshift(p);
        }
        for (const ancestor of ancestors) {
            owner.#expanded.add(ancestor);
            owner.#find.collapsed.delete(ancestor);
            await owner.#loadChildren(owner.#items.get(ancestor));
        }
        if (expand) {
            await owner.expand(id);
        }
        owner.#queueRender(true);
        owner.#ensureRows();
        if (select) {
            owner.#anchorId = id;
            owner.#setSelected([id]);
        }
        if (focus) {
            owner.#focusedId = id;
        }
        owner.#scrollToIndex(owner.#indexById.get(id));
        owner.#scheduleSave();
        return true;
    }
    /**
     * marks the node matching what's open elsewhere (current file/page); with `reveal` it's also expanded to, selected and scrolled into view
     * @param {string|null} id
     * @param {{reveal?: boolean}} [opts]
     */
    setActive(id, { reveal = false } = {}) {
        this.#activeId = id;
        this.#queueRender();
        if (reveal && id != null) {
            return this.reveal(id);
        }
    }
    /**
     * shows the find widget with `text` (empty string clears it)
     * @param {string} text
     */
    filter(text) {
        const owner = this;
        if (text === "") {
            owner.#closeFind();
            return;
        }
        owner.elements.find_input.value = "";
        owner.#openFind(text);
    }
    /** @returns {boolean} */
    isBookmarked(id) {
        return this.#bookmarks.some(b => b.id === id);
    }
    /** @returns {Array<{id: string, label: string, icon?: string, folder: boolean, path: string}>} pinned nodes, in pin order */
    getBookmarks() {
        return this.#bookmarks.map(b => ({ ...b }));
    }
    /**
     * pins nodes into the "Bookmarks" branch (created when missing, and expanded) and saves them to localStorage
     * @param {string|Array<string>} ids - loaded nodes; already pinned ones are skipped
     */
    addBookmark(ids) {
        const owner = this;
        if (!owner.#bookmarksEnabled()) {
            return;
        }
        const branch_existed = owner.#bookmarks.length > 0;
        for (const id of [ids].flat()) {
            const node = owner.#items.get(id)?.node;
            if (node == undefined || TreeMenu.#isInternal(id) || owner.isBookmarked(id)) {
                continue;
            }
            const path = [];
            for (let p = owner.#items.get(id).parentId; p != null; p = owner.#items.get(p)?.parentId) {
                path.unshift(owner.#items.get(p)?.node.label ?? "");
            }
            owner.#bookmarks.push({ id, label: node.label, icon: node.icon, folder: TreeMenu.#isFolder(node), path: path.join("/") });
        }
        owner.#saveBookmarks();
        if (!branch_existed && owner.#bookmarks.length > 0) {
            owner.#expanded.add(TreeMenu.#BOOKMARKS_ID);
            owner.#scheduleSave();
        }
        owner.#afterDataChange();
    }
    /**
     * unpins nodes; the "Bookmarks" branch disappears with the last one
     * @param {string|Array<string>} ids - original ids (not the shortcut ids)
     */
    removeBookmark(ids) {
        const owner = this;
        if (!owner.#bookmarksEnabled()) {
            return;
        }
        const remove = new Set([ids].flat());
        owner.#bookmarks = owner.#bookmarks.filter(b => !remove.has(b.id));
        owner.#saveBookmarks();
        owner.#afterDataChange();
    }
    /**
     * starts the inline input for a new node (requires `options.onCreate`)
     * @param {string|null} [parent_id] - omitted = the focused folder (or the folder of the focused leaf), null = root
     * @param {boolean} [is_folder]
     */
    async createNode(parent_id = undefined, is_folder = false) {
        const owner = this;
        if (owner.options.onCreate == undefined) {
            return;
        }
        if (parent_id === undefined) {
            const focused = owner.#items.get(owner.#focusedId);
            parent_id = focused == undefined ? null : (TreeMenu.#isFolder(focused.node) ? focused.id : focused.parentId);
        }
        if (TreeMenu.#isInternal(parent_id)) {
            parent_id = null;
        }
        // nested files can't host children: create next to them
        while (parent_id != null && !TreeMenu.#isFolder(owner.#items.get(parent_id)?.node)) {
            parent_id = owner.#items.get(parent_id)?.parentId ?? null;
        }
        if (parent_id != null) {
            await owner.reveal(parent_id, { select: false, focus: false, expand: true });
        }
        owner.#beginEdit({ kind: "create", id: null, parentId: parent_id, isFolder: is_folder });
    }
    /**
     * starts the inline rename (requires `options.onRename`)
     * @param {string} [id] - default the focused node
     */
    rename(id = this.#focusedId) {
        const owner = this;
        const rec = owner.#items.get(id);
        if (owner.options.onRename == undefined || rec == undefined || rec.node.disabled || TreeMenu.#isInternal(id)) {
            return;
        }
        owner.#ensureRows();
        if (!owner.#indexById.has(id)) {
            return;
        }
        owner.#beginEdit({ kind: "rename", id, parentId: rec.parentId, isFolder: TreeMenu.#isFolder(rec.node) });
    }
    //#endregion

    destroy(timeout_ms = 0) {
        const owner = this;
        if (owner.#saveTimer) {
            clearTimeout(owner.#saveTimer);
            owner.#saveState();
        }
        owner.#endDrag();
        owner.#destroyed = true;
        owner.#resizeObserver?.disconnect();
        super.destroy(timeout_ms);
    }
}


//#START RESERVED AREA FOR UI_BUILDER
///*mock for the UIBuilder::live-watch-component uncomment to test it  */
// setTimeout(() => {
//     const mock_container = document.createElement("div");
//     mock_container.style.display = "grid";
//     mock_container.style.gridTemplateColumns = "repeat(3, 1fr)";
//     mock_container.style.gap = "16px";
//     mock_container.style.padding = "20px";
//     document.body.appendChild(mock_container);

//     // fake file system: ~3000 nodes, lazily served with a delay, one folder that always fails
//     const make_children = (path, depth) => {
//         if (path.endsWith("broken")) {
//             throw new Error("access denied");
//         }
//         if (path.endsWith("deep")) {
//             return [{ id: `${path}/a`, label: "a", hasChildren: true }];
//         }
//         if (depth > 3) {
//             return [];
//         }
//         const nodes = [];
//         for (let i = 1; i <= 6; i++) {
//             nodes.push({ id: `${path}/folder${i}`, label: `folder${i}`, hasChildren: true });
//         }
//         nodes.push({ id: `${path}/deep`, label: "deep", hasChildren: true });
//         nodes.push({ id: `${path}/broken`, label: "broken", hasChildren: true });
//         for (let i = 1; i <= 12; i++) {
//             nodes.push({ id: `${path}/file${i}.js`, label: `file${i}.js`, decoration: i === 3 ? { badge: "M", color: "#e2c08d", propagate: true } : undefined });
//             nodes.push({ id: `${path}/file${i}.min.js`, label: `file${i}.min.js` });
//         }
//         return nodes;
//     };
//     const provider = {
//         getChildren: (node) => new Promise((resolve, reject) => setTimeout(() => {
//             try {
//                 resolve(make_children(node?.id ?? "root", (node?.id ?? "root").split("/").length));
//             } catch (e) {
//                 reject(e);
//             }
//         }, 300)),
//         getParent: async (id) => id.includes("/") ? id.slice(0, id.lastIndexOf("/")) : null,
//     };

//     const mock_variants = [
//         {
//             title: "1) Explorer completo",
//             options: {
//                 id: "mock-explorer", title: "Explorer", provider, compactFolders: true, nesting: { "*.js": ["${base}.min.js"] },
//                 inlineActions: [{ icon: "e89c", title: "New file", when: (node) => node.hasChildren === true, run: (node) => console.log("new file in", node.id) }],
//                 onActivate: (node, meta) => console.log("activate", node.id, meta),
//                 onSelectionChange: (nodes) => console.log("selection", nodes.map(n => n.id)),
//                 onRename: async (node, label) => { await new Promise(r => setTimeout(r, 200)); if (label.includes("x")) throw new Error("'x' non permesso (test errore)"); },
//                 onCreate: async (parent, label, is_folder) => ({ id: `${parent?.id ?? "root"}/${label}`, label, hasChildren: is_folder || undefined }),
//                 onDelete: (nodes) => nodes.forEach(n => tree_ref.removeNode(n.id)),
//                 onDrop: (nodes, target) => console.log("drop", nodes.map(n => n.id), "->", target?.id ?? "root"),
//             },
//             test: "Espandi/comprimi con mouse e tastiera (frecce, Home/End, *, Alt+click sul triangolino), digita per filtrare, F2 per rinominare (una 'x' nel nome genera un errore), tasto destro > Add to Bookmarks su un file e su una cartella (poi click sul segnalibro, Canc su un segnalibro), Canc, trascina un file su una cartella, scrolla dentro una cartella profonda. Ricarica la pagina.",
//             expect: "Righe virtualizzate fluide; 'deep/a/a/...' compattate in una riga; file*.min.js annidati sotto file*.js; 'broken' mostra la riga d'errore con retry; file3.js colora di giallo le cartelle antenate; i genitori restano in alto durante lo scroll; il ramo 'Bookmarks' compare in cima e il click su un segnalibro rivela l'originale; dopo il reload segnalibri, le cartelle aperte e lo scroll vengono ripristinati.",
//         },
//         {
//             title: "2) Nodi statici, highlight mode",
//             options: {
//                 title: "Impostazioni", findMode: "highlight", multiSelect: false, expanded: ["general"],
//                 nodes: [
//                     { id: "general", label: "Generale", children: [{ id: "lang", label: "Lingua", icon: "e894" }, { id: "theme", label: "Tema", icon: "e40a" }] },
//                     { id: "network", label: "Rete", children: [{ id: "proxy", label: "Proxy", disabled: true }, { id: "timeout", label: "Timeout", description: "30s" }] },
//                     { id: "about", label: "Informazioni", icon: "e88e" },
//                 ],
//                 onActivate: (node) => console.log("open settings page", node.id),
//             },
//             test: "Digita 'te' con l'albero a fuoco, poi Invio / Shift+Invio nel campo di ricerca.",
//             expect: "Nessuna riga nascosta: il fuoco salta tra 'Tema' e 'Timeout' con le lettere evidenziate; 'Proxy' è visibile ma disabilitato.",
//         },
//         {
//             title: "3) Comfortable + vuoto",
//             options: { density: "comfortable", indentGuides: "always", nodes: [], emptyText: "Nessun elemento" },
//             test: "Osserva il componente.",
//             expect: "Compare il messaggio 'Nessun elemento' al centro.",
//         },
//     ];
//     let tree_ref = null;
//     for (const variant of mock_variants) {
//         const slot = document.createElement("div");
//         slot.style.display = "flex";
//         slot.style.flexDirection = "column";
//         slot.style.gap = "6px";
//         slot.style.border = "1px solid #ccc";
//         slot.style.borderRadius = "6px";
//         slot.style.padding = "10px";
//         mock_container.appendChild(slot);
//         const label = document.createElement("div");
//         label.style.fontWeight = "600";
//         label.textContent = variant.title;
//         slot.appendChild(label);
//         const host = document.createElement("div");
//         host.style.height = "420px";
//         slot.appendChild(host);
//         const tree = new TreeMenu(variant.options);
//         tree_ref ??= tree;
//         host.appendChild(tree.elementReference());
//         const instructions = document.createElement("div");
//         instructions.style.fontSize = "12px";
//         instructions.style.opacity = "0.85";
//         instructions.style.borderTop = "1px dashed #999";
//         instructions.style.paddingTop = "4px";
//         instructions.innerHTML = `<b>Testare:</b> ${variant.test}<br><b>Aspettarsi:</b> ${variant.expect}`;
//         slot.appendChild(instructions);
//     }
// }, 0);
//#END RESERVED AREA FOR UI_BUILDER
