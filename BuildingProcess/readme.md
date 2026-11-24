# BuildingProcess

Dev tooling for `FWITD/ClientApp`. `FWITD` is a git submodule
(`FWITD`), so anything added here is shared across every consumer
checkout (FWShellWPF, FWShellMAUI, UiBuilder) - no need to duplicate tooling
per repo.

## MinifyClientApp.bat

Regenerates every `Name.min.js` / `Name.min.css` / `Name.min.html` in
`ClientApp/` from its `Name.js` / `Name.css` / `Name.html` source, replacing
the old manual workflow of opening each file in VS Code and letting the
**MinifyAll** extension write the `.min.*` file on save.

- JS goes through **terser**, using the same `mangle`/`compress` options this
  repo had configured for MinifyAll (`scripts/minify-client-app.js`, top of
  file).
- HTML goes through **html-minifier-terser** (whitespace/comment stripping,
  inline `<script>` minified via the same terser options).
- CSS goes through a small **hand-written** minifier, not clean-css or
  lightningcss. `ClientApp`'s CSS uses native CSS nesting (`&::after`, bare
  `>.selector {}`) and intentionally ships duplicate standard + vendor-prefixed
  declarations (`backdrop-filter` + `-webkit-backdrop-filter`) - both of those
  real minifier libraries were tested and found to silently corrupt that
  content (clean-css mis-parses the nesting and drops rules; lightningcss
  collapses the "duplicate" prefixed/unprefixed pair down to one). The
  hand-written minifier only strips comments and insignificant whitespace -
  it never parses selectors or touches a value, so it can't do that. Trade-off:
  the output is a few bytes larger than a "smart" minifier would produce
  (e.g. it doesn't strip a leading `0` from `0.5s`), which is an intentional,
  low-risk choice.

### Running it

- Double-click `MinifyClientApp.bat` (or run
  `powershell -ExecutionPolicy Bypass -File scripts\A_MinifyClientApp.ps1`).
  First run does `npm install` in this folder automatically (installs into
  `BuildingProcess/node_modules`, gitignored). Walks all of `ClientApp/` and
  reports `created` / `updated` / `unchanged` / `failed` counts.
- Or from `BuildingProcess/`: `npm run minify` (same thing, no pause/prompts -
  better for scripting).
- Point it at a different folder: `node scripts\minify-client-app.js <path>`.

Nothing is overwritten unnecessarily - a file whose minified output is
byte-identical to what's already on disk is left untouched (reported as
`unchanged`), so re-running this doesn't create noise for files nobody
touched.

### Minifying a single file (e.g. on save)

Re-walking and re-minifying all ~180 `ClientApp` files on every `Ctrl+S` would
be far heavier than MinifyAll (which only touches the one file you saved).
For that use case, call the script with `--file`, which skips the directory
walk entirely and minifies just that one file:

```
node "<path to>\FWITD\BuildingProcess\scripts\minify-client-app.js" --file "<path to the saved .js/.css/.html file>"
```

This is what a "minify on save" hook should call - not `MinifyClientApp.bat`.
The only real overhead versus MinifyAll is the `node` process start-up
(~50-100ms); everything else is comparable in weight.

**Recommended integration**: rather than writing a custom VS Code extension,
bind this to save with the **Run on Save** extension
(`emeraldwalk.runonsave`) via a workspace `.vscode/settings.json`:

```jsonc
"emeraldwalk.runonsave": {
  "commands": [
    {
      "match": "FWITD[\\\\/]ClientApp[\\\\/].*\\.(js|css|html)$",
      "notMatch": "\\.min\\.(js|css|html)$",
      "cmd": "node \"${workspaceFolder}\\FWITD\\BuildingProcess\\scripts\\minify-client-app.js\" --file \"${file}\""
    }
  ]
}
```

`--file` on a path that isn't a recognized source file (e.g. you saved a
`.min.js` directly, or a non-JS/CSS/HTML file matched by accident) is a no-op
(prints `Skipped: ...`, exit code 0) - it won't error or write anything.

## UpdateJSEnums.bat / CreatePage.bat / CreateComponent.bat / CreateInjectable.bat

Scaffolding and enum maintenance for `ClientApp`, the script equivalent of
UiBuilder's *Add FW JS Component* form (`Helpers\addFWJSComponent.cs`,
`Lib\UpdaterEnums.cs`) - keep the two in sync.

Every path is resolved from the scripts' own location inside this submodule
(`FWITD\...`), never from the host project, so they work the same in every
project that includes `FWITD`. Shared logic lives in `scripts\_FWCommon.ps1`.

| .bat | script | does |
|---|---|---|
| `UpdateJSEnums.bat` | `A_UpdateJSEnums.ps1` | regenerates, in `JSProvider.cs`, the enums `pages` / `utils` / `components` / `frameworks` / `injectable_apps` and the dictionaries `page_to_components` / `components_views` from the `ClientApp` folders, and syncs `external_libs` / `external_libs_info` with `utils\external_libs` (see below) |
| `CreatePage.bat` | `A_CreateNewPage.ps1` | `apps_standalone\<Name>\` from `data\template_page.*` + `jsconfig.json` + `components\`; then (asked) updates the enums and adds `StartApp.<Name>` + its `_scripts` entry to `AppConfig.cs` |
| `CreateComponent.bat` | `A_CreateNewComponent.ps1` | a component from `data\js_component_v2.js`: global (`components\`), child of a page / ComponentView (`...\<Parent>\components\`) or a new ComponentView (`apps_standalone_components\`); then (asked) updates the enums |
| `CreateInjectable.bat` | `A_CreateNewInjectable.ps1` | `apps_injectable\<Name>\` (`.js`, optional `.html` / `.css`, `jsconfig.json`); then (asked) updates the enums. Its `StartApp` / `_scripts` entry is left to you: it needs the url to inject into |

Arguments after the `.bat` are passed to the script: `-Name <Name>` skips the
name prompt, `-NoPause` skips the final "Press ENTER" (used by the VS Code
tasks).

- Enum files are rewritten keeping their encoding (BOM or not) and line
  endings; a file whose content doesn't change isn't touched.
- Folder names that aren't valid C# identifiers are skipped with a warning.
- A component name present in two folders (e.g. `components\TaskItem` and
  `apps_standalone_components\AndroidViewTasks\components\TaskItem`) is listed
  once in the `components` enum and reported: only one of them can be loaded.
- `external_libs` is synced, not regenerated: its order is the load order and
  each lib's triggers (the globals it exposes) can't be derived from the file.
  Existing libs keep their position and `external_libs_info` entry; a new
  `utils\external_libs\<name>.js` is appended with the trigger
  `//keep <name>` only (add its global to the triggers by hand); a lib whose
  file is gone is removed with its entry. Files inlined through
  `external_libs_inlined` (`pdf.worker`) are not libs of their own.

## CreateShortcut.ps1

Generic "create a `.lnk` shortcut" helper, invoked by `FWShellWPF.csproj`
during build/publish. Not part of the `ClientApp` dev workflow - unrelated
utility that happens to live in this folder.

## default_website/ (serve_debug.py)

A tiny Python HTTP server that serves `default_website/index.html` on
`http://localhost:4981`. Wired to the **"Serve Debug Website"** VS Code task
(`.vscode/tasks.json`, `runOn: folderOpen`) - starts automatically when the
workspace opens. Whether it also auto-launches Chrome is controlled by
`openChromeBrowserOnServeDebugWebsite` in that same `tasks.json`.

## data/

Template source files consumed by the page / component / injectable
scaffolding scripts (and UiBuilder) - not used by `MinifyClientApp`.
