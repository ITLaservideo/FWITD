// Compiles one ClientApp component (Name.js + Name.html + Name.css, non-minified) into a single
// self-contained ES module `.plain_compiled_Name.js`, usable outside the C# host (which normally
// does this stitching at runtime, see JSProvider.cs):
//   - imports FrameworkGC
//   - exports the component class
//   - wires `fw-id` / `(click)`-style attributes of Name.html (port of `linkJSToFWHTML`)
//   - inlines Name.html in place of `${injector_html}`
//   - injects Name.css into document.head through a <style> element
//
// Usage (same shape as minify-client-app.js single-file mode, so it can be bound to save too):
//   node compiler_to_plain.js --file <path to Name.js | Name.html | Name.css | Name.min.*> [--out <dir>]
// Output goes next to the source files unless `--out` is given.
'use strict';

const fs = require('fs');
const path = require('path');

const IMPORT_LINE = 'import { FrameworkGC } from "../depenedency.min.js?v=019";';
const SOURCE_EXTENSIONS = ['.js', '.html', '.css'];
const CLASS_DECLARATION = /class [A-Za-z0-9_$ ]+ extends FrameworkGC/;
// UiBuilder's test/mock area, from the START line to the END line (both included)
const UI_BUILDER_RESERVED_AREA = /^[ \t]*\/\/#START RESERVED AREA FOR UI_BUILDER[\s\S]*?^[ \t]*\/\/#END RESERVED AREA FOR UI_BUILDER[^\r\n]*(\r?\n)?/gm;

