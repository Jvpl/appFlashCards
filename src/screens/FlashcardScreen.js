import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, InteractionManager, Modal, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, useAnimatedReaction, interpolate } from 'react-native-reanimated';
import { getAppData, saveAppData, saveStudySession } from '../services/storage';
import { calculateCardUpdate } from '../services/srs';
import { FlashcardItem } from '../components/flashcard/FlashcardItem';
import { SkeletonItem } from '../components/ui/SkeletonItem';
import { CustomAlert } from '../components/ui/CustomAlert';
import styles from '../styles/globalStyles';
import theme from '../styles/theme';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

function formatNextReview(ms) {
  const diff = ms - Date.now();
  if (diff <= 0) return 'na próxima sessão';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.round(diff / 3600000);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(diff / 86400000);
  return `${days} dia${days > 1 ? 's' : ''}`;
}



export const FlashcardScreen = ({ route, navigation }) => {
  const { deckId, subjectId, deckName, subjectName, preloadedCards, reviewAll, reviewMode } = route.params;
  const insets = useSafeAreaInsets();
  const initialState = React.useMemo(() => {
    if (!preloadedCards || reviewAll || reviewMode) {
      return { cards: preloadedCards ? [...preloadedCards].sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0)) : [], sessionDone: false, sessionNextReview: null, totalSubjectCards: null };
    }
    const now = new Date();
    const filtered = preloadedCards
      .filter(c => (c.level || 0) < 5 && (c.nextReview == null || new Date(c.nextReview) <= now))
      .sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
    if (filtered.length === 0 && preloadedCards.length > 0) {
      let earliest = null;
      preloadedCards.forEach(c => {
        if (c.nextReview) {
          const t = new Date(c.nextReview).getTime();
          if (earliest === null || t < earliest) earliest = t;
        }
      });
      return { cards: filtered, sessionDone: true, sessionNextReview: earliest, totalSubjectCards: preloadedCards.length };
    }
    return { cards: filtered, sessionDone: false, sessionNextReview: null, totalSubjectCards: preloadedCards.length };
  }, []);

  const [cards, setCards] = useState(initialState.cards);
  const cacheKey = reviewAll ? `${deckId}-all` : `${deckId}-${subjectId}`;
  const [loading, setLoading] = useState(initialState.cards.length === 0 && !initialState.sessionDone && !global.screenCache?.flashcards?.has(cacheKey));

  const [totalCardsInSession, setTotalCardsInSession] = useState(initialState.cards.length || 0);
  const isFocused = useIsFocused();

  const reviewUpdates = useRef([]);
  const hasLoadedOnce = useRef(false);
  const sessionDoneRef = useRef(false);

  const currentIndex = useSharedValue(0);
  const isFlipped = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const resetKey = useSharedValue(0);
  const swipeProgress = useSharedValue(0);
  // 0=none 1=left(errei) 2=right(memorizado) 3=up(quase)
  const swipeDirection = useSharedValue(0);

  const [jsCurrentIndex, setJsCurrentIndex] = useState(0);
  const [jsIsFlipped, setJsIsFlipped] = useState(false);

  const leftGlowOpacity = useSharedValue(0);
  const rightGlowOpacity = useSharedValue(0);
  const topGlowOpacity = useSharedValue(0);
  const feedbackTextOpacity = useSharedValue(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('transparent');
  const [swipeReviewText, setSwipeReviewText] = useState('');
  const previewTextsRef = useRef({ wrong: '', hard: '', easy: '' });
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });
  const [sessionDone, setSessionDone] = useState(initialState.sessionDone);
  const [sessionNextReview, setSessionNextReview] = useState(initialState.sessionNextReview);
  const [totalSubjectCards, setTotalSubjectCards] = useState(initialState.totalSubjectCards);


  const [headerMenuVisible, setHeaderMenuVisible] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: subjectName || 'Estudar',
      headerTitleAlign: 'center',
      headerTitle: undefined,
      headerRight: () => (
        <TouchableOpacity
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 8, opacity: sessionDone ? 0.3 : 1 }}
          onPress={() => { if (!sessionDone) setHeaderMenuVisible(v => !v); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={sessionDone}
        >
          <Ionicons name="ellipsis-vertical" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, subjectName, deckId, subjectId, sessionDone]);

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
    const isReturning = hasLoadedOnce.current;
    hasLoadedOnce.current = true;
    const data = allData;
    const deck = data.find(c => c.id === deckId);
    if (reviewAll) {
      const allCards = (deck?.subjects || []).flatMap(s =>
        (s.flashcards || []).map(c => ({ ...c, _subjectId: s.id }))
      ).sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
      setCards(allCards);
      setTotalCardsInSession(allCards.length);
    } else {
      const subject = deck ? deck.subjects.find(s => s.id === subjectId) : null;
      if (subject) {
        const now = new Date();
        const allSubjectCards = subject.flashcards || [];
        const cardsToReview = allSubjectCards
          .filter(c => (c.level || 0) < 5 && (c.nextReview == null || new Date(c.nextReview) <= now))
          .sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
        setTotalSubjectCards(allSubjectCards.length);
        setCards(cardsToReview);
        setTotalCardsInSession(cardsToReview.length);
        // Todos em cooldown: calcular próximo review e mostrar tela de parabéns
        if (cardsToReview.length === 0 && allSubjectCards.length > 0 && !isReturning) {
          let earliest = null;
          allSubjectCards.forEach(c => {
            if (c.nextReview) {
              const t = new Date(c.nextReview).getTime();
              if (earliest === null || t < earliest) earliest = t;
            }
          });
          setSessionNextReview(earliest);
          sessionDoneRef.current = true; setSessionDone(true);
          setLoading(false);
          return;
        }
      }
    }
    if (!isReturning) {
      currentIndex.value = 0;
      isFlipped.value = 0;
      translateX.value = 0;
      translateY.value = 0;
      resetKey.value = resetKey.value + 1;
      runOnJS(setJsCurrentIndex)(0);
      runOnJS(setJsIsFlipped)(false);
    } else {
      translateX.value = 0;
      translateY.value = 0;
    }
    setLoading(false); // Stop loading
  }, [deckId, subjectId, currentIndex, isFlipped, translateX, translateY, resetKey]);


  const loadCardsRef = useRef(loadCards);
  useEffect(() => { loadCardsRef.current = loadCards; });

  useEffect(() => {
    if (isFocused) {
      const task = InteractionManager.runAfterInteractions(() => {
        loadCardsRef.current();
      });
      return () => task.cancel();
    }
  }, [isFocused]);

  useAnimatedReaction(() => currentIndex.value, (res) => { runOnJS(setJsCurrentIndex)(Math.floor(res)) });
  useAnimatedReaction(() => isFlipped.value, (res) => { runOnJS(setJsIsFlipped)(res) });

  // Warm-up: dispara withTiming invisível para compilar worklet antes do primeiro flip
  const _warmup = useSharedValue(0);
  useEffect(() => {
    _warmup.value = withTiming(1, { duration: 1 }, () => { _warmup.value = 0; });
  }, []);

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
    await saveStudySession({
      deckId,
      deckName: deckName || deckId,
      subjectId: reviewAll ? 'all' : subjectId,
      subjectName: reviewAll ? 'Revisão Geral' : (subjectName || subjectId),
      count: reviewUpdates.current.length,
    });
    reviewUpdates.current = [];
  }, [deckId, subjectId, deckName, subjectName, reviewAll]);

  useEffect(() => { return () => { saveSessionProgress(); } }, [saveSessionProgress]);

  // Intercepta o botão voltar: salva os dados ANTES de navegar
  // Assim a SubjectListScreen já encontra os dados atualizados ao recarregar
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (reviewUpdates.current.length === 0) return;
      e.preventDefault();
      saveSessionProgress().then(() => {
        navigation.dispatch(e.data.action);
      });
    });
    return unsubscribe;
  }, [navigation, saveSessionProgress]);

  const onFlip = useCallback(() => { isFlipped.value = !isFlipped.value; }, [isFlipped]);

  const getNextReviewText = useCallback((nextReview) => {
    if (!nextReview) return 'Volta imediatamente';
    const diffMin = Math.round((new Date(nextReview) - new Date()) / 60000);
    if (diffMin <= 0) return 'Volta imediatamente';
    if (diffMin < 60) return `Volta em ${diffMin} min`;
    if (diffMin < 1440) return `Volta em ${Math.round(diffMin / 60)}h`;
    return `Volta em ${Math.round(diffMin / 1440)} dia${Math.round(diffMin / 1440) > 1 ? 's' : ''}`;
  }, []);

  const handleReview = useCallback((cardToReview, rating) => {
    if (!cardToReview) return;
    const updatedCard = calculateCardUpdate(cardToReview, rating);
    const existingIndex = reviewUpdates.current.findIndex(c => c.id === updatedCard.id);
    if (existingIndex > -1) reviewUpdates.current[existingIndex] = updatedCard;
    else reviewUpdates.current.push(updatedCard);
    setSwipeReviewText('');
  }, [getNextReviewText]);

  useEffect(() => {
    const card = cards[jsCurrentIndex];
    if (!card) { previewTextsRef.current = { wrong: '', hard: '', easy: '' }; return; }
    previewTextsRef.current = {
      wrong: getNextReviewText(calculateCardUpdate(card, 'wrong')?.nextReview),
      hard: getNextReviewText(calculateCardUpdate(card, 'hard')?.nextReview),
      easy: getNextReviewText(calculateCardUpdate(card, 'easy')?.nextReview),
    };
  }, [jsCurrentIndex, cards, getNextReviewText]);

  const panGestureRef = useRef();
  const gesture = useMemo(() => {
    return Gesture.Pan().withRef(panGestureRef)
      .onUpdate((event) => {
        'worklet';
        if (!isFlipped.value) return;
        translateX.value = event.translationX;
        translateY.value = event.translationY;
        const xAbs = Math.abs(event.translationX);
        const yAbs = Math.abs(event.translationY);

        let opacity = 0;
        if (event.translationX < -30 && xAbs > yAbs) { // Left — Errei
          runOnJS(setSwipeReviewText)(previewTextsRef.current.wrong);
          opacity = interpolate(xAbs, [30, screenWidth / 2], [0, 1], 'clamp');
          leftGlowOpacity.value = opacity; rightGlowOpacity.value = 0; topGlowOpacity.value = 0;
          swipeDirection.value = 1;
          swipeProgress.value = opacity;
        } else if (event.translationX > 30 && xAbs > yAbs) { // Right — Memorizado
          runOnJS(setSwipeReviewText)(previewTextsRef.current.easy);
          opacity = interpolate(xAbs, [30, screenWidth / 2], [0, 1], 'clamp');
          rightGlowOpacity.value = opacity; leftGlowOpacity.value = 0; topGlowOpacity.value = 0;
          swipeDirection.value = 2;
          swipeProgress.value = opacity;
        } else if (event.translationY < -30 && yAbs > xAbs) { // Up — Quase
          runOnJS(setSwipeReviewText)(previewTextsRef.current.hard);
          opacity = interpolate(yAbs, [30, screenHeight / 3], [0, 1], 'clamp');
          topGlowOpacity.value = opacity; leftGlowOpacity.value = 0; rightGlowOpacity.value = 0;
          swipeDirection.value = 3;
          swipeProgress.value = opacity;
        } else {
          runOnJS(setSwipeReviewText)('');
          opacity = 0;
          leftGlowOpacity.value = withTiming(0); rightGlowOpacity.value = withTiming(0); topGlowOpacity.value = withTiming(0);
          swipeDirection.value = 0;
          swipeProgress.value = 0;
        }
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
        swipeProgress.value = withTiming(0);
        swipeDirection.value = 0;

        const swipeThresholdX = screenWidth * 0.3;
        const swipeThresholdY = screenHeight * 0.2;

        let rating = null;
        let destinationX = 0;
        let destinationY = 0;

        const isNearRight = event.translationX > swipeThresholdX * 0.8;
        const isNearLeft = event.translationX < -swipeThresholdX * 0.8;
        const isNearTop = event.translationY < -swipeThresholdY * 0.8;

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
          runOnJS(setSwipeReviewText)('');
          swipeProgress.value = withTiming(0);
          swipeDirection.value = 0;
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
        }
      });
  }, [handleReview, isFlipped, translateX, translateY, currentIndex, swipeProgress, swipeDirection]);

  const handleReviewComplete = useCallback(async () => {
    if (!reviewMode || !subjectId) {
      // Captura antes de saveSessionProgress zerar o array
      const snapshot = [...reviewUpdates.current];
      await saveSessionProgress();
      let earliest = null;
      const allToCheck = snapshot.length > 0 ? snapshot : cards;
      allToCheck.forEach(c => {
        if (c.nextReview) {
          const t = new Date(c.nextReview).getTime();
          if (earliest === null || t < earliest) earliest = t;
        }
      });
      setSessionNextReview(earliest);
      sessionDoneRef.current = true; setSessionDone(true);
      return;
    }
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
  }, [reviewMode, subjectId, deckId, navigation, currentIndex, isFlipped, saveSessionProgress, cards]);

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

  const animatedFeedbackStyle = useAnimatedStyle(() => ({ opacity: feedbackTextOpacity.value }));
  const animatedLeftGlowStyle = useAnimatedStyle(() => ({ opacity: leftGlowOpacity.value }));
  const animatedRightGlowStyle = useAnimatedStyle(() => ({ opacity: rightGlowOpacity.value }));
  const animatedTopGlowStyle = useAnimatedStyle(() => ({ opacity: topGlowOpacity.value }));

  if (sessionDone) {
    return (
      <View style={fcs.root}>
        {headerMenuVisible && (
          <TouchableWithoutFeedback onPress={() => setHeaderMenuVisible(false)}>
            <View style={fcs.menuOverlay}>
              <TouchableWithoutFeedback>
                <View style={fcs.menuDropdown}>
                  <TouchableOpacity style={fcs.menuItem} onPress={() => { setHeaderMenuVisible(false); navigation.navigate('ManageFlashcards', { deckId, subjectId, preloadedCards: [], subjectName }); }}>
                    <Ionicons name="add-circle-outline" size={20} color={theme.textPrimary} />
                    <Text style={fcs.menuItemText}>Criar card</Text>
                  </TouchableOpacity>
                  <View style={fcs.menuDivider} />
                  <TouchableOpacity style={fcs.menuItem} onPress={() => { setHeaderMenuVisible(false); navigation.navigate('FlashcardHistory', { deckId, subjectId }); }}>
                    <Ionicons name="layers-outline" size={20} color={theme.textPrimary} />
                    <Text style={fcs.menuItemText}>Gerenciar cards</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        )}
        <View style={fcs.doneContainer}>
          <View style={fcs.doneIconRing}>
            <Ionicons name="checkmark-done" size={40} color={theme.primary} />
          </View>
          <Text style={fcs.doneTitle}>Sessão concluída!</Text>
          <Text style={fcs.doneSubtitle}>
            {totalCardsInSession > 0
              ? `Você estudou ${totalCardsInSession} card${totalCardsInSession !== 1 ? 's' : ''} de `
              : 'Nenhum card disponível agora em '
            }
            <Text style={{ color: theme.textPrimary, fontFamily: theme.fontFamily.uiSemiBold }}>{subjectName}</Text>
          </Text>
          {sessionNextReview != null && (
            <View style={fcs.doneNextRow}>
              <Ionicons name="time-outline" size={16} color={theme.textMuted} />
              <Text style={fcs.doneNextText}>
                Próximo card disponível em <Text style={{ color: theme.primary }}>{formatNextReview(sessionNextReview)}</Text>
              </Text>
            </View>
          )}
          <View style={fcs.doneBtnRow}>
            <TouchableOpacity style={fcs.doneBtn} onPress={() => navigation.goBack()}>
              <Text style={fcs.doneBtnTxt}>Voltar</Text>
            </TouchableOpacity>
            {(sessionNextReview == null || sessionNextReview <= Date.now()) && (
              <TouchableOpacity
                style={fcs.doneBtnPrimary}
                onPress={async () => {
                  sessionDoneRef.current = false;
                  setSessionDone(false);
                  hasLoadedOnce.current = false;
                  setLoading(true);
                  await loadCards();
                }}
              >
                <Text style={fcs.doneBtnPrimaryTxt}>Continuar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  if (loading || totalSubjectCards === null) {
    const cardW = screenWidth * 0.9;
    return (
      <View style={fcs.root}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: cardW, height: 460, backgroundColor: theme.backgroundSecondary, borderRadius: 20, padding: 28, justifyContent: 'center', gap: 14 }}>
            <SkeletonItem style={{ width: '60%', height: 14, borderRadius: 7 }} />
            <SkeletonItem style={{ width: '90%', height: 14, borderRadius: 7 }} />
            <SkeletonItem style={{ width: '75%', height: 14, borderRadius: 7 }} />
            <SkeletonItem style={{ width: '50%', height: 14, borderRadius: 7 }} />
          </View>
        </View>
        <View style={{ alignItems: 'center', paddingBottom: 48 }}>
          <SkeletonItem style={{ width: 160, height: 13, borderRadius: 6 }} />
        </View>
      </View>
    );
  }

  if (cards.length === 0 && totalSubjectCards === 0) {
    return (
      <View style={fcs.root}>
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
    <View style={styles.studyContainer}>

      {currentCardForModal && <Modal animationType="fade" transparent={true} visible={isOptionsModalVisible} onRequestClose={() => setOptionsModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setOptionsModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Opções do Card</Text>
                {currentCardForModal.isUserCreated && (
                  <TouchableOpacity style={styles.modalButton} onPress={() => { setOptionsModalVisible(false); navigation.navigate('ManageFlashcards', { deckId, subjectId, cardId: currentCardForModal.id }); }}>
                    <Ionicons name="create-outline" size={22} color="#FFFFFF" /><Text style={styles.modalButtonText}>Editar Card</Text>
                  </TouchableOpacity>
                )}
                {currentCardForModal.isUserCreated && (
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.danger }]} onPress={performDelete}>
                    <Ionicons name="trash-outline" size={22} color="#FFFFFF" /><Text style={styles.modalButtonText}>Apagar Card</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.backgroundTertiary, marginTop: 20 }]} onPress={() => setOptionsModalVisible(false)}>
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
              jsIsFlipped={jsIsFlipped}
              resetKey={resetKey}
              showLevel={!reviewAll}
              swipeProgress={swipeProgress}
              swipeDirection={swipeDirection}
              onEdit={() => navigation.navigate('ManageFlashcards', { deckId, subjectId, cardId: card.id })}
            />
          )
          )}
        </Animated.View>
      </GestureDetector>

      <View style={[styles.swipeGuideContainer, { bottom: insets.bottom + 100 }]}>
