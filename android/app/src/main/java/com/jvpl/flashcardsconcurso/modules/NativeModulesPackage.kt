package com.jvpl.flashcardsconcurso.modules

// =============================================================================
// NativeModulesPackage — Ponto central de registro de todos os módulos nativos
// =============================================================================
//
// POR QUE ESTE ARQUIVO EXISTE:
//   O React Native precisa que cada módulo nativo (ViewManager ou NativeModule)
//   seja registrado em um ReactPackage. Em vez de criar um package separado para
//   cada módulo (o que espalharia o código), centralizamos tudo aqui.
//
//   Ao adicionar um novo módulo Kotlin:
//     1. Crie a pasta e o arquivo dentro de modules/<nome-do-modulo>/
//     2. Registre o ViewManager em getViewManagers() ou o NativeModule em getModules()
//     3. Documente o motivo no próprio arquivo do módulo (seguindo o padrão abaixo)
//
// MÓDULOS REGISTRADOS:
//   - KeyboardAvoidingContainerViewManager  → modules/keyboard/
//   - NativeBottomSheetViewManager          → modules/bottomsheet/
//
// =============================================================================

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

import com.jvpl.flashcardsconcurso.modules.keyboard.KeyboardAvoidingContainerViewManager
import com.jvpl.flashcardsconcurso.modules.keyboard.KeyboardInsetModule
import com.jvpl.flashcardsconcurso.modules.bottomsheet.NativeBottomSheetViewManager

class NativeModulesPackage : ReactPackage {

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> = listOf(
        // Módulo 1 — Keyboard: sincroniza animação do teclado sem delay de bridge JS
        KeyboardAvoidingContainerViewManager(),
        // Módulo 2 — BottomSheet: resolve conflito scroll vs swipe nativamente via BottomSheetBehavior
        NativeBottomSheetViewManager()
    )

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> = listOf(
        // Módulo 2 — KeyboardInset: emite altura do teclado frame-a-frame via WindowInsetsAnimationCompat
        // Resolve o delay de ~300ms do keyboardDidShow/keyboardDidHide do RN
        KeyboardInsetModule(reactContext)
    )
}
