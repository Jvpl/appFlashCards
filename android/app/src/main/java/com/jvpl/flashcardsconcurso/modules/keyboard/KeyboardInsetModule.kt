package com.jvpl.flashcardsconcurso.modules.keyboard

// =============================================================================
// KeyboardInsetModule
// =============================================================================
//
// POR QUE KOTLIN E NÃO JS:
//   O RN emite `keyboardDidShow` / `keyboardDidHide` DEPOIS que a animação do
//   teclado termina (~300ms de delay). Qualquer padding/scroll ajustado via JS
//   sobe depois do teclado, causando o "salto" visível.
//
//   Este módulo usa WindowInsetsAnimationCompat, que chama onProgress() em cada
//   frame da animação do teclado — no thread da UI nativa, antes de qualquer
//   comunicação com o JS. O JS recebe o valor do inset via evento RN e atualiza
//   o paddingBottom em sincronia com a animação do sistema (igual ao WhatsApp).
//
// ONDE É USADO NO JS:
//   import { useKeyboardInset } from '../native/useKeyboardInset';
//   Substitui os listeners keyboardDidShow/keyboardDidHide no CategoryDetailScreen.
//
// CASOS DE USO ATUAIS:
//   - CategoryDetailScreen.js — BottomSheetScrollView com paddingBottom dinâmico
//
// COMO FUNCIONA:
//   1. O módulo se registra na Activity como WindowInsetsAnimationCompat.Callback
//   2. Em cada frame da animação, lê o inset IME (teclado) em pixels
//   3. Converte para dp (densidade-independente) e emite evento "KeyboardInset"
//   4. O JS usa esse evento para atualizar o estado de paddingBottom em tempo real
//
// CUIDADO:
//   Emite em dp (não px) porque o JS trabalha com dp via StyleSheet.
//   O evento é emitido a cada frame — o JS deve usar setState ou Animated.Value.
//   NÃO usar com windowSoftInputMode="adjustPan" — requer "adjustResize" (já configurado).
//
// =============================================================================

import android.app.Activity
import android.view.View
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsAnimationCompat
import androidx.core.view.WindowInsetsCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class KeyboardInsetModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "KeyboardInset"

    private var isListening = false
    private var rootView: View? = null

    // Chamado pelo JS para iniciar a escuta (ex: quando o BottomSheet abre)
    @ReactMethod
    fun startListening() {
        val activity = reactContext.currentActivity ?: return
        if (isListening) return
        isListening = true

        activity.runOnUiThread {
            val root = activity.window.decorView.rootView
            rootView = root

            // Garante que a view possa receber insets de animação
            ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets -> insets }

            ViewCompat.setWindowInsetsAnimationCallback(
                root,
                object : WindowInsetsAnimationCompat.Callback(DISPATCH_MODE_STOP) {

                    // Chamado a cada frame da animação do teclado
                    override fun onProgress(
                        insets: WindowInsetsCompat,
                        runningAnimations: List<WindowInsetsAnimationCompat>
                    ): WindowInsetsCompat {
                        val imeInset = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
                        val navInset = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom

                        // O inset real do teclado é o IME menos a barra de navegação
                        val keyboardHeight = (imeInset - navInset).coerceAtLeast(0)

                        // Converte px → dp para o JS
                        val density = reactContext.resources.displayMetrics.density
                        val keyboardHeightDp = keyboardHeight / density

                        emitKeyboardInset(keyboardHeightDp)
                        return insets
                    }

                    override fun onEnd(animation: WindowInsetsAnimationCompat) {
                        // Garante que o valor final seja emitido corretamente
                        val finalInsets = ViewCompat.getRootWindowInsets(root)
                        val imeInset = finalInsets?.getInsets(WindowInsetsCompat.Type.ime())?.bottom ?: 0
                        val navInset = finalInsets?.getInsets(WindowInsetsCompat.Type.navigationBars())?.bottom ?: 0
                        val keyboardHeight = (imeInset - navInset).coerceAtLeast(0)
                        val density = reactContext.resources.displayMetrics.density
                        emitKeyboardInset(keyboardHeight / density)
                    }
                }
            )
        }
    }

    // Chamado pelo JS para parar a escuta (ex: quando o BottomSheet fecha)
    @ReactMethod
    fun stopListening() {
        val root = rootView ?: return
        isListening = false
        reactContext.currentActivity?.runOnUiThread {
            ViewCompat.setWindowInsetsAnimationCallback(root, null)
        }
        rootView = null
    }

    private fun emitKeyboardInset(heightDp: Float) {
        val params = Arguments.createMap().apply {
            putDouble("height", heightDp.toDouble())
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("KeyboardInset", params)
    }

    // Necessário para módulos que emitem eventos no RN
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
