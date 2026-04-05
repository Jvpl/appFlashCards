# REDESIGN — ABA INÍCIO
> Documento de referência completo. Criado para preservar contexto entre sessões.

---

## PALETA DE CORES

| Token | Valor | Uso |
|---|---|---|
| `background` | `#0F0F0F` | Fundo principal da tela |
| `backgroundSecondary` | `#202020` | Superfície de cards |
| `backgroundTertiary` | `#2A2A2A` | Bordas, separadores, elementos elevados |
| `primary` | `#5DD62C` | Verde lima — cor accent única. Botões primários, ícone ativo da nav, destaques |
| `primaryDark` | `#337418` | Verde musgo — hover, bordas do accent, badge secundário |
| `primaryTransparent` | `rgba(93,214,44,0.12)` | Fundos translúcidos do accent |
| `textPrimary` | `#F8F8F8` | Texto principal |
| `textSecondary` | `#A0A0A0` | Texto secundário |
| `textMuted` | `#606060` | Hints, placeholders, metadados |

**REGRA:** Nenhuma cor adicional de categoria ou arco-íris. Todo destaque usa `#5DD62C`. Cores de status (danger, warning) continuam existindo apenas para feedback funcional.

---

## TIPOGRAFIA

### Fontes escolhidas (todas gratuitas, Google Fonts / @expo-google-fonts)

| Fonte | Pacote | Papel | Pesos usados |
|---|---|---|---|
| **Space Grotesk** | `@expo-google-fonts/space-grotesk` | Títulos, nome do deck, pontuações, destaques | 500, 600, 700 |
| **Manrope** | `@expo-google-fonts/manrope` | Corpo de texto, frente/verso dos flashcards, descrições | 400, 500, 600 |
| **Plus Jakarta Sans** | `@expo-google-fonts/plus-jakarta-sans` | Labels de UI, botões, badges, tags, metadados | 400, 500, 600 |

### Hierarquia de uso

| Elemento | Fonte | Peso | Tamanho |
|---|---|---|---|
| Título de tela / nome do deck | Space Grotesk | 700 | 20–24px |
| Pergunta do flashcard | Space Grotesk | 500 | 18–20px |
| Seção label (RECENTES, MEUS) | Plus Jakarta Sans | 600 | 11px / letter-spacing 1.5 |
| Botão primário | Plus Jakarta Sans | 600 | 14px |
| Corpo / resposta do card | Manrope | 400 | 14–15px |
| Metadados (X cards, X matérias) | Plus Jakarta Sans | 400 | 12px |
| Badge / tag | Plus Jakarta Sans | 500 | 10–11px |
| Porcentagem de domínio | Space Grotesk | 700 | 14px |

### Instalação
```bash
npx expo install @expo-google-fonts/space-grotesk @expo-google-fonts/manrope @expo-google-fonts/plus-jakarta-sans expo-font
```

---

## ESTRUTURA DA ABA INÍCIO

### Estado 1 — Primeiro acesso (sem nenhum deck criado/comprado, deck exemplo ainda não dispensado)

```
Header
Barra de pesquisa
─────────────────────
Card grande "Deck de Exemplo"
  - label: DECK DE EXEMPLO
  - título: Como funciona o app?
  - subtítulo: Toque para ver seus primeiros flashcards
  - botão: [Explorar exemplo →]

Botão: [+ Criar meu primeiro deck]   (full width, borda verde)
Botão: [🛒 Explorar a loja]          (full width, fundo secundário)
─────────────────────
NavBar
```

### Estado 2 — Com conteúdo (tem decks ou recentes)

```
Header
Barra de pesquisa
─────────────────────
[RECENTES]  ← só aparece se recentDecks.length > 0
  scroll horizontal, max 4 cards compactos

[+ Criar deck]  ← botão full-width, ícone +, borda verde tracejada

[ Categorias | Decks | Matérias ]  ← TabBar com 3 botões
  Decks = botão levemente maior (font 15px vs 13px dos outros)
  Ativo = fundo verde #5DD62C, texto preto
  Inativo = fundo transparente, texto #A0A0A0

─── Conteúdo da aba ativa ───

SEÇÃO: "Seus X primeiro   Inverter ⇅"
  subseção MEUS / subseção COMPRADOS
  grid 2 colunas, máx 8 items
  overflow → card "+N mais" que ao clicar expande

─────────────────────
NavBar
```

