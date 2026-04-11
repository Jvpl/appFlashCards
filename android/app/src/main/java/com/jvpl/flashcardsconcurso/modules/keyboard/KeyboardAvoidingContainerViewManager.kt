package com.jvpl.flashcardsconcurso.modules.keyboard

// =============================================================================
// KeyboardAvoidingContainerViewManager
// =============================================================================
//
// POR QUE KOTLIN E NÃO JS:
//   O React Native detecta o teclado via bridge com ~300ms de delay.
//   Este módulo usa globalLayoutListener + ValueAnimator para animar o
//   translationY em sincronia com o teclado, sem passar pela bridge JS.
//
// FABRIC (New Architecture):
//   O modal não usa ReactModalHostView — usa DialogRootViewGroup.
//   O insetsCallback é registrado na rootView do DialogRootViewGroup.
//   O globalLayoutListener serve como fallback principal quando o
//   WindowInsetsAnimationCompat não está disponível.
//
// RESPONSABILIDADE:
//   Animar translationY junto com o teclado e emitir onKeyboardSettle(height)
//   quando o teclado termina de animar.
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
    private var entryAnimator: android.animation.ValueAnimator? = null
    private var kbAnimator: android.animation.ValueAnimator? = null

    // Callback registrado na rootView do dialog (quando disponível).
    // Sincroniza translationY frame-a-frame com a animação do teclado.
    private val insetsCallback = object : WindowInsetsAnimationCompat.Callback(DISPATCH_MODE_STOP) {

        override fun onPrepare(animation: WindowInsetsAnimationCompat) {
            if (animation.typeMask and WindowInsetsCompat.Type.ime() == 0) return
            isAnimating = true
            entryAnimator?.cancel()
            entryAnimator = null
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
            translationY = -getKeyboardHeight(insets).toFloat()
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
        }
    }

    // Escuta topShow para registrar insetsCallback (Paper/Old Architecture).
    // No Fabric o topShow chega mas o modal não é ReactModalHostView —
    // tryRegisterFromCurrentWindow cobre esse caso.
    private val modalListener = object : EventDispatcherListener {
        override fun onEventDispatch(event: Event<*>) {
            if (event.eventName != "topShow") return
            tryRegisterFromCurrentWindow()
        }
    }

    // Fallback principal: detecta mudança de altura do teclado via layout.
    // Anima suavemente com ValueAnimator em vez de teleportar.
    private val globalLayoutListener = ViewTreeObserver.OnGlobalLayoutListener {
        if (isAnimating) return@OnGlobalLayoutListener
        val insets = ViewCompat.getRootWindowInsets(this) ?: return@OnGlobalLayoutListener
        val kbHeight = getKeyboardHeight(insets)
        if (kbHeight == lastKbHeight) return@OnGlobalLayoutListener
        lastKbHeight = kbHeight
        val targetY = -kbHeight.toFloat()
        kbAnimator?.cancel()
        kbAnimator = android.animation.ValueAnimator.ofFloat(translationY, targetY).also { anim ->
            anim.duration = 280
            anim.interpolator = android.view.animation.DecelerateInterpolator(1.5f)
            anim.addUpdateListener { translationY = it.animatedValue as Float }
            anim.start()
        }
        emitSettle(kbHeight)
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

        // Tenta registrar imediatamente e nos próximos frames.
        // onAttachedToWindow pode disparar antes do container estar na hierarquia completa.
        tryRegisterFromCurrentWindow()
        post { tryRegisterFromCurrentWindow() }
        postDelayed({ tryRegisterFromCurrentWindow() }, 50)
        postDelayed({ tryRegisterFromCurrentWindow() }, 150)

        // Animação de entrada nativa — sem JS, sem race condition.
        val screenHeight = resources.displayMetrics.heightPixels
        val startY = (screenHeight / 2).toFloat()
        translationY = startY
        entryAnimator = android.animation.ValueAnimator.ofFloat(startY, 0f).also { anim ->
            anim.duration = 320
            anim.interpolator = android.view.animation.DecelerateInterpolator(1.5f)
            anim.addUpdateListener { translationY = it.animatedValue as Float }
            anim.start()
        }
    }

    // No Fabric (New Architecture) o modal usa DialogRootViewGroup em vez de ReactModalHostView.
    // Sobe na hierarquia procurando DialogRootViewGroup e registra o insetsCallback na rootView.
    // Tenta também obter a Window via reflection para configurar softInputMode corretamente.
    private fun tryRegisterFromCurrentWindow() {
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.R) return
        if (dialogRootViewRef?.isAttachedToWindow == true) return
        dialogRootViewRef = null

        var parent = this.parent
        while (parent != null) {
            val parentView = parent as? android.view.View ?: break
            if (parentView::class.simpleName == "DialogRootViewGroup") {
                val rootView = parentView.rootView as? ViewGroup ?: return

                val window: android.view.Window? = try {
                    val f = parentView::class.java.getDeclaredField("mDialog")
                    f.isAccessible = true
                    (f.get(parentView) as? android.app.Dialog)?.window
                } catch (e1: Exception) {
                    try {
                        val f = parentView::class.java.getDeclaredField("mContext")
                        f.isAccessible = true
                        (f.get(parentView) as? android.app.Dialog)?.window
                    } catch (e2: Exception) { null }
                }

                if (window != null) {
                    WindowCompat.setDecorFitsSystemWindows(window, false)
                    window.setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING)
                    window.decorView.rootView.let { dv ->
                        (dv as? ViewGroup)?.let { decorGroup ->
                            ViewCompat.setWindowInsetsAnimationCallback(decorGroup, insetsCallback)
                            dialogRootViewRef = decorGroup
                        }
                    }
                    Log.d("KbContainer", "tryRegister — Window+insetsCallback via DialogRootViewGroup")
                } else {
                    ViewCompat.setWindowInsetsAnimationCallback(rootView, insetsCallback)
                    dialogRootViewRef = rootView
                    Log.d("KbContainer", "tryRegister — insetsCallback via DialogRootViewGroup (sem Window)")
                }
                return
            }
            parent = parentView.parent
        }
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
        entryAnimator?.cancel()
        kbAnimator?.cancel()
        lastKbHeight = 0
    }
}
