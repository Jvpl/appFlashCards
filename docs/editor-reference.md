# Referência Completa do Editor de Flashcards

> **Checkpoint antes da migração para TipTap.**
> Este documento mapeia 100% do sistema atual para permitir rollback ou referência futura.

---

## Arquivos Envolvidos

| Arquivo | Função |
|---|---|
| `src/components/editor/editorTemplates.js` | HTML/CSS/JS da WebView (~1680 linhas). É uma template string exportada como `editorHtml` e `previewHtml`. |
| `src/components/editor/HybridEditor.js` | Wrapper React Native da WebView. Expõe ref imperativa com todos os métodos do editor. |
| `src/components/editor/IsolatedMathEditor.js` | `React.memo(() => true)` ao redor do HybridEditor. Nunca re-renderiza — toda comunicação é via `injectJavaScript`. |
| `src/components/editor/FormulaBuilderModal.js` | Modal avançado de construção de fórmulas. 100% React Native, sem WebView própria (usa `previewHtml` para preview). |
| `src/components/editor/UnifiedFormulaModal.js` | Modal alternativo (legado/experimental). Usa `FormulaEngine`. Atualmente não é o modal principal. |
| `src/components/editor/MathToolbar.js` | Bottom sheet animado com 6 botões de fórmulas + botão "Modo Avançado". Abre via `toggleMathToolbar()`. |
| `src/screens/ManageFlashcardsScreen.js` | Tela principal de criação/edição de flashcards. Orquestra tudo. |
| `src/utils/FormulaEngine.js` | Engine de estado para o UnifiedFormulaModal (não usado no fluxo principal). |

---

## 1. Estrutura do Editor WebView (`editorHtml`)

### HTML Base
```html
<div id="editor" contenteditable="true" data-placeholder="..."></div>
```

