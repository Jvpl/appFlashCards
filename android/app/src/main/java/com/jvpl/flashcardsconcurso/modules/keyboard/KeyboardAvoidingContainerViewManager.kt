package com.jvpl.flashcardsconcurso.modules.keyboard

// =============================================================================
// KeyboardAvoidingContainerViewManager
// =============================================================================
//
// POR QUE KOTLIN E NÃO JS:
//   O React Native (Fabric) detecta eventos de teclado via JS bridge com delay.
//   Este módulo usa WindowInsetsAnimationCompat para detectar a altura do teclado
//   com precisão nativa e emite onKeyboardSettle(height) ao JS sem delay.
//
// RESPONSABILIDADE:
//   Detectar abertura/fechamento do teclado e emitir onKeyboardSettle(height).
//   O movimento do sheet (translateY) é feito pelo JS via Animated.Value —
//   NÃO usamos translationY nativo aqui. Motivo: o Fabric (New Architecture)
//   faz hit-testing com base nos bounds de layout JS. Se movermos a view com
//   translationY nativo, os bounds JS ficam desatualizados e toques na posição
//   visual dos filhos são rejeitados pelo Fabric antes de chegar ao dispatchTouchEvent.
// =============================================================================

import android.content.Context
import android.util.AttributeSet
import android.util.Log
import android.view.MotionEvent
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
    private var kbAnimator: android.animation.ValueAnimator? = null

    // Sem translationY nativo — o Reanimated.View do sheet anima via JSI.
    // checkInputConnectionProxy=true: diz ao Android que este ViewGroup "gerencia" o input,
    // impedindo que toques nele causem o fechamento automático do teclado pelo sistema.
    // Isso mantém child.matrix sincronizado com o shadow tree.
    // TouchTargetHelper usa child.matrix.invert() para hit-test → sempre correto.

    override fun checkInputConnectionProxy(focused: android.view.View?): Boolean = true

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
            val kbH = getKeyboardHeight(insets)
            emitSettle(kbH)
            return insets
        }

        override fun onEnd(animation: WindowInsetsAnimationCompat) {
            if (animation.typeMask and WindowInsetsCompat.Type.ime() == 0) return
            isAnimating = false
            val insets = ViewCompat.getRootWindowInsets(this@KeyboardAvoidingContainerView) ?: return
            val kbHeight = getKeyboardHeight(insets)
            Log.d("KbContainer", "insetsCallback.onEnd — kbHeight=$kbHeight")
            lastKbHeight = kbHeight
            emitSettle(kbHeight)
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

    // Fallback: emite onKeyboardSettle quando insetsCallback não dispara.
    private val globalLayoutListener = ViewTreeObserver.OnGlobalLayoutListener {
        if (isAnimating) return@OnGlobalLayoutListener
        val insets = ViewCompat.getRootWindowInsets(this) ?: return@OnGlobalLayoutListener
        val kbHeight = getKeyboardHeight(insets)
        if (kbHeight == lastKbHeight) return@OnGlobalLayoutListener
        Log.d("KbContainer", "globalLayout — kbHeight=$kbHeight lastKbHeight=$lastKbHeight")
        lastKbHeight = kbHeight
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

                val window: android.view.Window? = findWindowFromView(parentView)

                if (window != null) {
                    WindowCompat.setDecorFitsSystemWindows(window, false)
                    window.setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING)
                    val decorRoot = window.decorView.rootView as? ViewGroup ?: rootView
                    ViewCompat.setWindowInsetsAnimationCallback(decorRoot, insetsCallback)
                    dialogRootViewRef = decorRoot
                    Log.d("KbContainer", "tryRegister — Window+insetsCallback via DialogRootViewGroup")
                } else {
                    // Sem Window: configura adjustNothing via WindowManager.LayoutParams diretamente
                    val wm = context.getSystemService(Context.WINDOW_SERVICE) as? android.view.WindowManager
                    val token = rootView.windowToken
                    if (token != null && wm != null) {
                        try {
                            val lp = rootView.layoutParams as? android.view.WindowManager.LayoutParams
                            if (lp != null) {
                                lp.softInputMode = android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING
                                wm.updateViewLayout(rootView, lp)
                                Log.d("KbContainer", "tryRegister — adjustNothing via WindowManager.updateViewLayout")
                            }
                        } catch (e: Exception) {
                            Log.d("KbContainer", "tryRegister — updateViewLayout falhou: ${e.message}")
                        }
                    }
                    ViewCompat.setWindowInsetsAnimationCallback(rootView, insetsCallback)
                    dialogRootViewRef = rootView
                    Log.d("KbContainer", "tryRegister — insetsCallback via DialogRootViewGroup (sem Window)")
                }
                return
            }
            parent = parentView.parent
        }
    }

    // Tenta obter a Window do DialogRootViewGroup por múltiplos caminhos de reflection.
    // O React Native não expõe a Window diretamente — precisamos inspecionar os campos internos.
    private fun findWindowFromView(view: android.view.View): android.view.Window? {
        // Tentativa 1: campo mDialog (Paper/Old Architecture)
        try {
            val f = view::class.java.getDeclaredField("mDialog")
            f.isAccessible = true
            val w = (f.get(view) as? android.app.Dialog)?.window
            if (w != null) { Log.d("KbContainer", "findWindow — via mDialog"); return w }
        } catch (_: Exception) {}

        // Tentativa 2: campo mContext como Dialog (variação)
        try {
            val f = view::class.java.getDeclaredField("mContext")
            f.isAccessible = true
            val w = (f.get(view) as? android.app.Dialog)?.window
            if (w != null) { Log.d("KbContainer", "findWindow — via mContext Dialog"); return w }
        } catch (_: Exception) {}

        // Tentativa 3: busca em superclasses
        var clazz: Class<*>? = view::class.java.superclass
        while (clazz != null) {
            for (fieldName in listOf("mDialog", "mWindow", "mDecorView")) {
                try {
                    val f = clazz.getDeclaredField(fieldName)
                    f.isAccessible = true
                    val obj = f.get(view)
                    val w = when (obj) {
                        is android.view.Window -> obj
                        is android.app.Dialog -> obj.window
                        else -> null
                    }
                    if (w != null) { Log.d("KbContainer", "findWindow — via superclass $fieldName"); return w }
                } catch (_: Exception) {}
            }
            clazz = clazz.superclass
        }

        // Tentativa 4: windowToken → WindowManager para obter LayoutParams e configurar softInputMode
        // Não retorna Window mas sinaliza que devemos usar updateViewLayout
        Log.d("KbContainer", "findWindow — nenhuma Window encontrada")
        return null
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
        kbAnimator?.cancel()
        lastKbHeight = 0
    }
}
