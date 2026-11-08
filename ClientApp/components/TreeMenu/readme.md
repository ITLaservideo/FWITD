# TreeMenu

Hierarchical, expandable list of nodes: a folder/file explorer, a settings tree, a category menu.

> **Status:** implemented in `TreeMenu.js` (v1.0). The design sections below explain *why* it behaves the way it does; §12 is the actual API. Not covered yet: sticky-scroll "push" animation, drop *between* rows (order-preserving trees), undo of moves (left to the caller).

The benchmarks are the **VS Code Explorer** and the **Android Studio Project view**. People use both for hours a day without thinking about the tree itself. A tree that feels that invisible is the goal. The rest of this document breaks down what makes them feel that way.

---

## 1. Anatomy of a row

```
│ │ ▸ 📁 components            ●  ⋯
│ │ ▾ 📁 TreeMenu
│ │ │   📄 TreeMenu.js       M   2
└─┴─┴── indent guides
        ▸/▾ twistie   icon   label   decorations   inline actions (on hover)
```

| Part | What good looks like |
|---|---|
| **Indent** | Fixed step per level (VS Code: 8px by default, configurable). It must be the same at every depth so columns line up. |
| **Indent guides** | Thin vertical lines that connect a parent to its children. VS Code shows them only on hover/focus by default, which keeps the tree quiet until you need to trace depth. The guide of the *active* subtree is drawn brighter. |
| **Twistie** | Its own fixed-width slot, even on leaves (leaves get an empty slot), so labels never shift sideways. It rotates (▸ → ▾) instead of swapping glyphs. While children are loading it turns into a spinner. |
| **Icon** | Shows the node type (folder open/closed, file by extension). It's optional, but if any row has one, every row reserves the space. |
| **Label** | Single line, ellipsis on overflow, full text in a tooltip. Matched characters are highlighted while filtering. |
| **Description** | Optional dimmed secondary text after the label (VS Code uses it for "relative path", Android Studio for module type). |
| **Decorations** | Right-aligned status: badge counts, git letters (`M`, `U`), error dots. They also tint the label, and the tint **propagates to collapsed ancestors** (a folder turns red if something inside has errors). |
| **Inline actions** | Small icon buttons that appear only on hover/focus of that row (e.g. "new file", "refresh"). They never shift the layout when they appear. |

Row height is fixed (VS Code uses 22px) and the **whole row width** is the hit/hover/selection target, not just the label text.

---

## 2. States a row can be in

These are independent and each needs its own visual:

| State | Meaning | Typical visual |
|---|---|---|
| **Hover** | Mouse is over it | Subtle background |
| **Focused** | Keyboard cursor is here (exactly one row) | Outline / focus ring |
| **Selected** | Part of the selection (0..n rows) | Solid background |
| **Selected + tree has focus** vs **selected + tree unfocused** | — | Strong accent vs muted grey. This is how users tell where keystrokes will go. |
| **Active / opened** | The node that matches what's open elsewhere (current file, current page) | Can be the same as selected, but it stays correct after a refresh |
| **Drop target** | Valid target during drag | Highlight the whole target *folder* subtree, not the single row |
| **Cut / pending** | Cut to clipboard, being renamed, being created | Dimmed / inline input |
| **Disabled** | Visible but not actionable | Reduced opacity, still focusable for screen readers |

The most common mistake is merging *focus* and *selection*. With multi-select you need to move the focus without changing the selection (Ctrl+Arrow in VS Code).

---

## 3. Mouse interaction

- **Single click** on a row: select it. On a leaf, open it (VS Code opens in *preview* mode, an italic tab that the next single click replaces).
- **Double click** on a leaf: open it "pinned". On a folder: toggle.
- **Click on a folder row**: toggles expansion (VS Code default). Clicking the twistie always toggles, without changing the selection.
- **Alt/Shift + click on a twistie**: expand/collapse the whole subtree recursively.
- **Ctrl+click / Shift+click**: toggle / range multi-select.
- **Right click**: select the row first if it isn't already in the selection, then open the context menu (use `MousePopUp`). The menu acts on the whole selection.
- **Middle-click / Ctrl+Enter**: open to the side (where applicable).

### Drag & drop

- Dragging starts only after a few pixels of movement, so it never steals a click.
- Hovering over a collapsed folder while dragging **auto-expands it after ~500 ms**.
- Hovering near the top/bottom edge **auto-scrolls**.
- The drop indicator makes clear whether you're dropping *into* a folder or *between* rows (when order matters).
- An invalid drop (onto self, onto own descendant) shows a "not allowed" cursor and does nothing.
- Esc cancels. Moves can be undone.

