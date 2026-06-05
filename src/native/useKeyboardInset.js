/**
 * useKeyboardInset
 *
 * Hook que retorna um Reanimated SharedValue com a altura atual do teclado em dp,
 * atualizada frame a frame via módulo Kotlin KeyboardInsetModule.
 *
 * Por que Kotlin + SharedValue (não useState):
 *   - useState causaria re-render a cada frame → solavanco garantido
 *   - SharedValue atualiza direto no thread de UI do Reanimated, sem passar pelo
 *     ciclo React — o mesmo mecanismo que o WhatsApp usa internamente
 *   - O módulo Kotlin usa WindowInsetsAnimationCompat para ler o inset a cada frame
 *     da animação do teclado, antes do JS receber qualquer evento nativo
 *
 * Uso:
 *   const keyboardHeight = useKeyboardInset({ active: bottomSheetIsOpen });
 *   // keyboardHeight é um Reanimated SharedValue — use em useAnimatedStyle
 *
 * @see android/.../modules/keyboard/KeyboardInsetModule.kt
 */

import { useEffect, useRef } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { useSharedValue, runOnUI } from 'react-native-reanimated';

const { KeyboardInset } = NativeModules;

const isSupported = Platform.OS === 'android' && !!KeyboardInset;

let emitter = null;
if (isSupported) {
  emitter = new NativeEventEmitter(KeyboardInset);
}

export function useKeyboardInset({ active = true } = {}) {
  const keyboardHeight = useSharedValue(0);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (!isSupported || !active) {
      keyboardHeight.value = 0;
      return;
    }

    KeyboardInset.startListening();

    subscriptionRef.current = emitter.addListener('KeyboardInset', (event) => {
      // Atualiza o SharedValue direto no thread de UI — sem re-render React
      keyboardHeight.value = event.height;
    });

    return () => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      KeyboardInset.stopListening();
      keyboardHeight.value = 0;
    };
  }, [active]);

  return keyboardHeight;
}
