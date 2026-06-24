# apps_standalone

Standalone apps are **full HTML pages** — each one owns its complete document. The host app calls `JSProvider.getPathJSHTMLApp(JS.pages.MyPage)` and receives a filesystem path to the assembled HTML file, which is then loaded directly into the WebView.

## Folder structure

Each app lives in a subfolder whose name **exactly matches** the corresponding `JS.pages` enum value:

```
apps_standalone/
  MyPage/
    MyPage.html         ← required — must contain </head> and </body>
    MyPage.js           ← required
    MyPage.css          ← required
    MyPage.min.html     ← required (release build)
    MyPage.min.js       ← required (release build)
    MyPage.min.css      ← required (release build)
    components/         ← optional — page-local components
      MyComponent/
        MyComponent.js / .html / .css
```

To add a new standalone page, create the folder + files **and** add the name to the `JS.pages` enum. To register page-local components, add an entry to the `JS.page_to_components` dictionary.

## Files

### `{Page}.html` — required

The page shell. Must include `</head>` and `</body>` — the assembler injects script/style link tags into these slots. Does not need to be a full `<!DOCTYPE html>` document.

### `{Page}.js` — required

The page's application script. Must define a class `App` with a no-arg constructor. Instantiated as:
```js
setTimeout(() => { window.the_main_app = new App(); }, 0);
```

The placeholder `@fromwho` is replaced with the page name at load time.

### `{Page}.css` — required

Page-specific styles. Appended after all shared/component CSS.

### `components/` subfolder — optional

Page-local components not shared with other pages. Declared in `JS.page_to_components` and loaded via `getJSRelativeComponents`.

## Build output

Assembled files are written to `FWITD/out/{PageName}.html/.js/.css`. The HTML file links the JS and CSS by filename with a `?v=` cache-bust timestamp. The result path is cached in memory (cache cleared on each request in `DEBUG + WINDOWS`).

## Current pages

| Enum value | Description |
|---|---|
| `AndroidAppDemo` | Full Android-style demo UI |
| `AndroidLogin` | Login screen |
| `AndroidMasterSettings` | Master settings page |
| `AndroidMusic` | Music player page |
| `left_panel` | Side panel / navigation |
| `some_page` | Generic placeholder page |
| `test_page` | Framework component test harness |
