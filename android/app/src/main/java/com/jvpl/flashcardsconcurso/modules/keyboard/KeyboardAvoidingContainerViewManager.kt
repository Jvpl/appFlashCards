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
    private var entryAnimator: android.animation.ValueAnimator? = null

    // Callback registrado na decorView do Dialog.
    // Emite onKeyboardSettle no onEnd com a altura final do teclado.
    private val insetsCallback = object : WindowInsetsAnimationCompat.Callback(DISPATCH_MODE_STOP) {

        override fun onPrepare(animation: WindowInsetsAnimationCompat) {
            if (animation.typeMask and WindowInsetsCompat.Type.ime() == 0) return
            isAnimating = true
            // Cancela animação de entrada se o teclado abrir antes dela terminar
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

    // Escuta topShow do Modal para registrar o insetsCallback na decorView do Dialog.
    // Filtra pelo modal que realmente contém este container como filho — evita reagir
    // a topShow de outros modais abertos no app.
    private val modalListener = object : EventDispatcherListener {
        override fun onEventDispatch(event: Event<*>) {
            if (event.eventName != "topShow") return
            Log.d("KbContainer", "topShow recebido — verificando se é nosso modal")
            val reactContext = context as? ThemedReactContext ?: return
            val uiManager =
                UIManagerHelper.getUIManager(reactContext, com.facebook.react.uimanager.common.UIManagerType.FABRIC)
                    ?: UIManagerHelper.getUIManager(reactContext, com.facebook.react.uimanager.common.UIManagerType.DEFAULT)
                    ?: return
            val modal = try { uiManager.resolveView(event.viewTag) as? ReactModalHostView } catch (e: Exception) { null } ?: return

            // Garante que este container pertence ao modal que disparou o topShow.
            // Sobe na hierarquia de parents e verifica se algum é o modal resolvido.
            var parent = this@KeyboardAvoidingContainerView.parent
            var isOurModal = false
            while (parent != null) {
                if (parent === modal) { isOurModal = true; break }
                parent = (parent as? android.view.View)?.parent
            }
            if (!isOurModal) {
                Log.d("KbContainer", "topShow ignorado — modal não é pai deste container")
                return
            }

            val window = modal.dialog?.window ?: return
            val rootView = window.decorView.rootView as? ViewGroup ?: return

            WindowCompat.setDecorFitsSystemWindows(window, false)
            window.setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING)

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                ViewCompat.setWindowInsetsAnimationCallback(rootView, insetsCallback)
                dialogRootViewRef = rootView
                Log.d("KbContainer", "topShow — insetsCallback registrado no modal correto")
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

    // Fallback principal: globalLayoutListener detecta mudança de altura do teclado.
    // Usado quando o WindowInsetsAnimationCompat não está disponível ou não foi registrado
    // (ex: Fabric com hierarquia diferente de ReactModalHostView).
    // Anima suavemente em vez de teleportar.
    private var kbAnimator: android.animation.ValueAnimator? = null
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
        Log.d("KbContainer", "globalLayout fallback kbHeight=$kbHeight animando para targetY=$targetY")
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
        Log.d("KbContainer", "onAttachedToWindow context=${context::class.simpleName}")
        val reactContext = context as? ThemedReactContext ?: return
        val eventDispatcher =
            UIManagerHelper.getEventDispatcher(reactContext, com.facebook.react.uimanager.common.UIManagerType.FABRIC)
                ?: UIManagerHelper.getEventDispatcher(reactContext, com.facebook.react.uimanager.common.UIManagerType.DEFAULT)
        eventDispatcher?.addListener(modalListener)
        viewTreeObserver.addOnGlobalLayoutListener(globalLayoutListener)

        // Tenta registrar no frame atual e nos próximos frames.
        // O topShow nem sempre dispara (React Native reutiliza o dialog em re-renders).
        // Tentamos múltiplos frames porque onAttachedToWindow pode disparar antes de
        // o container estar completamente inserido na hierarquia do modal.
        tryRegisterFromCurrentWindow()
        post { tryRegisterFromCurrentWindow() }
        postDelayed({ tryRegisterFromCurrentWindow() }, 50)
        postDelayed({ tryRegisterFromCurrentWindow() }, 150)

        // Animação de entrada — onAttachedToWindow é determinístico: o container acabou
        // de ser criado com translationY=0 e ainda não foi desenhado nenhum frame.
        // resources.displayMetrics.heightPixels está sempre disponível, sem depender de layout.
        val screenHeight = resources.displayMetrics.heightPixels
        val startY = (screenHeight / 2).toFloat()
        translationY = startY
        entryAnimator = android.animation.ValueAnimator.ofFloat(startY, 0f).also { anim ->
            anim.duration = 320
            anim.interpolator = android.view.animation.DecelerateInterpolator(1.5f)
            anim.addUpdateListener { translationY = it.animatedValue as Float }
            anim.start()
        }
        Log.d("KbContainer", "onAttachedToWindow — entrada nativa startY=$startY")
    }

    private fun tryRegisterFromCurrentWindow() {
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.R) return
        if (dialogRootViewRef?.isAttachedToWindow == true) return
        dialogRootViewRef = null

        // Loga toda a hierarquia de parents para diagnóstico
        val hierarchy = StringBuilder()
        var p = this.parent
        while (p != null) {
            hierarchy.append(p::class.simpleName).append(" → ")
            p = (p as? android.view.View)?.parent
        }
        Log.d("KbContainer", "tryRegister hierarquia: $hierarchy")

        // No Fabric (New Architecture) o modal usa DialogRootViewGroup em vez de ReactModalHostView.
        // A DecorView já está no rootView da hierarquia — registramos o insetsCallback nela.
        var parent = this.parent
        while (parent != null) {
            val parentView = parent as? android.view.View ?: break
            if (parentView::class.simpleName == "DialogRootViewGroup") {
                val rootView = parentView.rootView as? ViewGroup ?: run {
                    Log.d("KbContainer", "tryRegister — DialogRootViewGroup encontrado mas rootView inválido")
                    return
                }
                ViewCompat.setWindowInsetsAnimationCallback(rootView, insetsCallback)
                dialogRootViewRef = rootView

                // Configura softInputMode via WindowInsetsControllerCompat
                ViewCompat.getWindowInsetsController(parentView)?.let {
                    it.systemBarsBehavior = androidx.core.view.WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                }

                Log.d("KbContainer", "tryRegister — insetsCallback registrado via DialogRootViewGroup")
                return
            }
            parent = parentView.parent
        }
        Log.d("KbContainer", "tryRegister — DialogRootViewGroup não encontrado")
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
        Log.d("KbContainer", "onDetachedFromWindow")
    }
}
