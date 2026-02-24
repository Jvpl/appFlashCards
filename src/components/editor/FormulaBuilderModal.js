import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Dimensions,
  Vibration,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { previewHtml } from './editorTemplates';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
// Largura fixa das teclas QWERTY = mesma da linha de 10 teclas
// Sheet: 14px padding × 2; 9 gaps de 5px entre as 10 teclas
const QWERTY_KEY_W = Math.floor((SCREEN_W - 14 * 2 - 5 * 9) / 10);
// Tap háptico curto (12 ms) — feedback tátil nas teclas
const tap = () => { try { Vibration.vibrate(12); } catch (_) { } };

// ─── Tokenizador LaTeX ────────────────────────────────────────────────────────
// \left( e \right) são 1 token — cursor nunca cai no meio deles
function latexTokens(str) {
  const re = /\\(?:left|right)[^a-zA-Z]|\\[a-zA-Z]+\*?\s*|[\s\S]/g;
  const out = [];
  let m;
  while ((m = re.exec(str)) !== null) {
    out.push({ t: m[0], s: m.index, e: m.index + m[0].length });
  }
  return out;
}
// Se cursor cair dentro de um token (ex: posição 3 de \left(), snap para o fim do token
function snapCursor(formula, pos) {
  for (const tok of latexTokens(formula)) {
    if (tok.s < pos && pos < tok.e) return tok.e;
  }
  return pos;
}
// ══════════════════════════════════════════════════════════════════════════════
// AUTO-CONVERSÃO DE PARÊNTESES: () ↔ \left(\right)
// ══════════════════════════════════════════════════════════════════════════════
//
// PROPÓSITO:
//   Faz os parênteses crescerem automaticamente quando contêm frações, mantendo
//   a capacidade de deletar () de forma MODULAR (um de cada vez).
//
// COMO FUNCIONA:
//   1. Usuário insere () normais (botão "( )")
//   2. Ao inserir \frac{}{} dentro de (), a conversão é IMEDIATA:
//      - () vira \left(\right) → parênteses crescem com a fração
//      - Cursor é ajustado para a posição correta (dentro do numerador)
//   3. Ao apagar a fração, conversão reversa AUTOMÁTICA:
//      - \left(\right) volta para () → parênteses voltam ao tamanho normal
//      - Cursor é ajustado (posição 6 em \left( → posição 1 em ()
//   4. Backspace é MODULAR:
//      - ()| + backspace → apaga só o )
//      - (|) + backspace → apaga o par vazio () inteiro
//      - (\frac{}{}|) + backspace → apaga só a FRAÇÃO, deixa o (
//
// GATILHOS DE CONVERSÃO:
//   - insertStruct: quando insere fração (conversão imediata, linha 291)
//   - nextSlot, exitGroup: ao navegar entre campos (linha 333, 323)
//   - moveLeft, moveRight: ao mover cursor (linha 688, 731)
//   - setFormulaConverted: ao apagar com backspace (linha 338)
//
// AJUSTE DE CURSOR:
//   - Ao converter ( → \left(: adiciona 5 caracteres antes do cursor
//   - Ao converter \left( → (: subtrai 5 caracteres do cursor
//   - Garante que cursor nunca fica em posição inválida
//
// EXEMPLOS:
//   Inserção:  ()| → clica a/b → \left(\frac{}{}\right) com cursor no numerador
//   Deleção:   \left(\frac{8}{3}| → backspace → \left( → converte → (|
//   Modular:   ()| → backspace → (| → backspace → |
//
// ══════════════════════════════════════════════════════════════════════════════
function autoConvertParentheses(formula) {
  const toks = latexTokens(formula);
  const pairs = [];
  const stack = [];

  // Encontrar todos os pares de () ou \left(\right)
  for (let i = 0; i < toks.length; i++) {
    const tok = toks[i];
    if (tok.t === '(' || tok.t === '\\left(') {
      stack.push({ type: tok.t, start: tok.s, end: tok.e });
    } else if (tok.t === ')' || tok.t === '\\right)') {
      if (stack.length > 0) {
        const open = stack.pop();
        const content = formula.slice(open.end, tok.s);
        const hasFrac = content.includes('\\frac');
        pairs.push({
          openType: open.type,
          closeType: tok.t,
          openStart: open.start,
          openEnd: open.end,
          closeStart: tok.s,
          closeEnd: tok.e,
          hasFrac
        });
      }
    }
  }

  // Converter pares (de trás para frente para não bagunçar índices)
  let result = formula;
  for (let i = pairs.length - 1; i >= 0; i--) {
    const p = pairs[i];
    if (p.hasFrac && p.openType === '(') {
      // Tem fração mas usa () → converter para \left(\right)
      result = result.slice(0, p.openStart) + '\\left(' +
        result.slice(p.openEnd, p.closeStart) + '\\right)' +
        result.slice(p.closeEnd);
    } else if (!p.hasFrac && p.openType === '\\left(') {
      // Não tem fração mas usa \left(\right) → converter para ()
      result = result.slice(0, p.openStart) + '(' +
        result.slice(p.openEnd, p.closeStart) + ')' +
        result.slice(p.closeEnd);
    }
  }

  return result;
}
// Sanitiza a fórmula para preview, corrigindo \left sem \right (e vice-versa)
// Adiciona delimitadores invisíveis (\left. ou \right.) para evitar erro LaTeX
function sanitizeForPreview(formula) {
  let result = formula;

  // Conta \left( e \right)
  const leftParenCount = (result.match(/\\left\(/g) || []).length;
  const rightParenCount = (result.match(/\\right\)/g) || []).length;

  // Conta \left| e \right|
  const leftBarCount = (result.match(/\\left\|/g) || []).length;
  const rightBarCount = (result.match(/\\right\|/g) || []).length;

  // Corrige parênteses: se tem mais \left( do que \right), adiciona \right. no final
  if (leftParenCount > rightParenCount) {
    for (let i = 0; i < leftParenCount - rightParenCount; i++) {
      result += '\\right.';
    }
  }
  // Se tem mais \right) do que \left(, adiciona \left. no início
  else if (rightParenCount > leftParenCount) {
    for (let i = 0; i < rightParenCount - leftParenCount; i++) {
      result = '\\left.' + result;
    }
  }

  // Corrige barras: se tem mais \left| do que \right|, adiciona \right. no final
  if (leftBarCount > rightBarCount) {
    for (let i = 0; i < leftBarCount - rightBarCount; i++) {
      result += '\\right.';
    }
  }
  // Se tem mais \right| do que \left|, adiciona \left. no início
  else if (rightBarCount > leftBarCount) {
    for (let i = 0; i < rightBarCount - leftBarCount; i++) {
      result = '\\left.' + result;
    }
  }

  return result;
}

