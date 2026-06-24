# icons

Static visual assets referenced by the client-side JS and CSS. Not processed by the C# assembler — they are either embedded at runtime by the `Icons` utility or referenced via paths known to the app.

## Subfolders

| Folder | Contents |
|---|---|
| `flags/` | Country flag SVGs (`de`, `es`, `fr`, `gb`, `it`) — used by locale/language selectors |
| `it_doc/` | Documentation screenshots — not used at runtime |
| `mocks/` | Placeholder images for UI mockups and demos |

## File formats

- **SVG** — preferred for icons; inline-friendly and resolution-independent
- **PNG / JPG / WEBP** — used for photographic content and pre-rendered mockups
- **WOFF2** — `utils/frameworks/google3.woff2` (Material Symbols font) is embedded as Base64 via `LoadAssetFileAsBase64Async` and injected into the shared stylesheet with the `@BASE64FrameworkIcons` placeholder

## Adding icons

Drop the file in this folder (or a subfolder) and reference it from JS or CSS. The `Icons` utility (`utils/Icons.js`) maps named identifiers to icon content — update it when adding icons that need to be referenced by name in app code.
