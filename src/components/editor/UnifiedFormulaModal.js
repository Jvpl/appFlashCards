import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, StyleSheet, ActivityIndicator, Keyboard, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { FormulaEngine } from '../../utils/FormulaEngine';
import styles from '../../styles/globalStyles';
import katexScript from './editorTemplates'; // Importando templates existentes
import { MathToolbar } from './MathToolbar';

export const UnifiedFormulaModal = ({ visible, onClose, onSave, initialLatex = '' }) => {
    const [engine] = useState(new FormulaEngine());
    const [latex, setLatex] = useState('');
    const [loading, setLoading] = useState(true);
    const webViewRef = useRef(null);
    const inputRef = useRef(null); // Ref for hidden TextInput

    // Inicialização
    useEffect(() => {
        if (visible) {
            // TODO: Futuro - carregar initialLatex no engine se necessário
            // Por enquanto começa limpo ou com o que o engine tem
            if (initialLatex) {
                // engine.load(initialLatex); // Implementar load no futuro
                engine.clear(); // Reset 
            } else {
                engine.clear();
            }
            updateDisplay();
            // Focar no input invisível para abrir teclado numérico
            setTimeout(() => inputRef.current?.focus(), 500);
        }
    }, [visible]);

    const updateDisplay = () => {
        const currentLatex = engine.toLaTeX();
        setLatex(currentLatex);
        // Envia para WebView
        // Usaremos postMessage para atualizar o conteúdo div 'math-content'
        const html = `
        var el = document.getElementById('math-content');
        if (el) {
            katex.render(String.raw\`${currentLatex}\`, el, {
                displayMode: true,
                throwOnError: false,
                trust: true
            });
        }
      `;
        webViewRef.current?.injectJavaScript(html);
    };

    // Handler de input de teclado (numérico/texto)
    const handleKeyPress = (e) => {
        const key = e.nativeEvent.key;
        if (key === 'Backspace') {
            engine.delete();
        } else if (key.length === 1) { // Caracteres simples
            engine.insert(key);
        }
        updateDisplay();
    };

    // Handler da Toolbar (Estruturas)
    const handleToolbarInsert = (cmd) => {
        // cmd pode ser '+', '-', ou struturas like '\\frac', '\\sqrt'
        if (cmd === '\\\\frac') engine.insertStructure('frac');
        else if (cmd === '\\\\sqrt') engine.insertStructure('sqrt');
        else if (cmd === '²') engine.insertStructure('sup'); // Simplificação para quadrado
        else if (cmd === '\\\\log') engine.insertStructure('log'); // Precisa implementar 'log' no engine structure se dif
        else if (cmd.length === 1) engine.insert(cmd); // Símbolos simples

        updateDisplay();
        // Refocus input para manter teclado ativo
        inputRef.current?.focus();
    };

    // Navegação (Setas) - Opcional, adicionar botões na UI
    const moveCursor = (dir) => {
        if (dir === 'left') engine.moveCursorLeft();
        if (dir === 'right') engine.moveCursorRight();
        updateDisplay();
        inputRef.current?.focus();
    };

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
        <style>
            body { 
                margin: 0; 
                padding: 0; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                background-color: #2D3748; /* Dark mode bg */
                color: #fff;
                overflow: hidden;
            }
            #math-content { 
                font-size: 2.5em; /* Fonte grande para destaque */
                text-align: center;
                width: 100%;
                min-height: 100px;
            }
            /* Cor do cursor */
            .katex .textcolor { color: #4FD1C5 !important; }
        </style>
    </head>
    <body>
        <div id="math-content"></div>
    </body>
    </html>
  `;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={modalStyles.container}>
                {/* Header */}
                <View style={modalStyles.header}>
                    <TouchableOpacity onPress={onClose} style={modalStyles.cancelButton}>
                        <Text style={modalStyles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <Text style={modalStyles.title}>Editor Avançado</Text>
                    <TouchableOpacity onPress={() => onSave(latex.replace(/\\textcolor{#4FD1C5}{\|}/g, ''))} style={modalStyles.saveButton}>
                        <Text style={modalStyles.saveText}>Salvar</Text>
                    </TouchableOpacity>
                </View>

                {/* Display Area */}
                <View style={modalStyles.displayContainer}>
                    <WebView
                        ref={webViewRef}
                        originWhitelist={['*']}
                        source={{ html: htmlContent }}
                        style={{ backgroundColor: 'transparent' }}
                        containerStyle={{ backgroundColor: '#2D3748' }}
                        onLoadEnd={() => {
                            setLoading(false);
                            updateDisplay(); // Render first frame
                        }}
                    />
                    {loading && <ActivityIndicator style={StyleSheet.absoluteFill} color="#4FD1C5" />}
                </View>

                {/* Navigation Controls */}
                <View style={modalStyles.navControls}>
                    <TouchableOpacity onPress={() => moveCursor('left')} style={modalStyles.navButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => engine.delete() && updateDisplay()} style={[modalStyles.navButton, { backgroundColor: '#E53E3E' }]}>
                        <Ionicons name="backspace" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveCursor('right')} style={modalStyles.navButton}>
                        <Ionicons name="arrow-forward" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* INPUT HIDDEN para teclado nativo */}
                <TextInput
                    ref={inputRef}
                    style={{ height: 0, width: 0, opacity: 0, position: 'absolute' }}
                    autoCorrect={false}
                    keyboardType="numeric" // Teclado numérico preferencial
                    onKeyPress={handleKeyPress}
                    // Evita que o teclado suma
                    blurOnSubmit={false}
                />

                {/* Math Toolbar Container - Always visible here */}
                <View style={{ height: 280, backgroundColor: '#252E3D' }}>
                    <MathToolbar onInsert={handleToolbarInsert} onClose={() => { }} />
                </View>
            </View>
        </Modal>
    );
};

const modalStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1A202C',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 50, // SafeArea
        backgroundColor: '#2D3748',
        borderBottomWidth: 1,
        borderBottomColor: '#4A5568',
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cancelButton: {
        padding: 8,
    },
    cancelText: {
        color: '#A0AEC0',
        fontSize: 16,
    },
    saveButton: {
        padding: 8,
        backgroundColor: '#4FD1C5',
        borderRadius: 8,
    },
    saveText: {
        color: '#1A202C',
        fontWeight: 'bold',
        fontSize: 14,
    },
    displayContainer: {
        flex: 1,
        backgroundColor: '#2D3748',
        margin: 16,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#4A5568',
    },
    navControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        paddingBottom: 10,
    },
    navButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#4A5568',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    }
});
