// Batch-minifies every ClientApp source file into its `.min.*` sibling, replacing the
// manual "open each file in VS Code, let MinifyAll write it on save" workflow described
// in ClientApp/readme.md. Mirrors the MinifyAll settings this repo was using (terser
// mangle/compress options below are copied verbatim from the user's VS Code settings.json).
'use strict';

const fs = require('fs');
const path = require('path');
const { minify: minifyJs } = require('terser');
const { minify: minifyHtml } = require('html-minifier-terser');

const CLIENT_APP_ROOT = path.resolve(__dirname, '..', '..', 'ClientApp');

const TERSER_OPTIONS = {
    mangle: true,
    compress: {
        drop_console: false,
        dead_code: false,
        keep_fnames: false,
        keep_classnames: true,
        evaluate: false,
    },
    // Lines commented `//keep <text>` are preserved verbatim in the minified output, and so
    // are block comments opening with `/*keep ` (how external_libs/ carry their license
    // notices - put them at the very top of the file, a comment attached to code terser
    // merges or moves is dropped along with it).
    format: {
        comments: /^keep /,
    },
};

// ClientApp's CSS relies on the native CSS Nesting Module (`&`, bare child-combinator
// nesting like `>.foo {}`) and deliberately ships duplicate standard+vendor-prefixed
// declarations (e.g. `backdrop-filter` + `-webkit-backdrop-filter`). Neither clean-css nor
// lightningcss were safe here: clean-css's parser mishandles nesting and drops rules,
// while lightningcss silently collapses "equivalent" prefixed/unprefixed declarations
// down to one. This minifier only strips comments and insignificant whitespace/semicolons
// (byte-for-byte what MinifyAll produced for the non-nesting files this was checked
// against) - it never parses selectors or touches a declaration's value, so it can't
// corrupt either of those.
const STRUCTURAL_ZERO_SPACE = new Set(['{', '}', ';', ':', ',', '>']);

function minifyCss(source) {
    let result = '';
    let i = 0;
    const n = source.length;
    while (i < n) {
        const ch = source[i];
        if (ch === '"' || ch === "'") {
            let j = i + 1;
            while (j < n && source[j] !== ch) {
                if (source[j] === '\\') j++;
                j++;
            }
            result += source.slice(i, j + 1);
            i = j + 1;
            continue;
        }
        if (ch === '/' && source[i + 1] === '*') {
            const end = source.indexOf('*/', i + 2);
            i = end === -1 ? n : end + 2;
            continue;
        }
        if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f') {
            let j = i;
            while (j < n && /[ \t\n\r\f]/.test(source[j])) j++;
            const prev = result[result.length - 1];
            const next = source[j];
            const dropSpace =
                prev === undefined ||
                STRUCTURAL_ZERO_SPACE.has(prev) ||
                (next !== undefined && STRUCTURAL_ZERO_SPACE.has(next));
            if (!dropSpace) {
                result += ' ';
            }
            i = j;
            continue;
        }
        if (ch === '}' && result.endsWith(';')) {
            result = result.slice(0, -1) + '}';
            i++;
            continue;
        }
        result += ch;
        i++;
    }
    return result.trim();
}

const HTML_MINIFIER_OPTIONS = {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: (text) => minifyCss(text),
    minifyJS: TERSER_OPTIONS,
};

const EXTENSION_HANDLERS = {
    '.js': async (source) => {
        const result = await minifyJs(source, TERSER_OPTIONS);
        if (!result.code) {
            throw new Error('terser returned no output');
        }
        return result.code;
    },
    '.css': async (source) => minifyCss(source),
    '.html': async (source) => minifyHtml(source, HTML_MINIFIER_OPTIONS),
};

function isSourceFile(fileName) {
    const ext = path.extname(fileName);
    if (!(ext in EXTENSION_HANDLERS)) {
        return false;
    }
    const withoutExt = fileName.slice(0, -ext.length);
    return !withoutExt.endsWith('.min');
}

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(fullPath, out);
        } else if (entry.isFile() && isSourceFile(entry.name)) {
            out.push(fullPath);
        }
    }
    return out;
}

async function minifyFile(sourcePath) {
    const ext = path.extname(sourcePath);
    const minPath = sourcePath.slice(0, -ext.length) + '.min' + ext;
    const source = fs.readFileSync(sourcePath, 'utf8');
    const minified = await EXTENSION_HANDLERS[ext](source);
    const previous = fs.existsSync(minPath) ? fs.readFileSync(minPath, 'utf8') : null;
    if (previous === minified) {
        return 'unchanged';
    }
    fs.writeFileSync(minPath, minified, 'utf8');
    return previous === null ? 'created' : 'updated';
}

// Single-file mode for editor "minify on save" hooks, where re-walking and re-minifying
// all of ClientApp on every keystroke-triggered save would be far heavier than MinifyAll.
async function runSingleFile(filePath) {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
        console.error(`File not found: ${resolved}`);
        process.exitCode = 1;
        return;
    }
    if (!isSourceFile(path.basename(resolved))) {
        console.log(`Skipped (not a minifiable source file): ${resolved}`);
        return;
    }
    try {
        const status = await minifyFile(resolved);
        console.log(`${status}: ${resolved}`);
    } catch (err) {
        console.error(`FAILED: ${resolved} -> ${err.message}`);
        process.exitCode = 1;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const fileFlagIndex = args.indexOf('--file');
    if (fileFlagIndex !== -1) {
        const filePath = args[fileFlagIndex + 1];
        if (!filePath) {
            console.error('--file requires a path argument');
            process.exitCode = 1;
            return;
        }
        await runSingleFile(filePath);
        return;
    }

    const target = args[0] ? path.resolve(args[0]) : CLIENT_APP_ROOT;
    if (!fs.existsSync(target)) {
        console.error(`Target folder not found: ${target}`);
        process.exitCode = 1;
        return;
    }

    const files = walk(target);
    console.log(`Found ${files.length} source file(s) under ${target}`);

    const counts = { created: 0, updated: 0, unchanged: 0 };
    const failures = [];

    for (const file of files) {
        if (path.basename(file).startsWith('.')) continue;
        const relative = path.relative(target, file);
        try {
            const status = await minifyFile(file);
            counts[status]++;
            if (status !== 'unchanged') {
                console.log(`  ${status}: ${relative}`);
            }
        } catch (err) {
            failures.push({ file: relative, error: err.message });
            console.error(`  FAILED: ${relative} -> ${err.message}`);
        }
    }

    console.log(
        `\nDone. ${counts.created} created, ${counts.updated} updated, ` +
        `${counts.unchanged} unchanged, ${failures.length} failed.`
    );

    if (failures.length) {
        process.exitCode = 1;
    }
}

main();
