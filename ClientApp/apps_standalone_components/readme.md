# apps_standalone_components

Page-level **view components** — larger, feature-specific pieces of UI that belong to a concrete standalone page. They are referenced in the `JS.components_views` dictionary in `JSProvider.cs` and are distinct from the shared reusable widgets in `components/`.

## How they differ from `components/`

| | `apps_standalone_components/` | `components/` |
|---|---|---|
| Scope | Tied to a specific page / domain feature | Reusable across all app types |
| Loaded from | `path_script_apps_standalone_components` | `path_App + "components/"` |
| Registration | `JS.components_views` dictionary | `JS.components` enum (auto-detected) |
| Can have children | Yes — via `components/` subfolder | No nested children |

## Folder structure

```
apps_standalone_components/
  MyView/
    MyView.html         ← required
    MyView.js           ← required
    MyView.css          ← required
    MyView.min.*        ← required (release build)
    components/         ← optional — child components for this view
      ChildWidget/
        ChildWidget.js / .html / .css / .min.*
```

Each component lives in a subfolder named after the `JS.components` enum value. To add a new view component, create the folder + files, add the name to `JS.components`, and register any children in `JS.components_views`.

## Files

### `{View}.html` — required

The component's HTML template. `fw-id`, `(click)`, `(change)` etc. attributes are processed by `linkJSToFWHTML` to wire event listeners automatically.

### `{View}.js` — required

The component class. Inlined into `${injector_html}` placeholder after HTML processing.

### `{View}.css` — required

Component-scoped styles. Returned as the `Value` of the `KeyValuePair` from `getJSComponentPair` and concatenated into the page's CSS bundle.

### `components/` subfolder — optional

Child components specific to this view. Declared in the `components_views` dictionary entry for the parent. Loaded from `{path_standalone_components}{ViewName}/components`.

## Current view components

| Component | Child components |
|---|---|
| `AndroidVeiwStatoMotori` | — |
| `AndroidViewAccount` | — |
| `AndroidViewAnalytics` | — |
| `AndroidViewHome` | — |
| `AndroidViewInventory` | `PosizioneMotore` |
| `AndroidViewLogin` | `OTPComponent` |
| `AndroidViewSalesDrivenRestock` | `CardRefillmentSuggestions` |
| `AndroidViewSettings` | — |
| `AndroidViewTasks` | `TaskItem` |
| `DataAnalizis1` | — |
| `SystemSettings` | — |
