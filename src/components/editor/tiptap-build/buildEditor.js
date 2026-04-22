#!/usr/bin/env node
// Gera o novo editorTemplates.js com TipTap integrado
// Execute com: node buildEditor.js

const fs = require('fs');
const path = require('path');

const editorDir = path.join(__dirname, '..');
const oldTemplates = fs.readFileSync(path.join(editorDir, 'editorTemplates.backup.js'), 'utf8');
const tiptapBundle = fs.readFileSync(path.join(__dirname, 'tiptap-bundle.js'), 'utf8');

// Extrai bloco de const X = `...`; do arquivo original (retorna o bloco completo incluindo const/backticks)
function extractRawConst(src, name) {
  const startMarker = `const ${name} = \``;
  const start = src.indexOf(startMarker);
  if (start === -1) throw new Error(`Não encontrou const ${name}`);
  const contentStart = start + startMarker.length;
  let i = contentStart;
  while (i < src.length) {
    // Ignora backtick escaped (\`)
    if (src[i] === '\\') { i += 2; continue; }
    if (src[i] === '`') break;
    i++;
  }
  // Retorna o bloco completo: "const X = `...`;"
  return src.substring(start, i + 2); // +2 para incluir `;
}

const katexStylesBlock = extractRawConst(oldTemplates, 'katexStyles');
const katexScriptBlock = extractRawConst(oldTemplates, 'katexScript');
const previewHtmlBlock = extractRawConst(oldTemplates, 'previewHtml');

// katexScript e katexStyles extraídos via Python (evita bug de backslash no parser JS)
const katexScriptFromFile = fs.readFileSync(path.join(__dirname, 'katex.min.js'), 'utf8');
const katexStylesFromFile = fs.readFileSync(path.join(__dirname, 'katex-styles.txt'), 'utf8').replace(/^\r\n/, '');

// Copy-Tex desabilitado — nosso handler de copy já serializa $latex$ corretamente
const copyTexScript = '';

console.log('katexStyles block:', Math.round(katexStylesBlock.length/1024) + 'KB');
console.log('katexScript block:', Math.round(katexScriptBlock.length/1024) + 'KB');
console.log('tiptapBundle:', Math.round(tiptapBundle.length/1024) + 'KB');
console.log('previewHtml block:', Math.round(previewHtmlBlock.length/1024) + 'KB');
console.log('copyTexScript:', copyTexScript.length, 'chars');

