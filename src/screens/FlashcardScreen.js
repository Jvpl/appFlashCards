import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, InteractionManager, Modal, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, useAnimatedReaction, interpolate } from 'react-native-reanimated';
import { getAppData, saveAppData, saveStudySession, savePerformanceData, updateStudyUnit, findStudyUnit, isDailyGoalReachedToday, saveDailyGoalReached, recordCardsAvailability } from '../services/storage';
import { calculateCardUpdate } from '../services/srs';
import { FlashcardItem } from '../components/flashcard/FlashcardItem';
import { SwipeTutorial } from '../components/flashcard/SwipeTutorial';
import { SkeletonItem } from '../components/ui/SkeletonItem';
import { CustomAlert } from '../components/ui/CustomAlert';
import styles from '../styles/globalStyles';
import theme from '../styles/theme';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

const InsertAnimCard = React.memo(({ insertAnim, width, baseScale = 0.93, baseTranslateY = -40, opacity = 1, zIndex = 1 }) => {
  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(insertAnim.value, [0, 1], [baseScale - 0.05, baseScale]) },
      { translateY: interpolate(insertAnim.value, [0, 1], [baseTranslateY + 20, baseTranslateY]) },
    ],
    opacity: interpolate(insertAnim.value, [0, 0.3, 1], [0, opacity, opacity]),
  }));
  return (
    <Animated.View style={[{
      position: 'absolute', width, height: 460,
      backgroundColor: '#242427ff', borderRadius: 20,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', zIndex,
    }, style]} />
  );
});

// Ref global — fora do componente, não é serializado pelo Reanimated
let _handleReviewByIndex = null;
let _queue = []; // fila de cards fora do componente — não serializado pelo Reanimated

