package com.jvpl.flashcardsconcurso.modules.keyboard

// =============================================================================
// KeyboardAvoidingContainerViewManager
// =============================================================================
//
// POR QUE KOTLIN E NÃO JS:
//   O React Native notifica o JS sobre o teclado via bridge, o que introduz um
//   delay de ~300ms. O resultado visível: o conteúdo (input + botão) sobe DEPOIS
//   do teclado, não junto com ele — causando um "salto" perceptível na UI.
//
//   Este módulo usa WindowInsetsAnimationCompat do Android, que é chamado no
//   frame ZERO da animação do teclado — antes de qualquer comunicação com o JS.
//   O container ajusta seu padding em sincronia exata com a animação do sistema.
//
// ONDE É USADO NO JS:
//   import { NativeKeyboardAvoidingContainer } from '../native';
//   Substitui qualquer KeyboardAvoidingView ou padding manual em telas com input.
//
// CASOS DE USO ATUAIS:
//   - CategoryDetailScreen.js (modal de editar categoria, dentro de BottomSheetModal)
//
// CUIDADO IMPORTANTE:
//   NÃO forçar windowSoftInputMode dentro deste módulo.
//   O Gorhom Bottom Sheet já gerencia o posicionamento do sheet.
//   Este container apenas RESPONDE ao inset — não o força.
//
// =============================================================================

import android.content.Context
import android.util.AttributeSet
import android.view.ViewTreeObserver
import android.widget.FrameLayout
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsAnimationCompat
import androidx.core.view.WindowInsetsCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.events.RCTEventEmitter

class KeyboardAvoidingContainerViewManager : ViewGroupManager<KeyboardAvoidingContainerView>() {

    override fun getName(): String = "KeyboardAvoidingContainer"

    override fun createViewInstance(context: ThemedReactContext): KeyboardAvoidingContainerView {
        return KeyboardAvoidingContainerView(context)
    }

    // Declara o evento onKeyboardSettle para o JS poder ouvir via prop
    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
        return mapOf(
            "onKeyboardSettle" to mapOf("registrationName" to "onKeyboardSettle")
        )
    }
}

// -----------------------------------------------------------------------------
// View que escuta a animação do teclado e aplica translationY negativo em si
// mesma — sobe junto com o teclado frame a frame, sem passar pelo bridge JS.
//
// POR QUE translationY E NÃO paddingBottom:
//   paddingBottom dentro do Gorhom BottomSheet não empurra o conteúdo visível
//   porque o scroll interno do Gorhom já ocupa o espaço disponível.
//   translationY move a view inteira no layer de composição do Android — é
//   exatamente o que o sistema faz internamente para animar qualquer View.
//   Não aciona relayout, não conflita com o Gorhom.
//
// POR QUE DISPATCH_MODE_STOP:
//   Impede que os insets se propaguem para as views filhas — este container
//   já consome o inset e ajusta a própria posição.
// -----------------------------------------------------------------------------
class KeyboardAvoidingContainerView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : FrameLayout(context, attrs) {

    init {
        // Container transparente para toques — não intercepta nem consome eventos.
        // Sem isso, o FrameLayout rouba foco e cliques não chegam nos filhos JS.
        isClickable = false
        isFocusable = false
        isLongClickable = false
    }

    private var lastEmittedHeight = -1

    // GlobalLayoutListener captura mudanças de altura do teclado que não geram
    // WindowInsetsAnimation — como o menu do teclado expandindo/recolhendo.
    private val globalLayoutListener = ViewTreeObserver.OnGlobalLayoutListener {
        val rootInsets = ViewCompat.getRootWindowInsets(this) ?: return@OnGlobalLayoutListener
        val imeBottom = rootInsets.getInsets(WindowInsetsCompat.Type.ime()).bottom
        val navBottom = rootInsets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom
        val kbHeight = (imeBottom - navBottom).coerceAtLeast(0)
        if (kbHeight != lastEmittedHeight) {
            lastEmittedHeight = kbHeight
            applyKeyboardTranslation(rootInsets)
            emitKeyboardSettle(kbHeight)
        }
    }

    private val insetsCallback = object : WindowInsetsAnimationCompat.Callback(DISPATCH_MODE_STOP) {
        override fun onProgress(
            insets: WindowInsetsCompat,
            runningAnimations: List<WindowInsetsAnimationCompat>
        ): WindowInsetsCompat {
            applyKeyboardTranslation(insets)
            return insets
        }

        override fun onEnd(animation: WindowInsetsAnimationCompat) {
            val rootInsets = ViewCompat.getRootWindowInsets(this@KeyboardAvoidingContainerView)
                ?: return
            applyKeyboardTranslation(rootInsets)
            val imeBottom = rootInsets.getInsets(WindowInsetsCompat.Type.ime()).bottom
            val navBottom = rootInsets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom
            val kbHeight = (imeBottom - navBottom).coerceAtLeast(0)
            // Emite sempre que a altura final muda (inclui menu do teclado expandindo/recolhendo)
            if (kbHeight != lastEmittedHeight) {
                lastEmittedHeight = kbHeight
                emitKeyboardSettle(kbHeight)
            }
        }
    }

    private fun emitKeyboardSettle(heightPx: Int) {
        val reactContext = context as? ThemedReactContext ?: return
        val density = resources.displayMetrics.density
        val event = Arguments.createMap().apply {
            putDouble("height", heightPx / density.toDouble())
        }
        reactContext.getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(id, "onKeyboardSettle", event)
    }

    private fun applyKeyboardTranslation(insets: WindowInsetsCompat) {
        val imeBottom = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
        val navBottom = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom
        val kbHeight = (imeBottom - navBottom).coerceAtLeast(0)
        // translationY: animação fluida frame a frame sem passar pelo bridge JS.
        translationY = -kbHeight.toFloat()
        // topPadding compensa o espaço perdido pelo translationY negativo:
        // a view subiu kbHeight pixels, então adicionamos kbHeight de paddingTop
        // para que o scrollable interno enxergue mais conteúdo no topo.
        setPadding(paddingLeft, kbHeight, paddingRight, paddingBottom)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()

        // OnApplyWindowInsetsListener: disparado a cada pixel de mudança de inset,
        // incluindo menu do teclado expandindo/recolhendo — não só abertura/fechamento.
        ViewCompat.setOnApplyWindowInsetsListener(this) { _, insets ->
            val imeBottom = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
            val navBottom = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom
            val kbHeight = (imeBottom - navBottom).coerceAtLeast(0)
            translationY = -kbHeight.toFloat()
            setPadding(paddingLeft, kbHeight, paddingRight, paddingBottom)
            if (kbHeight != lastEmittedHeight) {
                lastEmittedHeight = kbHeight
                emitKeyboardSettle(kbHeight)
            }
            insets
        }

        // WindowInsetsAnimationCallback: suaviza a animação frame a frame
        ViewCompat.setWindowInsetsAnimationCallback(this, insetsCallback)
        viewTreeObserver.addOnGlobalLayoutListener(globalLayoutListener)

        // Aplica imediatamente caso o teclado já esteja visível quando o modal abre
        ViewCompat.getRootWindowInsets(this)?.let { applyKeyboardTranslation(it) }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        ViewCompat.setWindowInsetsAnimationCallback(this, null)
        viewTreeObserver.removeOnGlobalLayoutListener(globalLayoutListener)
        translationY = 0f
        setPadding(paddingLeft, 0, paddingRight, 0)
        lastEmittedHeight = -1
    }
}
