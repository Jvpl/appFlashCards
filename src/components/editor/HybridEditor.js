import React, { useRef, useImperativeHandle, useEffect, useState, forwardRef } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { editorHtml } from './editorTemplates';

export const HybridEditor = React.forwardRef(({ initialHtml, onFocus, onContentChange, onEditMath, style }, ref) => {
  const webviewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  React.useImperativeHandle(ref, () => ({
    getHtml: () => null,
    blur: () => webviewRef.current?.injectJavaScript("window.blurEditor(); true;"),
    focus: () => webviewRef.current?.injectJavaScript("window.focusEditor(); true;"),
    // Inserção com placeholder visual (\Box) para ficar "quadradinho"
    // TENTATIVA COM MENOS ESCAPING (4 barras -> vira 2 barras no JS -> vira \ no KaTeX)
    insertFrac: () => webviewRef.current?.injectJavaScript("window.insertFormula('\\\\frac{\\\\Box}{\\\\Box}'); true;"),
    insertRoot: () => webviewRef.current?.injectJavaScript("window.insertFormula('\\\\sqrt{\\\\Box}'); true;"),
    insertSquared: () => webviewRef.current?.injectJavaScript("window.insertFormula('\\\\Box^2'); true;"),
    insertLog: () => webviewRef.current?.injectJavaScript("window.insertFormula('\\\\log_{\\\\Box}{\\\\Box}'); true;"),
    insertSymbol: (symbol) => {
      const escaped = symbol.replace(/\\/g, '\\\\\\\\').replace(/'/g, "\\\\'");
      webviewRef.current?.injectJavaScript("window.insertSymbol('" + escaped + "'); true;");
    },
    updateFormula: (id, latex) => {
      const escaped = latex.replace(/'/g, "\\\\'");
      webviewRef.current?.injectJavaScript("window.updateFormula('" + id + "', '" + escaped + "'); true;");
    },
    deleteMath: (id) => {
      webviewRef.current?.injectJavaScript(`
        (function() {
           const atom = document.querySelector('.math-atom[data-id="${id}"]');
           if (atom) {
              // Remove sentinela + espaço após fórmula
              let next = atom.nextSibling;
              
              // Remove sentinela (ou invisible-char legado) se houver
              if (next && next.classList && (next.classList.contains('sentinela-anti-caps') || next.classList.contains('invisible-char'))) {
                const temp = next.nextSibling;
                next.remove();
                next = temp;
              }
              
              // Remove espaço se houver
              if (next && next.nodeType === 3 && next.textContent.trim() === '') {
                next.remove();
              }
              
              atom.remove();
           }
           checkPlaceholder();
           // FIX: Notifica o app que o conteúdo mudou após a remoção!
           // Isso garante que o rascunho (draft) seja atualizado e a fórmula não volte.
           if (window.sendToApp) {
               window.sendToApp('CONTENT_CHANGE', { html: editor.innerHTML });
           }
        })();
        true;
      `);
    }
  }));

  const initScript = "window.setHtml(" + JSON.stringify(initialHtml || '') + "); true;";

  return (
    <View style={[{ flex: 1 }, style]}>
      {isLoading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2D3748', zIndex: 10 }}>
          <ActivityIndicator size="small" color="#4FD1C5" />
        </View>
      )}
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: editorHtml }}
        style={{ backgroundColor: 'transparent', flex: 1, opacity: isLoading ? 0 : 1 }}
        javaScriptEnabled={true}
        scrollEnabled={true}
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView={true}
        injectedJavaScript={initScript}
        cacheEnabled={true}
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        renderToHardwareTextureAndroid={true}
        onLoadEnd={() => setIsLoading(false)}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'EDIT_MATH' && onEditMath) onEditMath(data.id, data.latex);
            if (data.type === 'CONTENT_CHANGE' && onContentChange) onContentChange(data.html);
            if (data.type === 'FOCUS' && onFocus) onFocus();
          } catch (e) {
            // Silently ignore JSON parse errors
          }
        }}
      />
    </View>
  );
});

// Wrapper isolado

export default HybridEditor;