// Content placed inside a JS template literal must not end it early (`), start an
// interpolation (${) or lose its backslashes (CSS escapes like `content: "\e316"`).
function escapeForTemplateLiteral(text) {
    return text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

// ---- port of JSProvider.cs `linkJSToFWHTML` (keep the two in sync) ----------------------
// Injects, right after the component's `super(...)` call (or at the start of its constructor),
// the code that the host normally generates at runtime:
//   - `fw_owner` / `___s_c` (container holding `self_ref` while wiring)
//   - `fw_owner.elements[name]` for every `fw-id="name"` in the HTML
//   - listeners for every `(click)="handler"` / `(click)="handler($event,'x')"` attribute
//     (and the other events below), rewriting the attribute to `fw-click` in the HTML

const FW_EVENT_LISTENERS = [
    { event_name: 'click', event_phase: 'default' },
    { event_name: 'change', event_phase: 'default' },
    { event_name: 'beforeinput', event_phase: 'bubbling' },
    { event_name: 'keydown', event_phase: 'default' },
    { event_name: 'keyup', event_phase: 'default' },
    { event_name: 'paste', event_phase: 'default' },
];

const replaceAll = (text, search, replacement) => text.split(search).join(replacement);
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function declareHtmlVariablesInsideTheJs(html, jscode, original) {
    const reg_find_fw_ids = /fw-id=(['"])[A-Za-z](?:(?!\1).)+\1/g;
    for (const [value] of html.matchAll(reg_find_fw_ids)) {
        if (!original.includes('querySelector(`[' + value + ']`)')) {
            const name = value.slice(7, -1).trim(); // fw-id="name" -> name
            jscode.push(';fw_owner.elements[`' + name + '`]=___s_c.querySelector(`[' + value + ']`)');
        }
    }
}

function addEventListener(tag, js_event_listener, html, jscode, event_phase) {
    const reg_find = new RegExp(escapeRegExp(tag) + `=(['"])[A-Za-z](?:(?!\\1).)+\\1`, 'g');
    // unique attribute strings, in first-occurrence order
    const unique_values = [...new Set(Array.from(html.matchAll(reg_find), m => m[0]))];
    const fw_attribute = 'fw-' + js_event_listener;
    for (const value of unique_values) {
        const expression = value.slice(tag.length + 2, -1).trim(); // (click)="expr" -> expr
        const index_tonda = expression.indexOf('(');
        const is_call_expression = index_tonda >= 0;
        const func_ref = is_call_expression ? expression.slice(0, index_tonda) : expression;
        jscode.push(';___s_c.querySelectorAll(`[' + replaceAll(value, tag, fw_attribute) + ']`).forEach((el)=>{el.fwInstanceReference=fw_owner;');
        if (is_call_expression) {
            // invoked as a real method call on fw_owner (so `this` is the component) with its own
            // arguments; `$event` resolves to the native event object when referenced
            jscode.push(`el.addEventListener('${js_event_listener}',function($event){return fw_owner.${expression};}`);
        } else {
            jscode.push(`el.addEventListener('${js_event_listener}',fw_owner.${func_ref}`);
        }
        if (event_phase === 'capturing') {
            jscode.push(',true');
        } else if (event_phase === 'bubbling') {
            jscode.push(',false');
        }
        jscode.push(`);el.removeAttribute('${fw_attribute}');})`);
    }
}

function linkJSToFWHTML(js, html) {
    let the_match = /super\([a-zA-Z_0-9,;]+\)/.exec(js);
    const jscode = [];
    if (the_match) {
        jscode.push(`${the_match[0]};`);
    } else {
        the_match = /constructor\([a-zA-Z0-9,\s]*\)\s*\{/.exec(js);
        if (!the_match) {
            return { js, html };
        }
        jscode.push(the_match[0]);
    }
    jscode.push(`const fw_owner=this;const ___s_c=${html.includes('<body>') ? 'document.body' : "document.createElement('div')"};try {___s_c.appendChild(fw_owner.self_ref);} catch {}`);
    const bloat_len = jscode.join('').length;
    declareHtmlVariablesInsideTheJs(html, jscode, js);
    for (const { event_name, event_phase } of FW_EVENT_LISTENERS) {
        addEventListener(`(${event_name})`, event_name, html, jscode, event_phase);
    }
    for (const { event_name } of FW_EVENT_LISTENERS) {
        html = replaceAll(html, `(${event_name})`, `fw-${event_name}`);
    }
    const code = jscode.join('');
    return { js: bloat_len < code.length ? replaceAll(js, the_match[0], code) : js, html };
}
// ---------------------------------------------------------------------------------------------

// 1. `Name.min.js` / `Name.js` / `Name.html` ... -> { dir, baseName: 'Name' }
function resolveBaseName(filePath) {
    const ext = path.extname(filePath);
    if (!SOURCE_EXTENSIONS.includes(ext)) {
        return null;
    }
    let baseName = path.basename(filePath, ext);
    if (baseName.endsWith('.min')) {
        baseName = baseName.slice(0, -'.min'.length);
    }
    return { dir: path.dirname(filePath), baseName };
}

// 2. read the three non-minified siblings; only the .js is mandatory
function readSources(dir, baseName) {
    const read = (ext) => {
        const p = path.join(dir, baseName + ext);
        return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
    };
    return { js: read('.js'), html: read('.html'), css: read('.css') };
}

function compile({ js, html, css }, baseName) {
    const parts = [];

    // 3.
    parts.push(IMPORT_LINE);

    js = js.replace(UI_BUILDER_RESERVED_AREA, '');
    if (js.includes('//#START RESERVED AREA FOR UI_BUILDER')) {
        console.warn(`Warning: ${baseName}.js has a "//#START RESERVED AREA FOR UI_BUILDER" without a matching END line - left in place`);
    }

    // 4. export the first `class X extends FrameworkGC` (unless it's already exported)
    const match = CLASS_DECLARATION.exec(js);
    if (match) {
        const before = js.slice(0, match.index);
        if (!/export\s+$/.test(before)) {
            js = before + 'export ' + js.slice(match.index);
        }
    } else {
        console.warn(`Warning: no "class ... extends FrameworkGC" found in ${baseName}.js - nothing exported`);
    }

    // 5. link fw-id / (event) attributes, then plain replace, same as the host does (JSProvider.cs)
    if (html !== null) {
        ({ js, html } = linkJSToFWHTML(js, html));
        js = replaceAll(js, '${injector_html}', html);
    } else if (js.includes('${injector_html}')) {
        console.warn(`Warning: ${baseName}.js uses \${injector_html} but ${baseName}.html was not found`);
    }
    parts.push(js);

    // 6.
    if (css !== null) {
        parts.push(
            '(() => {\n' +
            '    const stylex_1 = document.createElement(\'style\');\n' +
            `    stylex_1.textContent = \`${escapeForTemplateLiteral(css)}\`; setTimeout(() => { document.head.appendChild(stylex_1); }, 0);\n` +
            '})();'
        );
    }

    return parts.join('\n');
}

function main() {
    const args = process.argv.slice(2);
    const fileFlagIndex = args.indexOf('--file');
    const filePath = fileFlagIndex !== -1 ? args[fileFlagIndex + 1] : args.find(a => !a.startsWith('--'));
    const outFlagIndex = args.indexOf('--out');
    const outDir = outFlagIndex !== -1 ? args[outFlagIndex + 1] : null;

    if (!filePath) {
        console.error('Usage: node compiler_to_plain.js --file <path> [--out <dir>]');
        process.exitCode = 1;
        return;
    }
    if (outFlagIndex !== -1 && !outDir) {
        console.error('--out requires a directory argument');
        process.exitCode = 1;
        return;
    }

    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
        console.error(`File not found: ${resolved}`);
        process.exitCode = 1;
        return;
    }
    const target = resolveBaseName(resolved);
    if (target === null) {
        console.log(`Skipped (not a .js/.html/.css file): ${resolved}`);
        return;
    }

    const sources = readSources(target.dir, target.baseName);
    if (sources.js === null) {
        console.error(`FAILED: ${target.baseName}.js not found in ${target.dir}`);
        process.exitCode = 1;
        return;
    }

    try {
        const output = compile(sources, target.baseName);
        // 7.
        const destDir = outDir ? path.resolve(outDir) : target.dir;
        fs.mkdirSync(destDir, { recursive: true });
        const destPath = path.join(destDir, `.plain_compiled_${target.baseName}.js`);
        fs.writeFileSync(destPath, output, 'utf8');
        console.log(`compiled: ${destPath}`);
    } catch (err) {
        console.error(`FAILED: ${resolved} -> ${err.message}`);
        process.exitCode = 1;
    }
}

main();
