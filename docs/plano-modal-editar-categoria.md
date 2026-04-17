# Plano — Redesenho do Modal de Edição de Categoria

## Contexto

O modal de edição de categoria é aberto na aba Início quando o usuário toca em uma categoria de um deck existente. Atualmente está dividido em duas seções. Com a reintrodução das categorias personalizadas nele, a hierarquia muda completamente.

---

## Nova Hierarquia do Modal

```
┌─────────────────────────────┐
│ HEADER                      │  ← categoria atual (padrão ou personalizada)
├─────────────────────────────┤
│ INPUT + MENU DE SÍMBOLOS    │  ← digitar novo nome / escolher ícone
├─────────────────────────────┤
│ FILTRO  [ Padrão | Custom ] │  ← alterna lista
│                             │
│ LISTA DE CATEGORIAS         │  ← disponíveis (não usadas na aba Início)
│  (scrollável)               │
├─────────────────────────────┤
│ [ SALVAR ]                  │
└─────────────────────────────┘
```

### 1. Header
- Exibe o nome e ícone da categoria atual do deck (padrão ou personalizada).
- Apenas informativo, não é editável.

### 2. Input + Menu de Símbolos
- Campo de texto onde o usuário digita o nome desejado.
- Menu de símbolos (ícones) **toggle** — aparece somente ao tocar no botão de ícone (igual à aba Novo Deck).
- O teclado abre mas **nunca cobre o input** — o input fica sempre acima do teclado. O modal pode se expandir com o menu de símbolos aberto, então o NativeKeyboardAvoidingContainer deve continuar gerenciando o teclado.
- O modal **não pode diminuir** conforme categorias são usadas e somem da lista — a altura mínima é fixa (~75-80% da tela).
- **Modo exclusivo com a lista:** se o usuário digitar qualquer coisa no input, a lista fica não clicável (mas scrollável e com filtro funcional). Se o usuário clicar primeiro em um item da lista, o input fica desabilitado/opaco (não clicável/editável).
- **Botão de limpar seleção da lista:** se houver espaço natural no layout (ex: ícone X ao lado do item selecionado), incluir para reabilitar o input. Não forçar se prejudicar o design.

### 3. Seção de Categorias
- **Filtro:** dois botões — "Padrão" e "Personalizar" — para alternar entre as listas.
- **Lista:** mostra apenas categorias **não usadas na aba Início** (sem decks).
  - Isso vale para padrão e personalizadas.
  - A categoria atual do deck não aparece na lista (já está em uso por esse deck).
- Quando a lista está bloqueada (usuário digitou no input), os itens ficam visualmente opacados e não respondem a toque.

### 4. Botão Salvar
- Aparece sempre no final, fixo abaixo da lista.
- Só tem efeito se houver uma mudança (input com texto OU item da lista selecionado).

---

## Regras de Negócio

### Regra A — Input vazio + item da lista selecionado
- Usuário clicou em uma categoria disponível → troca direta de categoria do deck.
- Sem confirmação extra (a categoria destino está disponível por definição).

### Regra B — Input com texto digitado
O sistema analisa o texto e decide:

| Texto digitado | Resultado |
|---|---|
| Nome de categoria **padrão** disponível | Troca para essa categoria padrão |
| Nome de categoria **personalizada** da biblioteca disponível | Ver Regra C |
| Nome que **não existe** em lugar nenhum | Ver Regra D |
| Nome de categoria já **em uso** na aba Início (por outro deck) | Bloqueado — alerta "já em uso" |

### Regra C — Texto é nome de personalizada existente na biblioteca (sem uso na aba Início)
- Sistema exibe alerta de confirmação:
  > "Essa categoria já existe na sua biblioteca. Quer trocar? Se trocar, seus decks saem de [Cat Atual] para [Cat Destino]."
- **Confirmar:** deck passa para a categoria destino. A categoria de origem fica na biblioteca com zero decks.
- **Cancelar:** nada muda.

### Regra D — Texto é nome novo (não existe em nenhum lugar)
- **Categoria atual é personalizada:** apenas renomeia essa categoria na biblioteca (não cria nova). Todos os decks que usavam essa categoria continuam com ela, agora com o novo nome.
- **Categoria atual é padrão:** a categoria do deck passa a ser personalizada com esse novo nome. O ícone é o escolhido pelo usuário (ou o padrão `folder-outline`). A categoria padrão original continua existindo normalmente.

### Regra E — Troca de personalizada para padrão (via input)
- Usuário digita o nome exato de uma categoria padrão disponível.
- Deck passa para a categoria padrão. A personalizada continua na biblioteca com zero decks.

### Regra F — Ícone
- Se a categoria destino/resultado for **padrão**: ícone é o fixo dessa categoria (GlowIcon com SVG path).
- Se for **personalizada**: ícone é o escolhido pelo usuário no menu de símbolos, ou `folder-outline` se nenhum foi escolhido.

### Regra G — Categorias que não aparecem na lista
- Qualquer categoria (padrão ou personalizada) que já possui pelo menos 1 deck na aba Início **não aparece** na lista do modal.
- A categoria atual do deck sendo editado também não aparece (já está em uso por ele).

---

## Estados de UI

| Estado | Input | Lista |
|---|---|---|
| Inicial | Habilitado, vazio | Habilitado |
| Usuário digitou no input | Habilitado | Bloqueada (scrollável, filtro ok, sem toque) |
| Usuário clicou na lista | Desabilitado (não editável) | Habilitado |
| Reset (limpa input ou desmarca lista) | Habilitado | Habilitado |

---

## Etapas de Implementação

- [x] **Etapa 1** — Reestruturar o layout do modal (header + input + lista + salvar)
- [ ] **Etapa 2** — Implementar lógica de exclusividade input ↔ lista
- [ ] **Etapa 3** — Popular lista com categorias disponíveis (padrão + personalizadas filtradas)
- [ ] **Etapa 4** — Implementar Regras A, B, C, D, E, F, G no botão salvar
- [ ] **Etapa 5** — Testes e ajustes de UX (alertas, edge cases)

---

## Arquivos Envolvidos

- `src/screens/EditCategoryModalScreen.js` — modal principal (todas as mudanças)
- `src/config/categories.js` — funções de leitura/escrita de categorias personalizadas
- `src/services/storage.js` — persistência dos decks (para atualizar categoryId nos decks afetados)
