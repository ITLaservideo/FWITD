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

## CreateComponent.bat / CreatePage.bat / UpdateJSEnums.bat

⚠️ **Currently broken / stale.** These (and everything they call - `scripts\A_CreateNewComponent.ps1`,
`A_CreateNewComponent2.ps1`, `A_CreateNewPage.ps1`, and all five
`SS_UpdateJSEnum_*.ps1` / `SS_UpdateJSDict_page_to_components.ps1`) still
target a project layout from before the `ClientApp` reorganization:
`FWITD\Resources\Raw\ui\App\...` and `FWITD\Utils\UtilsUi.cs`. Neither path
exists anymore - running any of them today fails at the first
`Resolve-Path` call. `A_CreateNewPage.ps1` additionally points at template
files (`data\test_page.css/html/js`) that were never checked in (only
`data\template_page.*` exists).

They're left in place as-is since fixing them wasn't part of this pass - just
be aware "create a new component/page" and "update the JS enums" don't
currently work via these entry points. (`ClientApp/readme.md` documents how
components/pages/enums are actually wired today if you need to do this by
hand.)

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

Template source files consumed by the (currently broken, see above)
component/page scaffolding scripts - not otherwise used by `MinifyClientApp`.
