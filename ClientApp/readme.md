# ClientApp

The browser-side codebase served inside the MAUI WebViews. Everything here is pure HTML/CSS/JS — no build step, no npm. The C# layer in `JSProvider.cs` reads these files at runtime, assembles them into a single string, and feeds the result to the WebView.

## Folder overview

| Folder | Purpose | C# entry point |
|---|---|---|
| [apps_injectable/](apps_injectable/readme.md) | JS bundles injected into existing pages | `JSProvider.getScriptApp(injectable_apps.X)` |
| [apps_standalone/](apps_standalone/readme.md) | Full HTML pages, each owning their document | `JSProvider.getPathJSHTMLApp(pages.X)` |
| [apps_standalone_components/](apps_standalone_components/readme.md) | Page-level view components tied to standalone pages | auto-loaded via `components_views` map |
| [components/](components/readme.md) | Shared UI widgets used across all app types | auto-detected from app JS source |
| [icons/](icons/readme.md) | Static SVG/PNG/JPG assets | referenced inline by app JS/CSS |
| [styles/](styles/readme.md) | Shared CSS: reset, animations, theme variables | loaded first in every page assembly |
| [utils/](utils/readme.md) | JS utilities and core frameworks | auto-detected from app JS source |

## File naming convention

Every source file ships in two variants:

| Variant | When used |
|---|---|
| `Name.js` / `Name.css` / `Name.html` | `DEBUG` + `USE_JS_NON_MINIMIZED_FILES` |
| `Name.min.js` / `Name.min.css` / `Name.min.html` | All other builds |

The C# loader picks the right variant automatically based on `minimized_folder_extension`.

## jsconfig.json

Provides VS Code IntelliSense path aliases for the client-side JS. Does not affect the runtime build.
