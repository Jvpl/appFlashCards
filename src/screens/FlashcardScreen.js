import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, BackHandler, Alert, InteractionManager, ActivityIndicator, Modal, TouchableWithoutFeedback } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, useAnimatedReaction, interpolate } from 'react-native-reanimated';
import { getAppData, saveAppData } from '../services/storage';
import { calculateCardUpdate } from '../services/srs';
import { FlashcardItem } from '../components/flashcard/FlashcardItem';
import { SkeletonItem } from '../components/ui/SkeletonItem';
import { CustomAlert } from '../components/ui/CustomAlert';
import styles from '../styles/globalStyles';
import theme from '../styles/theme';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

export const FlashcardScreen = ({ route, navigation }) => {
  const { deckId, subjectId, subjectName, preloadedCards, reviewAll, reviewMode } = route.params;
  const insets = useSafeAreaInsets();
  const [cards, setCards] = useState(() => {
     if (preloadedCards) {
        if (reviewAll || reviewMode) {
          return [...preloadedCards].sort((a,b) => (a.nextReview || 0) - (b.nextReview || 0));
        }
        const now = new Date();
        return preloadedCards
          .filter(c => (c.level || 0) < 5 && (c.nextReview == null || new Date(c.nextReview) <= now))
          .sort((a,b) => (a.nextReview || 0) - (b.nextReview || 0));
     }
     return [];
  });
  const cacheKey = reviewAll ? `${deckId}-all` : `${deckId}-${subjectId}`;
  const [loading, setLoading] = useState(!global.screenCache.flashcards.has(cacheKey)); // Check cache

  const [totalCardsInSession, setTotalCardsInSession] = useState(cards.length || 0);
  const isFocused = useIsFocused();

  const reviewUpdates = useRef([]);

  const currentIndex = useSharedValue(0);
  const isFlipped = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const [jsCurrentIndex, setJsCurrentIndex] = useState(0);
  const [jsIsFlipped, setJsIsFlipped] = useState(false);

  const leftGlowOpacity = useSharedValue(0);
  const rightGlowOpacity = useSharedValue(0);
  const topGlowOpacity = useSharedValue(0);
  const feedbackTextOpacity = useSharedValue(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('transparent');
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

  // Oculta o header padrão — usamos header customizado
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadCards = useCallback(async () => {
      reviewUpdates.current = [];
      // Only delay if NOT cached
      const shouldDelay = !global.screenCache.flashcards.has(cacheKey);
      const minDelay = shouldDelay ? new Promise(resolve => setTimeout(resolve, 300)) : Promise.resolve();
      
      if (cards.length === 0 && shouldDelay) setLoading(true);

      const [allData] = await Promise.all([
          getAppData(),
          minDelay
      ]);
      
      // Mark as visited after load
      global.screenCache.flashcards.add(cacheKey);
      const data = allData;
      const deck = data.find(c => c.id === deckId);
      if (reviewAll) {
        const allCards = (deck?.subjects || []).flatMap(s =>
          (s.flashcards || []).map(c => ({ ...c, _subjectId: s.id }))
        ).sort((a,b) => (a.nextReview || 0) - (b.nextReview || 0));
        setCards(allCards);
        setTotalCardsInSession(allCards.length);
      } else {
        const subject = deck ? deck.subjects.find(s => s.id === subjectId) : null;
        if (subject) {
          const now = new Date();
          const cardsToReview = subject.flashcards
            .filter(c => (c.level || 0) < 5 && (c.nextReview == null || new Date(c.nextReview) <= now))
            .sort((a,b) => (a.nextReview || 0) - (b.nextReview || 0));
          setCards(cardsToReview);
          setTotalCardsInSession(cardsToReview.length);
        }
      }
      currentIndex.value = 0;
      isFlipped.value = false;
      translateX.value = 0;
      translateY.value = 0;
      runOnJS(setJsCurrentIndex)(0);
      runOnJS(setJsIsFlipped)(false);
      setLoading(false); // Stop loading
  }, [deckId, subjectId, currentIndex, isFlipped, translateX, translateY, cards.length]);


  useEffect(() => {
    if (isFocused) {
      // setLoading(true); // Removed to prevent flicker on back navigation
      const task = InteractionManager.runAfterInteractions(() => {
        loadCards();
      });
      return () => task.cancel();
    }
  }, [isFocused, loadCards]);

  useAnimatedReaction(() => currentIndex.value, (res) => { runOnJS(setJsCurrentIndex)(Math.floor(res)) });
  useAnimatedReaction(() => isFlipped.value, (res) => { runOnJS(setJsIsFlipped)(res) });

  const saveSessionProgress = useCallback(async () => {
    if (reviewUpdates.current.length === 0) return;
    const allCurrentData = await getAppData();
    if (reviewAll) {
      // Agrupa updates por matéria (_subjectId)
      const bySubject = {};
      reviewUpdates.current.forEach(card => {
        const sid = card._subjectId;
        if (!bySubject[sid]) bySubject[sid] = new Map();
        bySubject[sid].set(card.id, card);
      });
      const newData = allCurrentData.map(deck =>
        deck.id !== deckId ? deck : {
          ...deck,
          subjects: deck.subjects.map(subject => {
            const updatesMap = bySubject[subject.id];
            if (!updatesMap) return subject;
            return { ...subject, flashcards: subject.flashcards.map(card => updatesMap.get(card.id) || card) };
          })
        }
      );
      await saveAppData(newData);
    } else {
      const updatesMap = new Map(reviewUpdates.current.map(card => [card.id, card]));
      const newData = allCurrentData.map(deck =>
          deck.id !== deckId ? deck : {
              ...deck,
              subjects: deck.subjects.map(subject =>
                  subject.id !== subjectId ? subject : {
                      ...subject,
                      flashcards: subject.flashcards.map(card => updatesMap.get(card.id) || card)
                  }
              )
          }
      );
      await saveAppData(newData);
    }
    reviewUpdates.current = [];
  }, [deckId, subjectId, reviewAll]);

  useEffect(() => { return () => { saveSessionProgress(); } }, [saveSessionProgress]);

  const onFlip = useCallback(() => { isFlipped.value = !isFlipped.value; }, [isFlipped]);

  const handleReview = useCallback((cardToReview, rating) => {
    if (!cardToReview) return;
    const updatedCard = calculateCardUpdate(cardToReview, rating);
    const existingIndex = reviewUpdates.current.findIndex(c => c.id === updatedCard.id);
    if (existingIndex > -1) reviewUpdates.current[existingIndex] = updatedCard;
    else reviewUpdates.current.push(updatedCard);
  }, []);

  const gesture = useMemo(() => {
    return Gesture.Pan()
        .onUpdate((event) => {
          'worklet';
          if (!isFlipped.value) return;
          translateX.value = event.translationX;
          translateY.value = event.translationY;
          const xAbs = Math.abs(event.translationX);
          const yAbs = Math.abs(event.translationY);

          let opacity = 0;
          if (event.translationX < -30 && xAbs > yAbs) { // Left
            runOnJS(setFeedbackText)('Errei'); runOnJS(setFeedbackColor)(theme.danger);
            opacity = interpolate(xAbs, [30, screenWidth / 2], [0, 1], 'clamp');
            leftGlowOpacity.value = opacity; rightGlowOpacity.value = 0; topGlowOpacity.value = 0;
          } else if (event.translationX > 30 && xAbs > yAbs) { // Right
            runOnJS(setFeedbackText)('Memorizado'); runOnJS(setFeedbackColor)(theme.success);
            opacity = interpolate(xAbs, [30, screenWidth / 2], [0, 1], 'clamp');
            rightGlowOpacity.value = opacity; leftGlowOpacity.value = 0; topGlowOpacity.value = 0;
          } else if (event.translationY < -30 && yAbs > xAbs) { // Up
            runOnJS(setFeedbackText)('Quase'); runOnJS(setFeedbackColor)(theme.info);
            opacity = interpolate(yAbs, [30, screenHeight / 3], [0, 1], 'clamp');
            topGlowOpacity.value = opacity; leftGlowOpacity.value = 0; rightGlowOpacity.value = 0;
          } else {
            opacity = 0;
            leftGlowOpacity.value = withTiming(0); rightGlowOpacity.value = withTiming(0); topGlowOpacity.value = withTiming(0);
          }
          feedbackTextOpacity.value = opacity;
        })
        .onEnd((event) => {
          'worklet';
          if (!isFlipped.value) {
            translateX.value = withSpring(0);
            translateY.value = withSpring(0);
            return;
          }

          leftGlowOpacity.value = withTiming(0);
          rightGlowOpacity.value = withTiming(0);
          topGlowOpacity.value = withTiming(0);
          feedbackTextOpacity.value = withTiming(0);

          const swipeThresholdX = screenWidth * 0.3;
          const swipeThresholdY = screenHeight * 0.2;

          let rating = null;
          let destinationX = 0;
          let destinationY = 0;

          const isNearRight = event.translationX > swipeThresholdX * 0.8;
          const isNearLeft  = event.translationX < -swipeThresholdX * 0.8;
          const isNearTop   = event.translationY < -swipeThresholdY * 0.8;

          const absX = Math.abs(event.translationX);
          const absY = Math.abs(event.translationY);
          const horizontalDominant = absX > absY;

          if (isNearTop && !horizontalDominant) {
            rating = 'up';
            destinationY = -screenHeight * 1.1;
            destinationX = event.translationX;
          } else if (isNearLeft && horizontalDominant) {
            rating = 'left';
            destinationX = -screenWidth * 1.1;
            destinationY = event.translationY * 0.3;
          } else if (isNearRight && horizontalDominant) {
            rating = 'right';
            destinationX = screenWidth * 1.1;
            destinationY = event.translationY * 0.3;
          }

          if (rating) {
            translateX.value = withTiming(destinationX, { duration: 220 });
            translateY.value = withTiming(destinationY, { duration: 220 }, (finished) => {
              'worklet';
              if (finished) {
                runOnJS(handleReview)(cards[Math.floor(currentIndex.value)], rating);
                currentIndex.value = currentIndex.value + 1;
                isFlipped.value = false;

                translateX.value = 0;
                translateY.value = 0;
              }
            });
          } else {
            // Retorno suave se não atingir o threshold
            translateX.value = withSpring(0);
            translateY.value = withSpring(0);
          }
        });
  }, [cards, handleReview, isFlipped, translateX, translateY, currentIndex]); // Adicionado dependências

  const handleReviewComplete = useCallback(async () => {
    if (!reviewMode || !subjectId) { navigation.goBack(); return; }
    // Pergunta se quer continuar no modo revisão ou sair
    setAlertConfig({
      visible: true,
      title: 'Revisão concluída!',
      message: 'Você completou todos os cards. Deseja continuar no modo revisão ou sair dele?',
      buttons: [
        {
          text: 'Continuar revisão',
          onPress: async () => {
            setAlertConfig(p => ({ ...p, visible: false }));
            // Recarrega cards e reseta índice
            const allData = await getAppData();
            const deck = allData.find(d => d.id === deckId);
            const subject = deck?.subjects?.find(s => s.id === subjectId);
            if (subject?.flashcards) {
              setCards([...subject.flashcards]);
              setTotalCardsInSession(subject.flashcards.length);
              currentIndex.value = 0;
              isFlipped.value = 0;
            } else {
              navigation.goBack();
            }
          },
        },
        {
          text: 'Sair do modo revisão',
          onPress: async () => {
            setAlertConfig(p => ({ ...p, visible: false }));
            const allData = await getAppData();
            await saveAppData(allData.map(d => {
              if (d.id !== deckId) return d;
              return { ...d, subjects: d.subjects.map(s => s.id === subjectId ? { ...s, reviewMode: false } : s) };
            }));
            navigation.goBack();
          },
        },
      ],
    });
  }, [reviewMode, subjectId, deckId, navigation, currentIndex, isFlipped]);

  useAnimatedReaction(() => currentIndex.value, (value) => {
    if (value >= totalCardsInSession && totalCardsInSession > 0) {
      runOnJS(handleReviewComplete)();
    }
  }, [totalCardsInSession, handleReviewComplete]);

  const [isOptionsModalVisible, setOptionsModalVisible] = useState(false);
  const currentCardForModal = cards[jsCurrentIndex];

  const performDelete = () => {
    if (!currentCardForModal) return;
    setOptionsModalVisible(false);
    setAlertConfig({
      visible: true,
      title: "Apagar Flashcard",
      message: "Tem certeza?",
      buttons: [
        { text: "Cancelar", style: "cancel", onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
        { 
          text: "Confirmar", 
          style: "destructive",
          onPress: async () => {
            const data = await getAppData();
            const deck = data.find(c => c.id === deckId);
            if (deck) {
              const subject = deck.subjects.find(s => s.id === subjectId);
              if (subject) {
                subject.flashcards = subject.flashcards.filter(f => f.id !== currentCardForModal.id);
                await saveAppData(data);
                loadCards(); 
                setAlertConfig(prev => ({ ...prev, visible: false }));
              }
            }
          }
        }
      ]
    });
  };

  const animatedFeedbackStyle = useAnimatedStyle(()=>({opacity: feedbackTextOpacity.value}));
  const animatedLeftGlowStyle = useAnimatedStyle(()=>({opacity: leftGlowOpacity.value}));
  const animatedRightGlowStyle = useAnimatedStyle(()=>({opacity: rightGlowOpacity.value}));
  const animatedTopGlowStyle = useAnimatedStyle(()=>({opacity: topGlowOpacity.value}));

  const CustomHeader = () => (
    <View style={[fcs.header, { paddingTop: insets.top }]}>
      <View style={fcs.headerInner}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={fcs.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={fcs.headerCenter}>
          <Text style={fcs.headerTitle} numberOfLines={1}>{subjectName || 'Estudar'}</Text>
          {cards.length > 0 && (
            <Text style={fcs.headerSub}>{Math.min(jsCurrentIndex + 1, totalCardsInSession)} / {totalCardsInSession}</Text>
          )}
        </View>
        <View style={fcs.headerActions}>
          {cards.length > 0 && (
            <>
              <TouchableOpacity
                style={fcs.headerBtn}
                onPress={() => navigation.navigate('FlashcardHistory', { deckId, subjectId })}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="create-outline" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={fcs.headerBtn}
                onPress={() => navigation.navigate('ManageFlashcards', { deckId, subjectId, preloadedCards: cards, subjectName })}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="add" size={24} color={theme.primary} />
              </TouchableOpacity>
            </>
          )}
          {cards.length === 0 && <View style={{ width: 36 }} />}
        </View>
      </View>
      <View style={fcs.headerDivider} />
    </View>
  );

  if (loading) {
    return (
      <View style={[fcs.root, { paddingTop: insets.top }]}>
        <View style={fcs.headerInner}>
          <View style={{ width: 36 }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <SkeletonItem style={{ width: 120, height: 16, borderRadius: 8 }} />
          </View>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <SkeletonItem style={{ width: screenWidth * 0.88, height: 380, borderRadius: 20 }} />
        </View>
      </View>
    );
  }

  if (cards.length === 0) {
    return (
      <View style={fcs.root}>
        <CustomHeader />
        <View style={fcs.emptyContainer}>
          {/* Ícone central */}
          <View style={fcs.emptyIconRing}>
            <Ionicons name="layers-outline" size={36} color={theme.primary} />
          </View>

          <Text style={fcs.emptyTitle}>Nenhum flashcard ainda</Text>
          <Text style={fcs.emptySubtitle}>
            Crie seu primeiro flashcard para começar a estudar {subjectName ? `"${subjectName}"` : 'esta matéria'}.
          </Text>

          {/* Steps */}
          <View style={fcs.stepsCard}>
            {[
              { icon: 'add-circle-outline', text: 'Toque em + para criar um flashcard' },
              { icon: 'sync-outline', text: 'Estude com revisão espaçada inteligente' },
              { icon: 'trending-up-outline', text: 'Acompanhe seu progresso evoluindo' },
            ].map((step, i) => (
              <View key={i} style={[fcs.stepRow, i > 0 && fcs.stepRowBorder]}>
                <View style={fcs.stepIcon}>
                  <Ionicons name={step.icon} size={16} color={theme.primary} />
                </View>
                <Text style={fcs.stepText}>{step.text}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={fcs.emptyBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ManageFlashcards', { deckId, subjectId, preloadedCards: [], subjectName })}
          >
            <Ionicons name="add" size={20} color="#0F0F0F" style={{ marginRight: 8 }} />
            <Text style={fcs.emptyBtnTxt}>Criar primeiro flashcard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.studyContainer, { paddingTop: insets.top }]}>
        <CustomHeader />
        <Animated.View style={[styles.glow, styles.glowLeft, animatedLeftGlowStyle]}><LinearGradient colors={[theme.dangerGlow, 'transparent']} style={styles.flexOne} start={{x: 0, y:0}} end={{x:1, y:0}}/></Animated.View>
        <Animated.View style={[styles.glow, styles.glowRight, animatedRightGlowStyle]}><LinearGradient colors={['transparent', theme.successGlow]} style={styles.flexOne} start={{x: 0, y:0}} end={{x:1, y:0}}/></Animated.View>
        <Animated.View style={[styles.glow, styles.glowTop, animatedTopGlowStyle]}><LinearGradient colors={[theme.infoGlow, 'transparent']} style={styles.flexOne} start={{x: 0, y:0}} end={{x:0, y:1}}/></Animated.View>

        {currentCardForModal && <Modal animationType="fade" transparent={true} visible={isOptionsModalVisible} onRequestClose={() => setOptionsModalVisible(false)}>
            <TouchableWithoutFeedback onPress={() => setOptionsModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Opções do Card</Text>
                    {currentCardForModal.isUserCreated && (
                        <TouchableOpacity style={styles.modalButton} onPress={() => { setOptionsModalVisible(false); navigation.navigate('ManageFlashcards', { deckId, subjectId, cardId: currentCardForModal.id })}}>
                            <Ionicons name="create-outline" size={22} color="#FFFFFF" /><Text style={styles.modalButtonText}>Editar Card</Text>
                        </TouchableOpacity>
                    )}
                    {currentCardForModal.isUserCreated && (
                        <TouchableOpacity style={[styles.modalButton, {backgroundColor: theme.danger}]} onPress={performDelete}>
                            <Ionicons name="trash-outline" size={22} color="#FFFFFF" /><Text style={styles.modalButtonText}>Apagar Card</Text>
                        </TouchableOpacity>
                    )}
                     <TouchableOpacity style={[styles.modalButton, {backgroundColor: theme.backgroundTertiary, marginTop: 20}]} onPress={() => setOptionsModalVisible(false)}>
                        <Text style={styles.modalButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
                </TouchableWithoutFeedback>
            </View>
            </TouchableWithoutFeedback>
        </Modal>}

        <GestureDetector gesture={gesture}>
            <Animated.View style={styles.cardWrapper}>
            {cards.map((card, index) => (
                <FlashcardItem
                    key={card.id} card={card} index={index}
                    currentIndex={currentIndex} totalCards={cards.length}
                    translateX={translateX} translateY={translateY}
                    onFlip={onFlip} isFlipped={isFlipped}
                    jsCurrentIndex={jsCurrentIndex}
                    showLevel={!reviewAll}
                />
                )
            )}
            </Animated.View>
        </GestureDetector>

        <View style={styles.swipeGuideContainer}>
          <Animated.Text style={[styles.feedbackText, { color: feedbackColor }, animatedFeedbackStyle]}>{feedbackText}</Animated.Text>
          <TouchableOpacity onPress={() => currentCardForModal?.isUserCreated && setOptionsModalVisible(true)}>
             <Text style={styles.swipeGuideText}>
                {jsIsFlipped ? "Arraste para classificar" : "Toque no card para revelar"}
                {currentCardForModal?.isUserCreated && <Ionicons name="ellipsis-horizontal" size={16} color={theme.textMuted} />}
            </Text>
          </TouchableOpacity>
        </View>


        <CustomAlert visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} buttons={alertConfig.buttons} onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))} />
    </View>
  );
};


// =================================================================
// Estilos do novo header e tela vazia
// =================================================================

const fcs = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.background,
  },

  // Header
  header: {
    backgroundColor: theme.background,
  },
  headerInner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: theme.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerDivider: {
    height: 1,
    backgroundColor: theme.backgroundSecondary,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  emptyIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(93,214,44,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(93,214,44,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: theme.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: theme.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  stepsCard: {
    width: '100%',
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 28,
    overflow: 'hidden',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  stepRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(93,214,44,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 15,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  emptyBtnTxt: {
    color: '#0F0F0F',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default FlashcardScreen;