// Escapa backticks e ${ para uso seguro dentro de template literal JS
function escapeForTemplateLiteral(str) {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

// TipTap e copyTex têm backticks — precisam ser escapados para o template literal do editorHtml
// katexStyles e katexScript são interpolados como ${katexStyles}/${katexScript} (igual ao backup)
const tiptapEscaped = escapeForTemplateLiteral(tiptapBundle);
const copyTexEscaped = escapeForTemplateLiteral(copyTexScript);

function buildEditorHtml(tiptap, copyTex) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />

  <!-- KaTeX Embedded for Offline -->
  <style>
\${katexStyles}

    /* Sentinela Anti-Caps */
    .sentinela-anti-caps {
      font-size: 0 !important;
      line-height: 0 !important;
      width: 0 !important;
      height: 0 !important;
      opacity: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
      display: inline !important;
      user-select: text !important;
      -webkit-user-select: text !important;
    }
  </style>
  <script>
\${katexScript}
  </script>

  <!-- KaTeX Copy-Tex Extension (Offline) -->
  <script>${copyTex}</script>

  <!-- TipTap Bundle (Bold, Italic, Highlight, History) -->
  <script>${tiptap}</script>

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }
    html, body {
      height: 100%;
      width: 100%;
      background-color: #202020;
      font-family: 'Roboto', sans-serif;
      color: #E2E8F0;
      overflow: hidden;
    }
    #editor-container { width: 100%; height: 100%; position: relative; }
    .ProseMirror {
      width: 100%;
      height: 100%;
      padding: 16px;
      font-size: 18px;
      line-height: 1.6;
      color: #FFFFFF;
      outline: none;
      border: none;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      box-sizing: border-box;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .ProseMirror::-webkit-scrollbar { width: 4px; }
    .ProseMirror::-webkit-scrollbar-track { background: transparent; }
    .ProseMirror::-webkit-scrollbar-thumb { background: #4A5568; border-radius: 4px; }
    .ProseMirror::-webkit-scrollbar-thumb:hover { background: #718096; }
    .ProseMirror.is-empty:before {
      content: attr(data-placeholder);
      color: #718096;
      pointer-events: none;
      display: block;
      position: absolute;
      top: 16px;
      left: 16px;
    }
    .math-atom {
      display: inline-block;
      vertical-align: middle;
      margin: 0 2px;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      caret-color: transparent;
      padding: 4px 6px;
      border-radius: 6px;
      background-color: rgba(76, 175, 80, 0.12);
      border: 1px solid rgba(76, 175, 80, 0.25);
      transition: all 0.2s ease;
      white-space: nowrap;
      position: relative;
      outline: none;
      pointer-events: auto !important;
    }
    .math-atom:active { transform: scale(0.95); background-color: rgba(76, 175, 80, 0.2); }
    .math-atom * { pointer-events: none !important; }
    .katex { font-size: 1.0em; color: white; }
    .katex .mfrac { font-size: 1.25em; }
    .katex .pstrut, .katex .vlist-s, .katex .nulldelimiter,
    .math-atom .pstrut, .math-atom .vlist-s, .math-atom .nulldelimiter {
      -webkit-user-select: none !important;
      user-select: none !important;
      pointer-events: none !important;
    }
    .math-atom.selected, .math-atom.selected:active {
      background-color: rgba(76, 175, 80, 0.3) !important;
      border: 1px solid rgba(76, 175, 80, 0.7) !important;
    }
    strong { font-weight: bold; }
    em { font-style: italic; }
    mark.destaque, span.destaque {
      background-color: #5DD62C;
      color: #000;
      border-radius: 2px;
      padding: 0 2px;
    }
    .math-atom.in-highlight {
      border: 1px solid rgba(93, 214, 44, 0.9) !important;
      background-color: rgba(93, 214, 44, 0.15) !important;
    }
  </style>
</head>
<body>
<div id="editor-container"></div>
<script>
  if (!window.TipTapCore) {
    document.getElementById('editor-container').innerHTML = '<div style="color:red;padding:16px">TipTap failed to load</div>';
    throw new Error('TipTapCore not defined');
  }
  var _TIPTAP = window.TipTapCore;
  var Editor = _TIPTAP.Editor, Bold = _TIPTAP.Bold, Italic = _TIPTAP.Italic;
  var Highlight = _TIPTAP.Highlight, History = _TIPTAP.History;
  var Document = _TIPTAP.Document, Paragraph = _TIPTAP.Paragraph, Text = _TIPTAP.Text;
  var MathAtom = _TIPTAP.MathAtom;
  var Sentinela = _TIPTAP.Sentinela;

  var tiptapEditor = new Editor({
    element: document.getElementById('editor-container'),
    extensions: [
      Document, Paragraph, Text, Bold, Italic,
      Highlight.configure({ multicolor: false, HTMLAttributes: { class: 'destaque' } }),
      History,
      MathAtom,
      Sentinela,
    ],
    content: '',
    autofocus: false,
    editorProps: {
      attributes: {
        'data-placeholder': 'Digite a questão...',
        'spellcheck': 'true',
        'autocapitalize': 'none',
      },
      handlePaste: function(view, event) {
        var clipboardData = event.clipboardData || window.clipboardData;
        if (!clipboardData) return false;
        var html = clipboardData.getData('text/html') || '';
        var text = clipboardData.getData('text/plain') || '';
        return handlePasteData(html, text);
      },
    },
    onFocus: function() { sendToApp('FOCUS', {}); },
    onUpdate: function() {
      // Detecta $latex$ inserido via teclado Android e converte para fórmula
      detectAndConvertLatexInDoc();
      updateMathHighlightBorder();
      var html = getFullHtml();
      sendToApp('CONTENT_CHANGE', { html: html });
      notifyCharCount();
      updatePlaceholder();
    },
    onCreate: function() {
      proseMirrorEl = document.querySelector('.ProseMirror');
      updateMathHighlightBorder();
      if (proseMirrorEl) {
        proseMirrorEl.setAttribute('autocapitalize', 'none');
        proseMirrorEl.setAttribute('autocorrect', 'off');
        proseMirrorEl.setAttribute('autocomplete', 'off');
        proseMirrorEl.setAttribute('spellcheck', 'false');
      }
      attachEventListeners();
      updatePlaceholder();
    },
  });

  var proseMirrorEl = null;

  function updatePlaceholder() {
    var isEmpty = tiptapEditor.isEmpty;
    var hasMath = proseMirrorEl && proseMirrorEl.querySelector('.math-atom');
    if (isEmpty && !hasMath) {
      proseMirrorEl && proseMirrorEl.classList.add('is-empty');
    } else {
      proseMirrorEl && proseMirrorEl.classList.remove('is-empty');
    }
  }

  function sendToApp(type, data) {
    if (window.ReactNativeWebView) {
      var payload = data;
      if (type === 'CONTENT_CHANGE' && payload.html) {
        payload = { html: payload.html.replace(/\u200B/g, '') };
      }
      window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, payload)));
    }
  }

  function getFullHtml() {
    if (!proseMirrorEl) return '';
    return proseMirrorEl.innerHTML;
  }

  function updateMathHighlightBorder() {
    if (!proseMirrorEl) return;
    proseMirrorEl.querySelectorAll('.math-atom').forEach(function(atom) {
      var prev = atom.previousSibling;
      var next = atom.nextSibling;
      // Pula sentinela para verificar o próximo/anterior real
      if (next && next.classList && next.classList.contains('sentinela-anti-caps')) next = next.nextSibling;
      var prevHighlight = prev && ((prev.nodeName === 'MARK' && prev.classList.contains('destaque')) || (prev.nodeType === 3 && prev.previousSibling && prev.previousSibling.nodeName === 'MARK'));
      var nextHighlight = next && ((next.nodeName === 'MARK' && next.classList.contains('destaque')) || (next.nodeType === 3 && next.nextSibling && next.nextSibling.nodeName === 'MARK'));
      if (prevHighlight || nextHighlight) {
        atom.classList.add('in-highlight');
      } else {
        atom.classList.remove('in-highlight');
      }
    });
  }

  function notifyFormatState() {
    sendToApp('FORMAT_STATE', {
      bold: tiptapEditor.isActive('bold'),
      italic: tiptapEditor.isActive('italic'),
      mark: tiptapEditor.isActive('highlight'),
    });
  }

  tiptapEditor.on('selectionUpdate', function() { notifyFormatState(); });

  function applyFormatWithSelectionAwareness(toggleCmd) {
    var hadSelection = !tiptapEditor.state.selection.empty;
    var selEnd = tiptapEditor.state.selection.to;
    toggleCmd();
    if (hadSelection) {
      // Colapsa cursor para fim da seleção e limpa storedMarks
      var tr = tiptapEditor.state.tr;
      var $pos = tr.doc.resolve(selEnd);
      var TextSelection = tiptapEditor.state.selection.constructor;
      tr = tr.setSelection(TextSelection.near($pos)).setStoredMarks([]);
      tiptapEditor.view.dispatch(tr);
      notifyFormatState();
    } else {
      notifyFormatState();
    }
  }
  window.toggleBold = function() { applyFormatWithSelectionAwareness(function() { tiptapEditor.chain().focus().toggleBold().run(); }); };
  window.toggleItalic = function() { applyFormatWithSelectionAwareness(function() { tiptapEditor.chain().focus().toggleItalic().run(); }); };
  window.toggleMark = function() {
    applyFormatWithSelectionAwareness(function() {
      var state = tiptapEditor.state;
      var sel = state.selection;
      var highlightMark = state.schema.marks.highlight;
      if (!highlightMark) { tiptapEditor.chain().focus().toggleHighlight().run(); return; }
      // Verifica se já tem highlight na seleção
      var hasHighlight = false;
      state.doc.nodesBetween(sel.from, sel.to, function(node) {
        if (node.isText && highlightMark.isInSet(node.marks)) hasHighlight = true;
      });
      var tr = state.tr;
      // Aplica/remove highlight apenas em nós de texto, pulando mathAtoms
      state.doc.nodesBetween(sel.from, sel.to, function(node, pos) {
        if (node.type.name === 'mathAtom' || node.type.name === 'sentinela') return false;
        if (!node.isText) return;
        var from = Math.max(pos, sel.from);
        var to = Math.min(pos + node.nodeSize, sel.to);
        if (from >= to) return;
        if (hasHighlight) {
          tr = tr.removeMark(from, to, highlightMark);
        } else {
          tr = tr.addMark(from, to, highlightMark.create({ color: null }));
        }
      });
      tiptapEditor.view.dispatch(tr);
    });
  };
  window.focusEditor = function() { tiptapEditor.commands.focus(); };
  window.blurEditor = function() { tiptapEditor.commands.blur(); };

  window.setHtml = function(h) {
    if (!h) {
      tiptapEditor.commands.clearContent(false);
    } else {
      tiptapEditor.commands.setContent(h, false, { preserveWhitespace: 'full' });
      if (proseMirrorEl) {
        proseMirrorEl.querySelectorAll('.invisible-char').forEach(function(el) {
          el.className = 'sentinela-anti-caps';
          el.textContent = '\u3164';
        });
      }
    }
    updatePlaceholder();
    notifyCharCount();
  };

  function criarSentinela() {
    var s = document.createElement('span');
    s.className = 'sentinela-anti-caps';
    s.textContent = '\u3164';
    return s;
  }

  var MAX_CHARS = 800;

  function calculateFormulaWeight(latex) {
    if (!latex) return 5;
    var s = latex.replace(/[a-zA-Z\\\\{}^ ]/g, '');
    return Math.max(5, s.length);
  }

  function countEquivalentChars() {
    try {
      if (!proseMirrorEl) return 0;
      var count = 0;
      var formulas = proseMirrorEl.querySelectorAll('.math-atom');
      for (var i = 0; i < formulas.length; i++) {
        count += calculateFormulaWeight(formulas[i].getAttribute('data-latex'));
      }
      var walker = document.createTreeWalker(proseMirrorEl, NodeFilter.SHOW_TEXT, function(node) {
        if (node.parentNode.closest && node.parentNode.closest('.math-atom')) return NodeFilter.FILTER_REJECT;
        if (node.parentNode.classList && node.parentNode.classList.contains('sentinela-anti-caps')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      });
      var n;
      while (n = walker.nextNode()) {
        count += n.textContent.replace(/[\u200B\u3164]/g, '').length;
      }
      return count;
    } catch(e) { return 0; }
  }

  function notifyCharCount() {
    try {
      var count = countEquivalentChars();
      sendToApp('CHAR_COUNT', { count: count, max: MAX_CHARS });
      return count;
    } catch(e) { return 0; }
  }

  window.setMaxChars = function(max) { MAX_CHARS = max; notifyCharCount(); };

  window.insertFormula = function(latex, id, source) {
    try {
      var peso = calculateFormulaWeight(latex);
      if (countEquivalentChars() + peso > MAX_CHARS) {
        sendToApp('CHAR_LIMIT_BLOCKED', { type: 'formula' });
        return;
      }
    } catch(e) {}
    if (!id) id = 'math_' + Date.now();
    var span = document.createElement('span');
    span.className = 'math-atom';
    span.contentEditable = 'false';
    span.setAttribute('data-id', id);
    span.setAttribute('data-latex', latex);
    span.setAttribute('data-source', source || 'simple');
    try { katex.render(latex, span, { throwOnError: false }); }
    catch (e) { span.textContent = latex; }
    span.querySelectorAll('.strut').forEach(function(s) { s.remove(); });
    tiptapEditor.chain().focus().insertContent([
      { type: 'mathAtom', attrs: { id: id, latex: latex, source: source || 'simple', html: span.innerHTML } },
      { type: 'sentinela' },
      { type: 'text', text: ' ' },
    ]).run();
    sendToApp('CONTENT_CHANGE', { html: getFullHtml() });
    notifyCharCount(); updatePlaceholder();
    if (latex.includes('Box')) {
      setTimeout(function() { sendToApp('EDIT_MATH', { id: id, latex: latex, source: source || 'simple' }); }, 100);
    }
  };

  window.updateFormula = function(id, newLatex) {
    if (!proseMirrorEl) return;
    var atom = proseMirrorEl.querySelector('.math-atom[data-id="' + id + '"]');
    if (!atom) return;
    var latexToRender = newLatex;
    var cleanTex = newLatex ? newLatex.replace(/\s/g, '') : '';
    if (!newLatex || cleanTex === '' || cleanTex === '\\frac{}{}' || cleanTex === '\\sqrt{}') {
      if (cleanTex && cleanTex.includes('frac')) latexToRender = '\\frac{\\Box}{\\Box}';
      else if (cleanTex && cleanTex.includes('sqrt')) latexToRender = '\\sqrt{\\Box}';
      else if (cleanTex && cleanTex.includes('^2')) latexToRender = '\\Box^2';
      else if (cleanTex && cleanTex.includes('log')) latexToRender = '\\log_{\\Box}{\\Box}';
      else {
        var oldLatex = atom.getAttribute('data-latex') || '';
        if (oldLatex.includes('frac')) latexToRender = '\\frac{\\Box}{\\Box}';
        else if (oldLatex.includes('sqrt')) latexToRender = '\\sqrt{\\Box}';
        else if (oldLatex.includes('^2')) latexToRender = '\\Box^2';
        else if (oldLatex.includes('log')) latexToRender = '\\log_{\\Box}{\\Box}';
        else return;
      }
    }
    // Renderiza o KaTeX no span temporário para obter o html atualizado
    var tmpSpan = document.createElement('span');
    try { katex.render(latexToRender, tmpSpan, { throwOnError: false }); } catch(e) { tmpSpan.textContent = latexToRender; }
    tmpSpan.querySelectorAll('.strut').forEach(function(s) { s.remove(); });
    var newHtml = tmpSpan.innerHTML;
    // Atualiza via transação TipTap para manter o state sincronizado
    var state = tiptapEditor.state;
    var found = null;
    state.doc.descendants(function(node, pos) {
      if (node.type.name === 'mathAtom' && node.attrs.id === id) {
        found = { node: node, pos: pos };
        return false;
      }
    });
    if (found) {
      var tr = state.tr.setNodeMarkup(found.pos, null, Object.assign({}, found.node.attrs, { latex: latexToRender, html: newHtml }));
      tiptapEditor.view.dispatch(tr);
    } else {
      // Fallback: atualiza DOM diretamente
      atom.setAttribute('data-latex', latexToRender);
      try { katex.render(latexToRender, atom, { throwOnError: false }); } catch(e) {}
      atom.querySelectorAll('.strut').forEach(function(s) { s.remove(); });
    }
    sendToApp('CONTENT_CHANGE', { html: getFullHtml() });
    notifyCharCount();
  };

  window.pasteText = function(text) {
    handlePasteData('', text);
  };

  window.insertSymbol = function(s) {
    try { if (countEquivalentChars() + s.length > MAX_CHARS) return; } catch(e) {}
    tiptapEditor.chain().focus().insertContent(s).run();
  };

  var _convertingLatex = false;
  function detectAndConvertLatexInDoc() {
    if (_convertingLatex) return;
    var state = tiptapEditor.state;
    // Procura text node com $...$ completo
    var found = null;
    state.doc.descendants(function(node, pos) {
      if (found) return false;
      if (!node.isText) return;
      var txt = node.text;
      var d1 = txt.indexOf('$');
      if (d1 === -1) return;
      var d2 = txt.indexOf('$', d1 + 1);
      if (d2 === -1) return;
      var latex = txt.slice(d1 + 1, d2).trim();
      if (!latex) return;
      found = { pos: pos, node: node, d1: d1, d2: d2, latex: latex };
    });
    if (!found) return;
    _convertingLatex = true;
    var span = document.createElement('span');
    try { katex.render(found.latex, span, { throwOnError: false }); } catch(e) { span.textContent = found.latex; }
    span.querySelectorAll('.strut').forEach(function(s) { s.remove(); });
    var newId = 'math_' + Date.now();
    var schema = tiptapEditor.state.schema;
    var mathNode = schema.nodeFromJSON({ type: 'mathAtom', attrs: { id: newId, latex: found.latex, source: 'simple', html: span.innerHTML } });
    var sentinelaNode = schema.nodeFromJSON({ type: 'sentinela' });
    var before = found.node.text.slice(0, found.d1);
    var after = found.node.text.slice(found.d2 + 1);
    var tr = tiptapEditor.state.tr;
    var basePos = found.pos;
    // Apaga o text node inteiro e reconstrói: before + mathAtom + sentinela + ' ' + after
    tr = tr.delete(basePos, basePos + found.node.nodeSize);
    // Insere de trás para frente para preservar basePos
    if (after) tr = tr.insert(basePos, schema.text(after));
    // Só insere espaço se 'after' não começa com espaço (evita duplo espaço)
    var insertedSpace = !after || after[0] !== ' ';
    if (insertedSpace) tr = tr.insert(basePos, schema.text(' '));
    tr = tr.insert(basePos, sentinelaNode);
    tr = tr.insert(basePos, mathNode);
    if (before) tr = tr.insert(basePos, schema.text(before));
    // Posiciona cursor após o espaço (sempre +1, seja espaço inserido ou já em 'after')
    var spacePos = basePos + (before ? before.length : 0) + mathNode.nodeSize + sentinelaNode.nodeSize + 1;
    var TextSelection = tiptapEditor.state.selection.constructor;
    try {
      var $pos = tr.doc.resolve(spacePos);
      tr = tr.setSelection(TextSelection.near($pos));
    } catch(e) {}
    tiptapEditor.view.dispatch(tr);
    _convertingLatex = false;
    // Verifica se ainda tem mais $...$ para converter
    detectAndConvertLatexInDoc();
  }

  function handlePasteData(html, text) {
    // Recover $latex$ from HTML when copied from our own editor via Android native menu
    if (html && html.includes('data-latex')) {
      var tmp = document.createElement('div');
      tmp.innerHTML = html;
      tmp.querySelectorAll('.sentinela-anti-caps').forEach(function(el) { el.remove(); });
      tmp.querySelectorAll('.math-atom').forEach(function(atom) {
        var latex = atom.getAttribute('data-latex');
        if (latex) atom.parentNode.replaceChild(document.createTextNode('$' + latex + '$'), atom);
      });
      text = (tmp.textContent || '').replace(/ㅤ/g, '').trim();
    }
    if (!text) return false;
    try {
      var currentCount = countEquivalentChars();
      var remaining = MAX_CHARS - currentCount;
      if (remaining <= 0) return true;
      if (text.length > remaining) text = text.substring(0, remaining);
    } catch(e2) {}
    var parts = [];
    var i = 0;
    while (i < text.length) {
      var d1 = text.indexOf('$', i);
      if (d1 === -1) { parts.push({ type: 'text', text: text.slice(i) }); break; }
      if (d1 > i) parts.push({ type: 'text', text: text.slice(i, d1) });
      var d2 = text.indexOf('$', d1 + 1);
      if (d2 === -1) { parts.push({ type: 'text', text: text.slice(d1) }); break; }
      var latex = text.slice(d1 + 1, d2).trim();
      if (latex) {
        var span = document.createElement('span');
        try { katex.render(latex, span, { throwOnError: false }); } catch(err) { span.textContent = latex; }
        span.querySelectorAll('.strut').forEach(function(s) { s.remove(); });
        var newId = 'math_' + Date.now() + '_' + parts.length;
        parts.push({ type: 'mathAtom', attrs: { id: newId, latex: latex, source: 'simple', html: span.innerHTML } });
        parts.push({ type: 'sentinela' });
        parts.push({ type: 'text', text: ' ' });
      } else {
        parts.push({ type: 'text', text: '$$' });
      }
      i = d2 + 1;
    }
    if (parts.length === 0) return false;
    tiptapEditor.chain().focus().deleteSelection().insertContent(parts).run();
    sendToApp('CONTENT_CHANGE', { html: getFullHtml() });
    notifyCharCount(); updatePlaceholder();
    return true;
  }

  function attachEventListeners() {
  document.addEventListener('click', function(e) {
    var mathAtom = e.target.closest && e.target.closest('.math-atom');
    if (mathAtom) {
      e.preventDefault(); e.stopPropagation();
      mathAtom.style.backgroundColor = 'rgba(66, 153, 225, 0.4)';
      setTimeout(function() { mathAtom.style.backgroundColor = ''; }, 200);
      sendToApp('EDIT_MATH', {
        id: mathAtom.getAttribute('data-id'),
        latex: mathAtom.getAttribute('data-latex'),
        source: mathAtom.getAttribute('data-source') || 'simple'
      });
      setTimeout(function() {
        var sel = window.getSelection();
        sel.removeAllRanges();
        var range = document.createRange();
        var sentinela = mathAtom.nextSibling;
        var targetNode = null;
        if (sentinela && sentinela.classList && sentinela.classList.contains('sentinela-anti-caps')) {
          var space = sentinela.nextSibling;
          if (space && space.nodeType === 3) {
            targetNode = space;
          } else {
            var newSpace = document.createTextNode(' ');
            sentinela.parentNode.insertBefore(newSpace, sentinela.nextSibling);
            targetNode = newSpace;
          }
        } else if (mathAtom.nextSibling) {
          targetNode = mathAtom.nextSibling;
        }
        if (targetNode) {
          range.setStart(targetNode, Math.min(1, targetNode.length || 0));
          range.collapse(true);
          sel.addRange(range);
        }
      }, 100);
    }
  });

  document.addEventListener('selectionchange', function() {
    document.querySelectorAll('.math-atom.selected').forEach(function(atom) { atom.classList.remove('selected'); });
    var sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return;
    if (!proseMirrorEl) return;
    Array.from(proseMirrorEl.querySelectorAll('.math-atom')).forEach(function(atom) {
      if (sel.containsNode(atom, true)) atom.classList.add('selected');
    });
  });

  document.addEventListener('contextmenu', function(e) {
    var mathAtom = e.target.closest && e.target.closest('.math-atom');
    if (mathAtom) {
      var originalHTML = mathAtom.innerHTML;
      mathAtom.contentEditable = 'true';
      tiptapEditor.commands.focus();
      var sel = window.getSelection();
      var range = document.createRange();
      range.selectNode(mathAtom);
      sel.removeAllRanges(); sel.addRange(range);
      var restore = function() {
        if (mathAtom.parentNode) {
          mathAtom.contentEditable = 'false';
          if (mathAtom.innerHTML !== originalHTML) mathAtom.innerHTML = originalHTML;
        }
        document.removeEventListener('touchstart', restoreOnTouch);
      };
      var restoreOnTouch = function() { restore(); };
      setTimeout(function() { document.addEventListener('touchstart', restoreOnTouch, { once: true }); }, 50);
      setTimeout(restore, 3000);
    }
  });

  proseMirrorEl.addEventListener('beforeinput', function(e) {
    if (e.inputType !== 'deleteContentBackward') return;
    // Usa ProseMirror para encontrar mathAtom imediatamente antes do cursor
    var state = tiptapEditor.state;
    var cursorPos = state.selection.from;
    var doc = state.doc;
    var mathPos = null, mathSize = null;
    doc.nodesBetween(0, cursorPos, function(node, pos) {
      if (node.type.name === 'mathAtom') { mathPos = pos; mathSize = node.nodeSize; }
    });
    if (mathPos === null) return;
    // Verifica que entre o fim do math e o cursor só há sentinela/espaço/ZWS
    var between = '';
    doc.nodesBetween(mathPos + mathSize, cursorPos, function(node) {
      if (node.isText) between += node.text.replace(/​/g, '').replace(/ /g, '');
    });
    if (between.length > 0) return;
    e.preventDefault();
    var tr = state.tr.delete(mathPos, cursorPos);
    var resolvedPos = tr.doc.resolve(mathPos);
    if (resolvedPos.parent.content.size === 0) {
      tr = tr.insertText('​', mathPos);
    }
    tiptapEditor.view.dispatch(tr);
    sendToApp('CONTENT_CHANGE', { html: getFullHtml() });
    notifyCharCount(); updatePlaceholder();
  });

  proseMirrorEl.addEventListener('beforeinput', function(e) {
    var formula = e.target.closest && e.target.closest('.math-atom');
    if (formula) { e.preventDefault(); e.stopPropagation(); return false; }
  }, true);

  proseMirrorEl.addEventListener('beforeinput', function(e) {
    try {
      if (!e.inputType) return;
      if (e.inputType.startsWith('delete') || e.inputType.startsWith('format') || e.inputType.startsWith('history')) return;
      var currentCount = countEquivalentChars();
      if (e.inputType === 'insertText') {
        var incomingLength = (e.data || '').length;
        if (currentCount + incomingLength > MAX_CHARS) { e.preventDefault(); return; }
      }
      if (e.inputType === 'insertCompositionText' && currentCount >= MAX_CHARS) { e.preventDefault(); return; }
      if (e.inputType.startsWith('insert') && e.inputType !== 'insertText' && e.inputType !== 'insertCompositionText') {
        if (currentCount >= MAX_CHARS) { e.preventDefault(); return; }
      }
    } catch(e2) {}
  });

  function getSelectedTextFromTiptap() {
    var state = tiptapEditor.state;
    var sel = state.selection;
    var text = '';
    state.doc.nodesBetween(sel.from, sel.to, function(node) {
      if (node.type.name === 'mathAtom') {
        text += '$' + (node.attrs.latex || '') + '$';
      } else if (node.type.name !== 'sentinela' && node.isText) {
        text += node.text;
      }
    });
    return text;
  }

  document.addEventListener('copy', function(e) {
    e.stopImmediatePropagation();
    var tiptapText = getSelectedTextFromTiptap();
    // Colapsa seleção para o fim após copiar
    var selTo = tiptapEditor.state.selection.to;
    var selEmpty = tiptapEditor.state.selection.empty;
    setTimeout(function() {
      if (!selEmpty) {
        tiptapEditor.commands.setTextSelection(selTo);
      }
    }, 0);
    // Fallback: seleção nativa via long-press em math-atom
    if (!tiptapText) {
      var sel = window.getSelection();
      if (sel && sel.rangeCount) {
        var container = sel.getRangeAt(0).commonAncestorContainer;
        var atom = (container.nodeType === 1 ? container : container.parentElement);
        atom = atom && atom.closest ? atom.closest('.math-atom') : null;
        if (atom) {
          var latex = atom.getAttribute('data-latex');
          if (latex) tiptapText = '$' + latex + '$';
        }
        // Se seleção abrange múltiplos nós, serializar o fragmento
        if (!tiptapText && sel.toString()) {
          tiptapText = sel.toString();
        }
      }
    }
    if (!tiptapText) return;
    if (e.clipboardData) {
      e.clipboardData.setData('text/plain', tiptapText);
      e.clipboardData.setData('text/html', '');
      e.preventDefault();
    }
  }, true);

  proseMirrorEl.addEventListener('paste', function(e) {
    var clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;
    var html = clipboardData.getData('text/html') || '';
    var text = clipboardData.getData('text/plain') || '';
    // Só intercepta via DOM se o handlePaste do TipTap não vai ser chamado
    // (quando html tem data-latex mas não $ no texto — Android nativo sem copy-tex)
    if (html.includes('data-latex') && !text.includes('$')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      handlePasteData(html, text);
    }
  }, true);

  document.addEventListener('cut', function(e) {
    e.stopImmediatePropagation();
    var text = getSelectedTextFromTiptap();
    if (!text) return;
    e.preventDefault();
    if (e.clipboardData) { e.clipboardData.setData('text/plain', text); e.clipboardData.setData('text/html', ''); }
    // Notifica RN para atualizar clipboardText
    sendToApp('CUT_TEXT', { text: text });
    tiptapEditor.chain().focus().deleteSelection().run();
    // Verifica se o que sobrou é só espaço/sentinela e limpa via TipTap
    var afterState = tiptapEditor.state;
    var hasRealContent = false;
    afterState.doc.descendants(function(node) {
      if (node.type.name === 'mathAtom') { hasRealContent = true; return false; }
      if (node.isText && node.text.replace(/[ㅤ​ ]/g, '').length > 0) { hasRealContent = true; return false; }
    });
    if (!hasRealContent) {
      tiptapEditor.commands.clearContent(false);
    }
    sendToApp('CONTENT_CHANGE', { html: getFullHtml() });
    notifyCharCount(); updatePlaceholder();
  }, true);


  var isComposing = false;
  proseMirrorEl.addEventListener('compositionstart', function() { isComposing = true; });
  proseMirrorEl.addEventListener('compositionend', function() { isComposing = false; });
  proseMirrorEl.addEventListener('input', function(e) {});

  proseMirrorEl.addEventListener('beforeinput', function(e) {
    if (e.inputType !== 'insertText') return;
    var char = e.data;
    if (!char || !/^[a-z\u00E0-\u00FF]$/.test(char)) return;
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    var range = sel.getRangeAt(0);
    var container = range.startContainer, offset = range.startOffset;
    var textBefore = '';
    if (container.nodeType === 3) textBefore = container.textContent.substring(Math.max(0, offset - 10), offset);
    if (/[.!?]+\s+$/.test(textBefore)) {
      e.preventDefault();
      document.execCommand('insertText', false, char.toUpperCase());
    }
  });

  proseMirrorEl.addEventListener('touchend', function() {
    setTimeout(notifyFormatState, 80);
  });
  } // end attachEventListeners

</script>
</body>
</html>`;
}

// editorHtml como template literal com ${katexStyles} e ${katexScript} interpolados
// TipTap e copyTex já estão escapados dentro do template
const editorHtmlTemplate = buildEditorHtml(tiptapEscaped, copyTexEscaped);

// katexStyles e katexScript: JSON.stringify para evitar problemas de escaping
// (template literal + extractRawConst trunca por causa dos \u no KaTeX)
const katexStylesJson = JSON.stringify(katexStylesFromFile);
const katexScriptClean = katexScriptFromFile.replace(/^\r\n/, '');
// katexScript como template literal (igual ao backup) — funciona no Hermes e WebView Android
const katexScriptEscaped = escapeForTemplateLiteral(katexScriptClean);

const outputContent = `// Templates para o editor de matemática com KaTeX + TipTap
// GERADO AUTOMATICAMENTE por tiptap-build/buildEditor.js — não editar manualmente

const katexStyles = ${katexStylesJson};

const katexScript = \`${katexScriptEscaped}\`;

const editorHtml = \`${editorHtmlTemplate}\`;

${previewHtmlBlock}

export { katexScript, editorHtml, katexStyles, previewHtml };
export default { katexScript, editorHtml, katexStyles, previewHtml };
`;

fs.writeFileSync(path.join(editorDir, 'editorTemplates.new.js'), outputContent);

console.log('✅ editorTemplates.new.js gerado com sucesso!');
console.log('Total size:', Math.round(fs.statSync(path.join(editorDir, 'editorTemplates.new.js')).size / 1024) + 'KB');
