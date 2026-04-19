import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Button, Vibration, ToastAndroid } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getAppData, saveAppData } from '../services/storage';
import { isDefaultDeck, canEditDefaultDecks } from '../config/constants';
import { HybridEditor } from '../components/editor/HybridEditor';
import { MathToolbar } from '../components/editor/MathToolbar';
import { FormulaBuilderModal } from '../components/editor/FormulaBuilderModal';
import { IsolatedMathEditor } from '../components/editor/IsolatedMathEditor';
import { SkeletonItem } from '../components/ui/SkeletonItem';
import { CustomAlert } from '../components/ui/CustomAlert';
import { SegmentedCounter } from '../components/editor/SegmentedCounter';
import { CollapsibleKeypad } from '../components/editor/CollapsibleKeypad';
import { validateInput, getButtonStates } from '../utils/inputValidation';
import styles from '../styles/globalStyles';
import theme from '../styles/theme';
import { Canvas, Circle, BlurMask } from '@shopify/react-native-skia';

export const ManageFlashcardsScreen = ({ route, navigation }) => {
  const { deckId, subjectId, preloadedCards, cardId, subjectName } = route.params; // cardId opcional para modo edição
  const insets = useSafeAreaInsets();

  const questionEditorRef = useRef(null);
  const answerEditorRef = useRef(null);
  const scrollViewRef = useRef(null);
  const mathToolbarRef = useRef(null);
  const pendingToolbarOpen = useRef(false);
  const keyboardVisibleRef = useRef(false);

  const [activeEditor, setActiveEditor] = useState(null);
  const [isMathToolbarVisible, setMathToolbarVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  // QoL: contador de cards da matéria
  const [subjectCardCount, setSubjectCardCount] = useState(0);
  // QoL: nome da matéria buscado dos dados (fallback ao param)
  const [resolvedSubjectName, setResolvedSubjectName] = useState(subjectName || '');
  // QoL: toast de card salvo (melhoria 1 — salvar+ficar)
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const saveToastTimer = useRef(null);
  // QoL: clear/undo por campo
  const [questionUndoMode, setQuestionUndoMode] = useState(false);
  const [answerUndoMode, setAnswerUndoMode] = useState(false);
  const questionUndoTimer = useRef(null);
  const answerUndoTimer = useRef(null);
  const questionUndoSnapshot = useRef('');
  const answerUndoSnapshot = useRef('');
  // QoL: clipboard
  const [clipboardText, setClipboardText] = useState('');

  // Estados para teclado colapsável do modal
  const [showLettersPanel, setShowLettersPanel] = useState(false);
  const [showSymbolsPanel, setShowSymbolsPanel] = useState(false);
  const [focusedInput, setFocusedInput] = useState(1); // 1 ou 2 (editValue3 removido)
  const [builderVisible, setBuilderVisible] = useState(false); // Montador de fórmula livre
  const [builderInitialLatex, setBuilderInitialLatex] = useState(''); // LaTeX inicial (edição)
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [helpPage, setHelpPage] = useState(0); // 0 = página 1, 1 = página 2

  // Refs para inputs do modal
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

  // ========== HELPER FUNCTIONS (importados de shared) ==========
  // validateInput e getButtonStates agora vêm de src/utils/inputValidation.js

  // Handler de inserção com validação (ADAPTADO: apenas 2 inputs)
  const handleValidatedInsert = (char, inputNumber) => {
    const currentValue = inputNumber === 1 ? editValue1 : editValue2;
    const setValue = inputNumber === 1 ? setEditValue1 : setEditValue2;
    const shakeAnim = inputNumber === 1 ? shakeAnim1 : shakeAnim2;

    const validation = validateInput(currentValue, char);

    if (validation.valid) {
      setValue(currentValue + char);
    } else {
      // Feedback visual: shake
      triggerShake(shakeAnim);
    }
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

  // Componente: Contador de caracteres com feedback visual (legado - mantido para compatibilidade)
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
    const color = percentage >= 95 ? theme.danger : percentage >= 80 ? theme.warning : theme.textSecondary;
    const slash = percentage >= 95 ? theme.danger : percentage >= 80 ? theme.warning : theme.primary;
    return (
      <Text style={{ fontSize: 13, fontFamily: theme.fontFamily.uiSemiBold, color, fontVariant: ['tabular-nums'] }}>
        {count}<Text style={{ color: slash, fontFamily: theme.fontFamily.uiMedium }}> / </Text>{max}
      </Text>
    );
  };

  // SegmentedCounter agora vem de src/components/editor/SegmentedCounter.js
  // CollapsibleKeypad agora vem de src/components/editor/CollapsibleKeypad.js

  // Helper para vibração (usado em outros lugares)
  const tap = () => { try { Vibration.vibrate(12); } catch (_) { } };
  // ================================================

  // Estados para modo edição (quando cardId existe)
  const isEditMode = !!cardId;
  const [initialQuestion, setInitialQuestion] = useState('');
  const [initialAnswer, setInitialAnswer] = useState('');
  const [cardDataLoaded, setCardDataLoaded] = useState(!isEditMode); // Se não está em modo edição, já está "carregado"

  // Chave do draft diferente para criação vs edição
  const draftKey = isEditMode ? `${deckId}-${subjectId}-${cardId}` : `${deckId}-${subjectId}`;

  // Check cache to skip skeleton on subsequent visits
  const cacheKey = `${deckId}-${subjectId}`; // Cache usa sempre a mesma chave (sem cardId)
  const [loading, setLoading] = useState(!global.screenCache.manageFlashcards.has(cacheKey));

  // Simulate loading delay ONLY if not cached
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoading(false);
        global.screenCache.manageFlashcards.add(cacheKey); // Mark as visited
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, cacheKey]);

  // Carregar dados do card quando em modo edição
  useEffect(() => {
    if (isEditMode && cardId) {
      const fetchCard = async () => {
        try {
          const allData = await getAppData();
          const deck = allData.find(d => d.id === deckId);
          if (deck) {
            const subject = deck.subjects.find(s => s.id === subjectId);
            if (subject) {
              const card = subject.flashcards.find(c => c.id === cardId);
              if (card) {
                setInitialQuestion(card.question);
                setInitialAnswer(card.answer);

                // Inicializa o draft com o conteúdo do card para edição
                const key = draftKey;
                if (!global.flashcardDrafts) global.flashcardDrafts = {};
                global.flashcardDrafts[key] = {
                  question: card.question,
                  answer: card.answer
                };

                // Marca que os dados foram carregados
                setCardDataLoaded(true);
              }
            }
          }
        } catch (error) {
          console.error('Error loading card for edit:', error);
          setCardDataLoaded(true); // Mesmo com erro, libera a tela
        }
      };
      fetchCard();
    }
  }, [isEditMode, cardId, deckId, subjectId, draftKey]);

  // Busca nome da matéria e contador de cards
  useEffect(() => {
    const fetchSubjectInfo = async () => {
      try {
        const allData = await getAppData();
        const deck = allData.find(d => d.id === deckId);
        if (deck) {
          const subject = deck.subjects.find(s => s.id === subjectId);
          if (subject) {
            if (!subjectName) setResolvedSubjectName(subject.name || '');
            setSubjectCardCount(subject.flashcards?.length || 0);
          }
        }
      } catch (_) { }
    };
    fetchSubjectInfo();
  }, [deckId, subjectId]);

  // Checa clipboard ao montar e ao focar na tela
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const hasString = await Clipboard.hasStringAsync();
        if (hasString) {
          const text = await Clipboard.getStringAsync();
          setClipboardText(text || '');
        } else {
          setClipboardText('');
        }
      } catch (_) {
        setClipboardText('');
      }
    };
    checkClipboard();
    // Recheca quando a tela recebe foco (usuário pode ter copiado algo)
    const unsubscribe = navigation.addListener('focus', checkClipboard);
    return unsubscribe;
  }, [navigation]);

  // Cleanup de timers ao desmontar a tela
  useEffect(() => {
    return () => {
      clearTimeout(saveToastTimer.current);
      clearTimeout(questionUndoTimer.current);
      clearTimeout(answerUndoTimer.current);
    };
  }, []);

  // Listener para detectar quando o teclado abre/fecha
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        keyboardVisibleRef.current = true;
        setKeyboardHeight(e.endCoordinates.height);
        mathToolbarRef.current?.forceClose();
        setMathToolbarVisible(false);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        keyboardVisibleRef.current = false;
        setKeyboardHeight(0);
        // Recheca clipboard quando teclado fecha (usuário pode ter copiado algo do editor)
        Clipboard.hasStringAsync().then(has => {
          if (has) Clipboard.getStringAsync().then(t => { if (t !== clipboardText) setClipboardText(t || ''); });
          else if (clipboardText) setClipboardText('');
        }).catch(() => { });
        if (pendingToolbarOpen.current) {
          // Transição teclado→toolbar: mantém posição do scroll (evita salto visual)
          pendingToolbarOpen.current = false;
          mathToolbarRef.current?.toggle();
        } else {
          scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        }
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Header Button for History (apenas no modo criação)
  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Editar Flashcard' : 'Criar Flashcard',
      headerRight: isEditMode ? undefined : () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('FlashcardHistory', {
            deckId: deckId,
            subjectId: subjectId
          })}
          style={{ marginRight: 15 }}
        >
          <Ionicons name="create-outline" size={24} color="white" />
        </TouchableOpacity>
      )
    });
  }, [navigation, deckId, subjectId, isEditMode]);

  // Ocultar a TabBar quando estiver nesta tela
  useLayoutEffect(() => {
    // Navegação: Stack -> Drawer -> Tab
    // Precisamos subir 3 níveis para chegar no TabNavigator
    const tabNavigator = navigation.getParent()?.getParent()?.getParent();

    if (tabNavigator) {
      tabNavigator.setOptions({
        tabBarStyle: { display: 'none' }
      });
    }

    return () => {
      if (tabNavigator) {
        tabNavigator.setOptions({
          tabBarStyle: undefined // Reseta para o padrão (visível)
        });
      }
    };
  }, [navigation]);

  // Scroll quando o TECLADO abre no input de baixo
  useEffect(() => {
    if (keyboardHeight > 0 && activeEditor === 'answer') {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [keyboardHeight, activeEditor]);

  // Scroll quando o MATH TOOLBAR abre (apenas para o input "verso")
  useEffect(() => {
    if (isMathToolbarVisible && activeEditor === 'answer') {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200); // Scroll rápido e responsivo
    }
  }, [isMathToolbarVisible, activeEditor]);

  const toggleMathToolbar = () => {
    if (!isMathToolbarVisible) {
      if (keyboardVisibleRef.current) {
        // Teclado aberto: blur nos editors (WebView) + agenda toolbar para quando fechar
        pendingToolbarOpen.current = true;
        questionEditorRef.current?.blur();
        answerEditorRef.current?.blur();
        Keyboard.dismiss();
      } else {
        mathToolbarRef.current?.toggle();
        if (activeEditor === 'answer') {
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        }
      }
    } else {
      Keyboard.dismiss();
      mathToolbarRef.current?.toggle();
    }
  };

  const handleDismissKeyboard = () => {
    Keyboard.dismiss();
    if (isMathToolbarVisible) mathToolbarRef.current?.forceClose();
    setActiveEditor(null);
    questionEditorRef.current?.blur();
    answerEditorRef.current?.blur();
  };

  const handleInsertMath = (cmd) => {
    // Abre o montador de fórmula livre
    if (cmd === '\\\\builder') {
      setCurrentMathId(null);
      setBuilderInitialLatex('');
      setBuilderVisible(true);
      return;
    }

    // Pre-check: bloqueia inserção se exceder limite de caracteres
    const charCount = activeEditor === 'answer' ? answerCharCount : questionCharCount;
    if (charCount + 5 > CHAR_LIMIT) return; // Fórmula padrão tem peso mínimo 5

    const target = activeEditor === 'answer' ? answerEditorRef.current : questionEditorRef.current;
    if (target) {
      if (cmd === '\\\\frac') target.insertFrac();
      else if (cmd === '\\\\sqrt') target.insertRoot();
      else if (cmd === '\\\\sqrt') target.insertRoot();
      else if (cmd === 'x^2' || cmd === '²') target.insertSquared(); // Usando insertSquared agora
      else if (cmd === '\\\\log') target.insertLog();
      else if (cmd === '\\\\sub') target.insertSub();
      else if (cmd === '\\\\abs') target.insertAbs();
      else target.insertSymbol(cmd);
    }
  };

  // Draft State
  const [draftQuestion, setDraftQuestion] = useState('');
  const [draftAnswer, setDraftAnswer] = useState('');

  // Load Draft Logic
  // We don't need to load into state because we pass global.flashcardDrafts directly to initialValue prop
  // of IsolatedMathEditor.

  // Sync Draft State Live
  const updateDraft = (type, content) => {
    if (!global.flashcardDrafts) global.flashcardDrafts = {};
    const key = draftKey;

    // Ensure object exists
    if (!global.flashcardDrafts[key]) global.flashcardDrafts[key] = { question: '', answer: '' };

    // Limpeza inteligente: Se o conteúdo for só espaços/HTML vazio, salvamos como ""
    // Isso garante que ao voltar para a tela, o placeholder apareça.
    const cleanContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    const hasMedia = content.includes('<img') || content.includes('math-atom');

    const valueToSave = (!cleanContent && !hasMedia) ? "" : content;

    if (type === 'question') {
      global.flashcardDrafts[key].question = valueToSave;
    } else {
      global.flashcardDrafts[key].answer = valueToSave;
    }
  };

  // Clear draft on successful save
  const clearDraft = () => {
    if (!global.flashcardDrafts) return;
    const key = draftKey;
    delete global.flashcardDrafts[key];
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

    // Fórmula criada por botão do toolbar → abre o modal inline simples
    let v1 = '', v2 = '', v3 = '';

    if (latex.includes('\\left(') && latex.includes('frac')) {
      const match = latex.match(/\\left\(\\frac\{(.+?)\}\{(.+?)\}\\right\)\^\{(.+?)\}/);
      if (match) { v1 = match[1]; v2 = match[2]; v3 = match[3]; }
    } else if (latex.includes('frac')) {
      const match = latex.match(/\\frac\{(.+?)\}\{(.+?)\}/);
      if (match) { v1 = match[1]; v2 = match[2]; }
    } else if (latex.includes('sqrt')) {
      const matchWithIndex = latex.match(/\\sqrt\[(.+?)\]\{(.+?)\}/);
      if (matchWithIndex) { v2 = matchWithIndex[1]; v1 = matchWithIndex[2]; }
      else {
        const matchSimple = latex.match(/\\sqrt\{(.+?)\}/);
        if (matchSimple) v1 = matchSimple[1];
      }
    } else if (latex.includes('log')) {
      const match = latex.match(/\\log_\{(.+?)\}\{(.+?)\}/);
      if (match) { v1 = match[1]; v2 = match[2]; }
    } else if (latex.includes('^')) {
      const match = latex.match(/(.+?)\^\{?(.+?)\}?$/);
      if (match) { v1 = match[1]; v2 = match[2]; }
      else {
        const matchSimple = latex.match(/(.+?)\^(.+)/);
        if (matchSimple) { v1 = matchSimple[1]; v2 = matchSimple[2]; }
      }
    } else if (latex.includes('_{')) {
      const match = latex.match(/(.+?)_\{(.+?)\}/);
      if (match) { v1 = match[1]; v2 = match[2]; }
    } else if (latex.includes('\\left|')) {
      const match = latex.match(/\\left\|(.+?)\\right\|/);
      if (match) { v1 = match[1]; }
    }

    if (v1 === '\\Box') v1 = '';
    if (v2 === '\\Box') v2 = '';
    if (v3 === '\\Box') v3 = '';

    setEditValue1(v1);
    setEditValue2(v2);
    setEditModalVisible(true);
  };

  // Trim de HTML: remove espaços/quebras no início e fim do conteúdo do editor
  const trimHtml = (html) => {
    if (!html) return html;
    return html
      .replace(/^(\s|<br\s*\/?>|&nbsp;)+/i, '')
      .replace(/(\s|<br\s*\/?>|&nbsp;)+$/i, '')
      .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');
  };

  const validateAndGetContent = () => {
    const key = draftKey;
    const rawQ = global.flashcardDrafts?.[key]?.question || "";
    const rawA = global.flashcardDrafts?.[key]?.answer || "";
    const currentQuestionHtml = trimHtml(rawQ);
    const currentAnswerHtml = trimHtml(rawA);
    const cleanQ = currentQuestionHtml.replace(/<[^>]*>/g, '').trim();
    const cleanA = currentAnswerHtml.replace(/<[^>]*>/g, '').trim();
    const hasMediaQ = currentQuestionHtml.includes('<img') || currentQuestionHtml.includes('math-atom');
    const hasMediaA = currentAnswerHtml.includes('<img') || currentAnswerHtml.includes('math-atom');
    if ((!cleanQ && !hasMediaQ) || (!cleanA && !hasMediaA)) return null;
    return { currentQuestionHtml, currentAnswerHtml };
  };

  const persistSave = async (questionHtml, answerHtml) => {
    const allData = await getAppData();
    const newData = allData.map(deck => {
      if (deck.id === deckId) {
        return {
          ...deck,
          subjects: deck.subjects.map(subject => {
            if (subject.id === subjectId) {
              if (isEditMode && cardId) {
                return {
                  ...subject,
                  flashcards: subject.flashcards.map(card =>
                    card.id === cardId
                      ? { ...card, question: questionHtml, answer: answerHtml }
                      : card
                  ),
                };
              } else {
                return {
                  ...subject,
                  flashcards: [
                    ...subject.flashcards,
                    {
                      id: Date.now().toString(),
                      question: questionHtml,
                      answer: answerHtml,
                      level: 0, points: 0, lastReview: null, nextReview: null,
                    },
                  ],
                };
              }
            }
            return subject;
          })
        };
      }
      return deck;
    });
    await saveAppData(newData);
    return newData;
  };

  const showEmptyAlert = () => setAlertConfig({
    visible: true,
    title: 'Atenção',
    message: 'Por favor, preencha a pergunta e a resposta.',
    buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
  });

  const handleSave = async () => {
    const content = validateAndGetContent();
    if (!content) { showEmptyAlert(); return; }
    await persistSave(content.currentQuestionHtml, content.currentAnswerHtml);
    clearDraft();
    navigation.goBack();
  };

  const handleSaveAndContinue = async () => {
    const content = validateAndGetContent();
    if (!content) { showEmptyAlert(); return; }
    const newData = await persistSave(content.currentQuestionHtml, content.currentAnswerHtml);
    clearDraft();

    // Atualiza contador
    const updatedDeck = newData?.find(d => d.id === deckId);
    const updatedSubject = updatedDeck?.subjects?.find(s => s.id === subjectId);
    if (updatedSubject) setSubjectCardCount(updatedSubject.flashcards?.length || 0);

    // Limpa os editores
    questionEditorRef.current?.clear();
    answerEditorRef.current?.clear();
    setQuestionCharCount(0);
    setAnswerCharCount(0);

    // Reinicia o draft vazio para o próximo card
    if (!global.flashcardDrafts) global.flashcardDrafts = {};
    global.flashcardDrafts[draftKey] = { question: '', answer: '' };

    // Mostra toast
    if (Platform.OS === 'android') {
      ToastAndroid.show('Card salvo!', ToastAndroid.SHORT);
    } else {
      setSaveToastVisible(true);
      clearTimeout(saveToastTimer.current);
      saveToastTimer.current = setTimeout(() => setSaveToastVisible(false), 2000);
    }
  };

  const getFieldRefs = (field) => field === 'question'
    ? { editorRef: questionEditorRef, undoSnapshot: questionUndoSnapshot, undoTimer: questionUndoTimer, setCharCount: setQuestionCharCount, setUndoMode: setQuestionUndoMode }
    : { editorRef: answerEditorRef, undoSnapshot: answerUndoSnapshot, undoTimer: answerUndoTimer, setCharCount: setAnswerCharCount, setUndoMode: setAnswerUndoMode };

  const handleClearField = (field) => {
    if (!global.flashcardDrafts?.[draftKey]) return;
    const { editorRef, undoSnapshot, undoTimer, setCharCount, setUndoMode } = getFieldRefs(field);
    undoSnapshot.current = global.flashcardDrafts[draftKey][field] || '';
    global.flashcardDrafts[draftKey][field] = '';
    editorRef.current?.clear();
    setCharCount(0);
    setUndoMode(true);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => { setUndoMode(false); undoSnapshot.current = ''; }, 4000);
  };

  const handleUndoClear = (field) => {
    if (!global.flashcardDrafts?.[draftKey]) return;
    const { editorRef, undoSnapshot, undoTimer, setUndoMode } = getFieldRefs(field);
    const snap = undoSnapshot.current;
    global.flashcardDrafts[draftKey][field] = snap;
    editorRef.current?.setContent(snap);
    clearTimeout(undoTimer.current);
    setUndoMode(false);
    undoSnapshot.current = '';
  };

  const handlePasteClipboard = (field) => {
    if (!clipboardText) return;
    if (!global.flashcardDrafts) global.flashcardDrafts = {};
    if (!global.flashcardDrafts[draftKey]) global.flashcardDrafts[draftKey] = { question: '', answer: '' };
    const { editorRef } = getFieldRefs(field);
    const escaped = clipboardText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    const current = global.flashcardDrafts[draftKey][field] || '';
    const newContent = current ? current + ' ' + escaped : escaped;
    global.flashcardDrafts[draftKey][field] = newContent;
    editorRef.current?.setContent(newContent);
  };

  const FieldActions = ({ field, charCount, undoMode }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {clipboardText.length > 0 && (
        <TouchableOpacity onPress={() => handlePasteClipboard(field)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(93,214,44,0.4)', backgroundColor: 'transparent' }}>
          <Ionicons name="clipboard-outline" size={11} color={theme.primary} />
          <Text style={{ fontSize: theme.fontSize.xs, fontFamily: theme.fontFamily.uiSemiBold, color: theme.primary }}>Colar</Text>
        </TouchableOpacity>
      )}
      {(charCount > 0 || undoMode) && (
        <TouchableOpacity onPress={() => undoMode ? handleUndoClear(field) : handleClearField(field)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: undoMode ? 'rgba(210,153,34,0.4)' : 'rgba(248,81,73,0.4)', backgroundColor: 'transparent' }}>
          <Ionicons name={undoMode ? 'arrow-undo-outline' : 'trash-outline'} size={11} color={undoMode ? theme.warning : theme.danger} />
          <Text style={{ fontSize: theme.fontSize.xs, fontFamily: theme.fontFamily.uiSemiBold, color: undoMode ? theme.warning : theme.danger }}>
            {undoMode ? 'Desfazer' : 'Limpar'}
          </Text>
        </TouchableOpacity>
      )}
      <EditorCharCounter count={charCount} max={CHAR_LIMIT} />
    </View>
  );

  return (
    <View style={styles.baseContainer}>
      {(loading || !cardDataLoaded) ? (
        <View style={{ padding: 20 }}>
          <SkeletonItem style={{ width: 100, height: 20, marginBottom: 10, borderRadius: 4 }} />
          <SkeletonItem style={{ width: '100%', height: 200, marginBottom: 20, borderRadius: 8 }} />
          <SkeletonItem style={{ width: 100, height: 20, marginBottom: 10, borderRadius: 4 }} />
          <SkeletonItem style={{ width: '100%', height: 200, marginBottom: 20, borderRadius: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <SkeletonItem style={{ width: 60, height: 50, borderRadius: 25 }} />
            <SkeletonItem style={{ width: 150, height: 50, borderRadius: 8 }} />
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {!isEditMode && (
            <View style={{ paddingHorizontal: 20, paddingVertical: 14, backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: theme.backgroundTertiary }}>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.75 }}>
                <Ionicons name="folder" size={15} color={theme.primary} />
                <Text style={{ fontSize: theme.fontSize.caption, fontFamily: theme.fontFamily.uiBold, color: theme.textPrimary, lineHeight: theme.fontSize.caption }} numberOfLines={1}>
                  {resolvedSubjectName || ''}
                </Text>
                <View style={{ width: 1.5, height: 16, backgroundColor: theme.primary }} />
                <Ionicons name="layers" size={15} color={theme.primary} />
                <Text style={{ fontSize: theme.fontSize.caption, fontFamily: theme.fontFamily.uiBold, color: theme.textPrimary, lineHeight: theme.fontSize.caption }}>
                  card nº{subjectCardCount + 1}
                </Text>
              </View>
            </View>
          )}
          <ScrollView
            ref={scrollViewRef}
            style={styles.formContainerNoPadding}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContentContainer,
              {
                paddingTop: 8,
                paddingBottom: keyboardHeight > 0
                  ? Math.max(10, keyboardHeight - (insets.bottom > 30 ? 95 : 84))
                  : isMathToolbarVisible
                    ? (insets.bottom > 30 ? 234 : 277)
                    : 10,
                flexGrow: 1
              }
            ]}
            scrollEnabled={keyboardHeight > 0 || isMathToolbarVisible}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={{ flex: 1, paddingTop: 0, paddingBottom: 16 }}>
              {/* Área clicável acima da caixa de pergunta */}
              <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
                <View style={{ height: 12 }} />
              </TouchableWithoutFeedback>


              {/* PERGUNTA */}
              <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
                <View style={{ marginBottom: 8, marginTop: 4, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 12, height: 12 }}>
                      <Canvas style={{ position: 'absolute', top: -5, left: -7, width: 26, height: 26 }}>
                        <Circle cx={13} cy={13} r={6} color={theme.primary}>
                          <BlurMask blur={5} style="outer" respectCTM={false} />
                        </Circle>
                        <Circle cx={13} cy={13} r={6} color={theme.primary} />
                      </Canvas>
                    </View>
                    <Text style={[styles.formLabel, { marginBottom: 0, marginTop: 0, fontFamily: theme.fontFamily.uiSemiBold, fontSize: theme.fontSize.body, letterSpacing: 0.8 }]}>PERGUNTA</Text>
                  </View>
                  <FieldActions field="question" charCount={questionCharCount} undoMode={questionUndoMode} />
                </View>
              </TouchableWithoutFeedback>

              <View style={[styles.inputGroup, { flex: 0 }]}>
                <View
                  renderToHardwareTextureAndroid={true}
                  style={{
                    borderWidth: .9,
                    borderColor: activeEditor === 'question' ? theme.primary : 'rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    height: 200,
                    padding: 4,
                    backgroundColor: '#202020',
                    overflow: 'hidden'
                  }}
                >
                  <View pointerEvents="box-none" style={{ flex: 1 }}>
                    <IsolatedMathEditor
                      editorRef={questionEditorRef}
                      initialValue={global.flashcardDrafts?.[draftKey]?.question || ""}
                      onContentChange={(html) => updateDraft('question', html)}
                      onFocusCallback={() => setActiveEditor('question')}
                      onEditMath={handleEditMath}
                      onCharCount={(count) => setQuestionCharCount(count)}
                      maxChars={CHAR_LIMIT}
                    />
                  </View>
                </View>
              </View>

              {/* Área clicável entre caixas */}
              <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
                <View style={{ height: 28 }} />
              </TouchableWithoutFeedback>

              {/* RESPOSTA */}
              <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
                <View style={{ marginBottom: 8, marginTop: 0, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 12, height: 12 }}>
                      <Canvas style={{ position: 'absolute', top: -5, left: -7, width: 26, height: 26 }}>
                        <Circle cx={13} cy={13} r={6} color={theme.primary}>
                          <BlurMask blur={5} style="outer" respectCTM={false} />
                        </Circle>
                        <Circle cx={13} cy={13} r={6} color={theme.primary} />
                      </Canvas>
                    </View>
                    <Text style={[styles.formLabel, { marginBottom: 0, marginTop: 0, fontFamily: theme.fontFamily.uiSemiBold, fontSize: theme.fontSize.body, letterSpacing: 0.8 }]}>RESPOSTA</Text>
                  </View>
                  <FieldActions field="answer" charCount={answerCharCount} undoMode={answerUndoMode} />
                </View>
              </TouchableWithoutFeedback>

              <View style={[styles.inputGroup, { flex: 0 }]}>
                <View
                  renderToHardwareTextureAndroid={true}
                  style={{
                    borderWidth: .9,
                    borderColor: activeEditor === 'answer' ? theme.primary : 'rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    height: 200,
                    padding: 4,
                    backgroundColor: '#202020',
                    overflow: 'hidden'
                  }}
                >
                  <View pointerEvents="box-none" style={{ flex: 1 }}>
                    <IsolatedMathEditor
                      editorRef={answerEditorRef}
                      initialValue={global.flashcardDrafts?.[draftKey]?.answer || ""}
                      onContentChange={(html) => updateDraft('answer', html)}
                      onFocusCallback={() => {
                        setActiveEditor('answer');
                        setTimeout(() => {
                          scrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 150);
                      }}
                      onEditMath={handleEditMath}
                      onCharCount={(count) => setAnswerCharCount(count)}
                      maxChars={CHAR_LIMIT}
                    />
                  </View>
                </View>
              </View>

              {/* Toast de card salvo (iOS) */}
              {saveToastVisible && (
                <View style={{ position: 'absolute', bottom: 80, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, zIndex: 999 }}>
                  <Text style={{ color: '#fff', fontFamily: theme.fontFamily.uiMedium, fontSize: 13 }}>Card salvo!</Text>
                </View>
              )}

              {/* Área extensiva clicável cobrindo o fundo e botões */}
              <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
                <View style={[styles.bottomControlsContainer, { width: '100%', paddingTop: 5, paddingBottom: 10 + (insets.bottom > 10 ? insets.bottom : 0) }]}>
                  <TouchableOpacity
                    style={{ backgroundColor: isMathToolbarVisible ? theme.primary : theme.backgroundTertiary, borderRadius: 12, width: 64, height: 54, alignItems: 'center', justifyContent: 'center' }}
                    onPress={(e) => { e.stopPropagation(); toggleMathToolbar(); }}
                  >
                    <Text style={{ color: theme.textPrimary, fontSize: theme.fontSize.md, fontFamily: theme.fontFamily.uiBold, includeFontPadding: false, textAlignVertical: 'center' }}>f(x)</Text>
                  </TouchableOpacity>

                  <View style={[styles.saveButtonContainer, { flexDirection: 'row', gap: 0 }]}>
                    {/* Botão principal: salva e continua */}
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: theme.primary, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, height: 54, alignItems: 'center', justifyContent: 'center' }}
                      onPress={(e) => { e.stopPropagation(); isEditMode ? handleSave() : handleSaveAndContinue(); }}
                    >
                      <Text style={{ color: '#000', fontFamily: theme.fontFamily.uiBold, fontSize: theme.fontSize.body }}>
                        {isEditMode ? 'Salvar edição' : 'Salvar card'}
                      </Text>
                    </TouchableOpacity>
                    {/* Separador */}
                    {!isEditMode && (
                      <View style={{ width: 1, backgroundColor: 'rgba(0,0,0,0.2)' }} />
                    )}
                    {/* Botão seta: salva e sai (apenas no modo criação) */}
                    {!isEditMode && (
                      <TouchableOpacity
                        style={{ width: 44, backgroundColor: theme.primary, borderTopRightRadius: 12, borderBottomRightRadius: 12, height: 54, alignItems: 'center', justifyContent: 'center' }}
                        onPress={(e) => { e.stopPropagation(); handleSave(); }}
                      >
                        <Ionicons name="chevron-forward" size={20} color="#000" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableWithoutFeedback>

              {/* Área clicável abaixo dos botões */}
              <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
                <View style={{ flex: 1 }} />
              </TouchableWithoutFeedback>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <MathToolbar
        ref={mathToolbarRef}
        onInsert={handleInsertMath}
        onOpen={() => setMathToolbarVisible(true)}
        onClose={() => {
          setMathToolbarVisible(false);
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }}
        onOpenAdvancedMode={() => {
          mathToolbarRef.current?.forceClose();
          setBuilderInitialLatex('');
          setBuilderVisible(true);
        }}
      />


      {/* ========== MODAL FULLSCREEN DE EDIÇÃO DE FÓRMULAS ========== */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => {
          setEditModalVisible(false);
          setShowLettersPanel(false);
          setShowSymbolsPanel(false);
        }}
      >
        <View style={styles.modalOverlayFullscreen}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalContentFullscreen}>
              {/* Header com título e ícone de ajuda */}
              <View style={styles.modalHeaderFullscreen}>
                <Text style={styles.modalTitleFullscreen}>Editar Fórmula</Text>
                <TouchableOpacity
                  onPress={() => {
                    setHelpModalVisible(true);
                    setHelpPage(0);  // Sempre começa na página 1
                  }}
                  style={styles.helpIcon}
                >
                  <Ionicons name="help-circle-outline" size={26} color={theme.primary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ flexShrink: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* ===== INPUT 1 ===== */}
                <Text style={styles.formLabel}>
                  {currentLatex.includes('\\left(')
                    ? 'Numerador'
                    : currentLatex.includes('frac')
                      ? 'Numerador'
                      : currentLatex.includes('^')
                        ? 'Base'
                        : currentLatex.includes('log')
                          ? 'Base'
                          : currentLatex.includes('_{')
                            ? 'Base'
                            : 'Valor'}
                </Text>
                <Animated.View style={shakeStyle1}>
                  <TextInput
                    ref={modalInput1Ref}
                    style={[
                      styles.modalInputWithFocus,
                      focusedInput === 1 && styles.modalInputFocusedGreen,
                    ]}
                    value={editValue1}
                    onChangeText={(text) => {
                      // Validação caractere a caractere
                      if (text.length > editValue1.length) {
                        const newChar = text.slice(-1);
                        const validation = validateInput(editValue1, newChar);
                        if (validation.valid) {
                          setEditValue1(text);
                        } else {
                          triggerShake(shakeAnim1);
                        }
                      } else {
                        // Backspace permitido
                        setEditValue1(text);
                      }
                    }}
                    onFocus={() => setFocusedInput(1)}
                    placeholder="Digite o valor..."
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    autoFocus={true}
                    autoComplete="off"
                    importantForAutofill="no"
                  />
                </Animated.View>
                <SegmentedCounter text={editValue1} />

                {/* ===== INPUT 2 (condicional) ===== */}
                {(currentLatex.includes('frac') ||
                  currentLatex.includes('log') ||
                  currentLatex.includes('sqrt') ||
                  currentLatex.includes('^') ||
                  currentLatex.includes('_{')) && (
                    <>
                      <Text style={[styles.formLabel, { marginTop: 12 }]}>
                        {currentLatex.includes('\\left(')
                          ? 'Denominador'
                          : currentLatex.includes('log')
                            ? 'Logaritmando'
                            : currentLatex.includes('sqrt')
                              ? 'Índice da Raiz (Opcional)'
                              : currentLatex.includes('^')
                                ? 'Expoente'
                                : currentLatex.includes('_{')
                                  ? 'Subscrito'
                                  : 'Denominador'}
                      </Text>
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
                          placeholder={
                            currentLatex.includes('\\left(')
                              ? 'Digite o denominador...'
                              : currentLatex.includes('log')
                                ? 'Digite o logaritmando...'
                                : currentLatex.includes('sqrt')
                                  ? 'Ex: 3 para cúbica (vazio = quadrada)'
                                  : currentLatex.includes('^')
                                    ? 'Ex: 2, n, n-1, (a+b)...'
                                    : currentLatex.includes('_{')
                                      ? 'Ex: n, 1, 0...'
                                      : 'Digite o denominador...'
                          }
                          placeholderTextColor="#666"
                          keyboardType="numeric"
                          autoComplete="off"
                          importantForAutofill="no"
                        />
                      </Animated.View>
                      <SegmentedCounter text={editValue2} />
                    </>
                  )}

                {/* ===== TECLADO COLAPSÁVEL ===== */}
                <CollapsibleKeypad
                  inputNumber={focusedInput}
                  currentValue={focusedInput === 1 ? editValue1 : editValue2}
                  onInsert={(char) => handleValidatedInsert(char, focusedInput)}
                  showLettersPanel={showLettersPanel}
                  setShowLettersPanel={setShowLettersPanel}
                  showSymbolsPanel={showSymbolsPanel}
                  setShowSymbolsPanel={setShowSymbolsPanel}
                />
              </ScrollView>

              {/* ===== BOTÕES DE AÇÃO ===== */}
              <View style={{ marginTop: 16 }}>
                <TouchableOpacity
                  style={styles.modalButtonFullWidth}
                  onPress={() => {
                    tap();
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

                    // Converte operadores Unicode para comandos LaTeX e auto-agrupa ^(...) e _(...)
                    const processVal = (val) => val
                      .replace(/×/g, '\\times ')
                      .replace(/÷/g, '\\div ')
                      .replace(/π/g, '\\pi ')
                      .replace(/θ/g, '\\theta ')
                      .replace(/∞/g, '\\infty ')
                      .replace(/≠/g, '\\neq ')
                      .replace(/≥/g, '\\geq ')
                      .replace(/≤/g, '\\leq ')
                      .replace(/\^\(([^)]*)\)/g, '^{$1}')
                      .replace(/_\(([^)]*)\)/g, '_{$1}');

                    const val1 = editValue1.trim() === '' ? '\\Box' : processVal(editValue1);
                    const val2 = editValue2.trim() === '' ? '\\Box' : processVal(editValue2);

                    let newLatex = val1;

                    if (currentLatex.includes('frac')) {
                      newLatex = `\\frac{${val1}}{${val2}}`;
                    } else if (currentLatex.includes('sqrt')) {
                      if (val2 && val2 !== '\\Box' && editValue2.trim() !== '') {
                        newLatex = `\\sqrt[${val2}]{${val1}}`;
                      } else {
                        newLatex = `\\sqrt{${val1}}`;
                      }
                    } else if (currentLatex.includes('^')) {
                      const exp = val2 === '' || val2 === '\\Box' ? '\\Box' : val2;
                      newLatex = `${val1}^{${exp}}`;
                    } else if (currentLatex.includes('log')) {
                      newLatex = `\\log_{${val1}}{${val2}}`;
                    } else if (currentLatex.includes('_{')) {
                      newLatex = `${val1}_{${val2}}`;
                    } else if (currentLatex.includes('\\left|')) {
                      newLatex = `\\left|${val1}\\right|`;
                    }

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

                    const target = activeEditor === 'answer' ? answerEditorRef.current : questionEditorRef.current;
                    target?.updateFormula(currentMathId, newLatex);
                    setEditModalVisible(false);
                    setShowLettersPanel(false);
                    setShowSymbolsPanel(false);
                  }}
                >
                  <Text style={styles.modalButtonTextFullWidth}>Confirmar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalButtonCancelFullWidth}
                  onPress={() => {
                    tap();
                    if (currentLatex.includes('\\Box')) {
                      const target = activeEditor === 'answer' ? answerEditorRef.current : questionEditorRef.current;
                      target?.deleteMath(currentMathId);
                    }
                    setEditModalVisible(false);
                    setShowLettersPanel(false);
                    setShowSymbolsPanel(false);
                  }}
                >
                  <Text style={styles.modalButtonTextFullWidth}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {/* ========== FIM DO MODAL ========== */}

      {/* ========== MONTADOR DE FÓRMULA LIVRE ========== */}
      <FormulaBuilderModal
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
                message: 'A fórmula excede o limite de caracteres.',
                buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
              });
              return;
            }
            target?.insertCustom(latex);
          }

          setCurrentMathId(null);
          setBuilderInitialLatex('');
          setBuilderVisible(false);
        }}
        onCancel={() => {
          // Se a fórmula original tinha placeholders (\Box), foi inserida pelo toolbar
          // e o usuário cancelou → deleta a fórmula placeholder do editor
          if (currentMathId && builderInitialLatex.includes('\\Box')) {
            const target = activeEditor === 'answer' ? answerEditorRef.current : questionEditorRef.current;
            target?.deleteMath(currentMathId);
          }
          setCurrentMathId(null);
          setBuilderInitialLatex('');
          setBuilderVisible(false);
        }}
      />
      {/* ========== FIM DO MONTADOR ========== */}

      {/* ========== HELP MODAL (Custom) ========== */}
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
            backgroundColor: theme.background,
            borderRadius: 12,
            padding: 24,
            width: '90%',
            maxWidth: 500,
            borderWidth: 1,
            borderColor: theme.backgroundSecondary
          }}>
            {/* Header */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: theme.backgroundSecondary, paddingBottom: 12, marginBottom: 16 }}>
              <Text style={{
                fontSize: theme.fontSize.lg,
                fontWeight: theme.fontWeight.bold,
                color: theme.primary,
                textAlign: 'center'
              }}>Regras de Edição</Text>
            </View>

            {/* Conteúdo Paginado */}
            <ScrollView style={{ maxHeight: 400 }}>
              {helpPage === 0 ? (
                // Página 1: Regras Básicas
                <View>
                  <Text style={{
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.bold,
                    color: theme.textSecondary,
                    marginBottom: 8
                  }}>🔢 NÚMEROS</Text>
                  <Text style={{ fontSize: theme.fontSize.body, color: '#CBD5E0', marginBottom: 4 }}>• Sem letras: até 10 dígitos</Text>
                  <Text style={{ fontSize: theme.fontSize.body, color: '#CBD5E0', marginBottom: 4 }}>• Com letras: até 3 dígitos</Text>

                  <Text style={{
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.bold,
                    color: theme.textSecondary,
                    marginTop: 16,
                    marginBottom: 8
                  }}>🔤 LETRAS</Text>
                  <Text style={{ fontSize: theme.fontSize.body, color: '#CBD5E0', marginBottom: 4 }}>• Máximo 2 letras por entrada</Text>
                  <Text style={{ fontSize: theme.fontSize.body, color: '#CBD5E0', marginBottom: 4 }}>• Número antes de letra precisa de símbolo</Text>
                  <Text style={{ fontSize: theme.fontSize.caption, color: theme.textMuted, marginLeft: 8 }}>  Exemplo: 1+a ✓  |  1a ✗</Text>

                  <Text style={{
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.bold,
                    color: theme.textSecondary,
                    marginTop: 16,
                    marginBottom: 8
                  }}>➕ SÍMBOLOS BÁSICOS</Text>
                  <Text style={{ fontSize: theme.fontSize.body, color: '#CBD5E0', marginBottom: 4 }}>• Máximo 2 de cada tipo (+, -, ×, ÷, ^, _, (, ))</Text>
                  <Text style={{ fontSize: theme.fontSize.body, color: '#CBD5E0', marginBottom: 4 }}>• Sem símbolos consecutivos</Text>
                  <Text style={{ fontSize: theme.fontSize.caption, color: theme.textMuted, marginLeft: 8 }}>  Exemplo: 2++3 ✗</Text>
                </View>
              ) : (
                // Página 2: Regras Avançadas
                <View>
                  <Text style={{
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.bold,
                    color: theme.textSecondary,
                    marginBottom: 8
                  }}>🎯 INÍCIO DA ENTRADA</Text>
                  <Text style={{ fontSize: theme.fontSize.body, color: '#CBD5E0', marginBottom: 4 }}>• Pode começar com: +, -, (, )</Text>
                  <Text style={{ fontSize: theme.fontSize.body, color: '#CBD5E0', marginBottom: 4 }}>• Não pode começar com: vírgula, ponto</Text>

                  <Text style={{
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.bold,
                    color: theme.textSecondary,
                    marginTop: 16,
                    marginBottom: 8
                  }}>🔣 SEPARADORES (vírgula e ponto)</Text>
                  <Text style={{ fontSize: theme.fontSize.body, color: '#CBD5E0', marginBottom: 4 }}>• Máximo 2 separadores no total</Text>
                  <Text style={{ fontSize: theme.fontSize.body, color: '#CBD5E0', marginBottom: 4 }}>• Não pode começar com separador</Text>
                  <Text style={{ fontSize: theme.fontSize.body, color: '#CBD5E0', marginBottom: 4 }}>• Não pode terminar com separador</Text>
                  <Text style={{ fontSize: theme.fontSize.caption, color: theme.textMuted, marginLeft: 8, marginTop: 4 }}>  Exemplos:</Text>
                  <Text style={{ fontSize: theme.fontSize.caption, color: theme.textMuted, marginLeft: 8 }}>  3,14 ✓  |  0,5 ✓</Text>
                  <Text style={{ fontSize: theme.fontSize.caption, color: theme.textMuted, marginLeft: 8 }}>  ,5 ✗  |  5, ✗  |  3,1,4 ✗</Text>

                  <Text style={{
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.bold,
                    color: theme.textSecondary,
                    marginTop: 16,
                    marginBottom: 8
                  }}>🚫 BLOQUEIOS</Text>
                  <Text style={{ fontSize: theme.fontSize.body, color: '#CBD5E0', marginBottom: 4 }}>• Ponto e vírgula (;) não permitido</Text>
                  <Text style={{ fontSize: theme.fontSize.body, color: '#CBD5E0', marginBottom: 4 }}>• Confirmação bloqueada se terminar com , ou .</Text>
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
                  backgroundColor: helpPage === 0 ? theme.primary : theme.backgroundTertiary,
                  marginHorizontal: 4
                }} />
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: helpPage === 1 ? theme.primary : theme.backgroundTertiary,
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
                      backgroundColor: theme.backgroundSecondary,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Text style={{ color: theme.textSecondary, fontSize: theme.fontSize.bodyLg, fontWeight: theme.fontWeight.semibold }}>Mais Detalhes ➡️</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => setHelpPage(0)}
                    style={{
                      flex: 1,
                      backgroundColor: theme.backgroundSecondary,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Text style={{ color: theme.textSecondary, fontSize: theme.fontSize.bodyLg, fontWeight: theme.fontWeight.semibold }}>⬅️ Voltar</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => setHelpModalVisible(false)}
                  style={{
                    flex: 1,
                    backgroundColor: theme.primary,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Text style={{ color: theme.textPrimary, fontSize: theme.fontSize.bodyLg, fontWeight: theme.fontWeight.bold, textAlign: 'center' }}>Entendi</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      {/* ========== FIM DO HELP MODAL ========== */}

      <CustomAlert
        {...alertConfig}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

// =================================================================

export default ManageFlashcardsScreen;
