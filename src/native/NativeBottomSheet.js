/**
 * NativeBottomSheet
 *
 * Wrapper JS para o módulo Kotlin NativeBottomSheetViewManager.
 *
 * Por que existe:
 *   O Gorhom BottomSheet resolve conflito scroll vs swipe em JS (RNGH + Reanimated).
 *   Na New Architecture (Fabric), esse sistema JS compete com o dispatcher de gestos
 *   nativo do Android — causando scroll travado com teclado ativo, botões não
 *   responsivos, e impossibilidade de scrollar tocando sobre TextInput.
 *
 *   Este componente usa BottomSheetBehavior do Material Design Android, que resolve
 *   esses conflitos na camada nativa sem concorrência com o JS.
 *
 * Props:
 *   visible (boolean)           — controla abertura/fechamento do sheet
 *   sheetHeightPercent (float)  — altura do sheet como fração da tela (default: 0.9)
 *   onDismiss ()                — chamado quando o sheet é fechado (swipe ou backdrop)
 *
 * Uso:
 *   <NativeBottomSheet
 *     visible={isOpen}
 *     sheetHeightPercent={0.9}
 *     onDismiss={() => setIsOpen(false)}
 *     style={{ flex: 1 }}
 *   >
 *     {children}
 *   </NativeBottomSheet>
 *
 * @see android/.../modules/bottomsheet/NativeBottomSheetViewManager.kt
 */

import { requireNativeComponent } from 'react-native';

export const NativeBottomSheet = requireNativeComponent('NativeBottomSheet');
