import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Modal, TouchableWithoutFeedback, TextInput, Button, Keyboard } from 'react-native';
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

    const [builderVisible, setBuilderVisible] = useState(false); // Montador de fórmula livre
    const [builderInitialLatex, setBuilderInitialLatex] = useState('');


    // Estados para limite de caracteres
    const [questionCharCount, setQuestionCharCount] = useState(0);
    const [answerCharCount, setAnswerCharCount] = useState(0);
    const CHAR_LIMIT = 800;



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
                                            setAlertConfig({
                                                visible: true,
                                                title: 'Regras de Edição',
                                                message: '📊 NÚMEROS: Até 10 caracteres\n(Ex: 123, 3.14, -5, 999999999)\n\n📝 LETRAS: Até 2 caracteres\n(Ex: x, y, ab, π)\n\n💡 O sistema detecta automaticamente o tipo!',
                                                buttons: [{ text: 'Entendi', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
                                            });
                                        }}
                                        style={styles.helpIcon}
                                    >
                                        <Ionicons name="help-circle-outline" size={24} color="#4FD1C5" />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.formLabel}>{currentLatex.includes('frac') ? 'Numerador' : (currentLatex.includes('^') ? 'Base' : (currentLatex.includes('log') ? 'Base' : 'Valor'))}</Text>
                                <Animated.View style={[styles.inputWrapper, shakeStyle1]}>
                                    <TextInput
                                        style={[styles.formInput, styles.formInputWithCounter, styles.modalInputFocused]}
                                        value={editValue1}
                                        onChangeText={(text) => {
                                            const maxLen = isNumericContent(text) ? 10 : 2;
                                            if (text.length <= maxLen) {
                                                setEditValue1(text);
                                            } else {
                                                triggerShake(shakeAnim1);
                                            }
                                        }}
                                        placeholder="Valor..."
                                        autoFocus={true}
                                        autoComplete="off"
                                        importantForAutofill="no"
                                    />
                                    <CharacterCounter
                                        current={editValue1.length}
                                        max={isNumericContent(editValue1) ? 10 : 2}
                                    />
                                </Animated.View>

                                {(currentLatex.includes('frac') || currentLatex.includes('log') || currentLatex.includes('sqrt') || currentLatex.includes('^')) && (
                                    <>
                                        <Text style={styles.formLabel}>{currentLatex.includes('log') ? 'Logaritmando' : (currentLatex.includes('sqrt') ? 'Índice' : (currentLatex.includes('^') ? 'Expoente' : 'Denominador'))}</Text>
                                        <Animated.View style={[styles.inputWrapper, shakeStyle2]}>
                                            <TextInput
                                                style={[styles.formInput, styles.formInputWithCounter, styles.modalInputFocused]}
                                                value={editValue2}
                                                onChangeText={(text) => {
                                                    const maxLen = isNumericContent(text) ? 10 : 2;
                                                    if (text.length <= maxLen) {
                                                        setEditValue2(text);
                                                    } else {
                                                        triggerShake(shakeAnim2);
                                                    }
                                                }}
                                                placeholder="Valor..."
                                                autoComplete="off"
                                                importantForAutofill="no"
                                            />
                                            <CharacterCounter
                                                current={editValue2.length}
                                                max={isNumericContent(editValue2) ? 10 : 2}
                                            />
                                        </Animated.View>
                                    </>
                                )}
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

            < CustomAlert {...alertConfig} onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))} />
        </View >
    );
};
// =================================================================

export default EditFlashcardScreen;
