import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, BackHandler, Alert, InteractionManager, ActivityIndicator, Modal, TouchableWithoutFeedback } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, useAnimatedReaction, interpolate } from 'react-native-reanimated';
import { getAppData, saveAppData } from '../services/storage';
import { calculateCardUpdate } from '../services/srs';
import { FlashcardItem } from '../components/flashcard/FlashcardItem';
import { SkeletonItem } from '../components/ui/SkeletonItem';
import { CustomAlert } from '../components/ui/CustomAlert';
import styles from '../styles/globalStyles';

export const FlashcardScreen = ({ route, navigation }) => {
  const { deckId, subjectId, preloadedCards } = route.params; // Recebe preloadedCards
  const [cards, setCards] = useState(() => {
     if (preloadedCards) {
        // Aplica o filtro de revisão inicial se os dados vierem preloadados
        const now = new Date();
        return preloadedCards
          .filter(c => (c.level || 0) < 5 && (c.nextReview == null || new Date(c.nextReview) <= now))
          .sort((a,b) => (a.nextReview || 0) - (b.nextReview || 0));
     }
     return [];
  });
  const cacheKey = `${deckId}-${subjectId}`;
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

  // Adiciona o botão '+' e 'Editar/Historico' no cabeçalho
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
             <TouchableOpacity
              onPress={() => navigation.navigate('FlashcardHistory', { deckId, subjectId })}
              style={{ marginRight: 20 }}
            >
              <Ionicons name="create-outline" size={26} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('ManageFlashcards', { deckId, subjectId, preloadedCards: cards })}
            >
              <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, deckId, subjectId, cards]); // Added cards dependency

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
      const subject = deck ? deck.subjects.find(s => s.id === subjectId) : null;
      if (subject) {
        const now = new Date();
        const cardsToReview = subject.flashcards
          .filter(c => (c.level || 0) < 5 && (c.nextReview == null || new Date(c.nextReview) <= now))
          .sort((a,b) => (a.nextReview || 0) - (b.nextReview || 0)); // Sorteio corrigido
        setCards(cardsToReview);
        setTotalCardsInSession(cardsToReview.length);
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
    reviewUpdates.current = [];
  }, [deckId, subjectId]);

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
            runOnJS(setFeedbackText)('Errei'); runOnJS(setFeedbackColor)('#EF4444');
            opacity = interpolate(xAbs, [30, screenWidth / 2], [0, 1], 'clamp');
            leftGlowOpacity.value = opacity; rightGlowOpacity.value = 0; topGlowOpacity.value = 0;
          } else if (event.translationX > 30 && xAbs > yAbs) { // Right
            runOnJS(setFeedbackText)('Memorizado'); runOnJS(setFeedbackColor)('#22C55E');
            opacity = interpolate(xAbs, [30, screenWidth / 2], [0, 1], 'clamp');
            rightGlowOpacity.value = opacity; leftGlowOpacity.value = 0; topGlowOpacity.value = 0;
          } else if (event.translationY < -30 && yAbs > xAbs) { // Up
            runOnJS(setFeedbackText)('Quase'); runOnJS(setFeedbackColor)('#3B82F6');
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
          };

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

  useAnimatedReaction(() => currentIndex.value, (value) => {
    if (value >= totalCardsInSession && totalCardsInSession > 0) {
        runOnJS(navigation.goBack)();
    }
  }, [totalCardsInSession, navigation]); // Adicionado dependências

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

  if (loading) {
      return (
        <View style={[styles.baseContainer, { justifyContent: 'center', alignItems: 'center' }]}>
            <SkeletonItem width={screenWidth * 0.9} height={380} style={{borderRadius: 15, marginBottom: 20}} />
            <View style={{width: '90%', flexDirection: 'row', justifyContent: 'space-between'}}>
                 <SkeletonItem width={80} height={80} style={{borderRadius: 40}} />
                 <SkeletonItem width={80} height={80} style={{borderRadius: 40}} />
                 <SkeletonItem width={80} height={80} style={{borderRadius: 40}} />
            </View>
        </View>
      );
  }

  if (cards.length === 0) {
    return isFocused
      ? <View style={styles.centered}><Text style={styles.noCardsText}>Nenhum card para revisar. Volte mais tarde ou adicione novos cards!</Text></View>
      : <View style={styles.centered}><ActivityIndicator size="large" color="#4A5568" /></View>;
  }

  return (
    <View style={styles.studyContainer}>
        <Animated.View style={[styles.glow, styles.glowLeft, animatedLeftGlowStyle]}><LinearGradient colors={['rgba(239, 68, 68, 0.5)', 'transparent']} style={styles.flexOne} start={{x: 0, y:0}} end={{x:1, y:0}}/></Animated.View>
        <Animated.View style={[styles.glow, styles.glowRight, animatedRightGlowStyle]}><LinearGradient colors={['transparent', 'rgba(34, 197, 94, 0.5)']} style={styles.flexOne} start={{x: 0, y:0}} end={{x:1, y:0}}/></Animated.View>
        <Animated.View style={[styles.glow, styles.glowTop, animatedTopGlowStyle]}><LinearGradient colors={['rgba(59, 130, 246, 0.5)', 'transparent']} style={styles.flexOne} start={{x: 0, y:0}} end={{x:0, y:1}}/></Animated.View>

        {currentCardForModal && <Modal animationType="fade" transparent={true} visible={isOptionsModalVisible} onRequestClose={() => setOptionsModalVisible(false)}>
            <TouchableWithoutFeedback onPress={() => setOptionsModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Opções do Card</Text>
                    {currentCardForModal.isUserCreated && (
                        <TouchableOpacity style={styles.modalButton} onPress={() => { setOptionsModalVisible(false); navigation.navigate('EditFlashcard', { deckId, subjectId, cardId: currentCardForModal.id })}}>
                            <Ionicons name="create-outline" size={22} color="#FFFFFF" /><Text style={styles.modalButtonText}>Editar Card</Text>
                        </TouchableOpacity>
                    )}
                    {currentCardForModal.isUserCreated && (
                        <TouchableOpacity style={[styles.modalButton, {backgroundColor: '#EF4444'}]} onPress={performDelete}>
                            <Ionicons name="trash-outline" size={22} color="#FFFFFF" /><Text style={styles.modalButtonText}>Apagar Card</Text>
                        </TouchableOpacity>
                    )}
                     <TouchableOpacity style={[styles.modalButton, {backgroundColor: '#4A5568', marginTop: 20}]} onPress={() => setOptionsModalVisible(false)}>
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
                {currentCardForModal?.isUserCreated && <Ionicons name="ellipsis-horizontal" size={16} color="#A0AEC0" />}
            </Text>
          </TouchableOpacity>
        </View>


        <View style={styles.progressIndicator}>
          <Text style={styles.progressText}>{Math.min(jsCurrentIndex + 1, totalCardsInSession)} / {totalCardsInSession}</Text>
        </View>
        <CustomAlert visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} buttons={alertConfig.buttons} onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))} />
    </View>
  );
};


// =================================================================

export default FlashcardScreen;
