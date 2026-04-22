import React, { useRef, useImperativeHandle, useEffect, useState, forwardRef } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { editorHtml } from './editorTemplates';

export const HybridEditor = React.forwardRef(({ initialHtml, onFocus, onContentChange, onEditMath, onCharCount, onFormatState, onCutText, maxChars, style }, ref) => {
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
    insertSub: () => webviewRef.current?.injectJavaScript("window.insertFormula('\\\\Box_{\\\\Box}'); true;"),
    insertAbs: () => webviewRef.current?.injectJavaScript("window.insertFormula('\\\\left|\\\\Box\\\\right|'); true;"),
    // Insere fórmula livre construída pelo FormulaBuilderModal (source = 'builder')
    insertCustom: (latex) => {
      const escaped = latex.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      webviewRef.current?.injectJavaScript(`window.insertFormula('${escaped}', undefined, 'builder'); true;`);
    },
    pasteText: (text) => {
      const escaped = JSON.stringify(text || '');
      webviewRef.current?.injectJavaScript(`window.pasteText(${escaped}); true;`);
    },
    insertSymbol: (symbol) => {
      const escaped = symbol.replace(/\\/g, '\\\\\\\\').replace(/'/g, "\\\\'");
      webviewRef.current?.injectJavaScript("window.insertSymbol('" + escaped + "'); true;");
    },
    clear: () => webviewRef.current?.injectJavaScript("window.setHtml(''); true;"),
    setContent: (html) => {
      const escaped = JSON.stringify(html || '');
      webviewRef.current?.injectJavaScript(`
        window.setHtml(${escaped});
        (function() {
          var el = document.querySelector('.ProseMirror') || document.getElementById('editor');
          if (el) {
            var range = document.createRange();
            var sel = window.getSelection();
            range.selectNodeContents(el);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        })();
        true;
      `);
    },
    updateFormula: (id, latex) => {
      // Escapa backslashes primeiro (\ → \\), depois aspas simples
      const escaped = latex.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      webviewRef.current?.injectJavaScript("window.updateFormula('" + id + "', '" + escaped + "'); true;");
    },
    toggleBold: () => webviewRef.current?.injectJavaScript("window.toggleBold(); true;"),
    toggleItalic: () => webviewRef.current?.injectJavaScript("window.toggleItalic(); true;"),
    toggleMark: () => webviewRef.current?.injectJavaScript("window.toggleMark(); true;"),
    deleteMath: (id) => {
      webviewRef.current?.injectJavaScript(`
        (function() {
           var atom = document.querySelector('.math-atom[data-id="${id}"]');
           if (atom) {
              var next = atom.nextSibling;
              if (next && next.classList && (next.classList.contains('sentinela-anti-caps') || next.classList.contains('invisible-char'))) {
                var temp = next.nextSibling;
                next.remove();
                next = temp;
              }
              if (next && next.nodeType === 3 && next.textContent.trim() === '') {
                next.remove();
              }
              atom.remove();
           }
           if (typeof updatePlaceholder === 'function') updatePlaceholder();
           if (window.sendToApp) {
               var el = document.querySelector('.ProseMirror') || document.getElementById('editor');
               window.sendToApp('CONTENT_CHANGE', { html: el ? el.innerHTML : '' });
               if (typeof notifyCharCount === 'function') notifyCharCount();
           }
        })();
        true;
      `);
    }
  }));

  const initScript = "window.setHtml(" + JSON.stringify(initialHtml || '') + ");" +
    (maxChars ? " try{window.setMaxChars(" + maxChars + ")}catch(e){}" : "") +
    " true;";

  return (
    <View style={[{ flex: 1 }, style]}>
      {isLoading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#202020', zIndex: 10 }}>
          <ActivityIndicator size="small" color="#4CAF50" />
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
        onError={(e) => console.log('[WebView error]', e.nativeEvent)}
        onHttpError={(e) => console.log('[WebView HTTP error]', e.nativeEvent)}
        injectedJavaScriptBeforeContentLoaded={`
          window.onerror = function(msg, src, line, col, err) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'JS_ERROR', msg:msg, src:src, line:line, col:col}));
          };
          true;
        `}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'EDIT_MATH' && onEditMath) onEditMath(data.id, data.latex, data.source || 'simple');
            if (data.type === 'CONTENT_CHANGE' && onContentChange) onContentChange(data.html);
            if (data.type === 'FOCUS' && onFocus) onFocus();
            if (data.type === 'CHAR_COUNT' && onCharCount) onCharCount(data.count, data.max);
            if (data.type === 'FORMAT_STATE' && onFormatState) onFormatState(data.bold, data.italic, data.mark);
            if (data.type === 'CUT_TEXT' && onCutText) onCutText(data.text);
            if (data.type === 'JS_ERROR') console.log('[WebView JS error]', data.msg, 'line:', data.line, 'col:', data.col);
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
