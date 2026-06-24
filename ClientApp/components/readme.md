# components

Shared UI widgets — reusable across standalone pages, injectable apps, and view components. These are the building blocks of the framework's component library.

## How they are loaded

Components are **auto-detected**: `JSProvider.buildJSComponents` scans each app's JS source for enum member names (`JS.components`, `JS.utils`) and adds the matching component to the load list. A fixed set is always included regardless of detection:

> AppStatus, UiBuilder, Notify, Locale, Icons, Logger, AppRouter, SpaHistory, BottomSheet, MousePopUp, Tooltip

## Folder structure

Each component lives in a subfolder named after the `JS.components` enum value:

```
components/
  MyWidget/
    MyWidget.html       ← required
    MyWidget.js         ← required
    MyWidget.css        ← required
    MyWidget.min.*      ← required (release build)
```

To add a new component, create the folder + files and add the name to the `JS.components` enum.

## Files

### `{Widget}.html` — required

The component template. `fw-id` attributes become typed element references; `(click)` / `(change)` / `(keydown)` etc. are compiled to `addEventListener` calls — all injected into the JS constructor by `linkJSToFWHTML`.

### `{Widget}.js` — required

The component class. The placeholder `${injector_html}` is replaced with the processed HTML at assembly time. The placeholder `${injector_css}` (used in the legacy `getJSComponent` path) is replaced with the raw CSS text.

### `{Widget}.css` — required

Component-scoped styles. When loaded via `getJSComponentPair` (the current path), the CSS is returned separately and merged into the page's CSS bundle, not inlined into the JS.

## Current components

`BottomNavBar`, `BottomSheet`, `DatePicker`, `DockWindow`, `DragAndDrop`, `Insight`, `ListBox`, `MousePopUp`, `Notify`, `PieChart`, `SideBarLeft`, `SpeedActions`, `SpeedDial`, `Table`, `Table2`, `ThemeSelector`, `Tooltip`
