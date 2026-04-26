# Plano — Melhorias de QoL: Tela "Criar Flashcard"

## Contexto
Tela `ManageFlashcardsScreen.js` — modo criação e edição de flashcards.
Editor baseado em WebView (IsolatedMathEditor/HybridEditor) com suporte a fórmulas matemáticas.
Draft salvo em `global.flashcardDrafts` enquanto o usuário digita.

---

## Melhorias Propostas

### 1. Feedback visual no botão "Salvar card" quando campos estão vazios
**Situação atual:** ao tentar salvar sem preencher, aparece um alerta (`CustomAlert`) — interrompe o fluxo.
**Melhoria:** o botão Salvar fica levemente opaco/desativado visualmente quando ambos os campos estão vazios (`questionCharCount === 0 && answerCharCount === 0`). Ao tentar salvar ainda assim, vibra e o botão faz um shake — sem alerta.
**Impacto:** baixo — só muda o feedback visual, não o fluxo de salvamento.

---

### 2. Indicador de campo ativo nos labels (PERGUNTA / RESPOSTA)
**Situação atual:** a borda da caixa muda de cor quando ativa, mas os labels `PERGUNTA` e `RESPOSTA` não têm feedback.
**Melhoria:** quando `activeEditor === 'question'`, o label "PERGUNTA" e seu ponto verde ficam mais brilhantes (opacidade 1.0 vs 0.45 quando inativo). Mesmo para "RESPOSTA".
**Impacto:** mínimo — só `opacity` nos dois labels via `activeEditor` state (já existente).

---

### 3. Contador de caracteres muda de cor progressivamente
**Situação atual:** já existe lógica de cor no `EditorCharCounter` (danger/warning/disabled) mas a transição é abrupta.
**Melhoria:** adicionar animação suave de cor com Reanimated quando o contador ultrapassa 80% e 95% do limite. Também exibir uma barra de progresso fina abaixo do label (altura 2px) que vai de verde → amarelo → vermelho.
**Impacto:** médio — requer uma barra de progresso nova, mas não altera lógica existente.

---

### 4. Botão "Salvar card" com feedback de sucesso antes de navegar
**Situação atual:** ao salvar, `navigation.goBack()` é chamado imediatamente — sem nenhum feedback.
**Melhoria:** o botão mostra um ícone de check (✓) verde por ~400ms antes de fazer `goBack()`. Usa `withTiming` do Reanimated já importado.
**Impacto:** baixo — apenas um `setTimeout` + troca de texto/ícone no botão.

---

### 5. Rascunho visível — indicador de "card em andamento"
**Situação atual:** o draft é salvo em `global.flashcardDrafts` mas o usuário não sabe se há conteúdo salvo ao entrar na tela.
**Melhoria:** se ao entrar na tela já houver conteúdo no draft (usuário saiu e voltou), exibir um badge discreto "Rascunho salvo" abaixo do label PERGUNTA, que some quando o usuário edita ou salva.
**Impacto:** baixo — lê `global.flashcardDrafts[draftKey]` no mount, já existente.

---

## Perguntas antes de implementar

1. **Melhoria 1 (botão opaco):** prefere manter o alerta atual quando tenta salvar vazio, ou trocar por shake + vibração sem alerta?
2. **Melhoria 3 (barra de progresso):** a barra ficaria na mesma linha do contador (à direita do label) ou abaixo da caixa de texto?
3. **Melhoria 4 (feedback de sucesso):** no modo edição (`isEditMode`), o comportamento também muda, ou só no modo criação?
4. **Melhoria 5 (badge de rascunho):** esse badge deve aparecer apenas quando a tela é aberta com conteúdo pré-existente, ou também quando o usuário volta ao topo após digitar?

---

## Status
- [ ] Melhoria 1 — Botão Salvar desativado visualmente
- [ ] Melhoria 2 — Labels com opacidade por campo ativo
- [ ] Melhoria 3 — Contador com barra de progresso animada
- [ ] Melhoria 4 — Feedback de sucesso no Salvar
- [ ] Melhoria 5 — Badge de rascunho salvo
