import { Editor, Node } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Highlight from '@tiptap/extension-highlight';
import History from '@tiptap/extension-history';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';

const MathAtom = Node.create({
  name: 'mathAtom',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      id: { default: null, parseHTML: el => el.getAttribute('data-id'), renderHTML: attrs => ({ 'data-id': attrs.id }) },
      latex: { default: '', parseHTML: el => el.getAttribute('data-latex'), renderHTML: attrs => ({ 'data-latex': attrs.latex }) },
      source: { default: 'simple', parseHTML: el => el.getAttribute('data-source'), renderHTML: attrs => ({ 'data-source': attrs.source }) },
      html: { default: '', parseHTML: el => el.innerHTML, renderHTML: () => ({}) },
    };
  },

  parseHTML() {
    return [{ tag: 'span.math-atom' }];
  },

  renderHTML({ node }) {
    const span = document.createElement('span');
    span.className = 'math-atom';
    span.contentEditable = 'false';
    span.setAttribute('data-id', node.attrs.id || '');
    span.setAttribute('data-latex', node.attrs.latex || '');
    span.setAttribute('data-source', node.attrs.source || 'simple');
    span.innerHTML = node.attrs.html || '';
    return { dom: span };
  },
});

const Sentinela = Node.create({
  name: 'sentinela',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: false,
  draggable: false,

  parseHTML() {
    return [{ tag: 'span.sentinela-anti-caps' }];
  },

  renderHTML() {
    const span = document.createElement('span');
    span.className = 'sentinela-anti-caps';
    span.textContent = 'ㅤ';
    return { dom: span };
  },
});

window.TipTapCore = { Editor, Node, Bold, Italic, Highlight, History, Document, Paragraph, Text, MathAtom, Sentinela };
