# Kotlin Native Modules — Roadmap e Guia de Decisão

Este arquivo existe para orientar decisões futuras sobre **quando e onde usar Kotlin** neste projeto.
O app é e sempre será React Native. Kotlin entra cirurgicamente em pontos onde o JS chega no limite.

---

## Filosofia

> "RN é o chassi. Kotlin é o motor nos pontos onde o chassi não aguenta."

Nunca reescrever telas inteiras em Kotlin. Criar **módulos nativos pontuais**, plugados no RN como componentes ou serviços. Cada módulo resolve um problema específico e real — não hipotético.

---

## Módulos planejados (por prioridade)

---

### 1. `NativeKeyboardAvoidingContainer` ✅ PRÓXIMO A IMPLEMENTAR

**Problema:** O JS recebe o evento de teclado com delay de ~300ms via bridge. O conteúdo (input + botão salvar) sobe depois do teclado, não junto.

**Por que Kotlin resolve:** O container usa `WindowInsetsAnimationCompat` + `imePadding()` nativos. O Android avisa o componente no frame zero da animação do teclado — sem passar pelo JS.

**O que envolve:**
- Um `ViewGroup` em Kotlin que escuta `WindowInsetsAnimationCompat.Callback`
- Exposto ao RN via `ViewManager` (New Architecture: `ViewGroupManager`)
- No JS, substitui qualquer `KeyboardAvoidingView` ou padding manual

**Como usar no JS:**
```jsx
import NativeKeyboardAvoidingContainer from '../native/NativeKeyboardAvoidingContainer';

<NativeKeyboardAvoidingContainer>
  <BottomSheetTextInput ... />
  <TouchableOpacity> {/* botão salvar */} </TouchableOpacity>
</NativeKeyboardAvoidingContainer>
```

**Onde já é usado:**
- `CategoryDetailScreen.js` — modal de editar categoria (BottomSheetModal)

**Onde vai ser útil no futuro:**
- Qualquer tela com input + botão de ação (criar deck, editar flashcard, etc.)

**Cuidado:** Não ativar `windowSoftInputMode` dentro do módulo Kotlin. Deixar o Gorhom + Android gerenciar o posicionamento do sheet. O container só responde ao inset, não o força.

**Arquivo Kotlin:** `android/app/src/main/java/com/jvpl/flashcardsconcurso/modules/KeyboardAvoidingContainerViewManager.kt`

---

### 2. SQLite Nativo — Quando o volume de dados crescer

**Problema futuro:** `AsyncStorage` é chave-valor flat. Buscar, filtrar e ordenar centenas de decks/matérias/flashcards em JS vai ficar lento e consumir memória.

**Sinal de que chegou a hora:** Telas de listagem com mais de ~200 itens começarem a travar ou demorar para carregar.

**O que fazer:**
- Migrar storage para SQLite via `expo-sqlite` (caminho mais simples, ainda JS)
- Se `expo-sqlite` não for suficiente: módulo Kotlin com `Room` (ORM do Android) + queries em background thread
- Room permite queries complexas (filtros, ordenação, paginação) sem travar a UI thread

**Cuidado na migração:** O storage atual usa `AsyncStorage` com estrutura JSON. Qualquer migração para SQLite precisa de um script de migração que rode uma única vez ao abrir o app após o update. Guardar versão do schema no storage.

**Arquivo futuro:** `android/.../modules/DatabaseModule.kt`

---

### 3. Algoritmo de Repetição Espaçada (SRS)

**Problema futuro:** O algoritmo SRS (tipo SM-2 ou FSRS) calcula para cada flashcard: próxima data de revisão, intervalo, fator de dificuldade. Com milhares de cards e histórico de revisões, rodar isso em JS no main thread vai causar jank visível.

**O que fazer:**
- Implementar o algoritmo em Kotlin rodando em `Dispatchers.Default` (background thread)
- Expor via `NativeModule` com método assíncrono: recebe histórico do card, retorna próximos parâmetros
- JS chama, Kotlin processa, JS recebe callback com resultado

**Vantagem extra:** Kotlin pode processar um lote inteiro de cards de uma vez (ex: calcular revisões do dia) sem bloquear nada.

**Arquivo futuro:** `android/.../modules/SrsAlgorithmModule.kt`

---

### 4. RecyclerView Nativo para Listas Grandes

**Problema futuro:** `FlatList` do RN tem limite prático. Com centenas de itens, a virtualização do RN não é tão eficiente quanto o `RecyclerView` nativo do Android, que foi construído especificamente para isso.

**Sinal de que chegou a hora:** FlatList de decks/matérias com scroll travando ou frames dropando.

**O que fazer:**
- Criar um `RecyclerViewManager` em Kotlin
- Recebe a lista de dados via props do JS
- Renderiza itens nativos simples (sem componentes RN dentro)

**Cuidado:** Itens com layout complexo (gradientes Skia, ícones SVG) não renderizam dentro de um RecyclerView nativo puro — seria necessário simplificar o design dos itens ou aceitar que só o scroll será nativo. Avaliar o tradeoff na hora.

**Arquivo futuro:** `android/.../modules/NativeRecyclerViewManager.kt`

---

## O que NÃO migrar para Kotlin

- **Animações:** Reanimated 4 + Skia já rodam no UI thread. Não há ganho em migrar.
- **Navegação:** React Navigation é suficiente para o escopo do app.
- **Lógica de negócio simples:** Filtros leves, formatação de texto, cálculos pontuais — JS resolve.
- **Telas inteiras:** Nunca. Custo altíssimo, manutenção dobrada.

---

## Estrutura de pastas para módulos nativos

```
android/app/src/main/java/com/jvpl/flashcardsconcurso/
├── MainActivity.kt
├── MainApplication.kt
└── modules/                          ← todos os módulos nativos aqui
    ├── KeyboardAvoidingContainerViewManager.kt
    ├── DatabaseModule.kt              (futuro)
    ├── SrsAlgorithmModule.kt          (futuro)
    └── NativeRecyclerViewManager.kt   (futuro)

src/native/                           ← wrappers JS para cada módulo
    ├── NativeKeyboardAvoidingContainer.js
    ├── NativeDatabase.js              (futuro)
    └── NativeSrs.js                   (futuro)
```

---

## Como registrar um novo módulo no RN (New Architecture)

1. Criar o `ViewManager` ou `NativeModule` em Kotlin na pasta `modules/`
2. Criar um `ReactPackage` que registra o módulo (ou adicionar ao existente)
3. Registrar o package em `MainApplication.kt` dentro do `getPackages()`
4. Criar o wrapper JS em `src/native/` com `requireNativeComponent` ou `NativeModules`
5. Usar no JS normalmente como qualquer componente/serviço

---

## Contexto da decisão (para referência futura)

- O app tem +12.000 linhas de código em React Native
- Usa New Architecture (Fabric) — módulos nativos devem usar a API nova (`ViewGroupManager`, Codegen)
- Build via `expo run:android` (development build), não Expo Go
- Gorhom Bottom Sheet v5 gerencia os modais — não conflita com módulos nativos pontuais
- A decisão foi: RN como base permanente, Kotlin apenas onde o JS demonstrar limitação real
