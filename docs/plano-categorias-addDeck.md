# Plano de Melhorias — Categorias & AddDeckScreen

## Status geral
- [x] Etapa 1 — Busca da aba inicial navega para dentro da categoria
- [x] Etapa 2 — FAB da categoria faz scroll automático até ela no AddDeck
- [x] Etapa 3 — Redesign do AddDeckScreen (filtro sempre visível + botão nova categoria)
- [x] Etapa 4 — Botão seta no card selecionado + label de categoria acima do input
- [x] Etapa 5 — Botão "Salvar deck" compacto ao lado do input

---

## Etapa 1 — Busca navega para dentro da categoria

**Problema:** ao pesquisar uma categoria na aba inicial e clicar no resultado, o sistema redireciona para a tela de fora da categoria (ou loja), em vez de abrir a `CategoryDetailScreen`.

**Comportamento esperado:** clicar em qualquer resultado de categoria na busca (padrão ou personalizada, com ou sem decks) deve navegar para `CategoryDetailScreen` daquela categoria.

**Arquivos afetados:**
- `src/screens/DeckListScreen.js` — lógica de `searchResults` e `onPress` dos resultados de busca de categoria

---

## Etapa 2 — FAB da categoria faz scroll automático até ela no AddDeck

**Problema:** ao entrar no AddDeck via FAB de uma categoria, a categoria pré-selecionada não está visível — o usuário precisa scrollar até ela manualmente.

**Comportamento esperado:** quando `preselectedCategoryId` é passado como param, o `ScrollView` das categorias deve fazer scroll automático até o card daquela categoria logo após o carregamento.

**Arquivos afetados:**
- `src/screens/AddDeckScreen.js` — adicionar `ref` no `ScrollView` de categorias e chamar `scrollTo` após carregar, usando a posição do card pré-selecionado

---

## Etapa 3 — Redesign do AddDeckScreen

### 3a — Filtro padrão/personalizar sempre visível
**Problema:** o filtro padrão/personalizar só aparece se houver categorias customizadas criadas.

**Comportamento esperado:** o filtro sempre aparece, independente de haver ou não categorias personalizadas.

### 3b — Botão "criar nova categoria" pertence somente à seção Personalizar
**Problema:** o botão interativo de criar nova categoria aparece na seção padrão também.

**Comportamento esperado:**
- O botão de criar nova categoria fica fixo no topo da seção "Personalizar", abaixo do input de nome do deck, sempre visível (não depende de ter cards ou não)
- Na seção "Padrão" esse botão não existe

**Arquivos afetados:**
- `src/screens/AddDeckScreen.js` — reorganizar renderização do filtro e do botão de criar categoria

---

## Etapa 4 — Botão seta no card selecionado + label de categoria acima do input

### 4a — Seta no card selecionado
**Comportamento esperado:**
- Quando uma categoria está selecionada, aparece um pequeno botão minimalista com uma seta para cima dentro do card selecionado
- Ao clicar, faz scroll até o input (topo da tela)
- Ao desselecionar a categoria, o botão some

### 4b — Label de categoria selecionada acima do input
**Comportamento esperado:**
- Pequeno label elegante próximo ao input indicando qual categoria está selecionada
- Ao clicar no label, o scroll vai até o card da categoria selecionada
- Some quando nenhuma categoria está selecionada

**Arquivos afetados:**
- `src/screens/AddDeckScreen.js` — adicionar botão no card selecionado e label próximo ao input

---

## Etapa 5 — Botão "Salvar deck" compacto ao lado do input

**Problema:** o botão "Salvar deck" atual ocupa toda a largura e fica na parte inferior da tela, inadequado para layout escalável com muitas categorias.

**Comportamento esperado:**
- Botão menor e compacto posicionado à direita do input de nome do deck (ou logo abaixo dele)
- Libera espaço vertical para a lista de categorias

**Arquivos afetados:**
- `src/screens/AddDeckScreen.js` — reposicionar e redimensionar o botão salvar

---

## Ordem de execução recomendada

1. Etapa 1 (busca) — isolada, não interfere no AddDeck
2. Etapa 3 (redesign base do AddDeck) — prepara a estrutura para as etapas seguintes
3. Etapa 2 (scroll automático) — depende da estrutura do Etapa 3
4. Etapa 5 (botão salvar compacto) — ajuste visual, melhor fazer com layout já estável
5. Etapa 4 (seta + label) — último pois depende de tudo estar posicionado corretamente
