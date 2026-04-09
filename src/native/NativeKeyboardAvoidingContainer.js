/**
 * NativeKeyboardAvoidingContainer
 *
 * Wrapper JS para o módulo Kotlin KeyboardAvoidingContainerViewManager.
 *
 * Por que existe:
 *   O KeyboardAvoidingView do RN recebe eventos de teclado via bridge JS (~300ms de delay).
 *   Este componente usa a implementação nativa Android (WindowInsetsAnimationCompat),
 *   que sincroniza o translationY com a animação do teclado no frame zero — sem delay visível.
 *
 * Props:
 *   onKeyboardSettle(event) — chamado quando o teclado termina de animar (abertura,
 *   fechamento, menu do teclado expandindo/recolhendo). event.nativeEvent.height em dp.
 *
 * @see android/.../modules/keyboard/KeyboardAvoidingContainerViewManager.kt
 */

import { requireNativeComponent } from 'react-native';

export const NativeKeyboardAvoidingContainer = requireNativeComponent(
  'KeyboardAvoidingContainer'
);
