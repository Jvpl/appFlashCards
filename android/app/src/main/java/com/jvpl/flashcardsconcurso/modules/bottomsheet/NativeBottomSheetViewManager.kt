package com.jvpl.flashcardsconcurso.modules.bottomsheet

// =============================================================================
// NativeBottomSheetViewManager
// =============================================================================
//
// POR QUE KOTLIN E NÃO JS (Gorhom BottomSheet):
//   O Gorhom BottomSheet resolve conflito scroll vs swipe em JS via RNGH +
//   Reanimated. Na New Architecture (Fabric), esse sistema JS compete com o
//   dispatcher de gestos nativo do Android, causando:
//     - Scroll travado quando o teclado está ativo (hitbox não move com translationY)
//     - Impossível scrollar tocando sobre o TextInput
//     - Botões dentro do sheet não respondem com teclado ativo
//
//   Este módulo usa:
//     - android.app.Dialog com Window própria → overlay real sobre TUDO na tela,
//       igual a um AlertDialog ou BottomSheetDialog do Material Design
//     - BottomSheetBehavior dentro do Dialog → resolve conflito scroll vs swipe
//       nativamente, sem concorrência com o JS
//     - WindowInsetsAnimationCompat (via NativeKeyboardAvoidingContainer existente)
//       continua funcionando normalmente dentro do sheet
//
// POR QUE Dialog E NÃO ViewGroupManager simples:
//   Um ViewGroupManager renderiza como view filha no layout React Native —
//   fica limitado ao z-order da tela e não pode ser um overlay real.
//   Dialog tem Window própria, aparece sobre StatusBar, NavigationBar e qualquer
//   outra view — é o mesmo mecanismo que o Modal do React Native usa internamente.
//
// O QUE ESTE MÓDULO FAZ (apenas o que o Gorhom fazia):
//   - Overlay real via Dialog (aparece sobre tudo)
//   - 90% da tela via BottomSheetBehavior
//   - Swipe para baixo fecha o modal
//   - Backdrop escuro com alpha animado via onSlide
//   - Emite onDismiss para o JS fechar o estado React
//   - O conteúdo React Native é renderizado dentro do sheet
//
// ONDE É USADO NO JS:
//   import { NativeBottomSheet } from '../native';
//   Substitui o <BottomSheetModal> do Gorhom no CategoryDetailScreen
//
// INTERAÇÃO COM O MÓDULO DE TECLADO EXISTENTE:
//   O NativeKeyboardAvoidingContainer funciona dentro deste sheet.
//   Este módulo gerencia scroll vs swipe + overlay;
//   o KeyboardAvoidingContainer gerencia translationY do teclado.
//
// =============================================================================

import android.app.Dialog
import android.content.Context
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.util.AttributeSet
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.google.android.material.bottomsheet.BottomSheetBehavior

// =============================================================================
// ViewManager — registrado no NativeModulesPackage
// =============================================================================

class NativeBottomSheetViewManager : ViewGroupManager<NativeBottomSheetView>() {

    override fun getName(): String = "NativeBottomSheet"

    override fun createViewInstance(context: ThemedReactContext): NativeBottomSheetView {
        return NativeBottomSheetView(context)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
        return mapOf(
            "onDismiss" to mapOf("registrationName" to "onDismiss")
        )
    }

    @ReactProp(name = "visible")
    fun setVisible(view: NativeBottomSheetView, visible: Boolean) {
        view.setSheetVisible(visible)
    }

    @ReactProp(name = "sheetHeightPercent", defaultFloat = 0.9f)
    fun setSheetHeightPercent(view: NativeBottomSheetView, percent: Float) {
        view.sheetHeightPercent = percent
    }

    // Children React Native são movidos para dentro do Dialog
    override fun addView(parent: NativeBottomSheetView, child: View, index: Int) {
        parent.addSheetChild(child, index)
    }

    override fun getChildCount(parent: NativeBottomSheetView): Int =
        parent.getSheetChildCount()

    override fun getChildAt(parent: NativeBottomSheetView, index: Int): View =
        parent.getSheetChildAt(index)

    override fun removeViewAt(parent: NativeBottomSheetView, index: Int) {
        parent.removeSheetChildAt(index)
    }
}

// =============================================================================
// View raiz — invisível no layout React Native, serve apenas como âncora.
// O conteúdo real fica dentro do Dialog.
// =============================================================================

class NativeBottomSheetView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : FrameLayout(context, attrs) {

    var sheetHeightPercent: Float = 0.9f

    // Container interno do Dialog onde os children RN ficam
    private val sheetContentContainer = FrameLayout(context)

    private var dialog: BottomSheetDialog? = null
    private var pendingVisible: Boolean? = null

    init {
        // Esta view não é visível — é só âncora para o React Native
        visibility = View.GONE
    }

