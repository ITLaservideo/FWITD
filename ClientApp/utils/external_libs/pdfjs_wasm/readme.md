# pdfjs_wasm

WebAssembly image codecs used by `pdf.worker.js`. Each binary has to be the exact build matching the
emscripten glue compiled into the worker (same minified import/export names), so these come from the
very commit the vendored pdf.js was built from (`pdfjsBuild = ee470d5db`, not published on npm):

| File | Source | Decodes | License |
|---|---|---|---|
| `jbig2.wasm` | `external/jbig2/` @ mozilla/pdf.js `ee470d5db4c8517ea3ccbfc489deab9311cc3a81` | JBIG2 and CCITT fax images (typical of B/W scans) | PDFium, Apache-2.0 / BSD-3 (`LICENSE_JBIG2`, `LICENSE_PDFJS_JBIG2`) |
| `openjpeg.wasm` | `external/openjpeg/` @ same commit | JPEG 2000 (`JPXDecode`) images | BSD-2 (`LICENSE_OPENJPEG`, `LICENSE_PDFJS_OPENJPEG`) |

The worker never fetches them: pdf.js is loaded with `useWorkerFetch: false`, so it asks the main thread
for them (`FetchBinaryData`, `kind: "wasmUrl"`). `PDFEditor` answers through its `BinaryDataFactory`,
which gets the bytes from `Lobby.postAsync("App/GetPdfJsWasm", { filename })` (`AppController`), read
from the embedded resource. Their license notices are also in `pdf.worker.js`'s `/*keep @license` header,
since that's what ships in the minified bundle.

When updating pdf.js, re-download both files from `external/jbig2/` and `external/openjpeg/` at the new
build's commit.