---

## 4. Keyboard

Follow the [WAI-ARIA Tree View pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/). VS Code and Android Studio both match it closely:

| Key | Action |
|---|---|
| `↑` / `↓` | Previous / next *visible* row |
| `→` | Closed folder: expand. Open folder: move to its first child. Leaf: nothing. |
| `←` | Open folder: collapse. Otherwise: move to parent. |
| `Home` / `End` | First / last visible row |
| `PageUp` / `PageDown` | Move by one viewport |
| `Enter` | Open / activate |
| `Space` | Toggle selection (or open in preview) |
| `*` (numpad) | Expand all siblings |
| `Shift + ↑/↓` | Extend selection |
| `Ctrl + ↑/↓` | Move focus without changing selection |
| `Ctrl + A` | Select all visible |
| `F2` | Rename inline |
| `Delete` | Delete (with confirmation or undo) |
| Typing letters | Type-ahead: jump to / filter rows whose label matches (see §6) |
| `Esc` | Clear filter → clear selection → leave inline edit |

The tree is **one tab stop**: `Tab` enters the tree on the last focused row and the next `Tab` leaves it. Arrows move inside it. Use a *roving tabindex* (only the focused row has `tabindex="0"`) or `aria-activedescendant` on the container.

---

## 5. Inline editing

VS Code never opens a dialog to create or rename a file. It puts a text input **in the row itself**:

- **New file/folder**: expand the target folder, insert a temporary row with an input in the correct sorted position, and focus it.
- **Rename**: replace the label with an input and pre-select the name *without the extension*.
- **Validate as you type** and show the error in a small popup anchored under the input ("A file with this name already exists"). Don't wait for Enter.
- `Enter` commits, `Esc` cancels, blur commits (VS Code) or cancels. Pick one and be consistent.
- If the backend call fails, roll back the optimistic row and show the error. Never leave a ghost row behind.

---

## 6. Finding things

Large trees live or die on this.

- **Type-ahead**: VS Code supports two modes. *Highlight* moves focus to the next matching row and highlights the matches. *Filter* hides non-matching rows. Both are useful; filter is better for big trees.
- When filtering, **keep the ancestors of every match visible** (otherwise matches have no context) and auto-expand them. Restore the previous expansion state when the filter is cleared.
- **Fuzzy matching** with matched characters highlighted (`trmn` → **T**ree**M**e**n**u).
- Show the match count, and an empty state when nothing matches ("No results for 'xyz'").
- **Reveal** (VS Code "Auto Reveal", Android Studio "Always Select Opened File"): when the user opens something elsewhere, expand its ancestors, scroll it into view (centered if it was far away, minimal scroll if it was near), and mark it active. Users must be able to turn this off.

---

## 7. Structure and presentation

Things that make deep or noisy trees readable:

- **Sorting**: folders first, then natural sort (`file2` before `file10`), case-insensitive. Make it configurable, but default to this.
- **Compact folders** (VS Code `explorer.compactFolders`, Android Studio "Compact Middle Packages"): merge a chain of single-child folders into one row, `src/main/java`. Each segment stays clickable on its own.
- **File nesting** (VS Code `explorer.fileNesting`): group related children under a primary one. In this repo that would mean showing `X.min.js` / `X.min.css` / `X.min.html` collapsed under `X.js`, which removes half the noise from every component folder.
- **Sticky scroll** (VS Code): while scrolling inside a deep folder, the parent rows stick to the top of the viewport, so you always know where you are. Clicking a sticky row scrolls to it.
- **Multiple projections of the same data** (Android Studio's *Project* / *Android* / *Packages* views): the same nodes grouped differently. Design the data provider so a "view" is only a different `getChildren` function.
- **Collapse All** button in the header. Expand All only when the tree is small or lazily bounded.
- **Empty folder**: show it as expandable but with no children, not as a leaf. When a lazy load returns nothing, remove the twistie.

---

## 8. Performance

A file tree can easily hold 10k+ nodes. The rules that keep VS Code smooth:

1. **Virtualize rendering.** Flatten the *visible* nodes (expanded ancestors only) into an array and render only the rows in the viewport plus a small buffer. With a fixed row height, `firstIndex = floor(scrollTop / rowHeight)`. The DOM size stays constant regardless of tree size.
2. **Lazy load children.** A node can say `hasChildren: true` without providing them. Fetch on first expand (e.g. a `Lobby.post(...)` call), show a spinner on the twistie, cache the result, and handle errors on that row (with a retry), not globally.
3. **Key everything by stable `id`**, never by index or label. Expansion, selection, focus and scroll anchoring all survive a refresh only if ids are stable.
4. **Incremental updates.** `refresh(node)` re-fetches and re-renders that subtree only. Never rebuild the whole tree because one file changed.
5. **Preserve the view across refreshes**: expanded set, selection, focus, and scroll position anchored to the top visible node (not to raw `scrollTop`, which jumps when rows above get inserted).
6. **Debounce bursts** of change events (a `git checkout` touches hundreds of files at once).
7. **Use event delegation**: one listener on the container that resolves the row from `event.target.closest('[data-id]')`, not N listeners per row.

---

## 9. Persistence

- Persist the **expanded node ids** (and optionally the scroll anchor) per tree instance, so reopening the page restores the tree as the user left it. Use `localStorage` keyed by a tree id, or `AppSettings` through a controller if it has to survive across machines.
- Prune ids that no longer exist instead of letting the stored set grow forever.

---

## 10. Accessibility

| Element | Attributes |
|---|---|
| Container | `role="tree"`, `aria-label`, `aria-multiselectable="true"` if multi-select |
| Row | `role="treeitem"`, `aria-level`, `aria-expanded` (folders only), `aria-selected` |
| Row (virtualized) | `aria-setsize` and `aria-posinset`, because screen readers can't count rows that aren't in the DOM |
| Children wrapper (non-virtualized) | `role="group"` |

- Respect `prefers-reduced-motion` for twistie rotation and expand animations.
- Contrast must hold for *selected + unfocused* rows too. That's the state that usually fails.
- Never convey a status by colour alone. Git decorations use a letter and a colour.

---

## 11. Theming

Every colour is a CSS custom property defaulting to the matching `--vscode-*` theme variable (`list-*`, `tree-indentGuidesStroke`, `sideBarStickyScroll-*`, `listFilterWidget-*`…), so `ThemeSelector` themes work without touching component CSS:

```css
--tree-row-height: 22px;   /* set by JS from options.rowHeight / density */
--tree-indent: 12px;       /* set by JS from options.indent */
--tree-hover-bg: ...;
--tree-selected-bg: ...;
--tree-selected-inactive-bg: ...;
--tree-focus-outline: ...;
--tree-indent-guide: ...;
--tree-indent-guide-active: ...;
--tree-highlight-fg: ...;
--tree-drop-bg: ...;
```

`density: "compact"` (default, 22px rows) or `"comfortable"` (32px rows, row actions always visible, since touch has no hover).

---

## 12. API

Shaped after VS Code's `TreeDataProvider`: the tree asks for data and doesn't own it. Every option and the `TreeMenuNode` typedef are documented with JSDoc at the top of `TreeMenu.js`. This is the short version.

```js
const tree = new TreeMenu({
    id: "explorer",                        // key for persisted state (localStorage); omit to persist nothing
    title: "Explorer",                     // header (with collapse all / refresh) shown only with title or headerActions
    provider: {                            // lazy data source...
        getChildren: async (node) => (await Lobby.postAsync("Files/List", { path: node?.id ?? "" })).nodes,
        getParent: async (id) => ...,      // optional, lets reveal() reach nodes not loaded yet
    },
    // nodes: [...],                       // ...or eager nodes with nested `children` (update with setNodes)
    compactFolders: true,
    nesting: { "*.js": ["${base}.min.js", "${base}.min.css"] },
    findMode: "filter",                    // "filter" | "highlight"
    inlineActions: [{ icon: "e89c", title: "New file", when: (n) => n.hasChildren, run: (n) => tree.createNode(n.id) }],
    onActivate: (node, { pinned, side }) => {},
    onSelectionChange: (nodes) => {},
    bookmarks: true,                       // default; needs `id`
    onContextMenu: (nodes, event, position) => new MousePopUp({ event: position, /* ... */ }), // replaces the built-in menu
    onRename: async (node, newLabel) => {},           // throw to reject (message shown under the input)
    onCreate: async (parent, label, isFolder) => ({ id, label }),
    onDelete: (nodes) => {},                          // confirm, delete, then removeNode()/refresh()
    onDrop: async (nodes, target, { copy }) => {},    // move the data, then refresh()
});
host.appendChild(tree.elementReference());
```

| Method | What it does |
|---|---|
| `refresh(id?)` | Re-fetch a subtree (whole tree without `id`) and its expanded descendants. Expansion, selection, focus and scroll are kept, and calls in the same burst are merged into one. |
| `setNodes(nodes)` / `addNode(parentId, node)` / `updateNode(patch)` / `removeNode(id)` | Change the data in place without going through the provider. |
| `reveal(id, { select, focus, expand })` | Expand the ancestors, then scroll the node into view (centered if it was far away). |
| `setActive(id, { reveal })` | Mark the node that's open elsewhere. With `reveal`, also do the "auto reveal" (callers decide whether it's on). |
| `expand(id, { recursive })` / `collapse(id, { recursive })` / `collapseAll()` | Expand or collapse nodes. |
| `getSelection()` / `setSelection(ids)` / `getFocused()` / `getNode(id)` / `focus()` | Read or set selection and focus. |
| `filter(text)` | Open the find widget with `text`. An empty string closes it. |
| `createNode(parentId?, isFolder)` / `rename(id?)` | Start inline create or rename. |
| `addBookmark(ids)` / `removeBookmark(ids)` / `isBookmarked(id)` / `getBookmarks()` | Manage bookmarks from code, for example from your own `onContextMenu`. |

