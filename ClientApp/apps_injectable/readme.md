# apps_injectable

Injectable apps are JavaScript bundles that are **injected into an existing WebView page** at runtime (as opposed to `apps_standalone`, which own their full HTML document). The host app calls `JSProvider.getScriptApp(injectable_apps.MyApp)` and receives a single self-contained JS string ready to evaluate.

## Folder structure

Each app lives in a subfolder whose name **exactly matches** the corresponding `JS.injectable_apps` enum value declared in `JSProvider.cs`:

```
apps_injectable/
  MyApp/
    MyApp.js          ← required
    MyApp.min.js      ← required (release build)
    MyApp.html        ← optional
    MyApp.css         ← optional
    lib/              ← optional extra JS, loaded automatically
      extra.js
      extra.min.js
```

To add a new injectable app, create the folder + files **and** add its name to the `JS.injectable_apps` enum.

## Files

### `{AppName}.js` / `{AppName}.min.js` — **required**

The main application script. Must export a class named `App` with a no-arg constructor — the framework instantiates it as:

```js
setTimeout(() => { window.the_main_app = new App(); }, 0);
```

The placeholder `@fromwho` inside the script is replaced with the app name at load time.

Which file is picked depends on the build configuration:

| Configuration | File loaded |
|---|---|
| `DEBUG` + `USE_JS_NON_MINIMIZED_FILES` | `AppName.js` |
| All other builds | `AppName.min.js` |

### `{AppName}.html` — optional

If present, the HTML is processed by `linkJSToFWHTML`: `fw-id`, `(click)`, `(change)`, `(keydown)`, etc. attributes are parsed and wired up as `addEventListener` calls injected into the JS constructor, so the app gets typed element references without manual `querySelector` boilerplate.

### `{AppName}.css` — optional

If present, the CSS is concatenated with the shared framework CSS (theme vars + animations + component styles) and injected into the page via a dynamically created `<style>` element.

### Sub-subdirectories (`lib/`, etc.) — optional

Any `.js` files found in sub-subdirectories (recursively, excluding folders named `components`) are loaded and prepended to the main script. Use this for splitting large apps into modules.

## Build output

In `DEBUG + WINDOWS` the assembled JS is written to `FWITD/out/{AppName}.js` for inspection. The result is cached in memory for the lifetime of the process (cache is cleared on each request in `DEBUG + WINDOWS` so file changes are picked up without restart).

## Shared framework assets bundled in

Every injectable app automatically receives:

- **FrameworkGC** — core framework + owner id wiring  
- **AppStatus** — app-level state  
- **UiBuilder**, **Notify**, **Locale**, **Icons**, **Logger**, **AppRouter**, **SpaHistory**, **BottomSheet**, **MousePopUp**, **Tooltip** — always included  
- Additional `components` / `utils` — auto-detected by scanning the app's JS source for enum member names
