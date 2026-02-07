import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getAppData, saveAppData } from '../services/storage';
import { isDefaultDeck, canEditDefaultDecks } from '../config/constants';
import { HybridEditor } from '../components/editor/HybridEditor';
import { MathToolbar } from '../components/editor/MathToolbar';
import { IsolatedMathEditor } from '../components/editor/IsolatedMathEditor';
import { SkeletonItem } from '../components/ui/SkeletonItem';
import styles from '../styles/globalStyles';

export const ManageFlashcardsScreen = ({ route, navigation }) => {
  const { deckId, subjectId, preloadedCards } = route.params;
  
  const questionEditorRef = useRef(null);
  const answerEditorRef = useRef(null);
  const scrollViewRef = useRef(null);
  
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

  // Estados para teclado colapsável do modal
  const [showLettersPanel, setShowLettersPanel] = useState(false);
  const [showSymbolsPanel, setShowSymbolsPanel] = useState(false);
  const [focusedInput, setFocusedInput] = useState(1); // 1 ou 2

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

  // ========== SISTEMA DE VALIDAÇÃO ROBUSTO ==========
  // Valida se um novo caractere pode ser inserido
  const validateInput = (currentText, newChar) => {
    const text = currentText || '';

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
    };

    const lastChar = text.slice(-1);
    const isLetter = /[a-zA-Z]/.test(newChar);
    const isNumber = /[0-9.]/.test(newChar);
    const isSymbol = /[+\-×÷^_()]/.test(newChar);
    const lastIsNumber = /[0-9]/.test(lastChar);
    const lastIsSymbol = /[+\-×÷^_()]/.test(lastChar);

    // Regra 1: Num → Letra BLOQUEADO (precisa de símbolo entre eles)
    if (isLetter && lastIsNumber) {
      return { valid: false, reason: 'needsSymbol' };
    }

    // Regra 2: Símbolos consecutivos BLOQUEADO
    if (isSymbol && lastIsSymbol) {
      return { valid: false, reason: 'noConsecutiveSymbols' };
    }

    // Regra 3: Símbolo no início (apenas + e - permitidos)
    if (isSymbol && text.length === 0 && newChar !== '-' && newChar !== '+') {
      return { valid: false, reason: 'invalidStart' };
    }

    // Regra 4: Limite de letras (máx 2)
    if (isLetter && letterCount >= 2) {
      return { valid: false, reason: 'maxLetters' };
    }

    // Regra 5: Limite dinâmico de números
    const maxNumbers = letterCount > 0 ? 3 : 10;
    if (isNumber && numberCount >= maxNumbers) {
      return { valid: false, reason: 'maxNumbers' };
    }

    // Regra 6: Limite de símbolos (máx 2 de cada tipo)
    if (isSymbol && symbolCounts[newChar] !== undefined && symbolCounts[newChar] >= 2) {
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
    const lastIsSymbol = /[+\-×÷^_()]/.test(lastChar);
    const isEmpty = (text || '').length === 0;

    const maxNumbers = letterCount > 0 ? 3 : 10;

    return {
      lettersDisabled: lastIsNumber || letterCount >= 2,
      numbersDisabled: numberCount >= maxNumbers,
      symbolsDisabled: lastIsSymbol,
      // Para símbolos no início, só + e - são permitidos
      onlyPlusMinusAllowed: isEmpty,
    };
  };

  // Handler de inserção com validação
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

  // Componente: Contador Segmentado (Num | Let | Sim)
  const SegmentedCounter = ({ text }) => {
    const letterCount = ((text || '').match(/[a-zA-Z]/g) || []).length;
    const numberCount = ((text || '').match(/[0-9]/g) || []).length;
    const symbolCount = ((text || '').match(/[+\-×÷^_()]/g) || []).length;
    const maxNumbers = letterCount > 0 ? 3 : 10;

    const getColor = (current, max) => {
      const pct = (current / max) * 100;
      if (pct >= 100) return '#EF4444'; // Vermelho
      if (pct >= 70) return '#F59E0B';  // Amarelo
      return '#A0AEC0'; // Cinza
    };

    return (
      <View style={styles.segmentedCounterContainer}>
        <Text style={[styles.segmentedCounterText, { color: getColor(numberCount, maxNumbers) }]}>
          Num: {numberCount}/{maxNumbers}
        </Text>
        <Text style={styles.segmentedCounterDivider}>|</Text>
        <Text style={[styles.segmentedCounterText, { color: getColor(letterCount, 2) }]}>
          Let: {letterCount}/2
        </Text>
        <Text style={styles.segmentedCounterDivider}>|</Text>
        <Text style={[styles.segmentedCounterText, { color: getColor(symbolCount, 6) }]}>
          Sim: {symbolCount}/6
        </Text>
      </View>
    );
  };

  // Componente: Teclado Colapsável (Abc | Símbolos)
  const CollapsibleKeypad = ({ inputNumber }) => {
    const letters = ['x', 'y', 'z', 'a', 'b', 'c', 'n', 'm', 'k', 't'];
    const symbols = ['+', '-', '×', '÷', '(', ')', '^', '_'];

    const currentValue = inputNumber === 1 ? editValue1 : editValue2;
    const buttonStates = getButtonStates(currentValue);

    const handleInsert = (char) => {
      handleValidatedInsert(char, inputNumber);
    };

    // Verifica se um símbolo específico está permitido
    const isSymbolAllowed = (symbol) => {
      if (buttonStates.symbolsDisabled) return false;
      if (buttonStates.onlyPlusMinusAllowed && symbol !== '+' && symbol !== '-') return false;
      return true;
    };

    return (
      <View style={styles.keypadContainer}>
        {/* Toggle Buttons */}
        <View style={styles.keypadToggleRow}>
          <TouchableOpacity
            style={[styles.keypadToggle, showLettersPanel && styles.keypadToggleActive]}
            onPress={() => {
              setShowLettersPanel(!showLettersPanel);
              if (showSymbolsPanel) setShowSymbolsPanel(false);
            }}
          >
            <Text style={styles.keypadToggleText}>Abc</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.keypadToggle, showSymbolsPanel && styles.keypadToggleActive]}
            onPress={() => {
              setShowSymbolsPanel(!showSymbolsPanel);
              if (showLettersPanel) setShowLettersPanel(false);
            }}
          >
            <Text style={styles.keypadToggleText}>+-×</Text>
          </TouchableOpacity>
        </View>

        {/* Letters Panel */}
        {showLettersPanel && (
          <View style={styles.keypadPanel}>
            {letters.map(letter => (
              <TouchableOpacity
                key={letter}
                style={[
                  styles.keypadButton,
                  buttonStates.lettersDisabled && styles.keypadButtonDisabled
                ]}
                onPress={() => !buttonStates.lettersDisabled && handleInsert(letter)}
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

        {/* Symbols Panel */}
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
                  onPress={() => allowed && handleInsert(symbol)}
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
  // ================================================
  
  // Check cache to skip skeleton on subsequent visits
  const cacheKey = `${deckId}-${subjectId}`;
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

  // Listener para detectar quando o teclado abre/fecha
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Header Button for History
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
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
  }, [navigation, deckId, subjectId]);

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

  // Novo efeito para garantir scroll quando o teclado OU a toolbar abrir no input de baixo
  useEffect(() => {
      if ((keyboardHeight > 0 || isMathToolbarVisible) && activeEditor === 'answer') {
          // Pequeno delay para garantir que o layout já ajustou o padding
          setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 50); 
      }
  }, [keyboardHeight, isMathToolbarVisible, activeEditor]);

  const toggleMathToolbar = () => {
      Keyboard.dismiss();
      setMathToolbarVisible(!isMathToolbarVisible);
  };
  
  const handleDismissKeyboard = () => {
      Keyboard.dismiss();
      setMathToolbarVisible(false);
      setActiveEditor(null);
      questionEditorRef.current?.blur();
      answerEditorRef.current?.blur();
  };

  const handleInsertMath = (cmd) => {
      const target = activeEditor === 'answer' ? answerEditorRef.current : questionEditorRef.current;
      if (target) {
          if (cmd === '\\\\frac') target.insertFrac();
          else if (cmd === '\\\\sqrt') target.insertRoot();
          else if (cmd === '\\\\sqrt') target.insertRoot();
          else if (cmd === 'x^2' || cmd === '²') target.insertSquared(); // Usando insertSquared agora
          else if (cmd === '\\\\log') target.insertLog();
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
      const key = `${deckId}-${subjectId}`;
      
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
      const key = `${deckId}-${subjectId}`;
      delete global.flashcardDrafts[key];
  };

  // Listener para detectar quando o teclado abre/fecha
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleEditMath = (id, latex) => {
    setCurrentMathId(id);
    setCurrentLatex(latex);

    // Parser simples para extrair valores existentes
    let v1 = '';
    let v2 = '';

    if (latex.includes('frac')) {
        const match = latex.match(/\\frac\{(.+?)\}\{(.+?)\}/);
        if (match) { v1 = match[1]; v2 = match[2]; }
    } else if (latex.includes('sqrt')) {
        // Suporta \sqrt[index]{value} ou \sqrt{value}
        const matchWithIndex = latex.match(/\\sqrt\[(.+?)\]\{(.+?)\}/);
        if (matchWithIndex) {
            v2 = matchWithIndex[1]; // Índice
            v1 = matchWithIndex[2]; // Valor
        } else {
            const matchSimple = latex.match(/\\sqrt\{(.+?)\}/);
            if (matchSimple) v1 = matchSimple[1];
        }
    } else if (latex.includes('log')) {
        const match = latex.match(/\\log_\{(.+?)\}\{(.+?)\}/);
        if (match) { v1 = match[1]; v2 = match[2]; }
    } else if (latex.includes('^')) { // Changed to generic power
       // Tenta extrair base e expoente
       // Ex: x^2 ou {base}^{exp}
       const match = latex.match(/(.+?)\^\{?(.+?)\}?$/); 
       if (match) {
           v1 = match[1];
           v2 = match[2];
       } else {
           // Fallback para x^2 simples sem chaves
           const matchSimple = latex.match(/(.+?)\^(.+)/);
           if (matchSimple) { v1 = matchSimple[1]; v2 = matchSimple[2]; }
       }
    }
    
    // Limpa placeholders (\Box) para visualização limpa
    if (v1 === '\\Box') v1 = '';
    if (v2 === '\\Box') v2 = '';

    setEditValue1(v1); 
    setEditValue2(v2);
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    // Pega o valor fresco direto do global drafts (já que o ref.getHtml() é assíncrono/null)
    const key = `${deckId}-${subjectId}`;
    const currentQuestionHtml = global.flashcardDrafts?.[key]?.question || "";
    const currentAnswerHtml = global.flashcardDrafts?.[key]?.answer || "";

    // Validação Segura: Verifica se tem conteúdo real (ignorando tags vazias ou só espaços)
    // Remove tags HTML básicas para checar se tem texto real
    const cleanQ = currentQuestionHtml.replace(/<[^>]*>/g, '').trim();
    const cleanA = currentAnswerHtml.replace(/<[^>]*>/g, '').trim();
    
    // Verifica também se tem imagens ou fórmulas (que podem não ter texto puro)
    const hasMediaQ = currentQuestionHtml.includes('<img') || currentQuestionHtml.includes('math-atom');
    const hasMediaA = currentAnswerHtml.includes('<img') || currentAnswerHtml.includes('math-atom');

    if ((!cleanQ && !hasMediaQ) || (!cleanA && !hasMediaA)) {
      setAlertConfig({
        visible: true,
        title: 'Atenção',
        message: 'Por favor, preencha a pergunta e a resposta.',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
      });
      return;
    }
    const allData = await getAppData();
    const newData = allData.map(deck => {
      if (deck.id === deckId) {
        return {
          ...deck,
          subjects: deck.subjects.map(subject => {
            if (subject.id === subjectId) {
              return {
                ...subject,
                flashcards: [
                  ...subject.flashcards,
                  {
                    id: Date.now().toString(),
                    question: currentQuestionHtml,
                    answer: currentAnswerHtml,
                    level: 0, points: 0, lastReview: null, nextReview: null,
                  },
                ],
              };
            }
            return subject;
          })
        };
      }
      return deck;
    });
    await saveAppData(newData);
    clearDraft(); // Limpa o rascunho ao salvar com sucesso
    navigation.goBack();
  };

  return (
      <View style={styles.baseContainer}>
        {loading ? (
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
          <ScrollView 
            ref={scrollViewRef}
            style={styles.formContainerNoPadding}
            contentContainerStyle={[
                styles.scrollContentContainer, 
                { 
                    paddingBottom: keyboardHeight > 0 
                        ? Math.max(20, keyboardHeight - 50)
                        : (isMathToolbarVisible ? 240 : 20),
                    flexGrow: 1 
                }
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
               <View style={{ flex: 1 }}>
                    {/* Área clicável acima do primeiro input (Label) */}
                    <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
                        <View style={{ marginBottom: 4, width: '100%' }}>
                            <Text style={styles.formLabel}>Frente</Text>
                        </View>
                    </TouchableWithoutFeedback>

                    <View style={styles.inputGroup}>
                        <View
                            style={{ 
                                borderWidth: 2, 
                                borderColor: activeEditor === 'question' ? '#4db6ac' : '#444', 
                                borderRadius: 8, 
                                height: 200, 
                                padding: 4,  
                                marginBottom: 0,
                                backgroundColor: '#2D3748', 
                                overflow: 'hidden'
                            }}
                        >
                            <View pointerEvents="box-none" style={{ flex: 1 }}>
                                <IsolatedMathEditor 
                                    editorRef={questionEditorRef}
                                    initialValue={global.flashcardDrafts?.[`${deckId}-${subjectId}`]?.question || ""}
                                    onContentChange={(html) => updateDraft('question', html)}
                                    onFocusCallback={() => setActiveEditor('question')}
                                    onEditMath={handleEditMath}
                                />
                            </View>
                        </View>
                    </View>

                    <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
                        <View style={{ marginBottom: 4, width: '100%', paddingTop: 16 }}>
                            <Text style={styles.formLabel}>Verso</Text>
                        </View>
                    </TouchableWithoutFeedback>

                    <View style={styles.inputGroup}>
                        <View
                            style={{ 
                                borderWidth: 2, 
                                borderColor: activeEditor === 'answer' ? '#4db6ac' : '#444', 
                                borderRadius: 8, 
                                height: 200,
                                padding: 4,
                                marginBottom: 0,
                                backgroundColor: '#2D3748', 
                                overflow: 'hidden'
                            }}
                        >
                            <View pointerEvents="box-none" style={{ flex: 1 }}>
                                <IsolatedMathEditor 
                                    editorRef={answerEditorRef}
                                    initialValue={global.flashcardDrafts?.[`${deckId}-${subjectId}`]?.answer || ""}
                                    onContentChange={(html) => updateDraft('answer', html)}
                                    onFocusCallback={() => {
                                        setActiveEditor('answer');
                                        setTimeout(() => {
                                            scrollViewRef.current?.scrollToEnd({ animated: true });
                                        }, 150);
                                    }}
                                    onEditMath={handleEditMath}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Área extensiva clicável cobrindo o fundo e botões */}
                    <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
                         <View style={[styles.bottomControlsContainer, { width: '100%', paddingTop: 26, paddingBottom: 20 }]}>
                            <TouchableOpacity
                                style={[styles.fxButton, isMathToolbarVisible && styles.fxButtonActive ]}
                                onPress={(e) => { e.stopPropagation(); toggleMathToolbar(); }}
                            >
                                <Text style={styles.fxButtonText}>f(x)</Text>
                            </TouchableOpacity>

                            <View style={styles.saveButtonContainer}>
                                <Button title="Salvar Flashcard" onPress={(e) => { e.stopPropagation(); handleSave(); }} color="#4FD1C5" />
                            </View> 
                        </View>
                    </TouchableWithoutFeedback>
               </View>
          </ScrollView>
        </KeyboardAvoidingView>
        )}

      {isMathToolbarVisible && (
          <MathToolbar onInsert={handleInsertMath} onClose={() => setMathToolbarVisible(false)} />
      )}


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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlayFullscreen}>
            <View style={styles.modalContentFullscreen}>
              {/* Header com título e ícone de ajuda */}
              <View style={styles.modalHeaderFullscreen}>
                <Text style={styles.modalTitleFullscreen}>Editar Fórmula</Text>
                <TouchableOpacity
                  onPress={() => {
                    setAlertConfig({
                      visible: true,
                      title: 'Regras de Edição',
                      message:
                        '🔢 NÚMEROS:\n' +
                        '• Sem letras: até 10 dígitos\n' +
                        '• Com letras: até 3 dígitos\n\n' +
                        '🔤 LETRAS:\n' +
                        '• Máximo 2 letras\n' +
                        '• Número antes de letra precisa de símbolo (1+a ✓, 1a ✗)\n\n' +
                        '➕ SÍMBOLOS:\n' +
                        '• Máximo 2 de cada tipo\n' +
                        '• Sem símbolos consecutivos (++ ✗)\n' +
                        '• No início: apenas + ou -',
                      buttons: [{ text: 'Entendi', onPress: () => setAlertConfig((prev) => ({ ...prev, visible: false })) }],
                    });
                  }}
                  style={styles.helpIcon}
                >
                  <Ionicons name="help-circle-outline" size={26} color="#4FD1C5" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* ===== INPUT 1 ===== */}
                <Text style={styles.formLabel}>
                  {currentLatex.includes('frac')
                    ? 'Numerador'
                    : currentLatex.includes('^')
                    ? 'Base'
                    : currentLatex.includes('log')
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
                  />
                </Animated.View>
                <SegmentedCounter text={editValue1} />

                {/* ===== INPUT 2 (condicional) ===== */}
                {(currentLatex.includes('frac') ||
                  currentLatex.includes('log') ||
                  currentLatex.includes('sqrt') ||
                  currentLatex.includes('^')) && (
                  <>
                    <Text style={[styles.formLabel, { marginTop: 12 }]}>
                      {currentLatex.includes('log')
                        ? 'Logaritmando'
                        : currentLatex.includes('sqrt')
                        ? 'Índice da Raiz (Opcional)'
                        : currentLatex.includes('^')
                        ? 'Expoente'
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
                          currentLatex.includes('log')
                            ? 'Digite o logaritmando...'
                            : currentLatex.includes('sqrt')
                            ? 'Ex: 3 para cúbica (vazio = quadrada)'
                            : currentLatex.includes('^')
                            ? 'Digite o expoente'
                            : 'Digite o denominador...'
                        }
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                      />
                    </Animated.View>
                    <SegmentedCounter text={editValue2} />
                  </>
                )}

                {/* ===== TECLADO COLAPSÁVEL ===== */}
                <CollapsibleKeypad inputNumber={focusedInput} />
              </ScrollView>

              {/* ===== BOTÕES DE AÇÃO ===== */}
              <View style={{ marginTop: 16 }}>
                <TouchableOpacity
                  style={styles.modalButtonFullWidth}
                  onPress={() => {
                    const val1 = editValue1.trim() === '' ? '\\\\Box' : editValue1;
                    const val2 = editValue2.trim() === '' ? '\\\\Box' : editValue2;

                    let newLatex = val1;

                    if (currentLatex.includes('frac')) {
                      newLatex = `\\\\frac{${val1}}{${val2}}`;
                    } else if (currentLatex.includes('sqrt')) {
                      if (val2 && val2 !== '\\\\Box' && editValue2.trim() !== '') {
                        newLatex = `\\\\sqrt[${val2}]{${val1}}`;
                      } else {
                        newLatex = `\\\\sqrt{${val1}}`;
                      }
                    } else if (currentLatex.includes('^')) {
                      const exp = val2 === '' || val2 === '\\Box' ? '\\Box' : val2;
                      newLatex = `${val1}^{${exp}}`;
                    } else if (currentLatex.includes('log')) {
                      newLatex = `\\\\log_{${val1}}{${val2}}`;
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
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* ========== FIM DO MODAL ========== */}
    <CustomAlert 
        {...alertConfig} 
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))} 
    />
   </View>
  );
};

// =================================================================

export default ManageFlashcardsScreen;