// ─── Blocos lego ──────────────────────────────────────────────────────────────
const STRUCTS = [
  { label: 'a/b', latex: '\\frac{}{}', offset: 6 },
  { label: 'xⁿ', latex: '^{}', offset: 2 },
  { label: 'xₙ', latex: '_{}', offset: 2 },
  // √ com índice opcional: cursor cai no radicando {} (offset 8)
  // ◀ do início do radicando → entra no índice [] para raiz n-ésima
  { label: '√', latex: '\\sqrt[]{}', offset: 8 },
  { label: '( )', latex: '()', offset: 1 },
  { label: '|x|', latex: '||', offset: 1 },
  { label: 'logₐ', latex: '\\log_{}{}', offset: 6 },
];

// ─── Símbolos em linhas de 5 (preenche igualmente toda a largura) ─────────────
const SYM_ROWS = [
  [{ d: 'π', l: '\\pi ' }, { d: 'θ', l: '\\theta ' }, { d: 'α', l: '\\alpha ' }, { d: 'β', l: '\\beta ' }, { d: 'γ', l: '\\gamma ' }],
  [{ d: 'λ', l: '\\lambda ' }, { d: 'μ', l: '\\mu ' }, { d: 'σ', l: '\\sigma ' }, { d: 'ω', l: '\\omega ' }, { d: 'φ', l: '\\phi ' }],
  [{ d: 'ε', l: '\\epsilon ' }, { d: 'δ', l: '\\delta ' }, { d: '∞', l: '\\infty ' }, { d: '≠', l: '\\neq ' }, { d: '≥', l: '\\geq ' }],
  [{ d: '≤', l: '\\leq ' }, { d: '±', l: '\\pm ' }, { d: '→', l: '\\to ' }, { d: '∑', l: '\\sum ' }, { d: '∫', l: '\\int ' }],
  [{ d: '<', l: '<' }, { d: '>', l: '>' }, { d: '≈', l: '\\approx ' }, { d: '∈', l: '\\in ' }, { d: '∝', l: '\\propto ' }],
];

// ─── Letras QWERTY ────────────────────────────────────────────────────────────
// Long-press em qualquer tecla insere a letra maiúscula (indicado pelo triângulo)
const QWERTY_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];
// Operadores + decimais no topo do painel de letras (acima do QWERTY, mais fácil de alcançar)
const LETTER_OPS = ['+', '-', '×', '÷', '=', '(', ')', '.', ','];

// ─── Números + operadores ─────────────────────────────────────────────────────
const NUM_ROWS = [
  [{ v: '7' }, { v: '8' }, { v: '9' }, { v: '+' }, { v: '-' }],
  [{ v: '4' }, { v: '5' }, { v: '6' }, { v: '×' }, { v: '÷' }],
  [{ v: '1' }, { v: '2' }, { v: '3' }, { v: '(' }, { v: ')' }],
  [{ v: '0' }, { v: '.' }, { v: ',' }, { v: '=' }],
];
// Largura fixa para última linha do numérico: igual à de uma tecla em 5 colunas (padding 14*2, 4 gaps de 5px)
const NUM_BTN_W = Math.floor((SCREEN_W - 14 * 2 - 4 * 5) / 5);

