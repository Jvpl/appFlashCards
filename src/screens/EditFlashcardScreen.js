import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Modal, TouchableWithoutFeedback, TextInput, Button, Keyboard, Vibration } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { getAppData, saveAppData } from '../services/storage';
import { isDefaultDeck, canEditDefaultDecks } from '../config/constants';
import { HybridEditor } from '../components/editor/HybridEditor';
import { MathToolbar } from '../components/editor/MathToolbar';
import { IsolatedMathEditor } from '../components/editor/IsolatedMathEditor';
import { FormulaBuilderModal } from '../components/editor/FormulaBuilderModal';
import { CustomAlert } from '../components/ui/CustomAlert';
import styles from '../styles/globalStyles';

export const EditFlashcardScreen = ({ route, navigation }) => {
    const { deckId, subjectId, cardId } = route.params;

    const questionEditorRef = useRef(null);
    const answerEditorRef = useRef(null);
    const scrollViewRef = useRef(null);
    const mathToolbarRef = useRef(null);

    const [activeEditor, setActiveEditor] = useState(null);
    const [isMathToolbarVisible, setMathToolbarVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [loading, setLoading] = useState(true);

    // Data holders
    const [initialQuestion, setInitialQuestion] = useState('');
    const [initialAnswer, setInitialAnswer] = useState('');

    // States para edição de fórmula
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });
    const [currentMathId, setCurrentMathId] = useState(null);
    const [currentLatex, setCurrentLatex] = useState('');
    const [editValue1, setEditValue1] = useState('');
    const [editValue2, setEditValue2] = useState('');

    // Estados para limite de caracteres
    const [questionCharCount, setQuestionCharCount] = useState(0);
    const [answerCharCount, setAnswerCharCount] = useState(0);
    const CHAR_LIMIT = 800;

    // Estados para teclado colapsável do modal (sincronizado com ManageFlashcardsScreen)
    const [showLettersPanel, setShowLettersPanel] = useState(false);
    const [showSymbolsPanel, setShowSymbolsPanel] = useState(false);
    const [focusedInput, setFocusedInput] = useState(1); // 1 ou 2 (sem 3 - removido editValue3)
    const [builderVisible, setBuilderVisible] = useState(false); // Montador de fórmula livre
    const [builderInitialLatex, setBuilderInitialLatex] = useState(''); // LaTeX inicial (edição)
    const [helpModalVisible, setHelpModalVisible] = useState(false);
    const [helpPage, setHelpPage] = useState(0); // 0 = página 1, 1 = página 2

    // Refs para inputs do modal (sincronizado com ManageFlashcardsScreen, sem modalInput3Ref)
    const modalInput1Ref = useRef(null);
    const modalInput2Ref = useRef(null);



    // ========== Helper Functions for Modal ==========
    // Valores compartilhados para animação de shake (reanimated v2/v3)
    const shakeAnim1 = useSharedValue(0);
    const shakeAnim2 = useSharedValue(0);

    // Estilos animados para shake
    const shakeStyle1 = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeAnim1.value }]
    }));
    const shakeStyle2 = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeAnim2.value }]
    }));

    // Detecta se o conteúdo é numérico (max 10) ou alfabético (max 2)
    // REGRA RIGOROSA: Se tem QUALQUER letra, limite é 2
    const isNumericContent = (text) => {
        if (!text || text.trim() === '') return true;
        const letterChars = (text.match(/[a-zA-Z]/g) || []).length;
        return letterChars === 0; // Só é numérico se NÃO tem nenhuma letra
    };

    // Gatilho de shake quando tenta ultrapassar limite (reanimated v2/v3)
    const triggerShake = (animRef) => {
        animRef.value = withSequence(
            withTiming(10, { duration: 50 }),
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(0, { duration: 50 })
        );
    };

    // ========== SISTEMA DE VALIDAÇÃO ROBUSTO (sincronizado com ManageFlashcardsScreen) ==========
    // Valida se um novo caractere pode ser inserido
    const validateInput = (currentText, newChar) => {
        const text = currentText || '';

        // VALIDAÇÃO ESTRITA: Lista branca de caracteres permitidos
        const allowedChars = /^[0-9a-zA-Z+\-×÷^_(),.\sπθ≠≥≤∞]$/;
        if (!allowedChars.test(newChar)) {
            return { valid: false, reason: 'characterNotAllowed' };
        }

        // Contadores
        const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
        const numberCount = (text.match(/[0-9]/g) || []).length;
        const symbolCounts = {
            '+': (text.match(/\+/g) || []).length,
            '-': (text.match(/-/g) || []).length,
            '×': (text.match(/×/g) || []).length,
            '÷': (text.match(/÷/g) || []).length,
            '^': (text.match(/\^/g) || []).length,
            '_': (text.match(/_/g) || []).length,
            '(': (text.match(/\(/g) || []).length,
            ')': (text.match(/\)/g) || []).length,
            ',': (text.match(/,/g) || []).length,
            '.': (text.match(/\./g) || []).length,
        };

        const lastChar = text.slice(-1);
        const isLetter = /[a-zA-Z]/.test(newChar);
        const isNumber = /[0-9]/.test(newChar);
        const isDecimalSep = /[,.]/.test(newChar);
        const isSymbol = /[+\-×÷^_()≠≥≤]/.test(newChar);
        const lastIsNumber = /[0-9]/.test(lastChar);
        const lastIsSymbol = /[+\-×÷^_()≠≥≤]/.test(lastChar);
        const lastIsDecimal = /[,.]/.test(lastChar);

        // Regra 1: Num → Letra BLOQUEADO (precisa de símbolo entre eles)
        if (isLetter && lastIsNumber) {
            return { valid: false, reason: 'needsSymbol' };
        }

        // Regra 2: Símbolos consecutivos — bloqueia, exceto combinações matematicamente válidas
        if (isSymbol && lastIsSymbol) {
            if (newChar === '(') return { valid: true };
            if (lastChar === ')') return { valid: true };
            return { valid: false, reason: 'noConsecutiveSymbols' };
        }

        // Regra 3: Símbolo no início (apenas +, -, ( e ) permitidos)
        if (isSymbol && text.length === 0 && newChar !== '-' && newChar !== '+' && newChar !== '(' && newChar !== ')') {
            return { valid: false, reason: 'invalidStart' };
        }

        // Separadores decimais (vírgula e ponto)
        if (isDecimalSep) {
            if (text.length === 0) {
                return { valid: false, reason: 'decimalAtStart' };
            }
            if (lastIsDecimal) {
                return { valid: false, reason: 'consecutiveDecimals' };
            }
            const totalSeparators = symbolCounts[','] + symbolCounts['.'];
            if (totalSeparators >= 2) {
                return { valid: false, reason: 'maxDecimals' };
            }
        }

        // Regra 4: Limite de letras (máx 6)
        if (isLetter && letterCount >= 6) {
            return { valid: false, reason: 'maxLetters' };
        }

        // Regra 5: Limite dinâmico de números
        const maxNumbers = letterCount > 0 ? 5 : 15;
        if (isNumber && numberCount >= maxNumbers) {
            return { valid: false, reason: 'maxNumbers' };
        }

        // Regra 6: Limite de símbolos (máx 4 de cada tipo)
        if ((isSymbol || isDecimalSep) && symbolCounts[newChar] !== undefined && symbolCounts[newChar] >= 4) {
            return { valid: false, reason: 'maxSymbols' };
        }

        return { valid: true };
    };

    // Retorna estados dos botões do teclado customizado
    const getButtonStates = (text) => {
        const lastChar = (text || '').slice(-1);
        const letterCount = ((text || '').match(/[a-zA-Z]/g) || []).length;
        const numberCount = ((text || '').match(/[0-9]/g) || []).length;
        const lastIsNumber = /[0-9]/.test(lastChar);
        const lastIsSymbol = /[+\-×÷^_()≠≥≤]/.test(lastChar);
        const isEmpty = (text || '').length === 0;

        const maxNumbers = letterCount > 0 ? 5 : 15;

        return {
            lettersDisabled: lastIsNumber || letterCount >= 6,
            numbersDisabled: numberCount >= maxNumbers,
            symbolsDisabled: lastIsSymbol,
            onlyPlusMinusAllowed: isEmpty,
        };
    };

    // Handler de inserção com validação (ADAPTADO: apenas 2 campos, sem editValue3)
    const handleValidatedInsert = (char, inputNumber) => {
        const currentValue = inputNumber === 1 ? editValue1 : editValue2;
        const setValue = inputNumber === 1 ? setEditValue1 : setEditValue2;
        const shakeAnim = inputNumber === 1 ? shakeAnim1 : shakeAnim2;

        const validation = validateInput(currentValue, char);

        if (validation.valid) {
            setValue(currentValue + char);
        } else {
            triggerShake(shakeAnim);
        }
    };

    const CharacterCounter = ({ current, max }) => {
        const percentage = (current / max) * 100;
        const isWarning = percentage >= 70;
        const isError = percentage >= 90;

        return (
            <Text style={[
                styles.charCounter,
                isWarning && styles.charCounterWarning,
                isError && styles.charCounterError
            ]}>
                {current}/{max}
            </Text>
        );
    };

    // Componente: Contador Segmentado (Num | Let | Sim) - sincronizado com ManageFlashcardsScreen
    const SegmentedCounter = ({ text }) => {
        const letterCount = ((text || '').match(/[a-zA-Z]/g) || []).length;
        const numberCount = ((text || '').match(/[0-9]/g) || []).length;
        const symbolCount = ((text || '').match(/[+\-×÷^_()]/g) || []).length;
        const maxNumbers = letterCount > 0 ? 5 : 15;

        const getColor = (current, max) => {
            const pct = (current / max) * 100;
            if (pct >= 100) return '#EF4444';
            if (pct >= 70) return '#F59E0B';
            return '#A0AEC0';
        };

        return (
            <View style={styles.segmentedCounterContainer}>
                <Text style={[styles.segmentedCounterText, { color: getColor(numberCount, maxNumbers) }]}>
                    Num: {numberCount}/{maxNumbers}
                </Text>
                <Text style={styles.segmentedCounterDivider}>|</Text>
                <Text style={[styles.segmentedCounterText, { color: getColor(letterCount, 6) }]}>
                    Let: {letterCount}/6
                </Text>
                <Text style={styles.segmentedCounterDivider}>|</Text>
                <Text style={[styles.segmentedCounterText, { color: getColor(symbolCount, 6) }]}>
                    Sim: {symbolCount}/6
                </Text>
            </View>
        );
    };

    // Helper para vibração (sincronizado com ManageFlashcardsScreen)
    const tap = () => { try { Vibration.vibrate(12); } catch (_) { } };

    // Componente: Teclado Colapsável (Abc | Símbolos) - sincronizado com ManageFlashcardsScreen, ADAPTADO para 2 campos
    const CollapsibleKeypad = ({ inputNumber }) => {
        const letters = ['x', 'y', 'z', 'a', 'b', 'c', 'n', 'm', 'k', 't'];
        const symbols = ['(', ')', '+', '-', '×', '÷', '^', '_', ',', '.', 'π', 'θ', '∞', '≠', '≥', '≤'];

        const currentValue = inputNumber === 1 ? editValue1 : editValue2; // ADAPTADO: sem editValue3
        const buttonStates = getButtonStates(currentValue);

        const handleInsert = (char) => {
            handleValidatedInsert(char, inputNumber);
        };

        const isSymbolAllowed = (symbol) => {
            if (['π', 'θ', '∞'].includes(symbol)) return true;
            if (buttonStates.symbolsDisabled) return false;
            if (buttonStates.onlyPlusMinusAllowed && symbol !== '+' && symbol !== '-' && symbol !== '(' && symbol !== ')') return false;
            return true;
        };

        return (
            <View style={styles.keypadContainer}>
                <View style={styles.keypadToggleRow}>
                    <TouchableOpacity
                        style={[styles.keypadToggle, showLettersPanel && styles.keypadToggleActive]}
                        onPress={() => {
                            tap();
                            setShowLettersPanel(!showLettersPanel);
                            if (showSymbolsPanel) setShowSymbolsPanel(false);
                        }}
                    >
                        <Text style={styles.keypadToggleText}>Abc</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.keypadToggle, showSymbolsPanel && styles.keypadToggleActive]}
                        onPress={() => {
                            tap();
                            setShowSymbolsPanel(!showSymbolsPanel);
                            if (showLettersPanel) setShowLettersPanel(false);
                        }}
                    >
                        <Text style={styles.keypadToggleText}>+-×</Text>
                    </TouchableOpacity>
                </View>

                {showLettersPanel && (
                    <View style={styles.keypadPanel}>
                        {letters.map(letter => (
                            <TouchableOpacity
                                key={letter}
                                style={[
                                    styles.keypadButton,
                                    buttonStates.lettersDisabled && styles.keypadButtonDisabled
                                ]}
                                onPress={() => { if (!buttonStates.lettersDisabled) { tap(); handleInsert(letter); } }}
                                disabled={buttonStates.lettersDisabled}
                            >
                                <Text style={[
                                    styles.keypadButtonText,
                                    buttonStates.lettersDisabled && styles.keypadButtonTextDisabled
                                ]}>{letter}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {showSymbolsPanel && (
                    <View style={styles.keypadPanel}>
                        {symbols.map(symbol => {
                            const allowed = isSymbolAllowed(symbol);
                            return (
                                <TouchableOpacity
                                    key={symbol}
                                    style={[
                                        styles.keypadButton,
                                        !allowed && styles.keypadButtonDisabled
                                    ]}
                                    onPress={() => { if (allowed) { tap(); handleInsert(symbol); } }}
                                    disabled={!allowed}
                                >
                                    <Text style={[
                                        styles.keypadButtonText,
                                        !allowed && styles.keypadButtonTextDisabled
                                    ]}>{symbol}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    };

    // Função para calcular peso de fórmula (espelho do WebView)
    const calculateFormulaWeight = (latex) => {
        if (!latex) return 5;
        let cleaned = latex
            .replace(/\\(frac|sqrt|log|Box|text|mathrm|mathbf|mathit)/g, '')
            .replace(/\\times/g, '\u00D7').replace(/\\div/g, '\u00F7').replace(/\\cdot/g, '\u00B7')
            .replace(/\\pm/g, '\u00B1').replace(/\\leq/g, '\u2264').replace(/\\geq/g, '\u2265')
            .replace(/\\neq/g, '\u2260').replace(/\\infty/g, '\u221E').replace(/\\theta/g, '\u03B8')
            .replace(/\\pi/g, '\u03C0').replace(/\\[a-zA-Z]+/g, '')
            .replace(/[{}\\_^\s]/g, '');
        return Math.max(5, cleaned.length);
    };

    // Componente: Contador de caracteres do editor (texto livre)
    const EditorCharCounter = ({ count, max }) => {
        const percentage = (count / max) * 100;
        const color = percentage >= 95 ? '#EF4444' : percentage >= 80 ? '#F59E0B' : '#718096';

        return (
            <View style={{ alignSelf: 'flex-end', marginTop: 3, backgroundColor: '#2D3748', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: percentage >= 95 ? '#EF444440' : percentage >= 80 ? '#F59E0B30' : '#4A5568' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color, fontVariant: ['tabular-nums'] }}>
                    {count}/{max}
                </Text>
            </View>
        );
    };
    // ================================================

    // Carregar dados do card
    useEffect(() => {
        const fetchCard = async () => {
            try {
                const allData = await getAppData();
                // Deep find
                const deck = allData.find(d => d.id === deckId);
                if (deck) {
                    const subject = deck.subjects.find(s => s.id === subjectId);
                    if (subject) {
                        const card = subject.flashcards.find(c => c.id === cardId);
                        if (card) {
                            setInitialQuestion(card.question);
                            setInitialAnswer(card.answer);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading card:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCard();
    }, [deckId, subjectId, cardId]);

    // Listener Teclado
    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardHeight(e.endCoordinates.height);
            mathToolbarRef.current?.forceClose();
            setMathToolbarVisible(false); // Fecha o menu de fórmulas ao teclado subir
        });
        const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    // Ocultar a TabBar quando estiver nesta tela
    useLayoutEffect(() => {
        const tabNavigator = navigation.getParent()?.getParent()?.getParent();
        if (tabNavigator) tabNavigator.setOptions({ tabBarStyle: { display: 'none' } });
        return () => { if (tabNavigator) tabNavigator.setOptions({ tabBarStyle: undefined }); };
    }, [navigation]);

    // Scroll only on keyboard open — NOT on toolbar open (would fire during animation)
    useEffect(() => {
        if (keyboardHeight > 0 && activeEditor === 'answer') {
            setTimeout(() => { scrollViewRef.current?.scrollToEnd({ animated: true }); }, 50);
        }
    }, [keyboardHeight, activeEditor]);

    const toggleMathToolbar = () => {
        Keyboard.dismiss();
        mathToolbarRef.current?.toggle();
    };

    const handleDismissKeyboard = () => {
        Keyboard.dismiss();
        if (isMathToolbarVisible) mathToolbarRef.current?.forceClose();
        setActiveEditor(null);
        questionEditorRef.current?.blur();
        answerEditorRef.current?.blur();
    };

    const handleInsertMath = (cmd) => {
        // Pre-check: bloqueia inserção se exceder limite de caracteres
        const charCount = activeEditor === 'answer' ? answerCharCount : questionCharCount;
        if (charCount + 5 > CHAR_LIMIT) return; // Fórmula padrão tem peso mínimo 5

        const target = activeEditor === 'answer' ? answerEditorRef.current : questionEditorRef.current;
        if (target) {
            if (cmd === '\\\\frac') target.insertFrac();
            else if (cmd === '\\\\sqrt') target.insertRoot();
            else if (cmd === 'x^2' || cmd === '²') target.insertSquared();
            else if (cmd === '\\\\log') target.insertLog();
            else if (cmd === '\\\\abs') target.insertAbs();
            else target.insertSymbol(cmd);
        }
    };

    // Draft updates not strictly needed for edit mode unless we want crash recovery, 
    // but we do need a way to get the final HTML.
    // We will use a ref to store current content as it changes.
    const currentContent = useRef({ question: '', answer: '' });

    // Update content ref on change - Initialize with loaded data once available
    useEffect(() => {
        currentContent.current.question = initialQuestion;
        currentContent.current.answer = initialAnswer;
    }, [initialQuestion, initialAnswer]);

    const onContentChange = (type, html) => {
        if (type === 'question') currentContent.current.question = html;
        else currentContent.current.answer = html;
    };

    const handleEditMath = (id, latex, source) => {
        setCurrentMathId(id);
        setCurrentLatex(latex);

        if (source === 'builder') {
            // Fórmula criada pelo modal avançado → reabre o FormulaBuilderModal
            setBuilderInitialLatex(latex);
            setBuilderVisible(true);
            return;
        }

        // Parsing simplificado (copiado do ManageFlashcards)
        let v1 = '', v2 = '';
        if (latex.includes('frac')) {
            const match = latex.match(/\\frac\{(.+?)\}\{(.+?)\}/);
            if (match) { v1 = match[1]; v2 = match[2]; }
        } else if (latex.includes('sqrt')) {
            const matchWithIndex = latex.match(/\\sqrt\[(.+?)\]\{(.+?)\}/);
            if (matchWithIndex) { v2 = matchWithIndex[1]; v1 = matchWithIndex[2]; }
            else { const matchSimple = latex.match(/\\sqrt\{(.+?)\}/); if (matchSimple) v1 = matchSimple[1]; }
        } else if (latex.includes('log')) {
            const match = latex.match(/\\log_\{(.+?)\}\{(.+?)\}/);
            if (match) { v1 = match[1]; v2 = match[2]; }
        } else if (latex.includes('^')) {
            const match = latex.match(/(.+?)\^\{?(.+?)\}?$/);
            if (match) { v1 = match[1]; v2 = match[2]; }
            else { const matchSimple = latex.match(/(.+?)\^(.+)/); if (matchSimple) { v1 = matchSimple[1]; v2 = matchSimple[2]; } }
        } else if (latex.includes('\\left|')) {
            const match = latex.match(/\\left\|(.+?)\\right\|/);
            if (match) { v1 = match[1]; }
        }
        if (v1 === '\\Box') v1 = ''; if (v2 === '\\Box') v2 = '';
        setEditValue1(v1); setEditValue2(v2);
        setEditModalVisible(true);
    };

    const handleSave = async () => {
        // Check protection first
        if (isDefaultDeck(deckId)) {
            const canEdit = await canEditDefaultDecks();
            if (!canEdit) {
                setAlertConfig({
                    visible: true,
                    title: "Card Protegido",
                    message: "Este card pertence a um deck padrão. Ative a edição nas configurações.",
                    buttons: [{ text: "OK", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
                });
                return;
            }
        }

        const q = currentContent.current.question;
        const a = currentContent.current.answer;

        // Validate
        const cleanQ = q.replace(/<[^>]*>/g, '').trim();
        const cleanA = a.replace(/<[^>]*>/g, '').trim();
        const hasMediaQ = q.includes('<img') || q.includes('math-atom');
        const hasMediaA = a.includes('<img') || a.includes('math-atom');

        if ((!cleanQ && !hasMediaQ) || (!cleanA && !hasMediaA)) {
            setAlertConfig({
                visible: true, title: 'Atenção', message: 'Preencha pergunta e resposta.',
                buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
            });
            return;
        }

        // Save
        const allData = await getAppData();
        const newData = allData.map(deck => {
            if (deck.id === deckId) {
                return {
                    ...deck,
                    subjects: deck.subjects.map(sub => {
                        if (sub.id === subjectId) {
                            return {
                                ...sub,
                                flashcards: sub.flashcards.map(c =>
                                    c.id === cardId ? { ...c, question: q, answer: a } : c
                                )
                            };
                        }
                        return sub;
                    })
                };
            }
            return deck;
        });

        await saveAppData(newData);
        navigation.goBack();
    };

    if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4A5568" /></View>;

    return (
        <View style={styles.baseContainer}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.formContainerNoPadding}
                    contentContainerStyle={[
                        styles.scrollContentContainer,
                        {
                            paddingBottom: keyboardHeight > 0 ? Math.max(20, keyboardHeight - 50) : 20,
                            flexGrow: 1
                        }
                    ]}
                    keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
                >
                    <View style={{ flex: 1 }}>
                        <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
                            <View style={{ marginBottom: 4, width: '100%' }}><Text style={styles.formLabel}>Frente</Text></View>
                        </TouchableWithoutFeedback>

                        <View style={styles.inputGroup}>
                            <View renderToHardwareTextureAndroid={true} style={{ borderWidth: 2, borderColor: activeEditor === 'question' ? '#4db6ac' : '#444', borderRadius: 8, height: 200, padding: 4, backgroundColor: '#2D3748', overflow: 'hidden' }}>
                                <IsolatedMathEditor
                                    editorRef={questionEditorRef}
                                    initialValue={initialQuestion}
                                    onContentChange={(html) => onContentChange('question', html)}
                                    onFocusCallback={() => setActiveEditor('question')}
                                    onEditMath={handleEditMath}
                                    onCharCount={(count) => setQuestionCharCount(count)}
                                    maxChars={CHAR_LIMIT}
                                />
                            </View>
                            <EditorCharCounter count={questionCharCount} max={CHAR_LIMIT} />
                        </View>

                        <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
                            <View style={{ marginBottom: 4, width: '100%', paddingTop: 16 }}><Text style={styles.formLabel}>Verso</Text></View>
                        </TouchableWithoutFeedback>

                        <View style={styles.inputGroup}>
                            <View renderToHardwareTextureAndroid={true} style={{ borderWidth: 2, borderColor: activeEditor === 'answer' ? '#4db6ac' : '#444', borderRadius: 8, height: 200, padding: 4, backgroundColor: '#2D3748', overflow: 'hidden' }}>
                                <IsolatedMathEditor
                                    editorRef={answerEditorRef}
                                    initialValue={initialAnswer}
                                    onContentChange={(html) => onContentChange('answer', html)}
                                    onFocusCallback={() => { setActiveEditor('answer'); setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150); }}
                                    onEditMath={handleEditMath}
                                    onCharCount={(count) => setAnswerCharCount(count)}
                                    maxChars={CHAR_LIMIT}
                                />
                            </View>
                            <EditorCharCounter count={answerCharCount} max={CHAR_LIMIT} />
                        </View>

                        <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
                            <View style={[styles.bottomControlsContainer, { width: '100%', paddingTop: 26, paddingBottom: 20 }]}>
                                <TouchableOpacity style={[styles.fxButton, isMathToolbarVisible && styles.fxButtonActive]} onPress={(e) => { e.stopPropagation(); toggleMathToolbar(); }}>
                                    <Text style={styles.fxButtonText}>f(x)</Text>
                                </TouchableOpacity>
                                <View style={styles.saveButtonContainer}>
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: '#4FD1C5',
                                            borderRadius: 4,
                                            paddingVertical: 8,
                                            paddingHorizontal: 16,
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        onPress={(e) => { e.stopPropagation(); handleSave(); }}
                                    >
                                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>SALVAR ALTERAÇÕES</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <MathToolbar
                ref={mathToolbarRef}
                onInsert={handleInsertMath}
                onOpen={() => setMathToolbarVisible(true)}
                onClose={() => setMathToolbarVisible(false)}
                onOpenAdvancedMode={() => {
                    mathToolbarRef.current?.forceClose();
                    setBuilderInitialLatex('');
                    setBuilderVisible(true);
                }}
            />

            {/* Modal de Edição (Cópia idêntica do ManageFlashcards - Melhor seria um componente separado mas inline funciona) */}
            <Modal animationType="fade" transparent={true} visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
                <View style={styles.modalOverlayFullscreen}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                        style={{ flex: 1 }}
                    >
                        <View style={styles.modalContentFullscreen}>
                            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                                {/* Header com título e ícone de ajuda */}
                                <View style={styles.modalHeaderFullscreen}>
                                    <Text style={styles.modalTitleFullscreen}>Editar Fórmula</Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setHelpPage(0); // Reset para primeira página
                                            setHelpModalVisible(true);
                                        }}
                                        style={styles.helpIcon}
                                    >
                                        <Ionicons name="help-circle-outline" size={24} color="#4FD1C5" />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.formLabel}>{currentLatex.includes('frac') ? 'Numerador' : (currentLatex.includes('^') ? 'Base' : (currentLatex.includes('log') ? 'Base' : 'Valor'))}</Text>
                                <Animated.View style={shakeStyle1}>
                                    <TextInput
                                        ref={modalInput1Ref}
                                        style={[
                                            styles.modalInputWithFocus,
                                            focusedInput === 1 && styles.modalInputFocusedGreen,
                                        ]}
                                        value={editValue1}
                                        onChangeText={(text) => {
                                            if (text.length > editValue1.length) {
                                                const newChar = text.slice(-1);
                                                const validation = validateInput(editValue1, newChar);
                                                if (validation.valid) {
                                                    setEditValue1(text);
                                                } else {
                                                    triggerShake(shakeAnim1);
                                                }
                                            } else {
                                                setEditValue1(text);
                                            }
                                        }}
                                        onFocus={() => setFocusedInput(1)}
                                        placeholder="Toque para editar..."
                                        placeholderTextColor="#718096"
                                        autoComplete="off"
                                        importantForAutofill="no"
                                    />
                                </Animated.View>
                                <SegmentedCounter text={editValue1} />

                                {(currentLatex.includes('frac') || currentLatex.includes('log') || currentLatex.includes('sqrt') || currentLatex.includes('^')) && (
                                    <>
                                        <Text style={[styles.formLabel, { marginTop: 12 }]}>{currentLatex.includes('log') ? 'Logaritmando' : (currentLatex.includes('sqrt') ? 'Índice' : (currentLatex.includes('^') ? 'Expoente' : 'Denominador'))}</Text>
                                        <Animated.View style={shakeStyle2}>
                                            <TextInput
                                                ref={modalInput2Ref}
                                                style={[
                                                    styles.modalInputWithFocus,
                                                    focusedInput === 2 && styles.modalInputFocusedGreen,
                                                ]}
                                                value={editValue2}
                                                onChangeText={(text) => {
                                                    if (text.length > editValue2.length) {
                                                        const newChar = text.slice(-1);
                                                        const validation = validateInput(editValue2, newChar);
                                                        if (validation.valid) {
                                                            setEditValue2(text);
                                                        } else {
                                                            triggerShake(shakeAnim2);
                                                        }
                                                    } else {
                                                        setEditValue2(text);
                                                    }
                                                }}
                                                onFocus={() => setFocusedInput(2)}
                                                placeholder="Toque para editar..."
                                                placeholderTextColor="#718096"
                                                autoComplete="off"
                                                importantForAutofill="no"
                                            />
                                        </Animated.View>
                                        <SegmentedCounter text={editValue2} />
                                    </>
                                )}

                                {/* Teclado colapsável sincronizado com ManageFlashcardsScreen */}
                                <CollapsibleKeypad inputNumber={focusedInput} />
                            </ScrollView>

                            <View style={{ marginTop: 16 }}>
                                <TouchableOpacity style={styles.modalButtonFullWidth} onPress={() => {
                                    // Valida se inputs terminam com separador decimal
                                    const val1Check = editValue1.trim();
                                    const val2Check = editValue2.trim();

                                    if (val1Check.endsWith(',') || val1Check.endsWith('.') ||
                                        val2Check.endsWith(',') || val2Check.endsWith('.')) {
                                        setAlertConfig({
                                            visible: true,
                                            title: 'Entrada Inválida',
                                            message: 'O número não pode terminar com vírgula ou ponto.',
                                            buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
                                        });
                                        return;
                                    }

                                    const val1 = editValue1.trim() === '' ? '\\Box' : editValue1;
                                    const val2 = editValue2.trim() === '' ? '\\Box' : editValue2;

                                    let newLatex = val1;
                                    if (currentLatex.includes('frac')) newLatex = `\\frac{${val1}}{${val2}}`;
                                    else if (currentLatex.includes('sqrt')) {
                                        if (val2 && val2 !== '\\Box' && editValue2.trim() !== '') {
                                            newLatex = `\\sqrt[${val2}]{${val1}}`;
                                        } else {
                                            newLatex = `\\sqrt{${val1}}`;
                                        }
                                    }
                                    else if (currentLatex.includes('^')) newLatex = `${val1}^{${(val2 === '' || val2 === '\\Box' ? '\\Box' : val2)}}`;
                                    else if (currentLatex.includes('log')) newLatex = `\\log_{${val1}}{${val2}}`;
                                    else if (currentLatex.includes('\\left|')) newLatex = `\\left|${val1}\\right|`;

                                    // Verifica se a fórmula editada excede o limite de caracteres
                                    const newWeight = calculateFormulaWeight(newLatex);
                                    const oldWeight = calculateFormulaWeight(currentLatex);
                                    const charCount = activeEditor === 'answer' ? answerCharCount : questionCharCount;
                                    const projected = charCount - oldWeight + newWeight;

                                    if (projected > CHAR_LIMIT) {
                                        setAlertConfig({
                                            visible: true,
                                            title: 'Limite Excedido',
                                            message: 'A fórmula excede o limite de caracteres. Simplifique o conteúdo.',
                                            buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
                                        });
                                        return;
                                    }

                                    (activeEditor === 'answer' ? answerEditorRef : questionEditorRef).current?.updateFormula(currentMathId, newLatex);
                                    setEditModalVisible(false);
                                }}>
                                    <Text style={styles.modalButtonTextFullWidth}>Confirmar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalButtonCancelFullWidth} onPress={() => setEditModalVisible(false)}>
                                    <Text style={styles.modalButtonTextFullWidth}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* ========== MONTADOR DE FÓRMULA LIVRE ========== */}
            < FormulaBuilderModal
                visible={builderVisible}
                initialFormula={builderInitialLatex}
                onConfirm={(latex) => {
                    const target = activeEditor === 'answer' ? answerEditorRef.current : questionEditorRef.current;
                    const charCount = activeEditor === 'answer' ? answerCharCount : questionCharCount;

                    if (currentMathId) {
                        // Modo edição — atualiza fórmula existente
                        const newWeight = calculateFormulaWeight(latex);
                        const oldWeight = calculateFormulaWeight(builderInitialLatex);
                        const projected = charCount - oldWeight + newWeight;
                        if (projected > CHAR_LIMIT) {
                            setAlertConfig({
                                visible: true,
                                title: 'Limite Excedido',
                                message: 'A fórmula excede o limite de caracteres. Simplifique o conteúdo.',
                                buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
                            });
                            return;
                        }
                        target?.updateFormula(currentMathId, latex);
                    } else {
                        // Modo criação — insere nova fórmula
                        const weight = calculateFormulaWeight(latex);
                        if (charCount + weight > CHAR_LIMIT) {
                            setAlertConfig({
                                visible: true,
                                title: 'Limite Excedido',
                                message: 'Sem espaço para esta fórmula. Tente reduzir o texto.',
                                buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
                            });
                            return;
                        }
                        target?.insertCustom(latex);
                    }

                    setBuilderVisible(false);
                    setCurrentMathId(null);
                    setBuilderInitialLatex('');
                }}
                onCancel={() => {
                    setBuilderVisible(false);
                    setCurrentMathId(null);
                    setBuilderInitialLatex('');
                }}
            />

            {/* ========== HELP MODAL (sincronizado com ManageFlashcardsScreen) ========== */}
            <Modal
                visible={helpModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setHelpModalVisible(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 20
                }}>
                    <View style={{
                        backgroundColor: '#1A202C',
                        borderRadius: 12,
                        padding: 24,
                        width: '90%',
                        maxWidth: 500,
                        borderWidth: 1,
                        borderColor: '#2D3748'
                    }}>
                        {/* Header */}
                        <View style={{ borderBottomWidth: 1, borderBottomColor: '#2D3748', paddingBottom: 12, marginBottom: 16 }}>
                            <Text style={{
                                fontSize: 20,
                                fontWeight: 'bold',
                                color: '#4FD1C5',
                                textAlign: 'center'
                            }}>Regras de Edição</Text>
                        </View>

                        {/* Conteúdo Paginado */}
                        <ScrollView style={{ maxHeight: 400 }}>
                            {helpPage === 0 ? (
                                // Página 1: Regras Básicas
                                <View>
                                    <Text style={{
                                        fontSize: 16,
                                        fontWeight: 'bold',
                                        color: '#E2E8F0',
                                        marginBottom: 8
                                    }}>🔢 NÚMEROS</Text>
                                    <Text style={{ fontSize: 14, color: '#CBD5E0', marginBottom: 4 }}>• Sem letras: até 10 dígitos</Text>
                                    <Text style={{ fontSize: 14, color: '#CBD5E0', marginBottom: 4 }}>• Com letras: até 3 dígitos</Text>

                                    <Text style={{
                                        fontSize: 16,
                                        fontWeight: 'bold',
                                        color: '#E2E8F0',
                                        marginTop: 16,
                                        marginBottom: 8
                                    }}>🔤 LETRAS</Text>
                                    <Text style={{ fontSize: 14, color: '#CBD5E0', marginBottom: 4 }}>• Máximo 2 letras por entrada</Text>
                                    <Text style={{ fontSize: 14, color: '#CBD5E0', marginBottom: 4 }}>• Número antes de letra precisa de símbolo</Text>
                                    <Text style={{ fontSize: 13, color: '#A0AEC0', marginLeft: 8 }}>  Exemplo: 1+a ✓  |  1a ✗</Text>

                                    <Text style={{
                                        fontSize: 16,
                                        fontWeight: 'bold',
                                        color: '#E2E8F0',
                                        marginTop: 16,
                                        marginBottom: 8
                                    }}>➕ SÍMBOLOS BÁSICOS</Text>
                                    <Text style={{ fontSize: 14, color: '#CBD5E0', marginBottom: 4 }}>• Máximo 2 de cada tipo (+, -, ×, ÷, ^, _, (, ))</Text>
                                    <Text style={{ fontSize: 14, color: '#CBD5E0', marginBottom: 4 }}>• Sem símbolos consecutivos</Text>
                                    <Text style={{ fontSize: 13, color: '#A0AEC0', marginLeft: 8 }}>  Exemplo: 2++3 ✗</Text>
                                </View>
                            ) : (
                                // Página 2: Regras Avançadas
                                <View>
                                    <Text style={{
                                        fontSize: 16,
                                        fontWeight: 'bold',
                                        color: '#E2E8F0',
                                        marginBottom: 8
                                    }}>🎯 INÍCIO DA ENTRADA</Text>
                                    <Text style={{ fontSize: 14, color: '#CBD5E0', marginBottom: 4 }}>• Pode começar com: +, -, (, )</Text>
                                    <Text style={{ fontSize: 14, color: '#CBD5E0', marginBottom: 4 }}>• Não pode começar com: vírgula, ponto</Text>

                                    <Text style={{
                                        fontSize: 16,
                                        fontWeight: 'bold',
                                        color: '#E2E8F0',
                                        marginTop: 16,
                                        marginBottom: 8
                                    }}>🔣 SEPARADORES (vírgula e ponto)</Text>
                                    <Text style={{ fontSize: 14, color: '#CBD5E0', marginBottom: 4 }}>• Máximo 2 separadores no total</Text>
                                    <Text style={{ fontSize: 14, color: '#CBD5E0', marginBottom: 4 }}>• Não pode começar com separador</Text>
                                    <Text style={{ fontSize: 14, color: '#CBD5E0', marginBottom: 4 }}>• Não pode terminar com separador</Text>
                                    <Text style={{ fontSize: 13, color: '#A0AEC0', marginLeft: 8, marginTop: 4 }}>  Exemplos:</Text>
                                    <Text style={{ fontSize: 13, color: '#A0AEC0', marginLeft: 8 }}>  3,14 ✓  |  0,5 ✓</Text>
                                    <Text style={{ fontSize: 13, color: '#A0AEC0', marginLeft: 8 }}>  ,5 ✗  |  5, ✗  |  3,1,4 ✗</Text>

                                    <Text style={{
                                        fontSize: 16,
                                        fontWeight: 'bold',
                                        color: '#E2E8F0',
                                        marginTop: 16,
                                        marginBottom: 8
                                    }}>🚫 BLOQUEIOS</Text>
                                    <Text style={{ fontSize: 14, color: '#CBD5E0', marginBottom: 4 }}>• Ponto e vírgula (;) não permitido</Text>
                                    <Text style={{ fontSize: 14, color: '#CBD5E0', marginBottom: 4 }}>• Confirmação bloqueada se terminar com , ou .</Text>
                                </View>
                            )}
                        </ScrollView>

                        {/* Navegação e Botões */}
                        <View style={{ marginTop: 16 }}>
                            {/* Indicador de Página */}
                            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12 }}>
                                <View style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: helpPage === 0 ? '#4FD1C5' : '#4A5568',
                                    marginHorizontal: 4
                                }} />
                                <View style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: helpPage === 1 ? '#4FD1C5' : '#4A5568',
                                    marginHorizontal: 4
                                }} />
                            </View>

                            {/* Botões */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                                {helpPage === 0 ? (
                                    <TouchableOpacity
                                        onPress={() => setHelpPage(1)}
                                        style={{
                                            flex: 1,
                                            backgroundColor: '#2D3748',
                                            paddingVertical: 10,
                                            paddingHorizontal: 16,
                                            borderRadius: 8,
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Text style={{ color: '#E2E8F0', fontSize: 15, fontWeight: '600' }}>Mais Detalhes ➡️</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        onPress={() => setHelpPage(0)}
                                        style={{
                                            flex: 1,
                                            backgroundColor: '#2D3748',
                                            paddingVertical: 10,
                                            paddingHorizontal: 16,
                                            borderRadius: 8,
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Text style={{ color: '#E2E8F0', fontSize: 15, fontWeight: '600' }}>⬅️ Voltar</Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    onPress={() => setHelpModalVisible(false)}
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#4FD1C5',
                                        paddingVertical: 10,
                                        paddingHorizontal: 16,
                                        borderRadius: 8,
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', textAlign: 'center' }}>Entendi</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* ========== FIM DO HELP MODAL ========== */}

            < CustomAlert {...alertConfig} onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))} />
        </View >
    );
};
// =================================================================

export default EditFlashcardScreen;
