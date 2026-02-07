import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { HybridEditor } from './HybridEditor';

export const IsolatedMathEditor = React.memo(({ editorRef, initialValue, onFocusCallback, onEditMath, onContentChange }) => {
  return (
    <HybridEditor
      ref={editorRef}
      initialHtml={initialValue}
      onFocus={onFocusCallback}
      onContentChange={onContentChange}
      onEditMath={onEditMath}
      style={{ flex: 1 }}
    />
  );
}, () => true);

// =================================================================
// 3. MATH TOOLBAR (BARRA DE SÍMBOLOS)
// =================================================================

export default IsolatedMathEditor;
