# utils

JS utilities and core framework modules. Loaded on demand — auto-detected by scanning each app's JS source for the enum member names (`JS.utils`, `JS.frameworks`).

## Subfolders

### `frameworks/`

Core runtime modules loaded unconditionally into every page:

| File | Enum | Description |
|---|---|---|
| `FrameworkGC.js` | `JS.frameworks.FrameworkGC` | Base class / garbage-collected component lifecycle. Contains the `{{@owner_id}}` placeholder replaced with the WebView ID. |
| `AppStatus.js` | `JS.frameworks.AppStatus` | App-level state manager. `{{@AppSettings.key}}` placeholders are replaced with values from `AppSettings` at load time. |
| `google3.woff2` | — | Material Symbols icon font, embedded as Base64 into `styles.css` via `@BASE64FrameworkIcons`. |

### `translations/`

i18n data files consumed by the `Locale` utility:

| File | Language |
|---|---|
| `it.js` / `it.min.js` | Italian (default — `default_language = "it"`) |
| `en.js` / `en.min.js` | English |
| `de.js` / `de.min.js` | German |

Each file exports `const data = { ... }`. The C# loader strips the `const data =` declaration and splices the JSON literal directly into `Locale.js` at the `"{{@jsonTranslations}}"` placeholder.

## Utility modules

Each file ships as `Name.js` (debug) and `Name.min.js` (release):

| File | Enum | Description |
|---|---|---|
| `AppRouter.js` | `JS.utils.AppRouter` | Client-side route management |
| `Icons.js` | `JS.utils.Icons` | Named icon lookup and SVG injection |
| `Lobby.js` | `JS.utils.Lobby` | WebView↔native message bridge. Replaces `{{@HttpImagesAddress}}` with the image server address. The platform-specific `FWBridge` shim is injected by `JSProvider` at bundle assembly time. |
| `Locale.js` | `JS.utils.Locale` | i18n — receives the translation JSON at assembly time |
| `Logger.js` | `JS.utils.Logger` | Structured console logger |
| `MovableUtil.js` | `JS.utils.MovableUtil` | Drag-to-reposition helper for floating elements |
| `SpaHistory.js` | `JS.utils.SpaHistory` | In-page navigation history stack |
| `UiBuilder.js` | `JS.utils.UiBuilder` | Declarative DOM construction helpers |

## Adding a utility

1. Create `MyUtil.js` and `MyUtil.min.js` in this folder.
2. Add `MyUtil` to the `JS.utils` enum in `JSProvider.cs`.
3. Any app that references `MyUtil` by name in its JS will have it included automatically.
