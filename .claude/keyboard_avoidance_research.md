# Keyboard Avoidance em Modal — Pesquisa (2026-04-09)

## Fontes verificadas
- `kirillzyusko/react-native-keyboard-controller` (RNKC) — código fonte real, tag main
- Arquivos lidos: `ModalAttachedWatcher.kt`, `EdgeToEdgeReactViewGroup.kt`, `KeyboardAnimationCallback.kt`, `ClippingScrollViewDecoratorView.kt`, `ReactContext.kt`, `ScrollViewWithBottomPadding/index.tsx`, `KeyboardAwareScrollView/index.tsx`

---

## 1. Onde aplicar paddingBottom para que o ScrollView consiga scrollar

**Resposta verificada:** Não se aplica `paddingBottom` no container pai (FrameLayout). Isso não expande o conteúdo scrollável.

O RNKC aplica `paddingBottom` **no próprio ScrollView** com `clipToPadding = false`.

```kotlin
// ClippingScrollViewDecoratorView.kt
scrollView.clipToPadding = false
scrollView.setPadding(
    scrollView.paddingLeft,
    scrollView.paddingTop,
    scrollView.paddingRight,
    (insetBottom + insetTop).toFloat().px.toInt(), // valor acumulado
)
```

Por quê funciona: o `ScrollView` do Android quando tem `clipToPadding = false` aumenta o range scrollável pelo valor do padding, sem clipar o conteúdo. O React Native expõe isso via `contentInsetBottom` (prop Android) ou `contentInset.bottom` (iOS).

**Alternativa nativa pura:** Se não usar RNKC, encontrar o `ScrollView` filho e chamar isso diretamente no callback de animação (onProgress).

---

## 2. Como o RNKC resolve dentro de Modals — arquitetura completa

### Passo a passo verificado:

**a) `EdgeToEdgeReactViewGroup` cria um `ModalAttachedWatcher`**
```kotlin
private val modalAttachedWatcher = ModalAttachedWatcher(this, reactContext, config, ::getKeyboardCallback)
```

**b) `ModalAttachedWatcher` escuta eventos via `EventDispatcherListener`**
- Ouve o evento `"topShow"` (Modal show)
- Resolve o `ReactModalHostView` via `uiManager.resolveView(event.viewTag)`

**c) Obtém a Window do Dialog:**
```kotlin
val dialog = modal.dialog
val window = dialog?.window
val rootView = window?.decorView?.rootView as ViewGroup?
```

**d) Cria um `eventView` fantasma (0x0) e registra o callback na rootView:**
```kotlin
val eventView = ReactViewGroup(reactContext).apply {
    layoutParams = ViewGroup.LayoutParams(0, 0)
}
rootView.addView(eventView)

// O callback é registrado na rootView do Dialog (não em view filha)
ViewCompat.setWindowInsetsAnimationCallback(rootView, callback)
ViewCompat.setOnApplyWindowInsetsListener(eventView, callback)
```

**e) Configura a Window do Dialog:**
```kotlin
window?.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING)
// setDecorFitsSystemWindows(false) é feito no EdgeToEdgeReactViewGroup via WindowCompat
```

**f) Suspende o callback da Window principal para evitar conflito:**
```kotlin
if (areEventsComingFromOwnWindow) {
    this.callback()?.suspend(true)  // pausa o callback da activity principal
    ViewCompat.setWindowInsetsAnimationCallback(rootView, callback)
    ...
}
// areEventsComingFromOwnWindow = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R (Android 12+)
```

**g) No dismiss do Dialog, limpa tudo:**
```kotlin
dialog?.setOnDismissListener {
    callback.syncKeyboardPosition()
    callback.destroy()
    eventView.removeSelf()
    this.callback()?.suspend(false) // reativa callback da activity
}
```

### Android < 12 (IS_ANIMATION_EMULATED = true):
```kotlin
val IS_ANIMATION_EMULATED = Build.VERSION.SDK_INT < Build.VERSION_CODES.R
val areEventsComingFromOwnWindow = !Keyboard.IS_ANIMATION_EMULATED
```
- Em Android < 12, o callback do Dialog **não funciona** — eventos continuam chegando pela Window principal da Activity
- Por isso o RNKC NÃO registra o callback no Dialog nesses casos
- O callback principal da Activity captura os eventos mesmo quando o Modal está aberto