---

## DESIGN DOS CARDS — ESPECIFICAÇÕES DETALHADAS

### 1. CARD DE CATEGORIA

**Fonte:** SVG próprio renderizado via `react-native-svg` (SvgXml ou SvgUri)
**Pasta dos SVGs:** `/SVG-categorias/` (raiz do projeto)
**Arquivos:** Administrativo.svg, Educação.svg, Fiscal & Controle.svg, Justiça & Direito.svg, Militar.svg, Operacional & Logística.svg, Saúde.svg, Segurança Pública.svg

**Estrutura do SVG (viewBox 0 0 218.32 153.94):**
- Fundo escuro `#1f1f1f` (cls-3) — corpo principal com bordas arredondadas
- Aba superior direita em verde musgo `#347530` (cls-2) — recorte estilo pasta
- 3 círculos decorativos na aba: mesma cor do fundo (cls-3) — imitam dots de janela
- Ícone da categoria centralizado em verde lima `#6fb630` (cls-1) — no canto inferior direito

**Dados dinâmicos embutidos NO SVG via `<Text>` SVG:**
- Nome da categoria: canto superior esquerdo, fonte bold, cor `#F8F8F8`
- Número de decks: inferior esquerdo, verde lima, bold + label "Decks" embaixo
- Separador vertical: linha `|` entre decks e matérias
- Número de matérias: ao lado do separador, verde lima, bold + label "Matérias" embaixo
- Ícone SVG: canto inferior direito (já está no arquivo SVG)

**Referência visual:** Idêntico à imagem fornecida pelo usuário (card escuro, aba verde no canto superior direito, nome no topo esquerdo, números verdes em baixo à esquerda, ícone em baixo à direita)

**Quando aparece:** Apenas quando o usuário tem ≥1 deck naquela categoria (criado e categorizado, ou comprado)

**Categoria "Meus estudos" (personalizados):** Mesmo padrão de SVG mas com ícone `albums-outline` e borda tracejada verde para diferenciar das categorias de concurso compradas

### 2. CARD DE DECK

**Design:** Pilha de 4 cartas empilhadas (estilo baralho)
- 3 cartas decorativas atrás (deslocadas ~4px e ~2° de rotação cada)
- 1 carta principal na frente

**Estrutura da carta principal:**
```
┌─────────────────────┐
│ DECK                │  ← label em cima, Plus Jakarta Sans 500, #A0A0A0, 10px
│                     │
│ PC-SP Investigador  │  ← nome, Space Grotesk 600, #F8F8F8, 14px, max 2 linhas
│ 2025                │
│                     │
│ 3 matérias          │  ← Manrope 400, #A0A0A0, 12px
│ 25% dominado        │  ← Plus Jakarta Sans 600, #5DD62C, 12px
└─────────────────────┘
```

**Sistema de nível / highlight da borda:**
- 0% → sem borda, cartas de trás opacidade 0.2
- 25% → borda `#5DD62C` opacity 0.3, cartas de trás opacity 0.4
- 50% → borda `#5DD62C` opacity 0.5, cartas de trás opacity 0.6
- 75% → borda `#5DD62C` opacity 0.75, cartas de trás opacity 0.8
- 100% → borda `#5DD62C` opacity 1.0, cartas de trás opacity 1.0, label "Dominado" com ● verde

**Cálculo de porcentagem:**
- Não é exata — arredonda para múltiplos de 25
- Fórmula: `Math.round((sum / (total * 5)) / 0.25) * 25`
- Exibe: 0% / 25% / 50% / 75% / 100%

