/**
 * src/native/index.js — Export central de todos os módulos nativos Kotlin
 *
 * Cada módulo aqui tem um contraparte em:
 *   android/app/src/main/java/com/jvpl/flashcardsconcurso/modules/
 *
 * O motivo de cada módulo existir em Kotlin (e não em JS) está documentado
 * no próprio arquivo .kt correspondente.
 *
 * Para adicionar um novo módulo:
 *   1. Crie o arquivo Kotlin em modules/<nome>/
 *   2. Registre em NativeModulesPackage.kt
 *   3. Crie o wrapper JS nesta pasta
 *   4. Exporte aqui
 */

export { NativeKeyboardAvoidingContainer } from './NativeKeyboardAvoidingContainer';
export { useKeyboardInset } from './useKeyboardInset';
export { NativeBottomSheet } from './NativeBottomSheet';
