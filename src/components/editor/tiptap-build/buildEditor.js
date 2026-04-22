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

// Copy-Tex extension
const copyTexIdx = oldTemplates.indexOf('<!-- KaTeX Copy-Tex Extension (Offline) -->');
let copyTexScript = '';
if (copyTexIdx !== -1) {
  const scriptStart = oldTemplates.indexOf('<script>', copyTexIdx) + '<script>'.length;
  const scriptEnd = oldTemplates.indexOf('</script>', scriptStart);
  copyTexScript = oldTemplates.substring(scriptStart, scriptEnd);
}

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
      user-select: all;
      -webkit-user-select: all;
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
    },
    onFocus: function() { sendToApp('FOCUS', {}); },
    onUpdate: function() {
      var html = getFullHtml();
      sendToApp('CONTENT_CHANGE', { html: html });
      notifyCharCount();
      updatePlaceholder();
    },
    onCreate: function() {
      proseMirrorEl = document.querySelector('.ProseMirror');
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

  function notifyFormatState() {
    sendToApp('FORMAT_STATE', {
      bold: tiptapEditor.isActive('bold'),
      italic: tiptapEditor.isActive('italic'),
      mark: tiptapEditor.isActive('highlight'),
    });
  }

  tiptapEditor.on('selectionUpdate', function() { notifyFormatState(); });

  window.toggleBold = function() { tiptapEditor.chain().focus().toggleBold().run(); notifyFormatState(); };
  window.toggleItalic = function() { tiptapEditor.chain().focus().toggleItalic().run(); notifyFormatState(); };
  window.toggleMark = function() { tiptapEditor.chain().focus().toggleHighlight().run(); notifyFormatState(); };
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
    atom.setAttribute('data-latex', latexToRender);
    atom.style.backgroundColor = '';
    try { katex.render(latexToRender, atom, { throwOnError: false }); } catch(e) {}
    atom.querySelectorAll('.strut').forEach(function(s) { s.remove(); });
    sendToApp('CONTENT_CHANGE', { html: getFullHtml() });
    notifyCharCount();
  };

  window.insertSymbol = function(s) {
    try { if (countEquivalentChars() + s.length > MAX_CHARS) return; } catch(e) {}
    tiptapEditor.chain().focus().insertContent(s).run();
  };

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
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    var range = sel.getRangeAt(0);
    var curr = range.startContainer;
    var offset = range.startOffset;
    if (curr.nodeType === 3 && offset > 0) return;
    var probe = null, nodesToDelete = [], atomFound = null;
    if (curr.nodeType === 3 && offset === 0) probe = curr.previousSibling;
    else if (curr === proseMirrorEl) probe = curr.childNodes[offset - 1];
    else if (curr.nodeType === 3) probe = curr.previousSibling;
    while (probe) {
      if (probe.nodeType === 1 && probe.classList.contains('math-atom')) { atomFound = probe; break; }
      var isInvis = probe.nodeType === 1 && probe.classList.contains('sentinela-anti-caps');
      var isEmpty = probe.nodeType === 3 && probe.textContent.trim() === '';
      var isZWS = probe.nodeType === 3 && probe.textContent === '\u200B';
      if (isInvis || isEmpty || isZWS) { nodesToDelete.push(probe); probe = probe.previousSibling; continue; }
      if (probe.nodeType === 3 && probe.textContent === ' ') break;
      break;
    }
    if (atomFound) {
      e.preventDefault();
      nodesToDelete.forEach(function(n) { n.remove(); });
      atomFound.remove();
      var prevSibling = atomFound.previousSibling;
      var hasContentBefore = prevSibling && ((prevSibling.nodeType === 3 && prevSibling.textContent.length > 0) || prevSibling.nodeType === 1);
      if (!hasContentBefore) document.execCommand('insertText', false, '\u200B');
      sendToApp('CONTENT_CHANGE', { html: getFullHtml() });
      notifyCharCount(); updatePlaceholder();
    }
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

  proseMirrorEl.addEventListener('copy', function(e) {
    e.stopPropagation();
    var sel = window.getSelection();
    if (!sel.rangeCount) return;
    var range = sel.getRangeAt(0);
    var div = document.createElement('div');
    div.appendChild(range.cloneContents());
    div.querySelectorAll('.sentinela-anti-caps').forEach(function(el) { el.remove(); });
    div.querySelectorAll('.math-atom').forEach(function(atom) {
      var latex = atom.getAttribute('data-latex');
      if (latex) atom.parentNode.replaceChild(document.createTextNode('$' + latex + '$'), atom);
    });
    var text = (div.textContent || '').replace(/\u3164/g, '');
    if (e.clipboardData) { e.clipboardData.setData('text/plain', text); e.preventDefault(); }
  });

  proseMirrorEl.addEventListener('cut', function(e) {
    e.stopPropagation();
    var sel = window.getSelection();
    if (!sel.rangeCount) return;
    var range = sel.getRangeAt(0);
    var div = document.createElement('div');
    div.appendChild(range.cloneContents());
    div.querySelectorAll('.sentinela-anti-caps').forEach(function(el) { el.remove(); });
    div.querySelectorAll('.math-atom').forEach(function(atom) {
      var latex = atom.getAttribute('data-latex');
      if (latex) atom.parentNode.replaceChild(document.createTextNode('$' + latex + '$'), atom);
    });
    var text = (div.textContent || '').replace(/\u3164/g, '');
    if (e.clipboardData) { e.clipboardData.setData('text/plain', text); e.preventDefault(); }
    range.deleteContents();
    var nodesToRemove = [];
    proseMirrorEl.childNodes.forEach(function(node) {
      if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) nodesToRemove.push(node);
      if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('sentinela-anti-caps')) {
        var prev = node.previousSibling;
        if (!(prev && prev.nodeType === 1 && prev.classList && prev.classList.contains('math-atom'))) nodesToRemove.push(node);
      }
    });
    nodesToRemove.forEach(function(n) { n.remove(); });
    sendToApp('CONTENT_CHANGE', { html: getFullHtml() });
    notifyCharCount(); updatePlaceholder();
  });

  proseMirrorEl.addEventListener('paste', function(e) {
    e.preventDefault();
    var clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;
    var text = clipboardData.getData('text/plain') || clipboardData.getData('text') || '';
    if (!text) return;
    text = text.replace(/\u3164/g, '');
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) { tiptapEditor.commands.focus(); sel = window.getSelection(); if (!sel || !sel.rangeCount) return; }
    var range = sel.getRangeAt(0);
    range.deleteContents();
    try {
      var currentCount = countEquivalentChars();
      var remaining = MAX_CHARS - currentCount;
      if (remaining <= 0) return;
      if (text.length > remaining) text = text.substring(0, remaining);
    } catch(e2) {}
    var textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode); range.setEndAfter(textNode);
    sel.removeAllRanges(); sel.addRange(range);
    detectAndConvertFormula();
    sendToApp('CONTENT_CHANGE', { html: getFullHtml() });
    notifyCharCount(); updatePlaceholder();
  });

  proseMirrorEl.addEventListener('paste', function(e) {
    setTimeout(function() {
      if (!proseMirrorEl) return;
      proseMirrorEl.querySelectorAll('.math-atom').forEach(function(atom) {
        var next = atom.nextSibling;
        if (!next || (next.nodeType === 1 && next.className !== 'sentinela-anti-caps') || (next.nodeType === 3 && next.textContent !== ' ')) {
          if (next && next.nodeType === 1 && next.className === 'sentinela-anti-caps') return;
          var s = criarSentinela();
          if (next) atom.parentNode.insertBefore(s, next);
          else atom.parentNode.appendChild(s);
        }
      });
    }, 50);
  });

  function detectAndConvertFormula() {
    if (!proseMirrorEl) return;
    var maxIterations = 20, converted = 0, lastSentinela = null, lastSpaceNode = null;
    for (var iteration = 0; iteration < maxIterations; iteration++) {
      var walker = document.createTreeWalker(proseMirrorEl, NodeFilter.SHOW_TEXT, null, false);
      var textNode = null, node;
      while (node = walker.nextNode()) {
        if (node.parentNode && node.parentNode.classList && node.parentNode.classList.contains('math-atom')) continue;
        if (node.parentNode && node.parentNode.classList && node.parentNode.classList.contains('sentinela-anti-caps')) continue;
        var txt = node.textContent;
        var first = txt.indexOf('$');
        if (first !== -1) {
          var second = txt.indexOf('$', first + 1);
          if (second !== -1 && txt.substring(first + 1, second).trim()) { textNode = node; break; }
        }
      }
      if (!textNode) break;
      var content = textNode.textContent;
      var firstDollar = content.indexOf('$'), secondDollar = content.indexOf('$', firstDollar + 1);
      var latex = content.substring(firstDollar + 1, secondDollar).trim();
      var before = content.substring(0, firstDollar), afterContent = content.substring(secondDollar + 1);
      var parent = textNode.parentNode;
      var newId = 'math_' + Date.now() + '_' + iteration;
      var span = document.createElement('span');
      span.className = 'math-atom'; span.contentEditable = 'false';
      span.setAttribute('data-id', newId); span.setAttribute('data-latex', latex);
      try { katex.render(latex, span, { throwOnError: false }); }
      catch(err) { span.textContent = '$' + latex + '$'; }
      span.querySelectorAll('.strut').forEach(function(s) { s.remove(); });
      var needsSpace = !afterContent || !afterContent.startsWith(' ');
      var sentinela = criarSentinela();
      var frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      frag.appendChild(span); frag.appendChild(sentinela);
      var spaceAfter = null;
      if (needsSpace) { spaceAfter = document.createTextNode(' '); frag.appendChild(spaceAfter); }
      if (afterContent) frag.appendChild(document.createTextNode(afterContent));
      parent.replaceChild(frag, textNode);
      lastSentinela = sentinela; lastSpaceNode = spaceAfter; converted++;
    }
    if (converted > 0 && lastSentinela) {
      setTimeout(function() {
        try {
          var sel = window.getSelection(), range = document.createRange();
          var target = lastSpaceNode || lastSentinela.nextSibling;
          if (target && target.nodeType === Node.TEXT_NODE && target.parentNode) {
            range.setStart(target, target.textContent.length); range.setEnd(target, target.textContent.length);
          } else if (lastSentinela.parentNode) {
            range.setStartAfter(lastSentinela); range.setEndAfter(lastSentinela);
          } else {
            range.selectNodeContents(proseMirrorEl); range.collapse(false);
          }
          sel.removeAllRanges(); sel.addRange(range);
        } catch(e) {}
      }, 10);
    }
    updatePlaceholder();
  }

  var isComposing = false;
  proseMirrorEl.addEventListener('compositionstart', function() { isComposing = true; });
  proseMirrorEl.addEventListener('compositionend', function() {
    isComposing = false;
    setTimeout(detectAndConvertFormula, 50);
  });
  proseMirrorEl.addEventListener('input', function(e) {
    if (e.inputType && e.inputType.startsWith('delete')) return;
    if (!isComposing && e.inputType !== 'insertCompositionText') setTimeout(detectAndConvertFormula, 50);
  });

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