---

## 3. Como obter ReactModalHostView e dialog.window a partir de view filha

**Método do RNKC:** Não usa referência direta de view filha → Modal. Usa `EventDispatcherListener`.

```kotlin
class ModalAttachedWatcher(...) : EventDispatcherListener {
    override fun onEventDispatch(event: Event<*>) {
        if (event.eventName != "topShow") return
        val modal = uiManager?.resolveView(event.viewTag) as? ReactModalHostView
        val dialog = modal.dialog
        val window = dialog?.window
        val rootView = window?.decorView?.rootView as ViewGroup?
    }
}

// Registro:
fun enable() { eventDispatcher?.addListener(this) }
fun disable() { eventDispatcher?.removeListener(this) }
```

**Dependências:**
- `reactContext.uiManager` → `UIManagerHelper.getUIManager(this, archType)` (suporta Fabric)
- `reactContext.eventDispatcher` → `UIManagerHelper.getEventDispatcher(this, archType)`

---

## 4. Registrar WindowInsetsAnimationCallback que funcione dentro e fora de Modal

**Não existe uma forma única.** O RNKC usa dois callbacks separados:

1. **Fora do Modal:** callback registrado em view filha dentro da Activity window
2. **Dentro do Modal (Android 12+):** callback registrado na `decorView.rootView` do Dialog, com o callback principal suspenso

Para Android < 12: só o callback da Activity window funciona, mesmo com Modal aberto.

---

## 5. Como o JS faz keyboard avoidance via eventos nativos

O `KeyboardAnimationCallback.kt` só emite eventos (não mexe em layout). O JS recebe:
- `keyboardWillShow/Hide` → onStart
- `KeyboardTransitionEvent` com `height` e `progress` (0.0–1.0) → onProgress (frame a frame)
- `keyboardDidShow/Hide` → onEnd

O `KeyboardAwareScrollView` JS:
1. Anima `contentInsetBottom` do ScrollView = `currentKeyboardFrameHeight.value`
2. Chama `scrollTo()` de reanimated para o input focado usando `layout.value.absoluteY` (vindo do `FocusedInputObserver.kt` via `input.screenLocation`)

---

## O que já foi tentado (nosso projeto)

| Técnica | Resultado |
|---|---|
| `setPadding(bottom = kbHeight)` no FrameLayout pai | Falhou — ScrollView filho não expande scroll range |
| `scrollTo(0, Int.MAX_VALUE)` | Falhou — vai para o fim, não para o input |
| `requestChildFocus` | Funciona mas depende do callback registrado |
| `WindowInsetsAnimationCompat.Callback` em view filha | Falhou — precisa ser na decorView.rootView do Dialog |

## Status atual (2026-04-10)

### O que foi implementado e funciona:
- `EventDispatcherListener` escutando `topShow` → obtém `dialog.window.decorView.rootView` ✅
- Callback registrado na rootView do Dialog (Android 12+) → `onPrepare/onStart/onEnd` disparam ✅
- `applyScrollViewPadding` com `clipToPadding=false` no ScrollView filho ✅
- Fallback via `onApplyWindowInsetsListener` para Android < 12 ✅

### Bugs confirmados pelo log (2026-04-10):

**Bug 1 — `delta=0` no onStart (translationY nunca aplicado):**
- Causa: `currentKbHeight` lido de `ViewCompat.getRootWindowInsets(this)` — insets já atualizaram para estado final no momento do `onStart`
- Fix: usar `bounds.lowerBound.bottom - navBottom` como altura inicial (antes da animação)

**Bug 2 — Padding não some ao fechar teclado:**
- Causa provável: `applyScrollViewPadding(0)` no `onEnd` não acha o ScrollView (`findScrollView()` retorna null)
- Fix em andamento: log adicionado para confirmar; scroll automático usa `post { scrollToFocused() }` para aguardar layout

### O que ainda falta confirmar:
- Se `findScrollView()` retorna null no `onEnd` (log pendente)
- Se `bounds.lowerBound` resolve o `delta=0` (build pendente)