// ─── Componente ───────────────────────────────────────────────────────────────
export const FormulaBuilderModal = ({ visible, onConfirm, onCancel, initialFormula = '' }) => {
  const insets = useSafeAreaInsets();
  const [formula, setFormula] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [panel, setPanel] = useState('num');
  const [ready, setReady] = useState(false);
  const [previewH, setPreviewH] = useState(74);

  const wvRef = useRef(null);
  const cursorRef = useRef(0); // ref sempre atualizado — evita stale closure

  // Atualiza ref E state imediatamente — garante que insert/insertStruct sempre usam posição correta
  // (useEffect seria tarde demais se o usuário tocar outro botão antes do próximo render)
  const setCursor = useCallback((pos) => {
    cursorRef.current = pos;
    setCursorPos(pos);
  }, []);

  // Cursor colorido teal inserido na posição atual para indicar onde está a edição
  const CURSOR = '\\mathclose{\\color{#4FD1C5}|}';

  const updatePreview = useCallback((f, pos) => {
    if (!wvRef.current) return;
    // Protege contra mismatch de posição durante transições (ex: apagar tudo e inserir novo)
    // Se pos > formula.length, pode causar cursor em dead zone que quebra KaTeX
    const clampedPos = Math.min(pos, f.length);
    const safePos = snapCursor(f, clampedPos); // garante que cursor não quebra token como \left(
    const isPlaceholder = f.startsWith('\\Box^') || f.startsWith('\\Box_');

    let withCursor, ph;
    if (isPlaceholder && safePos === 0) {
      // Cursor EM CIMA do \Box: não mostra cursor character, apenas destaca o \Box
      // (ph=2 sinaliza para o WebView estilizar o □ como "selecionado")
      withCursor = f;
      ph = 2;
    } else {
      // Cursor em outra posição: mostra cursor character normalmente
      withCursor = f.slice(0, safePos) + CURSOR + f.slice(safePos);
      ph = isPlaceholder ? 1 : 0;
    }

    // Sanitiza a fórmula antes de renderizar (corrige \left sem \right, etc.)
    let sanitized = sanitizeForPreview(withCursor);

    // ═══════════════════════════════════════════════════════════════════
    // CONFIGURAÇÃO DE TAMANHOS E ESPAÇAMENTOS (AJUSTE AQUI)
    // ═══════════════════════════════════════════════════════════════════

    // Tamanhos disponíveis (do menor para o maior):
    // \\tiny < \\scriptsize < \\footnotesize < \\small < \\normalsize < \\large < \\Large < \\LARGE < \\huge < \\Huge
    // OU use estilos matemáticos: \\scriptstyle < \\textstyle < \\displaystyle

    const INT_SIZE = '\\footnotesize';           // Tamanho do ∫ (ajuste: \\tiny, \\scriptsize, \\footnotesize, \\small, \\normalsize, \\large, etc)
    const SUM_SIZE = '\\textstyle';       // Tamanho do ∑ (mantenha \\textstyle ou use comandos de tamanho)
    const INT_CURSOR_SPACE = '-3mu';      // Espaçamento do cursor após ∫ (negativo=próximo, positivo=longe, 1mu ≈ 1/18 em)
    const SUM_CURSOR_SPACE = '-0.2mu';      // Espaçamento do cursor após ∑
    const COMMA_CURSOR_SPACE = '-3mu';    // Espaçamento do cursor após vírgula

    // ═══════════════════════════════════════════════════════════════════

    // Aplica os ajustes ESPECÍFICOS para ∫, ∑ e vírgula (não afeta outros símbolos):
    sanitized = sanitized.replace(/\\int\s/g, `{${INT_SIZE}\\int} `);
    sanitized = sanitized.replace(/\\sum\s/g, `{${SUM_SIZE}\\sum} `);
    // Para ∫: ajusta cursor verticalmente para compensar baseline do \footnotesize
    sanitized = sanitized.replace(new RegExp(`(\\{${INT_SIZE.replace(/\\/g, '\\\\')}\\\\int\\}\\s)\\\\mathclose\\{\\\\color\\{#4FD1C5\\}\\|\\}`, 'g'), `$1\\mkern${INT_CURSOR_SPACE}\\raisebox{-0.1ex}{\\color{#4FD1C5}|}`);
    sanitized = sanitized.replace(new RegExp(`(\\{${SUM_SIZE.replace(/\\/g, '\\\\')}\\\\sum\\}\\s)\\\\mathclose\\{\\\\color\\{#4FD1C5\\}\\|\\}`, 'g'), `$1\\mkern${SUM_CURSOR_SPACE}\\mathclose{\\color{#4FD1C5}|}`);
    sanitized = sanitized.replace(/,\\mathclose\{\\color\{#4FD1C5\}\|\}/g, `,\\mkern${COMMA_CURSOR_SPACE}\\mathclose{\\color{#4FD1C5}|}`);

    const esc = sanitized.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '');
    wvRef.current.injectJavaScript("r('" + esc + "'," + ph + "); true;");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready) updatePreview(formula, cursorPos);
  }, [formula, cursorPos, ready, updatePreview]);

  useEffect(() => {
    if (!visible) {
      // NÃO reseta ready — no Android o WebView não é desmontado quando o Modal fecha,
      // portanto onLoadEnd não dispara na reabertura. Se resetarmos ready=false, o preview
      // nunca atualiza na segunda abertura (fica mostrando conteúdo estático da sessão anterior).
      setFormula(''); setCursorPos(0); setPanel('num'); setPreviewH(74);
      cursorRef.current = 0;
    } else if (initialFormula) {
      // Edição de fórmula existente: pré-popula o editor com o LaTeX atual
      setFormula(initialFormula);
      cursorRef.current = initialFormula.length;
      setCursorPos(initialFormula.length);
      // Força atualização imediata do preview sem esperar o useEffect de formula
      if (ready) updatePreview(initialFormula, initialFormula.length);
    } else {
      // Nova fórmula: exibe só o cursor imediatamente
      if (ready) updatePreview('', 0);
    }
  }, [visible, initialFormula, ready, updatePreview]);

  // ── Operações de edição ────────────────────────────────────────────────────
  // Usa cursorRef (sempre atual) para evitar stale closure — corrige bug de inserção na posição 0
  const insert = useCallback((text) => {
    const pos = cursorRef.current;
    // ── LÓGICA ESPECÍFICA: \Box^{} e \Box_{} (placeholders de expoente/subscrito) ──
    // Substituição do placeholder □: cursor no início E fórmula começa com \Box^ ou \Box_
    // → digitar um caractere SUBSTITUI o \Box em vez de inserir antes dele
    if (pos === 0 && (formula.startsWith('\\Box^') || formula.startsWith('\\Box_'))) {
      const rest = formula.slice(4); // remove \Box (4 chars)
      setFormula(text + rest);
      const next = text.length;
      cursorRef.current = next;
      setCursorPos(next);
      return;
    }
    setFormula(prev => prev.slice(0, pos) + text + prev.slice(pos));
    const next = pos + text.length;
    cursorRef.current = next;
    setCursorPos(next);
  }, [formula]);

  const insertStruct = useCallback((latex, offset) => {
    const pos = cursorRef.current;
    const currentFormula = formula; // captura estado atual no momento da chamada

    // ── LÓGICA ESPECÍFICA: ^{} e _{} (botões xⁿ/xₙ) ──
    // xⁿ/xₙ com editor vazio: insere \Box como base-placeholder antes do ^ ou _
    // Usuário preenche o expoente/índice, depois navega para o □ e substitui digitando
    // O \Box SÓ aparece quando editor VAZIO - NUNCA é restaurado automaticamente
    let actualLatex = latex;
    let actualOffset = offset;

    // Verifica se editor está vazio - se sim, adiciona \Box antes do ^ ou _
    if ((latex === '^{}' || latex === '_{}') && currentFormula === '') {
      actualLatex = '\\Box' + latex; // \Box^{} ou \Box_{}
      actualOffset = 6;              // cursor dentro de {} (4:\Box + 1:^ou_ + 1:{)
    }

    const newFormula = currentFormula.slice(0, pos) + actualLatex + currentFormula.slice(pos);
    const newCursorPos = pos + actualOffset;

    // ── AUTO-CONVERSÃO IMEDIATA: Frações fazem () crescer automaticamente ──
    // Quando insere \frac{}{}, aplica conversão imediatamente e ajusta cursor
    const converted = autoConvertParentheses(newFormula);

    if (converted !== newFormula) {
      // Calcula ajuste do cursor: conta quantos () ou || antes do cursor foram convertidos
      const toks = latexTokens(newFormula);
      const convertedPairs = []; // posições iniciais de pares que serão convertidos
      const stack = [];

      for (let i = 0; i < toks.length; i++) {
        const tok = toks[i];
        if (tok.t === '(' || tok.t === '|') {
          stack.push({ type: tok.t, start: tok.s, end: tok.e });
        } else if (tok.t === ')' || (tok.t === '|' && stack.length > 0 && stack[stack.length - 1].type === '|')) {
          if (stack.length > 0) {
            const open = stack.pop();
            const content = newFormula.slice(open.end, tok.s);
            const willConvert = content.includes('\\frac');
            if (willConvert) {
              convertedPairs.push(open.start);
            }
          }
        }
      }

      // Cada par convertido antes do cursor adiciona 5 chars (( → \left( ou | → \left|)
      const adjustment = convertedPairs.filter(start => start < newCursorPos).length * 5;

      setFormula(converted);
      const adjustedCursor = newCursorPos + adjustment;
      cursorRef.current = adjustedCursor;
      setCursorPos(adjustedCursor);
      return;
    }

    setFormula(newFormula);
    cursorRef.current = newCursorPos;
    setCursorPos(newCursorPos);
  }, [formula]);

  // Vai para o próximo {} ou [] vazio (próximo campo a preencher)
  const nextSlot = useCallback(() => {
    // Aplica conversão antes de navegar (após preencher um campo)
    const converted = autoConvertParentheses(formula);
    setFormula(converted);

    const f = converted;
    for (let i = cursorPos; i < f.length - 1; i++) {
      if (f[i] === '{' && f[i + 1] === '}') { setCursor(i + 1); return; }
      if (f[i] === '[' && f[i + 1] === ']') { setCursor(i + 1); return; }
    }
    setCursor(f.length);
  }, [formula, cursorPos, setCursor]);

  // Sai do delimitador mais interno:
  // \left..\right tem prioridade sobre {} — assim é possível sair de (x-m) e depois adicionar ^2
  const exitGroup = useCallback(() => {
    const toksAfter = latexTokens(formula.slice(cursorPos));
    let depth = 0;
    for (const tok of toksAfter) {
      if (tok.t === '{' || tok.t.startsWith('\\left')) depth++;
      else if (tok.t === '}' || tok.t.startsWith('\\right')) {
        if (depth === 0) {
          let newPos = cursorPos + tok.e;
          // Zona morta }|{ entre argumentos de mesma estrutura (ex: \frac{a}|{b})
          // → entra direto no próximo {} para evitar erro de parsing no preview
          if (formula[newPos] === '{') newPos++;

          // Aplica conversão automática ao sair do grupo (após preencher a fração)
          setFormula(autoConvertParentheses(formula));
          setCursor(newPos);
          return;
        }
        depth--;
      }
    }

    // Aplica conversão automática ao sair para o final
    setFormula(autoConvertParentheses(formula));
    setCursor(formula.length);
  }, [formula, cursorPos, setCursor]);

  // Helper para setFormula com conversão automática de parênteses
  // Retorna o cursor ajustado quando a conversão muda o tamanho da string
  const setFormulaConverted = useCallback((newFormula, currentCursor) => {
    const converted = autoConvertParentheses(newFormula);

    if (converted !== newFormula) {
      // Calcula ajuste do cursor baseado nas conversões antes da posição do cursor
      const toks = latexTokens(newFormula);
      let adjustment = 0;

      for (const tok of toks) {
        if (tok.e <= currentCursor) {
          // \left( ou \left| virando ( ou | → perde 5 chars
          if (tok.t === '\\left(' || tok.t === '\\left|') {
            // Verifica se essa posição no converted virou ( ou |
            const convertedSlice = converted.slice(tok.s + adjustment, tok.s + adjustment + 1);
            if (convertedSlice === '(' || convertedSlice === '|') {
              adjustment -= 5;
            }
          }
          // ( ou | virando \left( ou \left| → ganha 5 chars
          else if (tok.t === '(' || tok.t === '|') {
            const convertedSlice = converted.slice(tok.s + adjustment, tok.s + adjustment + 6);
            if (convertedSlice === '\\left(' || convertedSlice === '\\left|') {
              adjustment += 5;
            }
          }
        }
      }

      setFormula(converted);
      return Math.max(0, currentCursor + adjustment); // Garante que cursor não fica negativo
    }

    setFormula(newFormula);
    return currentCursor;
  }, []);

  // Backspace por token com deleção em par de \left...\right
  const backspace = useCallback(() => {
    // ── LÓGICA ESPECÍFICA: \Box^{} e \Box_{} (placeholders de expoente/subscrito) ──
    // Se cursor na posição 0 e fórmula é APENAS \Box^{} ou \Box_{} vazio, limpa tudo
    // (permite resetar completamente após apagar base e expoente)
    if (cursorPos === 0) {
      if (formula === '\\Box^{}' || formula === '\\Box_{}') {
        setFormula('');
        return;
      }
      return; // outros casos: não faz nada quando cursor em 0
    }
    const before = formula.slice(0, cursorPos);
    const after = formula.slice(cursorPos);

    // ── LÓGICA ESPECÍFICA: \Box^{} e \Box_{} (placeholders de expoente/subscrito) ──
    // Cursor em posição intermediária do placeholder \Box^{...} (ex: após \Box mas antes de ^):
    // Move cursor para dentro da base (posição 0) sem apagar nada - só ◀ move, backspace não apaga
    if (cursorPos === 4 && (formula.startsWith('\\Box^') || formula.startsWith('\\Box_'))) {
      setCursor(0);
      return;
    }

    // ── LÓGICA GLOBAL: Afeta \sqrt[]{}, \log[]{} e qualquer comando com [] ──
    // Cursor dentro de [] vazio: remove [ e ] juntos — evita ] órfão no preview
    // (deletar só [ deixa a fórmula como \sqrt]{} que é LaTeX inválido)
    if (before.endsWith('[') && after.startsWith(']')) {
      const newFormula = before.slice(0, -1) + after.slice(1);
      let newPos = before.length - 1;
      // Após deletar [], cursor vai para o FINAL do {} seguinte (não o início)
      // ex: \sqrt[]{78} → deleta [] → cursor após 8 (antes de }), não antes do 7
      // Isso preserva o fluxo natural de deleção da direita para a esquerda
      const toksAft = latexTokens(newFormula);
      const precAft = toksAft.find(t => t.e === newPos);
      if (precAft && precAft.t.startsWith('\\') && newFormula[newPos] === '{') {
        // Navega até o } fechador do grupo {} (suporta conteúdo aninhado)
        let depth = 0;
        let i = newPos;
        while (i < newFormula.length) {
          if (newFormula[i] === '{') depth++;
          else if (newFormula[i] === '}') {
            depth--;
            if (depth === 0) { newPos = i; break; }
          }
          i++;
        }
      }
      const adjustedCursor = setFormulaConverted(newFormula, newPos);
      setCursor(adjustedCursor);
      return;
    }

    // ── LÓGICA GLOBAL: Afeta () e \left(\right) vazios ──
    // Cursor dentro de () vazio: remove ( e ) juntos
    if (before.endsWith('(') && after.startsWith(')')) {
      const adjustedCursor = setFormulaConverted(before.slice(0, -1) + after.slice(1), before.length - 1);
      setCursor(adjustedCursor);
      return;
    }
    // Cursor dentro de \left(\right) vazio: remove ambos
    if (before.endsWith('\\left(') && after.startsWith('\\right)')) {
      const adjustedCursor = setFormulaConverted(before.slice(0, -6) + after.slice(7), before.length - 6);
      setCursor(adjustedCursor);
      return;
    }

    // ── LÓGICA GLOBAL: Afeta || e \left|\right| vazios ──
    // Cursor dentro de || vazio: remove ambos os | juntos
    if (before.endsWith('|') && after.startsWith('|')) {
      const adjustedCursor = setFormulaConverted(before.slice(0, -1) + after.slice(1), before.length - 1);
      setCursor(adjustedCursor);
      return;
    }
    // Cursor dentro de \left|\right| vazio: remove ambos
    if (before.endsWith('\\left|') && after.startsWith('\\right|')) {
      const adjustedCursor = setFormulaConverted(before.slice(0, -6) + after.slice(7), before.length - 6);
      setCursor(adjustedCursor);
      return;
    }

    // ── LÓGICA GLOBAL: Afeta \sqrt[n]{}, \log[a]{} e comandos com [] ──
    // Cursor logo após ] e antes de { (zona morta ]|{ do \sqrt[n]{})
    // → recua para dentro do índice em vez de apagar o ] (que corromperia o LaTeX)
    if (before.endsWith(']') && after.startsWith('{')) {
      setCursor(cursorPos - 1);
      return;
    }

    // ── LÓGICA GLOBAL COM CASOS ESPECÍFICOS ──
    // Cursor dentro de {} vazio: recua, ou apaga a estrutura inteira
    // Ao recuar, evita zonas mortas (] + { ou \comando + {) que quebram o preview
    // Afeta: \frac{}{}, \sqrt{}, \log_{}{}, \Box^{}, \Box_{}, e todos comandos com {}
    if (before.endsWith('{') && after.startsWith('}')) {
      let newPos = cursorPos - 1;
      const fToks = latexTokens(formula);
      const prec = fToks.find(t => t.e === newPos);
      if (prec) {
        if (prec.t === ']') {
          // Se [] estiver vazio E for o último grupo → apaga estrutura inteira
          if (formula[prec.s - 1] === '[' && after === '}') {
            const cmdTok = fToks.find(t => t.e === prec.s - 1);
            if (cmdTok && cmdTok.t.startsWith('\\')) {
              const newFormula = before.slice(0, cmdTok.s) + after.slice(1);
              const adjustedCursor = setFormulaConverted(newFormula, cmdTok.s);
              setCursor(adjustedCursor);
              return;
            }
          }
          newPos = prec.s; // [] não vazio → entra no índice para deletar conteúdo
        }
        else if (prec.t === '}') {
          // {} vazio com outro grupo fechado antes (ex: 2º grupo de \log_{}{}):
          // recua para dentro do grupo anterior — evita zona morta }|{ que
          // no próximo backspace deletaria a chave errada e quebraria o LaTeX
          newPos = prec.s;
        }
        else if (prec.t === '_') {
          // {} vazio precedido por _ → verifica se é placeholder \Box_{}
          const cmdTok = fToks.find(t => t.e === prec.s);
          // ── ESPECÍFICO: \Box_{} (placeholder de subscrito) ──
          if (cmdTok && cmdTok.t === '\\Box' && after === '}') {
            // Placeholder vazio \Box_{} COM subscrito VAZIO → backspace APAGA TUDO
            // (só apaga se {} estiver vazio, senão deleta caractere normalmente)
            const adjustedCursor = setFormulaConverted('', 0);
            setCursor(adjustedCursor);
            return;
          }
          if (cmdTok && cmdTok.t.startsWith('\\')) {
            // {} vazio precedido por _ (ex: \log_{}{}) → apaga estrutura inteira
            // Apaga \cmd + _ + {} + todos os {} restantes da estrutura
            let endPos = cursorPos + 1; // pula o } de fechamento do grupo atual
            while (endPos < formula.length && formula[endPos] === '{') {
              let depth = 1, i = endPos + 1;
              while (i < formula.length && depth > 0) {
                if (formula[i] === '{') depth++;
                else if (formula[i] === '}') depth--;
                i++;
              }
              endPos = i;
            }
            const newFormula = formula.slice(0, cmdTok.s) + formula.slice(endPos);
            const adjustedCursor = setFormulaConverted(newFormula, cmdTok.s);
            setCursor(adjustedCursor);
            return;
          }
          newPos = prec.s; // _ sem \comando antes (ex: x_{}) → recua antes do _
        }
        else if (prec.t === '^') {
          // {} vazio precedido por ^ → verifica se é placeholder \Box^{}
          const prevTok = fToks.find(t => t.e === prec.s);
          // ── ESPECÍFICO: \Box^{} (placeholder de expoente) ──
          if (prevTok && prevTok.t === '\\Box' && after === '}') {
            // Placeholder vazio \Box^{} COM expoente VAZIO → backspace APAGA TUDO
            // (só apaga se {} estiver vazio, senão deleta caractere normalmente)
            const adjustedCursor = setFormulaConverted('', 0);
            setCursor(adjustedCursor);
            return;
          }
          newPos = prec.s; // ^ sem \Box antes → recua antes do ^
        }
        else if (prec.t.startsWith('\\')) {
          // Apaga estrutura inteira (1 ou múltiplos {}, ex: \sqrt{}, \frac{}{})
          // Navegar para prec.s não resolve: cursor em 0 fica travado pelo guard do início
          let endI = 1; // skip closing } do {} vazio atual
          while (endI < after.length && after[endI] === '{') {
            let depth = 1; endI++;
            while (endI < after.length && depth > 0) {
              if (after[endI] === '{') depth++;
              else if (after[endI] === '}') depth--;
              endI++;
            }
          }
          const adjustedCursor = setFormulaConverted(before.slice(0, prec.s) + after.slice(endI), prec.s);
          setCursor(adjustedCursor);
          return;
        }
      }
      setCursor(newPos);
      return;
    }

    // Cursor logo no início de {} com conteúdo (ex: \sqrt[7]{|78}, \frac{|a}{b})
    // before termina com '{' mas after não começa com '}' (grupo não vazio)
    if (before.endsWith('{')) {
      const prevStr = before.slice(0, -1); // string sem o { final
      const toksB = latexTokens(prevStr);
      const precTok = toksB.length > 0 ? toksB[toksB.length - 1] : null;
      if (precTok) {
        if (precTok.t === '}') {
          // {} antes: navega para dentro do grupo anterior (ex: \frac{7}{|b} → entra em {7})
          setCursor(precTok.s);
          return;
        }
        if (precTok.t === ']') {
          // Verifica se o índice [] tem conteúdo (char antes de ] não é [)
          if (prevStr[precTok.s - 1] !== '[') {
            // [] NÃO vazio (ex: \sqrt[7]{|78}) → navega para dentro do índice
            setCursor(precTok.s);
            return;
          }
          // [] VAZIO (ex: \sqrt[]{|78}) → sem índice útil → apaga estrutura inteira
          // Localiza o \comando antes do [] para determinar início da estrutura
          const cmdTok = toksB.find(t => t.e === precTok.s - 1);
          if (cmdTok && cmdTok.t.startsWith('\\')) {
            // Apaga desde \comando até o fim de todos os {} da estrutura
            let depth = 0, i = cursorPos - 1;
            while (i < formula.length) {
              if (formula[i] === '{') depth++;
              else if (formula[i] === '}') { depth--; if (depth === 0) { i++; break; } }
              i++;
            }
            while (i < formula.length && formula[i] === '{') {
              depth = 0;
              while (i < formula.length) {
                if (formula[i] === '{') depth++;
                else if (formula[i] === '}') { depth--; if (depth === 0) { i++; break; } }
                i++;
              }
            }
            const adjustedCursor = setFormulaConverted(formula.slice(0, cmdTok.s) + formula.slice(i), cmdTok.s);
            setCursor(adjustedCursor);
            return;
          }
        }
        if (precTok.t === '^' || precTok.t === '_') {
          // ^ ou _ antes de { (ex: \Box^{7} ou x^{2})
          // Verifica se há \Box antes do ^/_ → pula toda estrutura para posição 0
          const tokBeforeOp = toksB.find(t => t.e === precTok.s);
          // ── ESPECÍFICO: \Box^{} e \Box_{} com conteúdo ──
          if (tokBeforeOp && tokBeforeOp.t === '\\Box') {
            // Placeholder \Box^{...} ou \Box_{...} → pula para antes do \Box
            setCursor(0);
            return;
          }
          // Não é \Box → recua para antes do ^/_ (evita zona morta ^{ ou _{)
          setCursor(precTok.s);
          return;
        }
        if (precTok.t.startsWith('\\')) {
          // \comando diretamente antes de { sem [] entre eles (ex: \sqrt{|78}, sem índice)
          // → apaga toda a estrutura \comando{conteúdo} incluindo todos os {} subsequentes
          const cmdStart = precTok.s;
          let depth = 0;
          let i = cursorPos - 1; // posição do { que precede o cursor
          while (i < formula.length) {
            if (formula[i] === '{') depth++;
            else if (formula[i] === '}') { depth--; if (depth === 0) { i++; break; } }
            i++;
          }
          // Pula {} adicionais imediatos da mesma estrutura (ex: \frac{a}{b})
          while (i < formula.length && formula[i] === '{') {
            depth = 0;
            while (i < formula.length) {
              if (formula[i] === '{') depth++;
              else if (formula[i] === '}') { depth--; if (depth === 0) { i++; break; } }
              i++;
            }
          }
          const adjustedCursor = setFormulaConverted(formula.slice(0, cmdStart) + formula.slice(i), cmdStart);
          setCursor(adjustedCursor);
          return;
        }
      }
    }

    const toks = latexTokens(before);
    if (toks.length === 0) return;
    const last = toks[toks.length - 1];

    // ── LÓGICA ESPECÍFICA: \right) ou \right| - REMOVER! Não usamos mais ──
    // Agora usamos () normais e a conversão automática cuida de transformar em \left(\right)

    // ── LÓGICA ESPECÍFICA: \Box^{} e \Box_{} (placeholders de expoente/subscrito) ──
    // \Box antes de ^{...} ou _{...}: apaga toda a estrutura \Box^{conteúdo}
    // (evita deixar ^{3} sem base ao deletar só o \Box)
    if (last.t === '\\Box' && (after.startsWith('^') || after.startsWith('_'))) {
      let i = 1; // skip ^ ou _
      if (i < after.length && after[i] === '{') {
        let depth = 1; i++;
        while (i < after.length && depth > 0) {
          if (after[i] === '{') depth++;
          else if (after[i] === '}') depth--;
          i++;
        }
      }
      const adjustedCursor = setFormulaConverted(before.slice(0, last.s) + after.slice(i), last.s);
      setCursor(adjustedCursor);
      return;
    }

    // ── LÓGICA ESPECÍFICA: \frac, \sqrt, \log e TODOS comandos com {} ──
    // Se último token é } (fechamento de estrutura), apaga estrutura COMPLETA
    // ex: \frac{7}{1}| → apaga tudo, não quebra ficando \frac{7}{1
    // Afeta: \frac{}{}, \sqrt{}, \log_{}{}, e qualquer \comando{...}
    if (last.t === '}') {
      // Procura o comando mais próximo do cursor (de trás para frente)
      // Isso garante que apaga só a estrutura mais interna, não tudo
      // Ex: (\frac{8}{3}| → apaga só \frac{8}{3}, não o \left( também
      const toksAll = latexTokens(before);
      for (let i = toksAll.length - 1; i >= 0; i--) {
        if (toksAll[i].t.startsWith('\\')) {
          // Encontrou comando → apaga desde o comando até incluir todos os seus {}
          const cmdStart = toksAll[i].s;
          let pos = toksAll[i].e;

          // Se tem [] opcional (como \sqrt[n]), pula
          if (before[pos] === '[') {
            let depth = 1;
            pos++;
            while (pos < before.length && depth > 0) {
              if (before[pos] === '[') depth++;
              else if (before[pos] === ']') depth--;
              pos++;
            }
          }

          // Apaga todos os {} seguidos do comando
          while (pos < before.length && before[pos] === '{') {
            let depth = 1;
            pos++;
            while (pos < before.length && depth > 0) {
              if (before[pos] === '{') depth++;
              else if (before[pos] === '}') depth--;
              pos++;
            }
          }

          const adjustedCursor = setFormulaConverted(before.slice(0, cmdStart) + before.slice(pos) + after, cmdStart);
          setCursor(adjustedCursor);
          return;
        }
      }
    }

    // Token normal: apaga apenas o último token
    const newFormula = before.slice(0, last.s) + after;

    // ── LÓGICA ESPECÍFICA: ^ e _ (expoente/subscrito sem base) ──
    // PROBLEMA: Após deletar a base, pode sobrar expoente/subscrito sem base (ex: 5^{7} → delete 5 → ^{7})
    // SOLUÇÃO: Verifica se fórmula resultante começa com ^ ou _ e trata de acordo com o conteúdo:
    //
    // CASO 1: {} VAZIO (ex: ^{} ou _{})
    //   → Apaga TUDO (expoente/subscrito vazio não faz sentido existir sozinho)
    //   Exemplo: 5^{} → delete 5 → ^{} → APAGA TUDO → ''
    //
    // CASO 2: {} COM CONTEÚDO (ex: ^{7} ou _{n})
    //   → Restaura \Box como base para PRESERVAR o expoente/subscrito
    //   → Cursor vai para posição 0 (sobre o \Box) para permitir digitar nova base
    //   Exemplo: 5^{7} → delete 5 → ^{7} → RESTAURA \Box → \Box^{7}
    //
    // Afeta APENAS ^ e _ (não afeta \frac, \sqrt, etc.)
    if (newFormula.startsWith('^') || newFormula.startsWith('_')) {
      if (newFormula === '^{}' || newFormula === '_{}') {
        // Expoente/subscrito vazio → apaga completamente
        const adjustedCursor = setFormulaConverted('', 0);
        setCursor(adjustedCursor);
      } else {
        // Expoente/subscrito com conteúdo → restaura \Box como base
        const adjustedCursor = setFormulaConverted('\\Box' + newFormula, 0);
        setCursor(adjustedCursor);
      }
    } else {
      const adjustedCursor = setFormulaConverted(newFormula, last.s);
      setCursor(adjustedCursor);
    }
  }, [formula, cursorPos, setCursor, setFormulaConverted]);

  const clearAll = () => { setFormula(''); setCursor(0); setPreviewH(74); };

  // Navegação por token: cursor sempre fica entre tokens, nunca dentro de \left( etc.
  // Zonas mortas (quebram o preview): \comando+{, \comando+[, ]+{
  //   ex: pos entre \sqrt e [] → cursor vira o radicando; vinculum fica minúsculo
  const moveLeft = () => {
    // Aplica conversão ao navegar para esquerda
    const converted = autoConvertParentheses(formula);
    if (converted !== formula) setFormula(converted);

    const toks = latexTokens(converted);
    let newPos = 0;
    for (const tok of toks) {
      if (tok.e <= cursorPos) newPos = tok.s;
      else break;
    }
    const ch = converted[newPos];
    if (ch === '{' || ch === '[') {
      const preceding = toks.find(t => t.e === newPos);
      if (preceding) {
        // ── LÓGICA GLOBAL: navegação modular entre argumentos ──
        // Afeta: \frac{a}{b}, \log_{a}{b}, e todas estruturas multi-argumento
        if (preceding.t === '}' && ch === '{') {
          // }{ → zona morta entre argumentos (ex: \frac{7}|{1})
          // Entra no argumento anterior (dentro do {}) ao invés de pular toda a estrutura
          newPos = preceding.s;
        } else if (preceding.t.startsWith('\\')) {
          // \comando + { ou [ → salta para antes do comando
          newPos = preceding.s;
        } else if (preceding.t === ']' && ch === '{') {
          // ] + { → salta para ANTES do ] (final do índice)
          // Cursor vindo da direita fica em 7| e não em |7
          newPos = preceding.s;
        } else if ((preceding.t === '^' || preceding.t === '_') && ch === '{') {
          // ^{ ou _{ → zona morta: cursor entre ^ e { quebra o KaTeX (ex: \Box^\cursor{7})
          // Salta para antes do ^/_ e, se \Box for a base, vai até antes do \Box
          const tokBeforeOp = toks.find(t => t.e === preceding.s);
          // ── ESPECÍFICO: \Box^{} e \Box_{} (placeholders) ──
          if (tokBeforeOp && tokBeforeOp.t === '\\Box') {
            newPos = tokBeforeOp.s; // pula toda a estrutura \Box^{} para a esquerda
          } else {
            newPos = preceding.s;   // apenas antes do ^/_
          }
        }
      }
    }
    setCursor(newPos);
  };
  const moveRight = () => {
    // Aplica conversão ao navegar para direita
    const converted = autoConvertParentheses(formula);
    if (converted !== formula) setFormula(converted);

    const toks = latexTokens(converted);
    for (const tok of toks) {
      if (tok.s >= cursorPos) {
        let newPos = tok.e;
        // ── LÓGICA GLOBAL: navegação automática para dentro de argumentos ──
        // \comando + { ou [ → entra direto no grupo (ex: \sqrt → dentro de [])
        // ] + { → pula o { e entra no radicando (ex: de [] entra em {})
        // } + { → zona morta entre args da mesma estrutura (ex: \frac{a}|{b}) → entra no próximo
        // ^ + { ou _ + { → zona morta ^{ quebra KaTeX; pula o { e entra direto no conteúdo
        // Afeta: \frac, \sqrt, \log, ^, _, e todos comandos com {} ou []
        if ((tok.t.startsWith('\\') || tok.t === ']' || tok.t === '}' || tok.t === '^' || tok.t === '_') &&
          (converted[newPos] === '{' || converted[newPos] === '[')) {
          newPos += 1;
        }
        // ── ESPECÍFICO: \Box^{} e \Box_{} (placeholders) ──
        else if (tok.t === '\\Box' && (converted[newPos] === '^' || converted[newPos] === '_') && converted[newPos + 1] === '{') {
          // \Box + ^{ ou _{ → salta ^ e { inteiros, entra diretamente no expoente/índice
          // Evita parada na posição 4 (entre \Box e ^) que exibe cursor como base de ^
          newPos += 2;
        }
        setCursor(newPos);
        return;
      }
    }
    setCursor(converted.length);
  };

  const handleConfirm = () => {
    if (formula.trim()) onConfirm(formula.trim());
    setFormula(''); setCursor(0);
  };

  const canConfirm = formula.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={[s.sheet, { maxHeight: SCREEN_H * 0.98, paddingBottom: Math.max(insets.bottom + 10, Platform.OS === 'ios' ? 20 : 14) }]}>

          {/* ── Cabeçalho ── */}
          <View style={s.header}>
            <Text style={s.title}>Montar Fórmula</Text>
          </View>

          {/* ── Preview KaTeX — altura auto-ajustável ── */}
          <View style={[s.previewBox, { height: previewH }]}>
            <WebView
              ref={wvRef}
              source={{ html: previewHtml }}
              style={s.wv}
              javaScriptEnabled
              originWhitelist={['*']}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              onLoadEnd={() => setReady(true)}
              onMessage={(e) => {
                try {
                  const msg = JSON.parse(e.nativeEvent.data);
                  if (msg.t === 'h') setPreviewH(Math.max(74, Math.min(150, msg.h + 12)));
                } catch (_) { }
              }}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            style={s.scroll}
          >
            {/* ── Blocos ── */}
            <Text style={s.sectionLabel}>ESTRUTURAS</Text>
            <View style={s.structRow}>
              {STRUCTS.map(({ label, latex, offset }) => (
                <TouchableOpacity
                  key={label}
                  onPress={() => { tap(); insertStruct(latex, offset); }}
                  style={s.structBtn}
                >
                  <Text style={s.structTxt}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Abas de painel + botão limpar ── */}
            <View style={s.tabRow}>
              {[['num', '0–9'], ['abc', 'abc'], ['sym', 'πθ∞']].map(([id, lbl]) => (
                <TouchableOpacity
                  key={id}
                  onPress={() => { tap(); setPanel(id); }}
                  style={[s.tab, panel === id && s.tabActive]}
                >
                  <Text style={[s.tabTxt, panel === id && s.tabTxtActive]}>{lbl}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => { tap(); clearAll(); }} style={s.clearBtn}>
                <Text style={s.clearTxt}>✕ limpar</Text>
              </TouchableOpacity>
            </View>

            {/* ── Painel Números ── */}
            {panel === 'num' && (
              <View style={s.grid}>
                {NUM_ROWS.map((row, ri) => {
                  const isLast = ri === NUM_ROWS.length - 1;
                  return (
                    <View key={ri} style={[s.gridRow, isLast && { justifyContent: 'center' }]}>
                      {row.map(({ v }) => (
                        <TouchableOpacity
                          key={v}
                          onPress={() => { tap(); insert(v); }}
                          style={isLast ? [s.keyBtn, { flex: 0, width: NUM_BTN_W }] : s.keyBtn}
                        >
                          <Text style={s.keyTxt}>{v}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── Painel Letras (QWERTY) ── */}
            {panel === 'abc' && (
              <View style={s.grid}>
                {/* Operadores + decimais no TOPO — mais confortável de alcançar com o polegar */}
                <View style={s.gridRow}>
                  {LETTER_OPS.map(op => (
                    <TouchableOpacity key={op} onPress={() => { tap(); insert(op); }} style={s.keyBtn}>
                      <Text style={s.keyTxt}>{op}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Linhas QWERTY — teclas com largura fixa (igual à linha de 10)
                    Long-press insere maiúscula; letra maiúscula aparece no canto */}
                {QWERTY_ROWS.map((row, ri) => (
                  <View key={ri} style={[s.gridRow, s.qwertyRow]}>
                    {row.map(k => (
                      <TouchableOpacity
                        key={k}
                        onPress={() => { tap(); insert(k); }}
                        onLongPress={() => { tap(); insert(k.toUpperCase()); }}
                        delayLongPress={350}
                        style={s.qwertyKey}
                      >
                        {/* Letra maiúscula no canto — indica função de long-press */}
                        <Text style={s.qwertySecondary}>{k.toUpperCase()}</Text>
                        <Text style={s.keyTxt}>{k}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {/* ── Painel Símbolos — 5 linhas com teclas mais compactas para igualar altura dos outros painéis ── */}
            {panel === 'sym' && (
              <View style={s.grid}>
                {SYM_ROWS.map((row, ri) => {
                  // Símbolos pequenos que precisam de tamanho levemente maior nos botões
                  const smallSymbols = ['≠', '≤', '≥', '<', '>', '→', '≈', '∝'];
                  return (
                    <View key={ri} style={s.gridRow}>
                      {row.map(({ d, l }) => {
                        // Ajustes específicos para símbolos individuais
                        let customStyle = {};
                        if (d === '∝') {
                          customStyle = { fontSize: 21 }; // Proporcional precisa ser um pouco maior
                        } else if (d === '→') {
                          customStyle = { fontSize: 19, marginTop: -5 }; // Seta centralizada
                        } else if (smallSymbols.includes(d)) {
                          customStyle = { fontSize: 19 }; // Outros símbolos pequenos
                        }
                        return (
                          <TouchableOpacity key={d} onPress={() => { tap(); insert(l); }} style={s.symKeyBtn}>
                            <Text style={[s.symTxt, customStyle]}>{d}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── Linha de navegação (abaixo do teclado) ── */}
            <View style={s.navRow}>
              <TouchableOpacity onPress={() => { tap(); moveLeft(); }} style={s.navBtn}>
                <Text style={s.navTxt}>◀</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { tap(); nextSlot(); }} style={[s.navBtn, s.navHL, { flex: 2 }]}>
                <Text style={[s.navTxt, s.navHLTxt]}>□ próx. campo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { tap(); exitGroup(); }} style={[s.navBtn, s.navHL, { flex: 2 }]}>
                <Text style={[s.navTxt, s.navHLTxt]}>{'↗'} sair grupo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { tap(); moveRight(); }} style={s.navBtn}>
                <Text style={s.navTxt}>▶</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { tap(); backspace(); }} style={[s.navBtn, s.navDanger]}>
                <Text style={s.navTxt}>⌫</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.navHint}>
              □ próx. = vai ao próximo campo vazio  •  ↗ sair = sai de ( ) ou {'{}'} atual
            </Text>

          </ScrollView>

          {/* ── Confirmar / Cancelar ── */}
          <View style={s.actions}>
            <TouchableOpacity
              onPress={() => { tap(); handleConfirm(); }}
              style={[s.btnConfirm, !canConfirm && s.btnDisabled]}
              disabled={!canConfirm}
            >
              <Text style={s.btnConfirmTxt}>Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { tap(); onCancel(); }} style={s.btnCancel}>
              <Text style={s.btnCancelTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.80)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1A2535',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 14,
    // paddingBottom é definido inline via useSafeAreaInsets (insets.bottom)
  },
  // Cabeçalho
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  clearBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.50)',
  },
  clearTxt: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  // Preview — altura dinâmica via onMessage (previewH state)
  previewBox: {
    backgroundColor: '#141D2B',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  wv: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flexShrink: 1 },
  // Blocos
  sectionLabel: {
    color: '#4A5568',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  structRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  structBtn: {
    backgroundColor: '#253045',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#3D4F6A',
  },
  structTxt: { color: '#E2E8F0', fontSize: 15, fontWeight: '600' },
  // Abas
  tabRow: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  tab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#253045',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3D4F6A',
  },
  tabActive: { backgroundColor: 'rgba(79,209,197,0.15)', borderColor: '#4FD1C5' },
  tabTxt: { color: '#718096', fontSize: 13, fontWeight: '600' },
  tabTxtActive: { color: '#4FD1C5' },
  // Grade unificada — num, abc e sym usam o mesmo layout de linhas
  grid: { gap: 5, marginBottom: 8 },
  gridRow: { flexDirection: 'row', gap: 5 },
  // Linhas QWERTY: centraliza quando há menos teclas (ex: 9 ou 7 ao invés de 10)
  qwertyRow: { justifyContent: 'center' },
  // Tecla QWERTY — largura fixa calculada para a linha de 10 teclas
  // Todas as linhas têm o mesmo tamanho de tecla independente da quantidade
  qwertyKey: {
    width: QWERTY_KEY_W,
    height: 46,
    backgroundColor: '#253045',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3D4F6A',
  },
  // Letra maiúscula no canto superior direito — indica função de long-press
  qwertySecondary: {
    position: 'absolute',
    top: 3,
    right: 4,
    color: '#4FD1C5',
    fontSize: 9,
    fontWeight: '700',
    opacity: 0.7,
  },
  keyBtn: {
    flex: 1,
    height: 46,
    backgroundColor: '#253045',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3D4F6A',
  },
  keyTxt: { color: '#E2E8F0', fontSize: 17, fontWeight: '600' },
  // Tecla compacta para ^ e _ na última linha do num (flex menor → 0 igual ao padrão de 5 botões)
  keyBtnSm: {
    flex: 0.5,
    height: 46,
    backgroundColor: '#253045',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3D4F6A',
  },
  // Tecla compacta do painel de símbolos (5 linhas → height menor para igualar altura dos outros painéis)
  // Cálculo: 4 linhas × 46px + 3 gaps × 5px = 199px → 5 linhas × 36px + 4 gaps × 5px = 200px ≈ igual
  symKeyBtn: {
    flex: 1,
    height: 36,
    backgroundColor: '#253045',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3D4F6A',
  },
  symTxt: { color: '#E2E8F0', fontSize: 16 },
  // Navegação (abaixo do teclado)
  navRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
    marginBottom: 4,
  },
  navBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#253045',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3D4F6A',
  },
  navHL: { backgroundColor: 'rgba(79,209,197,0.12)', borderColor: '#4FD1C5' },
  navDanger: { backgroundColor: '#3B1F1F', borderColor: '#7B2D2D' },
  navTxt: { color: '#CBD5E0', fontSize: 13, fontWeight: '600' },
  navHLTxt: { color: '#4FD1C5' },
  navHint: {
    color: '#4A5568',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 8,
  },
  // Ações
  actions: { gap: 8, marginTop: 6 },
  btnConfirm: {
    backgroundColor: '#4FD1C5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnConfirmTxt: { color: '#1A202C', fontSize: 16, fontWeight: '700' },
  btnCancel: {
    backgroundColor: '#253045',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnCancelTxt: { color: '#A0AEC0', fontSize: 15, fontWeight: '600' },
});
