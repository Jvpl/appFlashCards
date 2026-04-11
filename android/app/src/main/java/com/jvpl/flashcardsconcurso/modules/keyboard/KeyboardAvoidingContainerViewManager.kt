package com.jvpl.flashcardsconcurso.modules.keyboard

// =============================================================================
// KeyboardAvoidingContainerViewManager
// =============================================================================
//
// POR QUE KOTLIN E NÃO JS:
//   O React Native detecta o teclado via bridge com ~300ms de delay.
//   WindowInsetsAnimationCompat é chamado frame-a-frame pela própria Window
//   do Android, antes de qualquer comunicação com JS.
//
// RESPONSABILIDADE DESTE MÓDULO:
//   Apenas detectar a altura do teclado e emitir onKeyboardSettle(height).
//   Todo o comportamento visual (scroll, padding, translationY) é responsabilidade
//   do JS no BottomSheet.
// =============================================================================

import android.content.Context
import android.util.AttributeSet
import android.util.Log
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.widget.FrameLayout
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsAnimationCompat
import androidx.core.view.WindowInsetsCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.EventDispatcherListener
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.facebook.react.views.modal.ReactModalHostView

class KeyboardAvoidingContainerViewManager : ViewGroupManager<KeyboardAvoidingContainerView>() {
    override fun getName(): String = "KeyboardAvoidingContainer"
    override fun createViewInstance(context: ThemedReactContext) = KeyboardAvoidingContainerView(context)
    override fun getExportedCustomDirectEventTypeConstants() = mapOf(
        "onKeyboardSettle" to mapOf("registrationName" to "onKeyboardSettle")
    )
}

class KeyboardAvoidingContainerView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : FrameLayout(context, attrs) {

    private var lastKbHeight = 0
    private var isAnimating = false
    private var dialogRootViewRef: ViewGroup? = null

    // Callback registrado na decorView do Dialog.
    // Emite onKeyboardSettle no onEnd com a altura final do teclado.
    private val insetsCallback = object : WindowInsetsAnimationCompat.Callback(DISPATCH_MODE_STOP) {

        override fun onPrepare(animation: WindowInsetsAnimationCompat) {
            if (animation.typeMask and WindowInsetsCompat.Type.ime() == 0) return
            isAnimating = true
        }

        override fun onStart(
            animation: WindowInsetsAnimationCompat,
            bounds: WindowInsetsAnimationCompat.BoundsCompat
        ) = bounds

        override fun onProgress(
            insets: WindowInsetsCompat,
            runningAnimations: List<WindowInsetsAnimationCompat>
        ): WindowInsetsCompat {
            if (runningAnimations.none { it.typeMask and WindowInsetsCompat.Type.ime() != 0 }) return insets
            val kbHeight = getKeyboardHeight(insets)
            // Empurra o conteúdo interno para cima frame a frame junto com o teclado
            translationY = -kbHeight.toFloat()
            return insets
        }

        override fun onEnd(animation: WindowInsetsAnimationCompat) {
            if (animation.typeMask and WindowInsetsCompat.Type.ime() == 0) return
            isAnimating = false
            val insets = ViewCompat.getRootWindowInsets(this@KeyboardAvoidingContainerView) ?: return
            val kbHeight = getKeyboardHeight(insets)
            translationY = -kbHeight.toFloat()
            if (kbHeight != lastKbHeight) {
                lastKbHeight = kbHeight
                emitSettle(kbHeight)
            }
            Log.d("KbContainer", "onEnd kbHeight=$kbHeight")
        }
    }

    // Escuta topShow do Modal para registrar o callback na decorView do Dialog.
    private val modalListener = object : EventDispatcherListener {
        override fun onEventDispatch(event: Event<*>) {
            if (event.eventName != "topShow") return
            val reactContext = context as? ThemedReactContext ?: return
            val uiManager =
                UIManagerHelper.getUIManager(reactContext, com.facebook.react.uimanager.common.UIManagerType.FABRIC)
                    ?: UIManagerHelper.getUIManager(reactContext, com.facebook.react.uimanager.common.UIManagerType.DEFAULT)
                    ?: return
            val modal = try { uiManager.resolveView(event.viewTag) as? ReactModalHostView } catch (e: Exception) { null } ?: return
            val window = modal.dialog?.window ?: return
            val rootView = window.decorView.rootView as? ViewGroup ?: return

            WindowCompat.setDecorFitsSystemWindows(window, false)
            window.setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING)

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                ViewCompat.setWindowInsetsAnimationCallback(rootView, insetsCallback)
                dialogRootViewRef = rootView
                Log.d("KbContainer", "topShow — callback registrado na decorView do Dialog")
            }

            modal.dialog?.setOnDismissListener {
                dialogRootViewRef?.let { ViewCompat.setWindowInsetsAnimationCallback(it, null) }
                dialogRootViewRef = null
                translationY = 0f
                if (lastKbHeight != 0) {
                    lastKbHeight = 0
                    emitSettle(0)
                }
            }
        }
    }

    // Fallback para Android < 12: globalLayoutListener detecta mudança de altura.
    private val globalLayoutListener = ViewTreeObserver.OnGlobalLayoutListener {
        if (isAnimating) return@OnGlobalLayoutListener
        val insets = ViewCompat.getRootWindowInsets(this) ?: return@OnGlobalLayoutListener
        val kbHeight = getKeyboardHeight(insets)
        if (kbHeight == lastKbHeight) return@OnGlobalLayoutListener
        lastKbHeight = kbHeight
        translationY = -kbHeight.toFloat()
        emitSettle(kbHeight)
        Log.d("KbContainer", "globalLayout fallback kbHeight=$kbHeight")
    }

    private fun getKeyboardHeight(insets: WindowInsetsCompat): Int {
        val ime = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
        val nav = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom
        return (ime - nav).coerceAtLeast(0)
    }

    private fun emitSettle(heightPx: Int) {
        val reactContext = context as? ThemedReactContext ?: return
        val density = resources.displayMetrics.density
        val event = Arguments.createMap().apply { putDouble("height", heightPx / density.toDouble()) }
        reactContext.getJSModule(RCTEventEmitter::class.java).receiveEvent(id, "onKeyboardSettle", event)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        val reactContext = context as? ThemedReactContext ?: return
        val eventDispatcher =
            UIManagerHelper.getEventDispatcher(reactContext, com.facebook.react.uimanager.common.UIManagerType.FABRIC)
                ?: UIManagerHelper.getEventDispatcher(reactContext, com.facebook.react.uimanager.common.UIManagerType.DEFAULT)
        eventDispatcher?.addListener(modalListener)
        viewTreeObserver.addOnGlobalLayoutListener(globalLayoutListener)
        Log.d("KbContainer", "onAttachedToWindow")
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        val reactContext = context as? ThemedReactContext ?: return
        val eventDispatcher =
            UIManagerHelper.getEventDispatcher(reactContext, com.facebook.react.uimanager.common.UIManagerType.FABRIC)
                ?: UIManagerHelper.getEventDispatcher(reactContext, com.facebook.react.uimanager.common.UIManagerType.DEFAULT)
        eventDispatcher?.removeListener(modalListener)
        dialogRootViewRef?.let { ViewCompat.setWindowInsetsAnimationCallback(it, null) }
        dialogRootViewRef = null
        viewTreeObserver.removeOnGlobalLayoutListener(globalLayoutListener)
        lastKbHeight = 0
        Log.d("KbContainer", "onDetachedFromWindow")
    }
}