### Sistemas CSS Importantes
- `.math-atom` — estilo das fórmulas inline (display:inline-block, contenteditable=false)
- `.math-atom.selected` — borda azul quando fórmula está selecionada
- `.sentinela-anti-caps` — invisível, previne autocaps do Android após fórmula
- `.destaque` — span verde (#5DD62C bg, #000 text) para marca-texto
- `#editor.is-empty:before` — placeholder via CSS attr(data-placeholder)
- `.katex .mfrac` — frações com font-size 1.25em para legibilidade

---

## 2. Sistema de Fórmulas (.math-atom)

### Estrutura HTML de uma fórmula inserida
```html
<span class="math-atom"
      contenteditable="false"
      data-id="math_1234567890"
      data-latex="\frac{a}{b}"
      data-source="builder">
  <!-- KaTeX renderizado aqui -->
</span>
<span class="sentinela-anti-caps">&#x3164;</span>
<!-- espaço de texto normal -->
```

### Atributos
| Atributo | Valor | Função |
|---|---|---|
| `data-id` | `math_<timestamp>` | Identificador único para editar/deletar |
| `data-latex` | string LaTeX | Código da fórmula. Atualizado no `updateFormula`. |
| `data-source` | `'simple'` ou `'builder'` | Determina qual modal abre ao clicar |
| `contenteditable` | `"false"` | Torna o átomo intocável pelo teclado |

### Sentinela Anti-Caps
- Caractere: `\u3164` (Hangul Filler — invisível, não é espaço)
- Posição: imediatamente após cada `.math-atom`
- Função: impede o Android de capitalizar a próxima letra após a fórmula
- CSS: `display:none` / pointer-events:none — completamente invisível
- Auto-reparado no paste: listener verifica se toda fórmula tem sentinela após colar

### Fluxo de Inserção (`window.insertFormula`)
1. Valida limite de caracteres (peso da fórmula via `calculateFormulaWeight`)
2. Cria `<span class="math-atom">` com atributos
3. Roda `katex.render(latex, span, { throwOnError: false })`
4. Remove `.pstrut` (artefatos visuais do KaTeX que causam seleção estranha)
5. Foca o editor, pega o range de seleção atual
6. Insere fragmento: `[math-atom][sentinela][espaço]`
7. Move cursor após o espaço
8. Dispara `CONTENT_CHANGE` + `CHAR_COUNT` + `checkPlaceholder`
9. Se fórmula contém `\Box` (placeholder), auto-abre modal `EDIT_MATH` após 100ms

### Fluxo de Edição (`window.updateFormula`)
1. Localiza `span[data-id="id"]`
2. Re-renderiza KaTeX com novo latex
3. Limpa espaços duplicados ao redor da sentinela
4. Atualiza `data-latex`
5. Dispara `CONTENT_CHANGE` + `CHAR_COUNT`

### Fluxo de Deleção (`HybridEditor.deleteMath`)
Via `injectJavaScript` direto no HybridEditor:
1. Localiza `.math-atom[data-id]`
2. Remove sentinela (`.sentinela-anti-caps` ou `.invisible-char`)
3. Remove espaço após sentinela se vazio
4. Remove o átomo
5. Dispara `CONTENT_CHANGE` + `CHAR_COUNT`

### Backspace sobre fórmula (dentro da WebView)
Listener `beforeinput` com `inputType === 'deleteContentBackward'`:
1. Busca para trás a partir do cursor
2. Se encontra `math-atom`: remove átomo + sentinela + lixo invisível
3. Se encontra espaço antes: para (deixa browser deletar normalmente)
4. Insere ZWS safety buffer se não restar conteúdo (mantém teclado aberto)

### Click/Touch em fórmula
Listener `touchstart` no documento:
1. `e.target.closest('.math-atom')` — detecta clique
2. Aplica feedback visual (scale 0.95, bg azul por 200ms)
3. Dispara `EDIT_MATH` com `{ id, latex, source }`
4. Posiciona cursor após a fórmula (no espaço seguinte)

---

## 3. Mensagens WebView → React Native

Todas via `window.ReactNativeWebView.postMessage(JSON.stringify({type, ...data}))`.

| Tipo | Dados | Quando dispara |
|---|---|---|
| `FOCUS` | `{}` | Editor recebe foco |
| `CONTENT_CHANGE` | `{ html: string }` | Qualquer mudança de conteúdo. HTML sem `\u200B`. |
| `EDIT_MATH` | `{ id, latex, source }` | Clique em fórmula ou inserção com placeholder |
| `CHAR_COUNT` | `{ count, max }` | Após mudança de conteúdo |
| `FORMAT_STATE` | `{ bold, italic, mark }` | Após keyup/touchend/toggle de formato |
| `CHAR_LIMIT_BLOCKED` | `{ type: 'formula' }` | Tentativa de inserir fórmula acima do limite |

---

## 4. Métodos Imperativos do HybridEditor (via ref)

Todos implementados como `injectJavaScript` para a WebView.

| Método | O que faz |
|---|---|
| `focus()` | `window.focusEditor()` |
| `blur()` | `window.blurEditor()` |
| `clear()` | `window.setHtml('')` |
| `setContent(html)` | `window.setHtml(html)` + posiciona cursor no fim |
| `insertFrac()` | Insere `\frac{\Box}{\Box}` |
| `insertRoot()` | Insere `\sqrt{\Box}` |
| `insertSquared()` | Insere `\Box^2` |
| `insertLog()` | Insere `\log_{\Box}{\Box}` |
| `insertSub()` | Insere `\Box_{\Box}` |
| `insertAbs()` | Insere `\left|\Box\right|` |
| `insertCustom(latex)` | Insere fórmula livre com source='builder' |
| `insertSymbol(symbol)` | Insere símbolo avulso (respeita limite de chars) |
| `updateFormula(id, latex)` | Atualiza fórmula existente pelo id |
| `deleteMath(id)` | Remove fórmula + sentinela + espaço pelo id |
| `toggleBold()` | `document.execCommand('bold')` |
| `toggleItalic()` | `document.execCommand('italic')` |
| `toggleMark()` | Aplica/remove span.destaque na seleção |

---

## 5. Sistema de Contagem de Caracteres

### Pesos
- Texto normal: 1 char = 1 unidade
- Fórmula: `calculateFormulaWeight(latex)` — mínimo 5, conta chars reais após remover comandos LaTeX
- `\u200B` (zero-width space) e `\u3164` (sentinela) são excluídos da contagem

### Limites
- Default: 800 chars
- Configurável via `window.setMaxChars(n)` (chamado no `injectedJavaScript` do HybridEditor)
- Bloqueio: fórmulas que estourariam o limite são rejeitadas com `CHAR_LIMIT_BLOCKED`

---

## 6. Sistema de Formatação (Bold/Italic/Marca-texto)

### Estado atual (pós-tentativa de migração)
- `toggleBold` / `toggleItalic`: usam `document.execCommand('bold'/'italic')`
- `notifyFormatState`: usa `document.queryCommandState('bold'/'italic')`
- `toggleMark`: usa `toggleInlineTag` com `span.destaque`

### Problemas conhecidos do execCommand no Android
- Espaço quebra o estado de bold durante digitação contínua
- `queryCommandState` fica preso em `true` após deletar todo o texto bold
- Modo de digitação contínua (ativar B antes de digitar) é instável

### span.destaque (marca-texto)
```html
<span class="destaque" style="background-color:#5DD62C;color:#000;border-radius:2px;padding:0 2px">
  texto destacado
</span>
```
- Aplicado via `toggleInlineTag` apenas sobre seleção
- Digitação dentro do destaque é expulsa para fora via `beforeinput`
- Limpo automaticamente quando fica vazio (após deleção)

---

## 7. Modal de Fórmula Simples (frac, sqrt, etc.)

Quando o usuário clica em um dos botões da toolbar inline (fração, raiz, etc.):
1. `HybridEditor.insertFrac()` etc. chama `window.insertFormula('\frac{\Box}{\Box}')`
2. Como a fórmula contém `\Box`, o WebView dispara `EDIT_MATH` automaticamente
3. `ManageFlashcardsScreen` recebe `EDIT_MATH` com `source='simple'`
4. `handleEditMath` parseia o latex com regex e abre **modal inline simples** (editModalVisible) com campos v1/v2/v3 pré-preenchidos (não o FormulaBuilderModal)

---

## 8. FormulaBuilderModal (Modal Avançado)

### Props
```js
{
  visible: boolean,
  onConfirm: (latex: string) => void,  // retorna latex limpo
  onCancel: () => void,
  initialFormula: string               // pré-popula ao editar fórmula existente
}
```

### Arquitetura interna
- Estado: `formula` (string LaTeX) + `cursorPos` (inteiro)
- Preview: WebView com `previewHtml` + `injectJavaScript` a cada mudança
- Cursor visual: `\mathclose{\color{#4FD1C5}|}` inserido na posição `cursorPos`
- Sem teclado nativo — todo input via botões do modal

### Painéis de entrada
| Painel | Conteúdo |
|---|---|
| `num` | Números 0-9, operadores +−×÷=()! |
| `abc` | QWERTY completo (long-press = maiúscula) + operadores no topo |
| `sym` | 25 símbolos matemáticos (π θ α β γ λ μ σ ω φ ε δ ∞ ≠ ≥ ≤ ± → ∑ ∫ < > ≈ ∈ ∝) |

### Estruturas (blocos)
```
a/b → \frac{}{}    xⁿ → ^{}    xₙ → _{}
√   → \sqrt[]{}    ( ) → ()     |x| → ||
logₐ → \log_{}{}
```

### Navegação de cursor
- `◀ ▶` — move por token (nunca para dentro de `\left(` etc.)
- `□ próx. campo` — salta para o próximo `{}` ou `[]` vazio
- `↗ sair grupo` — sai do `{}` ou `\left...\right` mais interno
- `⌫` — backspace por token com lógica especial para estruturas

### Lógicas especiais do backspace
- `{}` vazio precedido por `\comando` → apaga estrutura inteira
- `()` vazios → apaga par inteiro
- `\left(\right)` vazios → apaga par inteiro
- `\Box^{}` ou `\Box_{}` vazios → apaga tudo
- Expoente/subscrito sem base: restaura `\Box` como placeholder

### Auto-conversão de parênteses
- `()` com `\frac` dentro → converte automaticamente para `\left(\right)`
- `\left(\right)` sem `\frac` → converte de volta para `()`
- Ocorre em: `insertStruct`, `nextSlot`, `exitGroup`, `moveLeft`, `moveRight`, `backspace`

### Preview WebView (`previewHtml`)
- HTML separado exportado de `editorTemplates.js`
- Função `r(latex, placeholder)` injetada via JS atualiza o display
- Envia `{ t: 'h', h: altura }` via postMessage para auto-ajustar altura do preview
- Cursor teal (`#4FD1C5`) renderizado como parte do LaTeX

### Fluxo de confirmação
1. Usuário clica "Confirmar"
2. `onConfirm(formula.trim())` é chamado
3. `ManageFlashcardsScreen` recebe o latex
4. Chama `editorRef.insertCustom(latex)` ou `editorRef.updateFormula(id, latex)`

---

## 9. Handlers de Copy/Cut/Paste na WebView

### Copy Handler
```js
editor.addEventListener('copy', (e) => {
  e.stopPropagation(); // CRÍTICO: impede KaTeX Copy-Tex de sobrescrever clipboard
  // 1. Clona seleção em div temporária
  // 2. Remove todos .sentinela-anti-caps do clone
  // 3. Converte cada .math-atom → textNode '$latex$'
  // 4. Extrai textContent, remove \u3164 residual
  // 5. e.clipboardData.setData('text/plain', text)
  // 6. e.preventDefault()
});
```

### Cut Handler
Idêntico ao copy, mais:
- `range.deleteContents()` remove o conteúdo do DOM
- Limpa nós de texto vazios e sentinelas órfãs (sem math-atom antes) do editor
- Dispara `CONTENT_CHANGE` + `CHAR_COUNT`

### Paste Handler
```js
editor.addEventListener('paste', (e) => {
  e.preventDefault();
  // Aceita apenas text/plain — nenhum HTML externo entra no DOM
  var text = clipboardData.getData('text/plain');
  text = text.replace(/\u3164/g, ''); // Remove sentinela que vazou via KaTeX Copy-Tex
  // Trunca para caber no limite restante (MAX_CHARS - currentCount)
  // Insere textNode na posição do cursor
  // Chama detectAndConvertFormula() para converter $latex$ colados
  // Dispara CONTENT_CHANGE + CHAR_COUNT
});
```

### detectAndConvertFormula()
Chamado após paste (e também após `compositionend` e `input` events):
1. Percorre tree walker até 20 iterações (suporta múltiplas fórmulas numa pasta)
2. A cada iteração: encontra o próximo nó de texto com padrão `$...$`
3. Extrai `latex` entre os `$`
4. Cria `span.math-atom` com `data-id='math_<timestamp>_<i>'`
5. Renderiza KaTeX no span (on error: mostra `$latex$` como texto)
6. Remove `.strut` do KaTeX renderizado
7. Substitui o textNode por: `[texto antes][math-atom][sentinela][espaço?][texto depois]`
8. Após todas as iterações, posiciona cursor após a última fórmula inserida (via setTimeout 10ms)
9. Chama `checkPlaceholder()`

### Auto-heal de sentinelas no paste
Após paste, um listener verifica se toda `.math-atom` tem uma sentinela imediatamente após — adiciona sentinela se faltar (previne corrupção de fórmulas copiadas de fontes externas).

---

## 10. Sistema de Rascunho (Draft)

### Armazenamento
```js
global.flashcardDrafts[draftKey] = { question: string, answer: string }
// draftKey = `${deckId}-${subjectId}` (criação)
// draftKey = `${deckId}-${subjectId}-${cardId}` (edição)
```

### updateDraft(type, content)
Chamada a cada `CONTENT_CHANGE` do WebView:
```js
// Limpeza inteligente: salva "" se conteúdo for só HTML vazio
const cleanContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
const hasMedia = content.includes('<img') || content.includes('math-atom');
const valueToSave = (!cleanContent && !hasMedia) ? "" : content;
```
Garante que o placeholder reaparece quando o campo fica vazio mesmo com `<br>` residuais.

### trimHtml(html)
Aplicado antes de salvar:
```js
html
  .replace(/^(\s|<br\s*\/?>|&nbsp;)+/i, '')  // remove início vazio
  .replace(/(\s|<br\s*\/?>|&nbsp;)+$/i, '')  // remove fim vazio
  .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>') // colapsa 3+ <br> → 2
```

### Modo edição
No mount, carrega card do banco e preenche `global.flashcardDrafts[draftKey]` com conteúdo existente. `IsolatedMathEditor` recebe `initialValue={global.flashcardDrafts[draftKey].question}` diretamente.

### clearDraft()
Chamada após save bem-sucedido: `delete global.flashcardDrafts[key]`

---

## 11. Integração no ManageFlashcardsScreen

### Estados relevantes
```js
const questionRef = useRef();        // ref para IsolatedMathEditor da pergunta
const answerRef = useRef();          // ref para IsolatedMathEditor da resposta
const [editingMath, setEditingMath]  // { id, latex, source, field } — fórmula sendo editada
const [builderVisible, setBuilderVisible] // FormulaBuilderModal aberto?
const [questionFormat, setQuestionFormat] // { bold, italic, mark }
const [answerFormat, setAnswerFormat]     // { bold, italic, mark }
```

### handleEditMath(id, latex, source)
Recebido de `EDIT_MATH` do WebView:
- Se `source === 'builder'`: abre `FormulaBuilderModal` com `initialFormula=latex`
- Caso contrário (source='simple'): parseia latex com regexes e abre modal inline simples
  ```js
  // Regexes por tipo:
  \left(\frac{}{})^{} → /\\left\(\\frac\{(.+?)\}\{(.+?)\}\\right\)\^\{(.+?)\}/
  \frac{}{}           → /\\frac\{(.+?)\}\{(.+?)\}/
  \sqrt[]{} / \sqrt{} → /\\sqrt\[(.+?)\]\{(.+?)\}/ ou /\\sqrt\{(.+?)\}/
  \log_{}{} (v1=base, v2=arg)
  ^{} / _ {}          → separate patterns
  \left|x\right|      → /\\left\|(.+?)\\right\|/
  // \Box limpo para '' antes de exibir
  ```

### Fluxo EDIT_MATH
```
WebView dispara EDIT_MATH
  → onEditMath(id, latex, source, field)
    → setEditingMath({ id, latex, source, field })
    → setBuilderVisible(true)
```

### Fluxo de confirmação da fórmula
```
FormulaBuilderModal.onConfirm(latex)
  → se editingMath.id existe:
      editorRef.updateFormula(editingMath.id, latex)
  → senão (nova fórmula):
      editorRef.insertCustom(latex)
  → setBuilderVisible(false)
  → setEditingMath(null)
```

### calculateFormulaWeight (espelho RN)
Função duplicada em `ManageFlashcardsScreen.js` para pre-checar peso antes de inserção. Usada ao editar fórmula existente (compara peso novo vs antigo para verificar se cabe no limite).

### FieldToolbar (toolbar dentro da caixa de texto)
Componente interno com botões:
- **Colar** (`handlePasteClipboard`): lê `clipboardText` → escapa HTML → appenda ao draft → `editorRef.setContent()`
- **Copiar** (`handleCopyField`): extrai texto puro do HTML do draft via regex; copia para clipboard; feedback 2s
- **Limpar** (`handleClearField`): salva snapshot em `undoSnapshot.current` → limpa draft + editor → ativa modo undo (4s)
- **Desfazer** (`handleUndoClear`): restaura draft + editor do snapshot; desativa modo undo
- **B**: `editorRef.toggleBold()`
- **I**: `editorRef.toggleItalic()`
- **brush**: `editorRef.toggleMark()`
- **contador**: exibe `charCount/maxChars` via `EditorCharCounter`

### Gerenciamento de teclado
```js
// keyboardDidShow:
mathToolbarRef.current?.forceClose() // fecha toolbar quando teclado abre

// keyboardDidHide:
if (pendingToolbarOpen.current) {
  pendingToolbarOpen.current = false;
  mathToolbarRef.current?.toggle(); // abre toolbar após teclado fechar
} else {
  scrollViewRef.current?.scrollTo({ y: 0 }); // scroll topo se não há toolbar pendente
}
```

### toggleMathToolbar()
```js
if (!isMathToolbarVisible) {
  if (keyboardVisibleRef.current) {
    // Teclado aberto: blur + Keyboard.dismiss() + agenda toolbar
    pendingToolbarOpen.current = true;
    questionEditorRef.current?.blur();
    answerEditorRef.current?.blur();
    Keyboard.dismiss();
  } else {
    mathToolbarRef.current?.toggle(); // abre direto
  }
} else {
  mathToolbarRef.current?.toggle(); // fecha
}
```
Padrão `pendingToolbarOpen` evita conflito teclado/toolbar no Android.

---

## 12. Problemas Conhecidos (motivo da migração)

### Bold/Italic — instabilidade no Android
- `execCommand('bold')` quebra ao pressionar espaço (Android IME trata espaço como separador de palavra)
- `queryCommandState('bold')` fica preso em `true` após deletar texto bold
- Modo de digitação contínua (ativar B sem seleção) não funciona de forma confiável
- **Causa raiz**: Android IME bypassa eventos DOM durante composição; é uma limitação do contenteditable no Android WebView documentada pelo time do ProseMirror

### Conclusão da pesquisa
Não existe solução confiável para bold/italic typing mode em contenteditable puro no Android WebView. A única solução que resolve de verdade é usar um editor que abstrai o DOM (ProseMirror/TipTap), que intercepta o IME e gerencia um estado interno em vez de deixar o browser controlar o DOM.

---

## 13. Plano de Migração para TipTap

### O que muda
- `editorTemplates.js`: reescrito usando TipTap core + extensões Bold + Italic + Highlight + extensão customizada MathAtom
- `HybridEditor.js`: métodos imperativos adaptados para comandos TipTap via `injectJavaScript`

### O que NÃO muda
- KaTeX continua sendo usado para renderizar fórmulas (agora dentro do NodeView do TipTap)
- `FormulaBuilderModal.js` — sem alterações
- `ManageFlashcardsScreen.js` — sem alterações (ou mínimas)
- `IsolatedMathEditor.js` — sem alterações
- Todos os modais, toolbar, estilos — sem alterações

### Extensão MathAtom (TipTap)
```js
// Node spec
{
  name: 'mathAtom',
  group: 'inline',
  inline: true,
  atom: true,          // cursor não entra dentro
  selectable: true,
  attrs: { id: {}, latex: {}, source: { default: 'simple' } },
  // parseHTML: detecta span.math-atom existente
  // renderHTML: renderiza span.math-atom com KaTeX
  // addNodeView: NodeView com click handler → dispara EDIT_MATH
}
```

### Possíveis problemas na migração
1. **Parsing do HTML existente**: flashcards salvos com HTML do contenteditable manual precisam ser parseados pelo TipTap. O `parseHTML` da extensão MathAtom precisa reconhecer `span.math-atom[data-latex]`.
2. **Serialização**: `getHTML()` do TipTap precisa gerar HTML compatível com o que o app espera salvar/renderizar no FlashcardScreen.
3. **CDN offline**: TipTap não tem build UMD. Precisa ser bundlado (esbuild) e injetado inline na template string do `editorTemplates.js`.
4. **Bundle size**: ~130-160kb minificado para core + Bold + Italic + Highlight. Aumenta o tempo de load inicial da WebView.
5. **sentinela anti-caps**: pode não ser necessário no TipTap (testar no Android real).
6. **Char count**: a extensão de contagem precisa calcular peso de nós MathAtom corretamente.
7. **Android WebView onLoadEnd**: no Android o WebView não é desmontado ao fechar Modal — padrão já conhecido e tratado no FormulaBuilderModal (não resetar `ready`).

---

*Documento gerado em 2026-04-21, atualizado em 2026-04-20. Checkpoint pré-migração TipTap.*