    fun setSheetVisible(visible: Boolean) {
        if (!isAttachedToWindow) {
            pendingVisible = visible
            return
        }
        if (visible) showDialog() else hideDialog()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        pendingVisible?.let {
            pendingVisible = null
            if (it) showDialog() else hideDialog()
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        dialog?.dismissWithoutEvent()
        dialog = null
    }

    private fun showDialog() {
        if (dialog?.isShowing == true) return

        val reactContext = context as? ThemedReactContext ?: return
        val activity = reactContext.currentActivity ?: return

        dialog = BottomSheetDialog(context, sheetHeightPercent, sheetContentContainer).apply {
            setOnDismissCallback { emitDismiss() }
            show(activity.window)
        }
    }

    private fun hideDialog() {
        dialog?.dismiss()
        dialog = null
    }

    private fun emitDismiss() {
        val reactContext = context as? ThemedReactContext ?: return
        reactContext.getJSModule(RCTEventEmitter::class.java)
            .receiveEvent(id, "onDismiss", Arguments.createMap())
    }

    // ── Delegação de children React Native para o container interno do Dialog ──

    fun addSheetChild(child: View, index: Int) {
        if (index < 0 || index >= sheetContentContainer.childCount) {
            sheetContentContainer.addView(child)
        } else {
            sheetContentContainer.addView(child, index)
        }
    }

    fun getSheetChildCount(): Int = sheetContentContainer.childCount

    fun getSheetChildAt(index: Int): View = sheetContentContainer.getChildAt(index)

    fun removeSheetChildAt(index: Int) {
        sheetContentContainer.removeViewAt(index)
    }
}

// =============================================================================
// Dialog real — Window própria, overlay sobre tudo, com BottomSheetBehavior
// =============================================================================

class BottomSheetDialog(
    context: Context,
    private val sheetHeightPercent: Float,
    private val content: View
) {
    private val dialog: Dialog = Dialog(context, android.R.style.Theme_Translucent_NoTitleBar)
    private lateinit var behavior: BottomSheetBehavior<FrameLayout>
    private var onDismissCallback: (() -> Unit)? = null
    private var dismissedByCallback = false

    fun setOnDismissCallback(cb: () -> Unit) {
        onDismissCallback = cb
    }

    val isShowing: Boolean get() = dialog.isShowing

    fun show(parentWindow: Window) {
        val ctx = dialog.context
        val screenHeight = ctx.resources.displayMetrics.heightPixels
        val sheetHeight = (screenHeight * sheetHeightPercent).toInt()

        // ── Root: CoordinatorLayout ocupa a tela toda ──
        val coordinator = CoordinatorLayout(ctx).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        // ── Backdrop escuro ──
        val backdrop = View(ctx).apply {
            setBackgroundColor(Color.BLACK)
            alpha = 0f
            layoutParams = CoordinatorLayout.LayoutParams(
                CoordinatorLayout.LayoutParams.MATCH_PARENT,
                CoordinatorLayout.LayoutParams.MATCH_PARENT
            )
            setOnClickListener { dismiss() }
        }

        // ── Sheet container ──
        val sheetContainer = FrameLayout(ctx).apply {
            setBackgroundColor(Color.parseColor("#1A1F1C"))
        }

        // ── Handle indicator ──
        val handle = View(ctx).apply {
            setBackgroundColor(Color.parseColor("#4A5568"))
            val dp = ctx.resources.displayMetrics.density
            val handleParams = FrameLayout.LayoutParams(
                (32 * dp).toInt(), (4 * dp).toInt()
            ).apply {
                gravity = Gravity.CENTER_HORIZONTAL
                topMargin = (8 * dp).toInt()
            }
            layoutParams = handleParams
        }

        // ── Content container (abaixo do handle) ──
        val contentWrapper = FrameLayout(ctx).apply {
            val dp = ctx.resources.displayMetrics.density
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            ).apply { topMargin = (20 * dp).toInt() }
        }

        // Remove content do pai anterior se necessário
        (content.parent as? ViewGroup)?.removeView(content)
        contentWrapper.addView(content, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        sheetContainer.addView(handle)
        sheetContainer.addView(contentWrapper)

        // ── CoordinatorLayout params com BottomSheetBehavior ──
        val sheetParams = CoordinatorLayout.LayoutParams(
            CoordinatorLayout.LayoutParams.MATCH_PARENT,
            sheetHeight
        ).apply {
            gravity = Gravity.BOTTOM
            behavior = BottomSheetBehavior<FrameLayout>()
        }
        sheetContainer.layoutParams = sheetParams

        @Suppress("UNCHECKED_CAST")
        behavior = (sheetParams.behavior as BottomSheetBehavior<FrameLayout>).apply {
            isHideable = true
            skipCollapsed = true
            peekHeight = 0
            state = BottomSheetBehavior.STATE_HIDDEN
        }

        behavior.addBottomSheetCallback(object : BottomSheetBehavior.BottomSheetCallback() {
            override fun onSlide(bottomSheet: View, slideOffset: Float) {
                val alpha = ((slideOffset + 1f) / 2f * 0.6f).coerceIn(0f, 0.6f)
                backdrop.alpha = alpha
            }

            override fun onStateChanged(bottomSheet: View, newState: Int) {
                if (newState == BottomSheetBehavior.STATE_HIDDEN) {
                    backdrop.alpha = 0f
                    dialog.dismiss()
                }
            }
        })

        coordinator.addView(backdrop)
        coordinator.addView(sheetContainer)

        dialog.apply {
            setContentView(coordinator)
            window?.apply {
                setLayout(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT
                )
                setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
                setGravity(Gravity.BOTTOM)
                // Edge-to-edge: dialog aparece sob as barras do sistema
                WindowCompat.setDecorFitsSystemWindows(this, false)
                setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN)
            }
            setOnDismissListener {
                if (!dismissedByCallback) {
                    onDismissCallback?.invoke()
                }
            }
            show()
        }

        // Abre com animação
        coordinator.post {
            behavior.state = BottomSheetBehavior.STATE_EXPANDED
        }
    }

    fun dismiss() {
        behavior.state = BottomSheetBehavior.STATE_HIDDEN
    }

    fun dismissWithoutEvent() {
        dismissedByCallback = true
        dialog.dismiss()
    }
}