<TouchableOpacity onPress={() => currentCardForModal?.isUserCreated && setOptionsModalVisible(true)}>
          <Text style={styles.swipeGuideText}>
            {jsIsFlipped ? "Arraste para classificar" : "Toque no card para revelar"}
            {currentCardForModal?.isUserCreated && <Ionicons name="ellipsis-horizontal" size={16} color={theme.textMuted} />}
          </Text>
        </TouchableOpacity>
        {!reviewAll && <Text style={{ color: theme.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4, opacity: swipeReviewText ? 1 : 0 }}>{swipeReviewText || ' '}</Text>}
      </View>


      <CustomAlert visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} buttons={alertConfig.buttons} onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))} />

      {headerMenuVisible && (
        <TouchableWithoutFeedback onPress={() => setHeaderMenuVisible(false)}>
          <View style={fcs.menuOverlay}>
            <TouchableWithoutFeedback>
              <View style={fcs.menuDropdown}>
                <TouchableOpacity style={fcs.menuItem} onPress={() => { setHeaderMenuVisible(false); navigation.navigate('ManageFlashcards', { deckId, subjectId, preloadedCards: [], subjectName }); }}>
                  <Ionicons name="add-circle-outline" size={20} color={theme.textPrimary} />
                  <Text style={fcs.menuItemText}>Criar card</Text>
                </TouchableOpacity>
                <View style={fcs.menuDivider} />
                <TouchableOpacity style={fcs.menuItem} onPress={() => { setHeaderMenuVisible(false); navigation.navigate('FlashcardHistory', { deckId, subjectId }); }}>
                  <Ionicons name="layers-outline" size={20} color={theme.textPrimary} />
                  <Text style={fcs.menuItemText}>Gerenciar cards</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
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
  menuOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
  },
  menuDropdown: {
    position: 'absolute',
    top: 8,
    right: 12,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    minWidth: 190,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: {
    color: theme.textPrimary,
    fontSize: 14,
    fontFamily: theme.fontFamily.uiMedium,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 0,
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

  // Session done state
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
    gap: 0,
  },
  doneIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(93,214,44,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(93,214,44,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  doneTitle: {
    color: theme.textPrimary,
    fontSize: 24,
    fontFamily: theme.fontFamily.uiBold,
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: 'center',
  },
  doneSubtitle: {
    color: theme.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  doneNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  doneNextText: {
    color: theme.textMuted,
    fontSize: 13,
  },
  doneBtnRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  doneBtn: {
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  doneBtnTxt: {
    color: theme.textPrimary,
    fontSize: 15,
    fontFamily: theme.fontFamily.uiMedium,
  },
  doneBtnPrimary: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  doneBtnPrimaryTxt: {
    color: '#0F0F0F',
    fontSize: 15,
    fontFamily: theme.fontFamily.uiBold,
  },
});

export default FlashcardScreen;