**Label de status por %:**
- 0% → "Não iniciado" (textMuted)
- 25% → "Iniciando" (#5DD62C)
- 50% → "Avançando" (#5DD62C)
- 75% → "Quase lá" (#5DD62C)
- 100% → "● Dominado" (#5DD62C)

### 3. CARD DE MATÉRIA

**Design:** Caderno com marcador (bookmark) verde

**Estrutura:**
```
┌────────┬──┐
│        │▼ │  ← bookmark verde no topo direito (retângulo com ponta em V)
│ ○      │  │  ← 3 furos decorativos lado esquerdo (círculos vazados)
│ ○      │  │
│ ○      │  │
│        │  │
│ MATÉRIA│  │  ← label, Plus Jakarta Sans 500, #5DD62C, 10px
│ Dir.   │  │  ← nome, Space Grotesk 600, #F8F8F8, 13px, max 2 linhas
│ Const. │  │     IMPORTANTE: nome não pode ultrapassar o bookmark
│        │  │
│ 7 cards│  │  ← Manrope 400, #A0A0A0, 12px
└────────┴──┘
```

**Detalhes visuais:**
- Fundo: `#202020`
- Bookmark: retângulo verde `#5DD62C` no topo direito, com recorte triangular na parte inferior (tipo marcador de livro real)
- Furos: 3 círculos vazados lado esquerdo, cor `#5DD62C` opacity 0.6, borda fina
- Badge "Avulsa" para matérias compradas separadamente (pill verde musgo)
- Badge "Criada" para matérias criadas pelo usuário (quando possível no futuro)

---

## TABBAR INTERNA (3 botões)

```
[ Categorias ]  [ Decks ]  [ Matérias ]
    13px         15px          13px
```

- Fundo da barra: `#202020`, borderRadius 12, padding 4
- Botão ativo: fundo `#5DD62C`, texto `#0F0F0F`, Plus Jakarta Sans 600
- Botão inativo: fundo transparente, texto `#606060`, Plus Jakarta Sans 500
- Botão Decks levemente maior (fontSize 15 vs 13, paddingVertical +2)
- Default ao abrir: aba **Decks**

---

## SEÇÃO COM OVERFLOW ("+ N mais")

- Grid 2 colunas, máx 8 items visíveis
- Se total > 8: o 8º slot vira card escuro com `+N mais` centralizado
- `+N mais` = total - 7 (os 7 primeiros aparecem + 1 card de overflow)
- Ao tocar no card de overflow: NÃO navega para outra tela, apenas expande a lista na mesma seção
- Texto: Space Grotesk 700, `#5DD62C`

---

## "INVERTER ⇅"

- Aparece na linha do label da seção: `"Seus decks primeiro    Inverter ⇅"`
- Estado padrão: MEUS antes de COMPRADOS
- Ao tocar: inverte a ordem (COMPRADOS primeiro)
- Label muda para: `"Comprados primeiro    Inverter ⇅"`
- Estado salvo apenas em memória (não persiste entre sessões)
- Cor: `#5DD62C`, Plus Jakarta Sans 500, 12px

---

## RECENTES

- Scroll horizontal
- Max 4 cards
- Card compacto: ícone + nome do deck + deck de origem (para matéria) ou nº de matérias (para deck)
- Ao tocar: navega diretamente para SubjectList do deck
- Aparece APENAS se `recentDeckIds.length > 0`

---

## BOTÃO CRIAR DECK

- Full width
- Ícone `+` em círculo verde
- Texto: "Criar deck", Plus Jakarta Sans 600, `#5DD62C`
- Fundo: `rgba(93,214,44,0.08)`
- Borda: 1.5px tracejada `#5DD62C` opacity 0.4
- borderRadius: 14
- Ao tocar: `navigation.navigate('AddDeck')`

---

## LÓGICA DE DADOS POR ABA

### Aba Categorias
```js
// Aparece apenas categorias que têm decks
const categoriesWithDecks = CONCURSO_CATEGORIES.filter(cat =>
  (categoryCounts[cat.id] || 0) > 0
)
// "personalizados" aparece se userDecks.length > 0

// Seção MEUS: decks do usuário agrupados por categoria
// Seção COMPRADOS: decks comprados agrupados por categoria
```

### Aba Decks
```js
// Seção MEUS: userDecks (isUserCreated === true || isExample)
// Seção COMPRADOS: purchasedDecks (isPurchased === true)
// Grid 2 colunas, máx 8 por seção, overflow card "+N mais"
// Seção MEUS tem card "+ Criar deck" no grid
```

### Aba Matérias
```js
// Flat list de todas as matérias de todos os decks
// Sem seção MEUS (usuário não cria matérias avulsas por enquanto)
// Seção COMPRADOS: todas as subjects dos decks comprados
// Cada item: { subject, deck, isPurchased }
```

---

## ARQUIVOS QUE SERÃO MODIFICADOS

| Arquivo | Tipo de mudança |
|---|---|
| `src/styles/theme.js` | Atualizar paleta de cores para nova paleta |
| `src/screens/DeckListScreen.js` | Reescrever seção de render (manter lógica de dados) |
| `src/navigation/AppContent.js` | Atualizar cores da TabBar principal |
| `App.js` | Carregar as 3 novas fontes com `expo-font` |

## ARQUIVOS NOVOS QUE SERÃO CRIADOS

| Arquivo | Conteúdo |
|---|---|
| `src/components/home/CategorySvgCard.js` | Renderiza SVG de categoria com dados dinâmicos embutidos |
| `src/components/home/DeckStackCard.js` | Card estilo pilha de cartas com sistema de nível |
| `src/components/home/MateriaCard.js` | Card estilo caderno com bookmark |
| `src/components/home/HomeTabBar.js` | TabBar interna com 3 botões (Categorias/Decks/Matérias) |
| `src/components/home/OverflowCard.js` | Card "+N mais" para overflow do grid |
| `src/components/home/RecentCard.js` | Card compacto da seção recentes |

---

## NAVEGAÇÃO (sem mudanças)

- Deck card → `navigation.navigate('SubjectList', { deckId, deckName, preloadedSubjects })`
- Categoria card → filtra aba Decks por categoria (sem mudar de tela)
- Matéria card → `navigation.navigate('SubjectList', { deckId })` com foco na matéria
- Botão loja → `navigation.navigate('Loja')`
- Botão criar deck → `navigation.navigate('AddDeck')`

---

## O QUE NÃO MUDA

- Toda lógica de `loadData`, `loadSecondaryData`
- `handleDeckPress`, `handleCategoryPress`
- `multiSelectMode`, `selectedDecks`, `deleteSelectedDecks`
- `CustomBottomModal`, `CustomAlert`
- Sistema de busca (SearchBar + resultados)
- Header (`HomeHeader`) — layout e lógica idênticos
- NavBar principal (AppContent.js) — apenas atualização de cores
- Lógica de `exampleDismissed`
- Navegação para todas as telas filhas

---

## ORDEM DE IMPLEMENTAÇÃO

1. Instalar as 3 fontes (`@expo-google-fonts`)
2. Configurar fontes no `App.js`
3. Atualizar `theme.js` com nova paleta
4. Criar componente `CategorySvgCard.js`
5. Criar componente `DeckStackCard.js`
6. Criar componente `MateriaCard.js`
7. Criar componente `HomeTabBar.js`
8. Criar componente `OverflowCard.js`
9. Criar componente `RecentCard.js`
10. Reescrever render do `DeckListScreen.js` (estado Primeiro acesso + estado Com conteúdo)
11. Atualizar cores da TabBar em `AppContent.js`

---

## NOTAS IMPORTANTES

- Os SVGs de categoria estão em `/SVG-categorias/` na **raiz do projeto** (não dentro de `src/`)
- O SVG usa classes CSS internas (cls-1, cls-2, cls-3) — ao usar com `react-native-svg`, converter para atributos inline
- O viewBox dos SVGs é `0 0 218.32 153.94` — aspect ratio ~1.42:1
- As cores do SVG são: `#6fb630` (verde lima), `#347530` (verde musgo), `#1f1f1f` (fundo escuro)
- Essas cores são **próximas mas não iguais** à paleta do app (`#5DD62C`, `#337418`, `#0F0F0F`) — manter as cores originais do SVG para não distorcer os ícones
- Categoria "personalizados" não tem SVG — usar componente customizado com mesmo layout
- Primeiro acesso = sem decks E deck exemplo não dispensado
- "Com conteúdo" = qualquer deck existe (userDecks.length > 0 ou purchasedDecks.length > 0)
