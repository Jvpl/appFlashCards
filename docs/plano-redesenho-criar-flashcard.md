# Plano — Redesenho da Tela "Criar Flashcard"

## Arquivo principal
`src/screens/ManageFlashcardsScreen.js` (modo criação — quando não há `flashcardId` na rota)

---

## Situação atual vs. desejada

| Elemento | Atual | Desejado |
|---|---|---|
| Label campo 1 | `Frente` (texto simples) | `PERGUNTA` com ponto verde à esquerda |
| Label campo 2 | `Verso` (texto simples) | `RESPOSTA` com ponto verde à esquerda |
| Borda ativa dos inputs | `#4db6ac` (teal azulado) | `theme.primary` (verde do app) |
| Borda inativa dos inputs | `#444` | `rgba(255,255,255,0.08)` |
| Separador entre campos | Nenhum | Seta/chevron-down centralizado |
| Botão salvar | `SALVAR FLASHCARD` | `Salvar card` |
| Fundo dos inputs | `theme.backgroundSecondary` | Manter, mas garantir tom correto |

---

## Etapas

### Etapa 1 — Labels e separador
- Trocar `<Text style={styles.formLabel}>Frente</Text>` por componente inline com ponto verde + texto `PERGUNTA` em uppercase
- Trocar `Verso` → `RESPOSTA` da mesma forma
- Adicionar separador com `Ionicons` `chevron-down` entre os dois blocos (input Pergunta → seta → input Resposta)
- Ponto verde: `width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary`

### Etapa 2 — Cores dos inputs e borda
- `borderColor` ativo: `#4db6ac` → `theme.primary`
- `borderColor` inativo: `#444` → `'rgba(255,255,255,0.08)'`
- Verificar `backgroundColor` dos inputs — deve ser `theme.backgroundSecondary` (sem tint azul)

### Etapa 3 — Botão Salvar
- Texto `SALVAR FLASHCARD` → `Salvar card`
- Ajustar `borderRadius` para `8` (mais arredondado, consistente com o resto do app)
- Manter `backgroundColor: theme.primary`

### Etapa 4 — Revisão geral e ajuste de espaçamentos
- Revisar `paddingTop` entre label e input
- Garantir que o contador de caracteres (`EditorCharCounter`) fique alinhado à direita na mesma linha do label
- Testar teclado e MathToolbar — nenhuma mudança funcional, só visual

---

## O que NÃO muda
- Lógica de `handleSave`, `handleEditMath`, `IsolatedMathEditor`
- `MathToolbar` e botão `f(x)`
- Lógica de scroll e `KeyboardAvoidingView`
- `EditorCharCounter` (só reposicionar visualmente se necessário)

---

## Status
- [x] Etapa 1 — Labels e separador
- [x] Etapa 2 — Cores dos inputs
- [x] Etapa 3 — Botão Salvar
- [ ] Etapa 4 — Revisão geral