### Bookmarks

Right-click any leaf or branch and choose **Add to Bookmarks** to pin it (the whole selection when it's part of one). This works like IntelliJ's *Favorites*:

- A **`Bookmarks`** branch is created the first time something is pinned, always as the first root, and expanded. It disappears when the last bookmark is removed.
- Each entry is a *shortcut*, not a copy. Clicking it reveals and selects the original in the tree (via `reveal()`), and opens it with `onActivate` when it's a leaf. A pinned branch isn't expandable inside Bookmarks, because the same ids can't appear twice in the tree.
- They're saved in `localStorage` under `TreeMenu:<id>:bookmarks` as `{ id, label, icon, folder, path }` snapshots, in pin order. The label and icon follow the original whenever it's loaded. Bookmarks are user data, so they're saved even with `persistState: false`. Without `options.id` (no storage key), bookmarks are off and right-click keeps the browser menu.
- To remove one: right-click it (or its original) and choose **Remove from Bookmarks**, or press `Delete` on the shortcut. That only unpins, it never calls `onDelete`. Right-click the branch for **Remove all Bookmarks**.
- Opening a bookmark whose original can't be reached shows a `Notify` error for branches. This happens when the node was deleted, or it sits in a lazy branch that was never loaded and there's no `provider.getParent`. Leaves are still passed to `onActivate` as their snapshot, so the caller can open them by id.
- The branch and its shortcuts never reach the caller. They're excluded from `getSelection()` / `onSelectionChange` / `onDrop` / `onDelete`, can't be renamed, dragged or used as drop targets, and don't get `inlineActions`.
- When `onContextMenu` is set, the caller's menu replaces the built-in one on normal rows. Add the entry yourself with `isBookmarked()` / `addBookmark()` / `removeBookmark()`. Rows inside Bookmarks always use the built-in menu.

---

## 13. Anti-patterns

- Re-rendering the whole tree on every change, so you lose scroll, focus and expansion.
- Only the label text is clickable, not the full row.
- Labels that jump sideways because leaves have no twistie slot or icons are conditional.
- A modal dialog for rename / new item.
- Click-to-expand that also moves the selection when the user only clicked the twistie.
- Focus and selection drawn identically, or the selection not visibly dimmed when the tree loses focus.
- Expansion state lost on refresh or page reload.
- Filtering that hides the parents of matches.
- Auto-reveal that you can't turn off and that yanks the scroll position while the user is browsing.
- Spinners or errors that block the whole tree when only one folder failed to load.
- Animating expand/collapse of thousands of rows (only animate small subtrees, or not at all).

---

## 14. Checklist

**Baseline (must have)**
- [x] Stable ids, fixed row height, consistent indent, twistie slot on every row
- [x] Full-row hover/selection, distinct focus vs selection, dimmed when tree unfocused
- [x] Complete keyboard support (§4), single tab stop
- [x] Lazy children with per-node loading/error state
- [x] ARIA roles and attributes (§10)
- [x] Expansion/selection preserved across `refresh`
- [x] Theming through CSS variables

**Great (what makes it feel like VS Code / Android Studio)**
- [x] Virtualized rendering
- [x] Type-ahead find with filter mode, fuzzy match highlighting, ancestors kept
- [x] Reveal active item (toggleable)
- [x] Inline rename/create with live validation
- [x] Multi-select + context menu acting on the selection
- [x] Drag & drop with hover-to-expand and edge auto-scroll
- [x] Decorations that propagate to collapsed ancestors
- [x] Indent guides on hover, sticky scroll for deep trees
- [x] Compact folders and file nesting
- [x] Persisted expansion state across sessions