function formatNextReview(ms) {
  const diff = ms - Date.now();
  if (diff <= 0) return 'na próxima sessão';
  const mins = Math.ceil(diff / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.ceil(diff / 3600000);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.ceil(diff / 86400000);
  return `${days} dia${days > 1 ? 's' : ''}`;
}



const GoalInfoModal = ({ visible, onClose }) => {
  const [page, setPage] = React.useState(0);
  React.useEffect(() => { if (visible) setPage(0); }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }}>
          <TouchableWithoutFeedback>
            <View style={{ backgroundColor: '#141414', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', width: '100%' }}>

              {page === 0 ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <Ionicons name="flame" size={20} color={theme.primary} />
                    <Text style={{ color: theme.textPrimary, fontSize: 17, fontFamily: theme.fontFamily.uiBold }}>O que é a meta diária?</Text>
                  </View>
                  <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 12 }}>
                    A meta diária é um <Text style={{ color: theme.textPrimary, fontFamily: theme.fontFamily.uiSemiBold }}>hábito</Text> — ela existe para te ajudar a estudar todos os dias e manter sua sequência 🔥
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 12 }}>
                    Ela <Text style={{ color: theme.textPrimary, fontFamily: theme.fontFamily.uiSemiBold }}>não afeta seu progresso</Text> — seus acertos e a evolução dos cards são sempre salvos, independente da meta.
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 12 }}>
                    O banner aparece em qualquer matéria que você abrir, mas você só precisa completar em <Text style={{ color: theme.textPrimary, fontFamily: theme.fontFamily.uiSemiBold }}>uma delas</Text> para validar o dia.
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 22 }}>
                    Se você começar a estudar e sair antes de completar a meta, <Text style={{ color: theme.textPrimary, fontFamily: theme.fontFamily.uiSemiBold }}>seu progresso nos cards é mantido</Text>, mas a sequência é quebrada — você ainda precisará completar a meta do dia nessa ou em outra matéria.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                    <TouchableOpacity onPress={onClose} style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                      <Text style={{ color: theme.textSecondary, fontFamily: theme.fontFamily.uiMedium, fontSize: 14 }}>Fechar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setPage(1)} style={{ flex: 1, backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
                      <Text style={{ color: '#0F0F0F', fontFamily: theme.fontFamily.uiBold, fontSize: 14 }}>Como funciona →</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <Ionicons name="flag" size={20} color={theme.primary} />
                    <Text style={{ color: theme.textPrimary, fontSize: 17, fontFamily: theme.fontFamily.uiBold }}>Como bater a meta?</Text>
                  </View>
                  {[
                    { label: '1 card disponível (nível 0-2)', desc: 'acerte ele 3 vezes' },
                    { label: '1 card disponível (nível 3+)', desc: 'acerte 1 vez — cards avançados demoram a voltar, então 1 acerto já conta' },
                    { label: '2 cards disponíveis', desc: 'acerte cada um 2 vezes (ou 1 vez se forem nível 3+)' },
                    { label: '3 ou mais cards', desc: 'acerte todos pelo menos 1 vez — se tiver mais de 10, a meta fica em 10 acertos mínimos' },
                  ].map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                      <Ionicons name="checkmark-circle" size={18} color={theme.primary} style={{ marginTop: 2 }} />
                      <Text style={{ flex: 1, color: theme.textSecondary, fontSize: 14, lineHeight: 20 }}>
                        <Text style={{ color: theme.textPrimary, fontFamily: theme.fontFamily.uiSemiBold }}>{item.label}: </Text>
                        {item.desc}
                      </Text>
                    </View>
                  ))}
                  <Text style={{ color: theme.textMuted, fontSize: 13, lineHeight: 20, marginTop: 4 }}>
                    Se você errar e acertar depois, conta como acerto. O que importa é a última tentativa.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                    <TouchableOpacity onPress={() => setPage(0)} style={{ flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                      <Text style={{ color: theme.textSecondary, fontFamily: theme.fontFamily.uiMedium, fontSize: 14 }}>← Voltar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} style={{ flex: 1, backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
                      <Text style={{ color: '#0F0F0F', fontFamily: theme.fontFamily.uiBold, fontSize: 14 }}>Entendido</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Indicador de página */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 }}>
                {[0, 1].map(i => (
                  <View key={i} style={{ width: i === page ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? theme.primary : 'rgba(255,255,255,0.2)' }} />
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export const FlashcardScreen = ({ route, navigation }) => {
  const { deckId, subjectId, deckName, subjectName, parentSubjectName, preloadedCards, reviewAll, reviewMode, isExample } = route.params;
  const insets = useSafeAreaInsets();
  const initialState = React.useMemo(() => {
    if (!preloadedCards || reviewAll || reviewMode) {
      return { cards: preloadedCards ? [...preloadedCards].sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0)) : [], sessionDone: false, sessionNextReview: null, totalSubjectCards: null };
    }
    const now = new Date();
    const filtered = preloadedCards
      .filter(c => isExample || ((c.level || 0) < 5 && (c.nextReview == null || new Date(c.nextReview) <= now)))
      .sort((a, b) => (a.level || 0) - (b.level || 0) || (a.nextReview || 0) - (b.nextReview || 0));
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
  // Fila única: começa com os cards iniciais, nunca cresce — errado/quase move pro fim
  // Inicializa a fila global com os cards iniciais
  useMemo(() => { _queue = [...initialState.cards]; }, []);
  const [queueSize, setQueueSize] = useState(initialState.cards.length);
  const [swipeCount, setSwipeCount] = useState(0);
  const [goalReached, setGoalReached] = useState(false);
  // null = ainda verificando; true/false = resultado conhecido
  const [goalAlreadyDoneToday, setGoalAlreadyDoneToday] = useState(null);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [currentCard, setCurrentCard] = useState(initialState.cards[0] ?? null);
  const [nextCard, setNextCard] = useState(initialState.cards[1] ?? null);
  const cacheKey = reviewAll ? `${deckId}-all` : `${deckId}-${subjectId}`;
  const [loading, setLoading] = useState(initialState.cards.length === 0 && !initialState.sessionDone && initialState.totalSubjectCards !== 0 && !global.screenCache?.flashcards?.has(cacheKey));

  const [totalCardsInSession, setTotalCardsInSession] = useState(initialState.cards.length || 0);
  const totalCardsInSessionSV = useSharedValue(initialState.cards.length || 0);
  const isFocused = useIsFocused();

  const reviewUpdates = useRef([]);
  const saveInProgress = useRef(false);
  const pendingSave = useRef(false);
  const sessionStudiedIds = useRef(new Set());
  const sessionInitialIds = useRef(new Set());
  const sessionLastRating = useRef({}); // último rating por card id
  const hasLoadedOnce = useRef(false);
  const sessionDoneRef = useRef(false);
  const sessionStartRef = useRef(Date.now());
  const dailyGoalSavedRef = useRef(false);
  const sessionRatings = useRef({ right: 0, up: 0, left: 0, levelUps: 0 });
  // Conta swipes right totais (incluindo repetições do mesmo card) — usado para meta de 1-2 cards
  const totalRightSwipesRef = useRef(0);

  const currentIndex = useSharedValue(0);
  const isFlipped = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const resetKey = useSharedValue(0);
  const swipeProgress = useSharedValue(0);
  const swipeDirection = useSharedValue(0);
  const isAnimatingOut = useSharedValue(false);
  const cardOpacitySV = useSharedValue(1);
  const insertAnim = useSharedValue(1);
  // SharedValues para preview texts — evita captura de previewTextsRef no worklet
  const previewWrongSV = useSharedValue('');
  const previewEasySV = useSharedValue('');
  const previewHardSV = useSharedValue('');

  const [jsCurrentIndex, setJsCurrentIndex] = useState(0);
  const jsCurrentIndexRef = useRef(0);
  const [jsIsFlipped, setJsIsFlipped] = useState(false);

  const cardTopY = useSharedValue(0);
  const panActivated = useSharedValue(false);
  const leftGlowOpacity = useSharedValue(0);
  const rightGlowOpacity = useSharedValue(0);
  const topGlowOpacity = useSharedValue(0);
  const feedbackTextOpacity = useSharedValue(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('transparent');
  const [swipeReviewText, setSwipeReviewText] = useState('');
  const previewTextsRef = useRef({ wrong: '', hard: '', easy: '' });
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });
  const [sessionResult, setSessionResult] = useState(
    initialState.sessionDone ? { done: true, nextReview: initialState.sessionNextReview } : null
  );
  const sessionDone = !!sessionResult?.done;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!sessionDone) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [sessionDone]);
  const sessionNextReview = sessionResult?.nextReview ?? null;
  const setSessionDone = (val) => { if (!val) setSessionResult(null); };
  const setSessionNextReview = () => { }; // substituído por setSessionResult
  const [totalSubjectCards, setTotalSubjectCards] = useState(initialState.totalSubjectCards);
  const [doneCardCount, setDoneCardCount] = useState(0);
  const originalSessionTotal = useRef(initialState.cards.length || 0);
  // true se todos os cards disponíveis são nível 3+ — meta vira 1 acerto por card independente da quantidade
  const allCardsHighLevelRef = useRef(initialState.cards.length > 0 && initialState.cards.every(c => (c.level || 0) >= 3));


  const [headerMenuVisible, setHeaderMenuVisible] = useState(false);
  const tutorialRef = useRef(null);

  // No deck exemplo, sempre mostrar o tutorial ao entrar
  useEffect(() => {
    if (isExample) {
      const timer = setTimeout(() => tutorialRef.current?.show(), 400);
      return () => clearTimeout(timer);
    }
  }, [isExample]);


  useLayoutEffect(() => {
    navigation.setOptions({
      title: subjectName || 'Estudar',
      headerTitleAlign: 'center',
      headerTitle: undefined,
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => tutorialRef.current?.show()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="help-circle-outline" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          {!isExample && (
            <TouchableOpacity
              style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 8, opacity: sessionDone ? 0.3 : 1 }}
              onPress={() => { if (!sessionDone) setHeaderMenuVisible(v => !v); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={sessionDone}
            >
              <Ionicons name="ellipsis-vertical" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [navigation, subjectName, deckId, subjectId, sessionDone]);

  const loadCards = useCallback(async () => {
    const studiedThisSession = new Set(sessionStudiedIds.current);
    // Only delay if NOT cached
    const shouldDelay = !global.screenCache.flashcards.has(cacheKey);
    const minDelay = shouldDelay ? new Promise(resolve => setTimeout(resolve, 300)) : Promise.resolve();

    if (shouldDelay && (preloadedCards == null || preloadedCards.length > 0)) setLoading(true);

    const [allData] = await Promise.all([
      getAppData(),
      minDelay
    ]);

    // Mark as visited after load
    global.screenCache.flashcards.add(cacheKey);
    const isReturning = hasLoadedOnce.current;
    hasLoadedOnce.current = true;

    if (!isReturning) {
      currentIndex.value = 0;
      isFlipped.value = 0;
      translateX.value = 0;
      translateY.value = 0;
      resetKey.value = resetKey.value + 1;
      setJsCurrentIndex(0);
      setJsIsFlipped(false);
    }

    const data = allData;
    const deck = data.find(c => c.id === deckId);
    if (reviewAll) {
      const allCards = (deck?.subjects || []).flatMap(s => {
        const topics = s.topics || [];
        if (topics.length > 0) {
          return topics.flatMap(t => (t.flashcards || []).map(c => ({ ...c, _subjectId: t.id })));
        }
        return (s.flashcards || []).map(c => ({ ...c, _subjectId: s.id }));
      }).sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
      if (isReturning) {
        // Adiciona ao fim da fila apenas cards que não estão nela e não foram estudados
        const queueIds = new Set(_queue.map(c => c.id));
        const newCards = allCards.filter(c => !queueIds.has(c.id) && !sessionStudiedIds.current.has(c.id));
        if (newCards.length > 0) {
          _queue = [..._queue, ...newCards];
          setQueueSize(_queue.length);
          setNextCard(_queue[1] ?? null);
          setTotalCardsInSession(prev => prev + newCards.length);
        }
      } else {
        setCards(allCards); _queue = [...allCards];
        setCurrentCard(allCards[0] ?? null); setNextCard(allCards[1] ?? null);
        setTotalCardsInSession(allCards.length);
      }
    } else {
      const subject = deck ? findStudyUnit(deck, subjectId) : null;
      if (subject) {
        const now = new Date();
        const allSubjectCards = subject.flashcards || [];
        setTotalSubjectCards(allSubjectCards.length);
        if (isReturning) {
          const storageIds = new Set(allSubjectCards.map(c => c.id));
          // Remove da fila cards deletados no storage
          const queueBefore = _queue.length;
          _queue = _queue.filter(c => storageIds.has(c.id));
          const removed = queueBefore - _queue.length;
          // Adiciona cards novos
          const queueIds = new Set(_queue.map(c => c.id));
          const newCards = allSubjectCards.filter(c =>
            (c.level || 0) < 5 &&
            (c.nextReview == null || new Date(c.nextReview) <= now) &&
            !queueIds.has(c.id) &&
            !sessionStudiedIds.current.has(c.id)
          );
          _queue = [..._queue, ...newCards];
          // Se fila ficou vazia, vai para empty state ou session done
          if (_queue.length === 0) {
            setCards([]);
            setCurrentCard(null);
            setNextCard(null);
            setQueueSize(0);
            setTotalCardsInSession(0);
            setLoading(false);
            cardOpacitySV.value = 1;
            return;
          }
          // Atualiza currentCard se foi deletado
          if (!storageIds.has(currentCard?.id)) {
            setCurrentCard(_queue[0] ?? null);
          }
          setNextCard(_queue[1] ?? null);
          setQueueSize(_queue.length);
          setTotalCardsInSession(prev => prev - removed + newCards.length);
        } else {
          const cardsToReview = allSubjectCards
            .filter(c => isExample || ((c.level || 0) < 5 && (c.nextReview == null || new Date(c.nextReview) <= now) && !studiedThisSession.has(c.id)))
            .sort((a, b) => isExample ? (a.level || 0) - (b.level || 0) : (a.nextReview || 0) - (b.nextReview || 0));
          setCards(cardsToReview); _queue = [...cardsToReview];
          setCurrentCard(cardsToReview[0] ?? null); setNextCard(cardsToReview[1] ?? null);
          setTotalCardsInSession(cardsToReview.length);
          originalSessionTotal.current = cardsToReview.length;
          // Reseta contagem de cards vistos para nova sessão
          if (cardsToReview[0]?.id) {
            sessionStudiedIds.current = new Set([cardsToReview[0].id]);

          }
          allCardsHighLevelRef.current = cardsToReview.length > 0 && cardsToReview.every(c => (c.level || 0) >= 3);
          if (cardsToReview.length === 0 && allSubjectCards.length > 0) {
            let earliest = null;
            const updatesMap = new Map(reviewUpdates.current.map(c => [c.id, c]));
            allSubjectCards.forEach(c => {
              const updated = updatesMap.get(c.id) || c;
              if (updated.nextReview) {
                const t = new Date(updated.nextReview).getTime();
                if (earliest === null || t < earliest) earliest = t;
              }
            });
            sessionDoneRef.current = true;
            setSessionResult({ done: true, nextReview: earliest });
            setLoading(false);
            return;
          }
        }
      }
    }
    setLoading(false);
    cardOpacitySV.value = 1;

    // Verifica se meta já foi batida hoje
    const alreadyDone = await isDailyGoalReachedToday();
    setGoalAlreadyDoneToday(alreadyDone);

    // Registra disponibilidade de cards (threshold 21:00)
    if (!reviewAll) {
      const hour = new Date().getHours();
      const allData2 = await getAppData();
      const deck2 = allData2.find(c => c.id === deckId);
      const subject2 = deck2 ? findStudyUnit(deck2, subjectId) : null;
      const allSubjectCards2 = subject2
        ? (subject2.topics?.length > 0 ? subject2.topics.flatMap(t => t.flashcards || []) : subject2.flashcards || [])
        : [];
      const hasCardsToday = allSubjectCards2.some(c => {
        if ((c.level || 0) >= 5) return false;
        if (!c.nextReview) return true;
        const t = new Date(c.nextReview);
        // Card disponível antes das 21:00 hoje conta
        const todayAt21 = new Date(); todayAt21.setHours(21, 0, 0, 0);
        return t <= todayAt21;
      });
      if (hour < 21) recordCardsAvailability(hasCardsToday);
    }
  }, [deckId, subjectId, currentIndex, isFlipped, translateX, translateY, resetKey]);


  const loadCardsRef = useRef(loadCards);
  useEffect(() => { loadCardsRef.current = loadCards; });


  const handleReviewCompleteRef = useRef(null);

  useFocusEffect(useCallback(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      loadCardsRef.current();
    });
    return () => task.cancel();
  }, []));

  useAnimatedReaction(() => currentIndex.value, (res) => {
    const idx = Math.floor(res);
    runOnJS(setJsCurrentIndex)(idx);
    jsCurrentIndexRef.current = idx;
  });

  // Após React renderizar o novo card: torna visível no próximo frame de pintura
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      cardOpacitySV.value = 1;
    });
    return () => cancelAnimationFrame(raf);
  }, [currentCard]);

  // Garante visibilidade ao voltar do ManageFlashcards sem trocar de card
  useEffect(() => {
    if (isFocused) cardOpacitySV.value = 1;
  }, [isFocused]);
  useAnimatedReaction(() => isFlipped.value, (res) => { runOnJS(setJsIsFlipped)(res) });

  // currentCard é atualizado em handleReviewByIndex, não via jsCurrentIndex
  // para evitar o flash do card antigo entre frames

  // Warm-up: dispara withTiming invisível para compilar worklet antes do primeiro flip
  const _warmup = useSharedValue(0);
  useEffect(() => {
    _warmup.value = withTiming(1, { duration: 1 }, () => { _warmup.value = 0; });
  }, []);

  const saveSessionProgress = useCallback(async (clearUpdates = true) => {
    if (isExample || reviewUpdates.current.length === 0) return;
    if (!clearUpdates) {
      if (saveInProgress.current) { pendingSave.current = true; return; }
      saveInProgress.current = true;
    }
    let allCurrentData = await getAppData();
    if (reviewAll) {
      // Agrupa updates por unit (_subjectId pode ser subject ou topic)
      const byUnit = {};
      reviewUpdates.current.forEach(card => {
        const sid = card._subjectId;
        if (!byUnit[sid]) byUnit[sid] = new Map();
        byUnit[sid].set(card.id, card);
      });
      for (const [unitId, updatesMap] of Object.entries(byUnit)) {
        allCurrentData = updateStudyUnit(allCurrentData, deckId, unitId, cards =>
          cards.map(c => updatesMap.get(c.id) || c)
        );
      }
      await saveAppData(allCurrentData);
    } else {
      const updatesMap = new Map(reviewUpdates.current.map(card => [card.id, card]));
      const newData = updateStudyUnit(allCurrentData, deckId, subjectId, cards =>
        cards.map(c => updatesMap.get(c.id) || c)
      );
      await saveAppData(newData);
    }
    const ratings = sessionRatings.current;
    const totalSwipes = ratings.right + ratings.up + ratings.left;
    if (totalSwipes > 0) {
      await saveStudySession({
        deckId,
        deckName: deckName || deckId,
        subjectId: reviewAll ? 'all' : subjectId,
        subjectName: reviewAll ? 'Revisão Geral' : (subjectName || subjectId),
        count: totalSwipes,
        acertos: ratings.right,
        quases: ratings.up,
        erros: ratings.left,
      });
    }
    if (clearUpdates) reviewUpdates.current = [];
    if (!clearUpdates) {
      saveInProgress.current = false;
      if (pendingSave.current) {
        pendingSave.current = false;
        saveSessionProgress(false);
      }
    }
  }, [deckId, subjectId, deckName, subjectName, reviewAll]);

  useEffect(() => { return () => { saveSessionProgress(); } }, [saveSessionProgress]);

  // Intercepta o botão voltar: salva os dados ANTES de navegar
  // Mostra aviso se saiu no meio da sessão sem bater a meta
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Se o tutorial estiver aberto, deixa navegar livremente
      if (tutorialRef.current?.isVisible()) return;

      const hasStarted = swipeCount > 0;
      const metaIncompleta = hasStarted && !dailyGoalSavedRef.current && !goalAlreadyDoneToday && !reviewAll && !sessionDone && !isExample;

      if (metaIncompleta) {
        e.preventDefault();
        setAlertConfig({
          visible: true,
          title: 'Sair da sessão?',
          message: 'Você começou a estudar mas ainda não completou a meta de hoje. Se sair, o progresso do hábito será perdido — mas você pode completar em outra matéria.\n\nOs seus acertos já foram salvos normalmente.',
          buttons: [
            {
              text: 'Continuar estudando',
              onPress: () => setAlertConfig(p => ({ ...p, visible: false })),
            },
            {
              text: 'Sair mesmo assim',
              style: 'cancel',
              onPress: () => {
                setAlertConfig(p => ({ ...p, visible: false }));
                saveSessionProgress().then(() => navigation.dispatch(e.data.action));
              },
            },
          ],
        });
        return;
      }

      if (reviewUpdates.current.length === 0) return;
      e.preventDefault();
      saveSessionProgress().then(() => {
        navigation.dispatch(e.data.action);
      });
    });
    return unsubscribe;
  }, [navigation, saveSessionProgress, swipeCount, goalAlreadyDoneToday, reviewAll, sessionDone]);

  const onFlip = useCallback(() => { isFlipped.value = !isFlipped.value; }, [isFlipped]);
  const footerPressedSV = useSharedValue(false);

  const getNextReviewText = useCallback((nextReview) => {
    if (!nextReview) return 'Volta imediatamente';
    const diffMin = Math.round((new Date(nextReview) - new Date()) / 60000);
    if (diffMin <= 0) return 'Volta imediatamente';
    if (diffMin < 60) return `Volta em ${diffMin} min`;
    if (diffMin < 1440) return `Volta em ${Math.round(diffMin / 60)}h`;
    return `Volta em ${Math.round(diffMin / 1440)} dia${Math.round(diffMin / 1440) > 1 ? 's' : ''}`;
  }, []);

  const handleReview = useCallback((cardToReview, rating, isLast) => {
    if (!cardToReview) return;
    const updatedCard = isExample ? { ...cardToReview } : calculateCardUpdate(cardToReview, rating);
    if (!isExample) {
      const existingIndex = reviewUpdates.current.findIndex(c => c.id === updatedCard.id);
      if (existingIndex > -1) reviewUpdates.current[existingIndex] = updatedCard;
      else reviewUpdates.current.push(updatedCard);
    }
    sessionStudiedIds.current.add(updatedCard.id);

    // Rastreia último rating por card — recalcula totais baseado na última avaliação de cada card
    sessionLastRating.current[updatedCard.id] = rating;
    if (rating === 'right') totalRightSwipesRef.current++;
    const allRatings = Object.values(sessionLastRating.current);
    sessionRatings.current.right = allRatings.filter(r => r === 'right').length;
    sessionRatings.current.up = allRatings.filter(r => r === 'up').length;
    sessionRatings.current.left = allRatings.filter(r => r === 'left').length;
    if (updatedCard.level > cardToReview.level) sessionRatings.current.levelUps++;
    setSwipeReviewText('');

    if (rating === 'left' || rating === 'up') {
      // Move pro fim da fila — tamanho não muda (o slot atual já foi consumido pelo handleReviewByIndex)
      _queue.push(updatedCard);
      insertAnim.value = 0;
      insertAnim.value = withTiming(1, { duration: 350 });
    }

    // Salva desempenho a cada swipe para refletir em tempo real na aba Progresso
    const ratingsNow = sessionRatings.current;
    const totalSwipesNow = ratingsNow.right + ratingsNow.up + ratingsNow.left;
    if (totalSwipesNow > 0) {
      if (reviewAll) {
        savePerformanceData('all', {
          acertos: ratingsNow.right, quases: ratingsNow.up, erros: ratingsNow.left,
          totalSwipes: totalSwipesNow, levelUps: ratingsNow.levelUps,
        });
      } else if (subjectId) {
        savePerformanceData(subjectId, {
          acertos: ratingsNow.right, quases: ratingsNow.up, erros: ratingsNow.left,
          totalSwipes: totalSwipesNow, levelUps: ratingsNow.levelUps,
        });
      }
    }

    // Verifica meta diária: cards nível 3+ sempre contam 1x; nível 0-2: 1 card=3x, 2=2x cada, 3+=min(total,10)
    if (!dailyGoalSavedRef.current) {
      const total = originalSessionTotal.current || totalCardsInSessionSV.value;
      const highLevel = allCardsHighLevelRef.current;
      const goal = highLevel ? Math.min(total, 10) : total === 1 ? 3 : total === 2 ? 4 : Math.min(total, 10);
      // Cards nível alto: conta únicos acertados; nível baixo com 1-2 cards: conta swipes totais
      const correct = (!highLevel && total <= 2) ? totalRightSwipesRef.current : sessionRatings.current.right;
      if (correct >= goal && goal > 0) {
        dailyGoalSavedRef.current = true;
        setGoalReached(true);
        saveDailyGoalReached();
        global.onDailyGoalReached?.();
        // Esconde o banner após 3 segundos
        setTimeout(() => setGoalAlreadyDoneToday(true), 3000);
      }
    }

    if (isLast) handleReviewCompleteRef.current();
  }, [getNextReviewText, deckId, subjectId, deckName, subjectName, reviewAll]);

  useEffect(() => {
    const card = currentCard;
    if (!card) {
      previewTextsRef.current = { wrong: '', hard: '', easy: '' };
      previewWrongSV.value = '';
      previewEasySV.value = '';
      previewHardSV.value = '';
      return;
    }
    const wrong = getNextReviewText(calculateCardUpdate(card, 'wrong')?.nextReview);
    const hard = getNextReviewText(calculateCardUpdate(card, 'hard')?.nextReview);
    const easy = getNextReviewText(calculateCardUpdate(card, 'easy')?.nextReview);
    previewTextsRef.current = { wrong, hard, easy };
    previewWrongSV.value = wrong;
    previewEasySV.value = easy;
    previewHardSV.value = hard;
  }, [currentCard, getNextReviewText]);

  const panGestureRef = useRef();
  const tapGestureRef = useRef();
  const cardWrapperRef = useRef();
  const cardsRef = useRef(cards);
  useEffect(() => { cardsRef.current = cards; }, [cards]);
  // handleReviewByIndex: chamado do worklet via runOnJS — busca o card pelo índice no JS thread
  const handleReviewByIndex = useCallback((_cardIndex, rating) => {
    const card = _queue[0];
    // Remove o primeiro da fila
    _queue = _queue.slice(1);
    // handleReview: se errou/quase, empurra pro fim
    const isLast = rating === 'right' && _queue.length === 0;
    handleReview(card, rating, isLast);
    saveSessionProgress(false);
    setQueueSize(_queue.length);
    setSwipeCount(prev => prev + 1);
    if (_queue.length <= 1) insertAnim.value = 0;
    resetKey.value = resetKey.value + 1;
    setCurrentCard(_queue[0] ?? null);
    setNextCard(_queue[1] ?? null);
  }, [handleReview]);
  useEffect(() => { _handleReviewByIndex = handleReviewByIndex; }, [handleReviewByIndex]);
  const handleReviewByIndexStable = useCallback((...args) => _handleReviewByIndex?.(...args), []);

  const tapGesture = useMemo(() =>
    Gesture.Tap()
      .withRef(tapGestureRef)
      .maxDuration(500)
      .maxDistance(20)
      .onEnd((_e, success) => {
        'worklet';
        if (!success || panActivated.value || footerPressedSV.value || isAnimatingOut.value) return;
        runOnJS(onFlip)();
      }),
    [onFlip, panActivated, footerPressedSV, isAnimatingOut]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan().withRef(panGestureRef)
      .minDistance(20)
      .onStart(() => { 'worklet'; panActivated.value = true; })
      .onFinalize(() => { 'worklet'; panActivated.value = false; })
      .onUpdate((event) => {
        'worklet';
        if (!isFlipped.value) return;
        translateX.value = event.translationX;
        translateY.value = event.translationY;
        const xAbs = Math.abs(event.translationX);
        const yAbs = Math.abs(event.translationY);

        let opacity = 0;
        if (event.translationX < -30 && xAbs > yAbs) { // Left — Errei
          runOnJS(setSwipeReviewText)(previewWrongSV.value);
          opacity = interpolate(xAbs, [30, screenWidth / 2], [0, 1], 'clamp');
          leftGlowOpacity.value = opacity; rightGlowOpacity.value = 0; topGlowOpacity.value = 0;
          swipeDirection.value = 1;
          swipeProgress.value = opacity;
        } else if (event.translationX > 30 && xAbs > yAbs) { // Right — Memorizado
          runOnJS(setSwipeReviewText)(previewEasySV.value);
          opacity = interpolate(xAbs, [30, screenWidth / 2], [0, 1], 'clamp');
          rightGlowOpacity.value = opacity; leftGlowOpacity.value = 0; topGlowOpacity.value = 0;
          swipeDirection.value = 2;
          swipeProgress.value = opacity;
        } else if (event.translationY < -30 && yAbs > xAbs) { // Up — Quase
          runOnJS(setSwipeReviewText)(previewHardSV.value);
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
          isAnimatingOut.value = true;
          translateX.value = withTiming(destinationX, { duration: 220 });
          translateY.value = withTiming(destinationY, { duration: 220 }, (finished) => {
            'worklet';
            if (finished) {
              const cardIndex = Math.floor(currentIndex.value);
              cardOpacitySV.value = 0;
              translateX.value = 0;
              translateY.value = 0;
              currentIndex.value = currentIndex.value + 1;
              isFlipped.value = false;
              isAnimatingOut.value = false;
              runOnJS(handleReviewByIndexStable)(cardIndex, rating);
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
    return Gesture.Simultaneous(tapGesture, pan);
  }, [tapGesture, panActivated, handleReviewByIndexStable, isFlipped, translateX, translateY, currentIndex, swipeProgress, swipeDirection, totalCardsInSessionSV, previewWrongSV, previewEasySV, previewHardSV]);

  const handleReviewComplete = useCallback(async () => {
    if (!reviewMode || !subjectId) {
      setDoneCardCount(sessionStudiedIds.current.size);
      // Usa reviewUpdates diretamente — já tem os dados mais recentes da sessão
      const sessionCards = reviewUpdates.current;
      let earliest = null;
      const now = Date.now();
      sessionCards.forEach(c => {
        const t = c.nextReview ? new Date(c.nextReview).getTime() : 0;
        if (!c.nextReview || t <= now) { earliest = now; return; }
        if (earliest === now) return;
        if (earliest === null || t < earliest) earliest = t;
      });
      await saveSessionProgress();
      sessionDoneRef.current = true;
      setSessionResult({ done: true, nextReview: earliest });
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
            const unit = deck ? findStudyUnit(deck, subjectId) : null;
            if (unit?.flashcards) {
              setCards([...unit.flashcards]);
              setTotalCardsInSession(unit.flashcards.length);
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
  }, [reviewMode, subjectId, deckId, navigation, currentIndex, isFlipped, saveSessionProgress]);

  useEffect(() => { handleReviewCompleteRef.current = handleReviewComplete; }, [handleReviewComplete]);
  useEffect(() => { totalCardsInSessionSV.value = totalCardsInSession; }, [totalCardsInSession]);

  const [isOptionsModalVisible, setOptionsModalVisible] = useState(false);
  const currentCardForModal = currentCard;

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
              const newData = updateStudyUnit(data, deckId, subjectId, cards =>
                cards.filter(f => f.id !== currentCardForModal.id)
              );
              await saveAppData(newData);
              loadCards();
              setAlertConfig(prev => ({ ...prev, visible: false }));
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
    if (isExample) {
      return (
        <View style={fcs.root}>
          <View style={fcs.doneContainer}>
            <View style={fcs.doneIconRing}>
              <Ionicons name="checkmark-done" size={40} color={theme.primary} />
            </View>
            <Text style={fcs.doneTitle}>Tutorial concluído!</Text>
            <Text style={fcs.doneSubtitle}>
              Agora você sabe como usar os flashcards.{'\n'}Deseja refazer o tutorial?
            </Text>
            <View style={fcs.doneBtnRow}>
              <TouchableOpacity style={fcs.doneBtn} onPress={() => navigation.goBack()}>
                <Text style={fcs.doneBtnTxt}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={fcs.doneBtnPrimary}
                onPress={() => {
                  sessionDoneRef.current = false;
                  setSessionResult(null);
                  hasLoadedOnce.current = false;
                  sessionStudiedIds.current = new Set();
                  _queue = [];
                  setLoading(true);
                  loadCards();
                }}
              >
                <Text style={fcs.doneBtnPrimaryTxt}>Refazer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={fcs.root}>
        {headerMenuVisible && (
          <TouchableWithoutFeedback onPress={() => setHeaderMenuVisible(false)}>
            <View style={fcs.menuOverlay}>
              <TouchableWithoutFeedback>
                <View style={fcs.menuDropdown}>
                  <TouchableOpacity style={fcs.menuItem} onPress={async () => { setHeaderMenuVisible(false); await saveSessionProgress(); navigation.navigate('ManageFlashcards', { deckId, subjectId, preloadedCards: [], subjectName }); }}>
                    <Ionicons name="add-circle-outline" size={20} color={theme.textPrimary} />
                    <Text style={fcs.menuItemText}>Criar card</Text>
                  </TouchableOpacity>
                  <View style={fcs.menuDivider} />
                  <TouchableOpacity style={fcs.menuItem} onPress={async () => { setHeaderMenuVisible(false); await saveSessionProgress(); navigation.navigate('FlashcardHistory', { deckId, subjectId }); }}>
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
            {doneCardCount > 0
              ? `Você estudou ${doneCardCount} card${doneCardCount !== 1 ? 's' : ''} de `
              : 'Nenhum card disponível agora em '
            }
            <Text style={{ color: theme.textPrimary, fontFamily: theme.fontFamily.uiSemiBold }}>{subjectName}</Text>
          </Text>
          {sessionNextReview != null && (
            <View style={fcs.doneNextRow}>
              <Ionicons name="time-outline" size={16} color={theme.textMuted} />
              <Text style={fcs.doneNextText}>
                {sessionNextReview <= now
                  ? <Text style={{ color: theme.primary }}>Há cards disponíveis agora</Text>
                  : <>Próximo card disponível em <Text style={{ color: theme.primary }}>{formatNextReview(sessionNextReview)}</Text></>
                }
              </Text>
            </View>
          )}
          <View style={fcs.doneBtnRow}>
            <TouchableOpacity style={fcs.doneBtn} onPress={() => navigation.goBack()}>
              <Text style={fcs.doneBtnTxt}>Voltar</Text>
            </TouchableOpacity>
            {(sessionNextReview == null || sessionNextReview <= now) && (
              <TouchableOpacity
                style={fcs.doneBtnPrimary}
                onPress={async () => {
                  sessionDoneRef.current = false;
                  setSessionResult(null);
                  hasLoadedOnce.current = false;
                  sessionStudiedIds.current = new Set();

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
        <View style={[fcs.emptyContainer, { paddingBottom: 40 + insets.bottom }]}>
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

      {!reviewAll && (() => {
        if (goalAlreadyDoneToday !== false) return <View style={{ height: 38, marginTop: 10, marginBottom: 4 }} />;
        const total = originalSessionTotal.current || queueSize;
        const highLevel = allCardsHighLevelRef.current;
        // Cards nível 3+ sempre contam 1x; nível 0-2: 1 card=3x, 2=2x cada, 3+=min(total,10)
        const goal = highLevel ? Math.min(total, 10) : total === 1 ? 3 : total === 2 ? 4 : Math.min(total, 10);
        const correct = (!highLevel && total <= 2) ? totalRightSwipesRef.current : sessionRatings.current.right;
        const started = swipeCount > 0;
        return (
          <TouchableOpacity onPress={() => setGoalModalVisible(true)} style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 8, paddingVertical: 8, paddingHorizontal: 16,
            marginHorizontal: 20, marginTop: 10, marginBottom: 4,
            backgroundColor: goalReached ? 'rgba(93,214,44,0.12)' : 'rgba(255,255,255,0.05)',
            borderRadius: 12, borderWidth: 1,
            borderColor: goalReached ? 'rgba(93,214,44,0.3)' : 'rgba(255,255,255,0.08)',
          }}>
            <Ionicons
              name={goalReached ? 'checkmark-circle' : 'flag-outline'}
              size={16}
              color={goalReached ? theme.primary : theme.textMuted}
            />
            <Text style={{ color: goalReached ? theme.primary : theme.textSecondary, fontSize: 13, fontFamily: theme.fontFamily.uiMedium, lineHeight: 18 }}>
              {goalReached
                ? 'Meta diária concluída! 🎉'
                : started
                  ? <Text>Meta de hoje: {correct}/<Text style={{ color: theme.primary, fontFamily: theme.fontFamily.uiBold }}>{goal}</Text> acertos</Text>
                  : <Text>Meta de hoje: <Text style={{ color: theme.primary, fontFamily: theme.fontFamily.uiBold }}>{goal}</Text> acertos</Text>
              }
            </Text>
            <Ionicons name="information-circle-outline" size={14} color={goalReached ? theme.primary : theme.textMuted} />
          </TouchableOpacity>
        );
      })()}

      <GestureDetector gesture={gesture}>
        <Animated.View
          ref={cardWrapperRef}
          style={[styles.cardWrapper, { marginBottom: 80 + insets.bottom }]}
          onLayout={() => {
            cardWrapperRef.current?.measure((_x, _y, _w, _h, _px, py) => { cardTopY.value = py; });
          }}
        >
          {/* Pilha decorativa — pos 2+ atrás do skeleton */}
          {(() => {
            const remaining = _queue.length - 1;
            const MAX_STACK = 3;
            const stackCount = Math.min(remaining, MAX_STACK);
            const views = [];
            // Cards decorativos estáticos
            for (let pos = stackCount; pos >= 2; pos--) {
              const relPos = stackCount - pos + 2; // skeleton=1, decorativo mais próximo=2, etc
              const translateY = -relPos * 6;
              const width = screenWidth * 0.9 - relPos * 10;
              const ratio = stackCount > 1 ? (relPos - 1) / stackCount : 0;
              const opacity = 0.6 - ratio * 0.3;
              const zIdx = stackCount - relPos + 1;
              views.push(
                <View key={pos} style={{
                  position: 'absolute', width, height: 460,
                  backgroundColor: '#242427ff', borderRadius: 20,
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
                  transform: [{ translateY }],
                  zIndex: zIdx,
                  opacity,
                }} />
              );
            }
            // InsertAnimCard sempre na posição do último slot visível
            if (stackCount >= 1) {
              const lastRelPos = stackCount + 1;
              const lastTranslateY = -lastRelPos * 6;
              const lastWidth = screenWidth * 0.9 - lastRelPos * 11;
              const lastOpacity = 0.6 - (stackCount / (stackCount + 1)) * 0.3;
              views.push(
                <InsertAnimCard
                  key="insert"
                  insertAnim={insertAnim}
                  width={lastWidth}
                  baseScale={1}
                  baseTranslateY={lastTranslateY}
                  opacity={lastOpacity}
                  zIndex={0}
                />
              );
            }
            return views;
          })()}
          {/* Skeleton do próximo card — sempre pos 1 */}
          {nextCard && (
            <View style={{ position: 'absolute', width: screenWidth * 0.9 - 10, height: 460, backgroundColor: '#242427ff', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', zIndex: 11, justifyContent: 'space-between', transform: [{ translateY: -6 }] }}>

              {/* Conteúdo central */}
              <View style={{ flex: 1, padding: 28, justifyContent: 'center', gap: 14 }}>
                <SkeletonItem style={{ width: '60%', height: 14, borderRadius: 7 }} />
                <SkeletonItem style={{ width: '90%', height: 14, borderRadius: 7 }} />
                <SkeletonItem style={{ width: '75%', height: 14, borderRadius: 7 }} />
                <SkeletonItem style={{ width: '50%', height: 14, borderRadius: 7 }} />
              </View>
              {/* Rodapé skeleton */}
              <View style={{ height: 95, borderTopWidth: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
                {/* Círculo de nível */}
                <SkeletonItem style={{ width: 56, height: 56, borderRadius: 28 }} />
                {/* Textos NÍVEL + nome */}
                <View style={{ marginLeft: 14, gap: 7 }}>
                  <SkeletonItem style={{ width: 36, height: 10, borderRadius: 5 }} />
                  <SkeletonItem style={{ width: 80, height: 12, borderRadius: 6 }} />
                </View>
                {/* Lápis + contador à direita */}
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                  <SkeletonItem style={{ width: 34, height: 34, borderRadius: 6 }} />
                  <View style={{ width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                  <SkeletonItem style={{ width: 36, height: 14, borderRadius: 6 }} />
                </View>
              </View>
            </View>
          )}
          {/* Único FlashcardItem — sempre o card atual */}
          {currentCard && (
            <FlashcardItem
              key="flashcard"
              contentKey={currentCard.id}
              card={currentCard}
              index={jsCurrentIndex}
              currentIndex={currentIndex}
              totalCards={queueSize}
              completedCards={queueSize}
              sessionTotal={originalSessionTotal.current || totalCardsInSession}
              translateX={translateX} translateY={translateY}
              isFlipped={isFlipped}
              jsCurrentIndex={jsCurrentIndex}
              jsIsFlipped={jsIsFlipped}
              resetKey={resetKey}
              showLevel={!reviewAll}
              swipeProgress={swipeProgress}
              swipeDirection={swipeDirection}
              footerPressedSV={footerPressedSV}
              cardOpacitySV={cardOpacitySV}
              onEdit={isExample ? undefined : () => navigation.navigate('ManageFlashcards', { deckId, subjectId, cardId: currentCard?.id })}
            />
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

      <GoalInfoModal visible={goalModalVisible} onClose={() => setGoalModalVisible(false)} />


      <SwipeTutorial ref={tutorialRef} requireButtons={isExample} />

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
