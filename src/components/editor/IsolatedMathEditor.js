import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { HybridEditor } from './HybridEditor';

export const IsolatedMathEditor = React.memo(({ editorRef, initialValue, onFocusCallback, onEditMath, onContentChange, onCharCount, maxChars }) => {
  return (
    <HybridEditor
      ref={editorRef}
      initialHtml={initialValue}
      onFocus={onFocusCallback}
      onContentChange={onContentChange}
      onEditMath={onEditMath}
      onCharCount={onCharCount}
      maxChars={maxChars}
      style={{ flex: 1 }}
    />
  );
}, () => true);

// =================================================================
// 3. MATH TOOLBAR (BARRA DE SÍMBOLOS)
// =================================================================

export default IsolatedMathEditor;
