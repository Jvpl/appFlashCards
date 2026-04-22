const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'editorTemplates.new.js'), 'utf8');

// Extract katexStyles and katexScript JSON strings (already valid, no further unescaping needed)
function extractJsonString(src, varName) {
  const marker = `const ${varName} = `;
  const idx = src.indexOf(marker);
  if (idx === -1) throw new Error(`${varName} not found`);
  const start = idx + marker.length;
  if (src[start] !== '"') throw new Error(`${varName} is not a JSON string`);
  let i = start + 1;
  while (i < src.length) {
    if (src[i] === '\\') { i += 2; continue; }
    if (src[i] === '"') break;
    i++;
  }
  return JSON.parse(src.substring(start, i + 1));
}

const katexStyles = extractJsonString(src, 'katexStyles');
const katexScript = extractJsonString(src, 'katexScript');

// Extract editorHtml template literal raw content
const startMarker = 'const editorHtml = `';
const start = src.indexOf(startMarker) + startMarker.length;
let i = start;
while (i < src.length) {
  const c = src[i];
  if (c === '\\') { i += 2; continue; }
  if (c === '`') break;
  i++;
}
let raw = src.substring(start, i);

// Replace interpolations with unique placeholders BEFORE unescaping
// so the substituted content (katex, tiptap) is NOT unescaped
const KATEX_STYLES_PH = '\x00KATEX_STYLES\x00';
const KATEX_SCRIPT_PH = '\x00KATEX_SCRIPT\x00';
raw = raw.replace(/\$\{katexStyles\}/g, KATEX_STYLES_PH);
raw = raw.replace(/\$\{katexScript\}/g, KATEX_SCRIPT_PH);

// Unescape template literal escapes (only affects the scaffold HTML, not katex/tiptap)
let unescaped = '';
let j = 0;
while (j < raw.length) {
  if (raw[j] === '\\') {
    const next = raw[j + 1];
    if (next === '\\') { unescaped += '\\'; j += 2; }
    else if (next === '`') { unescaped += '`'; j += 2; }
    else if (next === '$') { unescaped += '$'; j += 2; }
    else if (next === 'n') { unescaped += '\n'; j += 2; }
    else if (next === 'r') { unescaped += '\r'; j += 2; }
    else if (next === 't') { unescaped += '\t'; j += 2; }
    else { unescaped += raw[j]; j++; }
  } else {
    unescaped += raw[j]; j++;
  }
}

// Now replace placeholders with the real content
// For test-editor.html: load katexScript via <script src> to avoid Chrome inline strict-mode issues
// katexStyles is CSS so it stays inline
let html = unescaped;
html = html.replace(new RegExp(KATEX_STYLES_PH, 'g'), katexStyles);
// Replace katexScript inline tag with external src reference
html = html.replace(
  /<script>\s*\x00KATEX_SCRIPT\x00\s*<\/script>/,
  '<script src="tiptap-build/katex.min.js"></script>'
);
// Fallback: if regex didn't match, replace placeholder directly
html = html.replace(new RegExp(KATEX_SCRIPT_PH, 'g'), katexScript);

fs.writeFileSync(path.join(__dirname, '..', 'test-editor.html'), html, 'utf8');
console.log('Written', html.length, 'chars');
console.log('Has charset UTF-8:', html.includes('charset="UTF-8"'));
console.log('Has katex render:', html.includes('katex.render'));
