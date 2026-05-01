import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, BackHandler, TextInput, TouchableOpacity, ActivityIndicator, Modal, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { getAppData, saveAppData } from '../services/storage';
import { isDefaultDeck, canEditDefaultDecks } from '../config/constants';
import { CustomAlert } from '../components/ui/CustomAlert';
import theme from '../styles/theme';

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim() || '(Imagem/Fórmula)';
};

const hasFormula = (text) => !text || text.includes('math-atom') || text.includes('data-latex');

// Extrai segmentos alternados de texto e fórmula na ordem que aparecem no HTML
const extractSegments = (html) => {
  if (!html) return [];
  const segments = [];
  const formulaRe = /<[^>]*(?:math-atom|data-latex)[^>]*>[\s\S]*?<\/\w+>/gi;
  let last = 0;
  let match;
  while ((match = formulaRe.exec(html)) !== null) {
    const textBefore = html.slice(last, match.index).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (textBefore) segments.push({ type: 'text', value: textBefore });
    segments.push({ type: 'formula' });
    last = match.index + match[0].length;
  }
  const textAfter = html.slice(last).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  if (textAfter) segments.push({ type: 'text', value: textAfter });
  return segments;
};

// Retorna preview respeitando 3 linhas: nunca corta fórmula, para o texto antes dela se não couber
const smartPreview = (html, charsPerLine = 38, maxLines = 3) => {
  if (!html) return '';
  const segments = extractSegments(html);
  if (segments.length === 0) return stripHtml(html);

  const FORMULA = '(Fórmula)';
  const maxChars = charsPerLine * maxLines;
  let result = '';
  let used = 0;

  for (const seg of segments) {
    if (seg.type === 'formula') {
      // Verifica se a fórmula cabe no espaço restante
      if (used + FORMULA.length <= maxChars) {
        result += (result ? ' ' : '') + FORMULA;
        used += (result.length === FORMULA.length ? 0 : 1) + FORMULA.length;
      } else {
        // Não cabe — para antes da fórmula
        if (result) result = result.trimEnd() + '...';
        return result;
      }
    } else {
      const words = seg.value.split(/\s+/);
      for (const word of words) {
        const piece = (result ? ' ' : '') + word;
        if (used + piece.length > maxChars) {
          result = result.trimEnd() + '...';
          return result;
        }
        result += piece;
        used += piece.length;
      }
    }
  }
  return result.trim();
};

// Exatamente do CardFooter
const RING_GRADIENTS = [
  ['#2A2F3A', '#3D4451'],
  ['#0D2B1E', '#2D6A4F'],
  ['#1B4332', '#40916C'],
  ['#2D6A4F', '#52B788'],
  ['#40916C', '#74C69D'],
  ['#2D9E00', '#5DD62C'],
];
const RING_FILL = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
const RING_R = 20;
const CIRC = 2 * Math.PI * RING_R;

const LevelRing = ({ level }) => {
  const lvl = Math.min(Math.max(level || 0, 0), 5);
  const [gradStart, gradEnd] = RING_GRADIENTS[lvl];
  const fill = RING_FILL[lvl];
  const size = 52;
  const cx = size / 2;
  const strokeW = 4;
  const gradId = `g${lvl}`;
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cx} r={RING_R} stroke="rgba(255,255,255,0.1)" strokeWidth={strokeW} fill="none" />
      {fill > 0 && (
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradStart} stopOpacity="1" />
            <Stop offset="1" stopColor={gradEnd} stopOpacity="1" />
          </LinearGradient>
        </Defs>
      )}
      {fill > 0 && (
        <Circle
          cx={cx} cy={cx} r={RING_R}
          stroke={`url(#${gradId})`} strokeWidth={strokeW} fill="none"
          strokeDasharray={`${CIRC * fill} ${CIRC * (1 - fill)}`}
          strokeLinecap="round" rotation="-90" origin={`${cx},${cx}`}
        />
      )}
      <SvgText x={cx} y={cx + 7} textAnchor="middle" fill="#F8F8F8" fontSize={18} fontWeight="700">{lvl}</SvgText>
    </Svg>
  );
};
const LEVEL_NAMES  = ['Marco Zero', 'Aprendiz', 'Em Progresso', 'Consolidando', 'Confiante', 'Dominado'];

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_PADDING = 16;

const SORT_OPTIONS = [
  { key: 'az',        label: 'A → Z',               icon: 'arrow-up-outline' },
  { key: 'za',        label: 'Z → A',               icon: 'arrow-down-outline' },
  { key: 'level_desc',label: 'Maior nível',          icon: 'trending-up-outline' },
  { key: 'level_asc', label: 'Menor nível',          icon: 'trending-down-outline' },
  { key: 'formula',   label: 'Fórmulas primeiro',    icon: 'calculator-outline' },
  { key: 'has_formula', label: 'Com fórmulas',       icon: 'flask-outline' },
  { key: 'review',    label: 'Disponíveis primeiro', icon: 'checkmark-circle-outline' },
];

const formatNextReview = (nextReview) => {
  if (!nextReview || typeof nextReview !== 'number' || nextReview <= Date.now()) return 'Disponível';
  const diff = nextReview - Date.now();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return `em ${days}d`;
  if (hrs  >= 1) return `em ${hrs}h`;
  if (mins >= 1) return `em ${mins}min`;
  return 'Disponível';
};

export const FlashcardHistoryScreen = ({ route, navigation }) => {
  const [cards, setCards]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [sortKey, setSortKey]           = useState(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedCards, setSelectedCards]     = useState(new Set());
  const [alertConfig, setAlertConfig]   = useState({ visible: false, title: '', message: '', buttons: [] });
  const [contextMenu, setContextMenu]   = useState({ visible: false, x: 0, y: 0, cardId: null });
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortMenuPos, setSortMenuPos]   = useState({ x: 0, y: 0 });
  const [contextName, setContextName]   = useState('');
  const [totalCards, setTotalCards]     = useState(0);
  const sortBtnRef = useRef(null);
  const isFocused = useIsFocused();

  const loadData = useCallback(async () => {
    setLoading(true);
    const allData = await getAppData();
    const fDeckId    = route.params?.deckId;
    const fSubjectId = route.params?.subjectId;

    if (fDeckId || fSubjectId) {
      const deck = allData.find(d => d.id === fDeckId);
      if (deck) {
        if (fSubjectId) {
          const sub = deck.subjects.find(s => s.id === fSubjectId);
          setContextName(sub ? sub.name : deck.name);
        } else {
          setContextName(deck.name);
        }
      }
    } else {
      setContextName('');
    }

    let flatList = [];
    allData.forEach(deck => {
      deck.subjects.forEach(subject => {
        subject.flashcards.forEach(card => {
          flatList.push({ ...card, deckId: deck.id, deckName: deck.name, subjectId: subject.id, subjectName: subject.name });
        });
      });
    });

    flatList.reverse();

    // total filtrado por matéria
    const filtered = fSubjectId ? flatList.filter(c => c.subjectId === fSubjectId) : fDeckId ? flatList.filter(c => c.deckId === fDeckId) : flatList;
    setTotalCards(filtered.length);
    setCards(flatList);
    setLoading(false);
  }, [route.params]);

  useEffect(() => { if (isFocused) loadData(); }, [isFocused, loadData]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFocused && multiSelectMode) { setMultiSelectMode(false); setSelectedCards(new Set()); return true; }
      return false;
    });
    return () => backHandler.remove();
  }, [isFocused, multiSelectMode]);

  const filteredCards = useMemo(() => {
    const fDeckId    = route.params?.deckId;
    const fSubjectId = route.params?.subjectId;
    let result = cards;
    if (fDeckId)    result = result.filter(c => c.deckId    === fDeckId);
    if (fSubjectId) result = result.filter(c => c.subjectId === fSubjectId);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c =>
        stripHtml(c.question).toLowerCase().includes(lower) ||
        stripHtml(c.answer).toLowerCase().includes(lower)
      );
    }
    switch (sortKey) {
      case 'az':        return [...result].sort((a, b) => stripHtml(a.question).localeCompare(stripHtml(b.question)));
      case 'za':        return [...result].sort((a, b) => stripHtml(b.question).localeCompare(stripHtml(a.question)));
      case 'level_asc': return [...result].sort((a, b) => (a.level || 0) - (b.level || 0));
      case 'level_desc':return [...result].sort((a, b) => (b.level || 0) - (a.level || 0));
      case 'formula':   return result.filter(c => c.question && c.question.trim().match(/^<[^>]*(?:math-atom|data-latex)/i));
      case 'has_formula': return result.filter(c => hasFormula(c.question) || hasFormula(c.answer));
      case 'review':    return [...result].sort((a, b) => ((a.nextReview || 0) <= Date.now() ? -1 : 1) - ((b.nextReview || 0) <= Date.now() ? -1 : 1));
      default:          return result;
    }
  }, [cards, searchTerm, sortKey, route.params]);

  const toggleSelection = (cardId) => {
    const newSet = new Set(selectedCards);
    if (newSet.has(cardId)) { newSet.delete(cardId); if (newSet.size === 0) setMultiSelectMode(false); }
    else newSet.add(cardId);
    setSelectedCards(newSet);
  };

  const closeContextMenu = () => setContextMenu({ visible: false, x: 0, y: 0, cardId: null });

  const handleOptionSelect = (action) => {
    const cardId = contextMenu.cardId;
    closeContextMenu();
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    if (action === 'edit')   navigation.navigate('ManageFlashcards', { deckId: card.deckId, subjectId: card.subjectId, cardId: card.id });
    if (action === 'select') { setMultiSelectMode(true); toggleSelection(card.id); }
    if (action === 'delete') confirmDeleteSingle(card.id);
  };

  const confirmDeleteSingle = (cardId) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    if (isDefaultDeck(card.deckId)) {
      canEditDefaultDecks().then(canEdit => {
        if (!canEdit) { setAlertConfig({ visible: true, title: 'Protegido', message: 'Este card pertence a um deck padrão.', buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }] }); return; }
        showDeleteAlert([cardId]);
      });
    } else showDeleteAlert([cardId]);
  };

  const deleteSelected = async () => {
    if (selectedCards.size === 0) return;
    const toDelete = cards.filter(c => selectedCards.has(c.id));
    if (toDelete.some(c => isDefaultDeck(c.deckId))) {
      const canEdit = await canEditDefaultDecks();
      if (!canEdit) { setAlertConfig({ visible: true, title: 'Protegido', message: 'Alguns cards são de decks padrão.', buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }] }); return; }
    }
    showDeleteAlert(Array.from(selectedCards));
  };

  const showDeleteAlert = (ids) => {
    setAlertConfig({
      visible: true,
      title: 'Apagar Cards',
      message: `Apagar ${ids.length > 1 ? ids.length + ' cards' : 'este card'}?`,
      buttons: [
        { text: 'Cancelar', style: 'cancel', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) },
        { text: 'Apagar', style: 'destructive', onPress: async () => {
          const allData = await getAppData();
          const idsSet = new Set(ids);
          await saveAppData(allData.map(d => ({ ...d, subjects: d.subjects.map(s => ({ ...s, flashcards: s.flashcards.filter(c => !idsSet.has(c.id)) })) })));
          setMultiSelectMode(false); setSelectedCards(new Set()); loadData();
          setAlertConfig(p => ({ ...p, visible: false }));
        }},
      ],
    });
  };

  const renderCard = ({ item }) => {
    const isSelected    = selectedCards.has(item.id);
    const level         = item.level || 0;
    const levelName     = LEVEL_NAMES[level];
    const questionText  = smartPreview(item.question);
    const answerText    = smartPreview(item.answer);
    const nextReviewTxt = formatNextReview(item.nextReview);
    const available     = !item.nextReview || item.nextReview <= Date.now();

    return (
      <TouchableOpacity
        style={[s.card, isSelected && s.cardSelected]}
        onPress={() => { if (multiSelectMode) toggleSelection(item.id); else navigation.navigate('ManageFlashcards', { deckId: item.deckId, subjectId: item.subjectId, cardId: item.id }); }}
        onLongPress={() => { setMultiSelectMode(true); toggleSelection(item.id); }}
        activeOpacity={0.78}
      >
        {/* Painel esquerdo — nível */}
        <View style={s.levelPanel}>
          <LevelRing level={level} />
          <View style={s.levelDivider} />
          <Text style={[s.reviewTxt, { color: nextReviewTxt === 'Disponível' ? '#5DD62C' : theme.textMuted }]}>{nextReviewTxt}</Text>
          <View style={{ flex: 1 }} />
          <Text style={s.levelName} numberOfLines={2}>{levelName}</Text>
        </View>

        {/* Separador */}
        <View style={s.separator} />

        {/* Painel direito — conteúdo */}
        <View style={s.contentPanel}>
          <Text style={[s.questionLabel, { color: '#FFFFFF' }]}>P:</Text>
          <Text style={[s.questionText, { color: 'rgba(255,255,255,0.75)' }]} numberOfLines={3} ellipsizeMode="tail">{questionText}</Text>

          <View style={s.divider} />

          <Text style={[s.answerLabel, { color: '#FFFFFF' }]}>R:</Text>
          <Text style={[s.answerText, { color: 'rgba(255,255,255,0.75)' }]} numberOfLines={3} ellipsizeMode="tail">{answerText || '—'}</Text>
        </View>

        {/* Menu ou checkbox */}
        {multiSelectMode ? (
          <View style={s.checkWrap}>
            <View style={[s.checkCircle, isSelected && s.checkCircleActive]}>
              {isSelected && <Ionicons name="checkmark" size={11} color="#0F0F0F" />}
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={s.menuBtn}
            hitSlop={{ top: 8, bottom: 8, left: 10, right: 8 }}
            onPress={(e) => {
              e.stopPropagation();
              const { pageX, pageY } = e.nativeEvent;
              setContextMenu({ visible: true, x: pageX, y: pageY, cardId: item.id });
            }}
          >
            <Ionicons name="ellipsis-vertical" size={16} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const currentSort = SORT_OPTIONS.find(o => o.key === sortKey);

  return (
    <View style={s.root}>

      {/* Sub-header: igual ao ManageFlashcardsScreen */}
      <View style={s.subHeader}>
        <View style={s.subHeaderRow}>
          <Ionicons name="folder" size={14} color={theme.primary} />
          <Text style={s.subHeaderText} numberOfLines={1}>{contextName || 'Todos os cards'}</Text>
          <View style={s.subHeaderDivider} />
          <Ionicons name="layers" size={14} color={theme.primary} />
          <Text style={s.subHeaderText}>{totalCards} {totalCards === 1 ? 'card' : 'cards'}</Text>
        </View>
      </View>

      {/* Busca */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
        <TextInput style={s.searchInput} placeholder="Buscar cards..." placeholderTextColor={theme.textMuted} value={searchTerm} onChangeText={setSearchTerm} />
        {searchTerm.length > 0 && <TouchableOpacity onPress={() => setSearchTerm('')}><Ionicons name="close-circle" size={16} color={theme.textMuted} /></TouchableOpacity>}
      </View>

      {/* Ordenar — padrão da aba início */}
      <View style={s.sortRow}>
        <View style={[s.sortLine, { flex: 1 }]} />
        <TouchableOpacity
          ref={sortBtnRef}
          style={s.sortBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => {
            sortBtnRef.current?.measureInWindow((x, y, bw, bh) => {
              setSortMenuPos({ x: x + bw, y: y + bh });
              setSortMenuOpen(true);
            });
          }}
        >
          <Ionicons name="swap-vertical-outline" size={13} color={sortKey ? theme.primary : theme.textMuted} />
          <Text style={[s.sortBtnTxt, sortKey && s.sortBtnTxtActive]}>
            {sortKey ? SORT_OPTIONS.find(o => o.key === sortKey)?.label : 'Ordenar'}
          </Text>
        </TouchableOpacity>
        <View style={[s.sortLine, { flex: 0, width: 40 }]} />
      </View>

      {/* Multi-select bar */}
      {multiSelectMode && (
        <View style={s.multiBar}>
          <Text style={s.multiBarTxt}>{selectedCards.size} selecionado{selectedCards.size !== 1 ? 's' : ''}</Text>
          <TouchableOpacity onPress={() => { setMultiSelectMode(false); setSelectedCards(new Set()); }}>
            <Text style={s.multiBarCancel}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredCards}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          renderItem={renderCard}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="layers-outline" size={48} color={theme.backgroundTertiary} />
              <Text style={s.emptyTxt}>
                {sortKey === 'formula' ? 'Nenhum card começa com fórmula.' : sortKey === 'has_formula' ? 'Nenhum card com fórmula encontrado.' : 'Nenhum card encontrado.'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB deletar */}
      {multiSelectMode && selectedCards.size > 0 && (
        <TouchableOpacity style={s.deleteFab} onPress={deleteSelected}>
          <Ionicons name="trash" size={22} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Context menu — padrão do app */}
      <Modal transparent animationType="fade" visible={contextMenu.visible} onRequestClose={closeContextMenu} statusBarTranslucent>
        <TouchableWithoutFeedback onPress={closeContextMenu}>
          <View style={{ flex: 1 }}>
            {(() => {
              const menuW = 200, menuH = 156;
              let menuLeft = contextMenu.x - menuW;
              let menuTop  = contextMenu.y - menuH - 10;
              if (menuLeft < 8) menuLeft = 8;
              if (menuLeft + menuW > SCREEN_W - 8) menuLeft = SCREEN_W - menuW - 8;
              if (menuTop < 60) menuTop = contextMenu.y + 10;
              return (
                <View style={[ctx.menu, { left: menuLeft, top: menuTop }]}>
                  <TouchableOpacity style={ctx.item} onPress={() => handleOptionSelect('edit')}>
                    <Ionicons name="create-outline" size={16} color={theme.textPrimary} />
                    <Text style={ctx.itemText}>Editar</Text>
                  </TouchableOpacity>
                  <View style={ctx.sep} />
                  <TouchableOpacity style={ctx.item} onPress={() => handleOptionSelect('select')}>
                    <Ionicons name="checkbox-outline" size={16} color={theme.textPrimary} />
                    <Text style={ctx.itemText}>Selecionar</Text>
                  </TouchableOpacity>
                  <View style={ctx.sep} />
                  <TouchableOpacity style={ctx.item} onPress={() => handleOptionSelect('delete')}>
                    <Ionicons name="trash-outline" size={16} color={theme.danger} />
                    <Text style={[ctx.itemText, { color: theme.danger }]}>Apagar</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Sort dropdown — padrão do app */}
      <Modal transparent animationType="fade" visible={sortMenuOpen} onRequestClose={() => setSortMenuOpen(false)} statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => setSortMenuOpen(false)}>
          <View style={{ flex: 1 }}>
            <View style={[sd.dropdown, { position: 'absolute', right: GRID_PADDING, top: sortMenuPos.y + 4, width: 230 }]}>
              <View style={sd.header}>
                <Ionicons name="swap-vertical-outline" size={13} color={theme.primary} />
                <Text style={sd.headerTxt}>Ordenar por</Text>
              </View>
              <View style={sd.sep} />
              {SORT_OPTIONS.map(opt => {
                const isActive = sortKey === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[sd.item, isActive && sd.itemActive]}
                    onPress={() => { setSortKey(sortKey === opt.key ? null : opt.key); setSortMenuOpen(false); }}
                  >
                    <View style={[sd.iconWrap, isActive && sd.iconWrapActive]}>
                      <Ionicons name={opt.icon} size={14} color={isActive ? theme.primary : theme.textMuted} />
                    </View>
                    <Text style={[sd.itemTxt, isActive && sd.itemTxtActive]} numberOfLines={1}>{opt.label}</Text>
                    {isActive && <Ionicons name="checkmark" size={14} color={theme.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <CustomAlert visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} buttons={alertConfig.buttons} onClose={() => setAlertConfig(p => ({ ...p, visible: false }))} />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },

  // Sub-header igual ManageFlashcardsScreen
  subHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.backgroundTertiary,
    opacity: 0.85,
  },
  subHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subHeaderText: { fontFamily: theme.fontFamily.uiBold, fontSize: 13, color: theme.textPrimary },
  subHeaderDivider: { width: 1.5, height: 14, backgroundColor: theme.primary, marginHorizontal: 2 },

  // Busca
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12, marginBottom: 12,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 12, borderWidth: 1, borderColor: theme.backgroundTertiary,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, color: theme.textPrimary, fontFamily: theme.fontFamily.ui, fontSize: 14 },

  // Ordenar
  sortRow: { flexDirection: 'row', alignItems: 'center', marginTop: 0, marginBottom: 12, marginHorizontal: 16 },
  sortLine: { height: 1.5, backgroundColor: 'rgba(255,255,255,0.1)' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginHorizontal: 6 },
  sortBtnTxt: { fontFamily: theme.fontFamily.uiMedium, fontSize: 12, color: theme.textMuted },
  sortBtnTxtActive: { color: theme.primary, fontFamily: theme.fontFamily.uiSemiBold },

  // Multi-select
  multiBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.backgroundSecondary, borderBottomWidth: 1, borderBottomColor: theme.backgroundTertiary },
  multiBarTxt: { fontFamily: theme.fontFamily.uiSemiBold, fontSize: 13, color: theme.textPrimary },
  multiBarCancel: { fontFamily: theme.fontFamily.uiMedium, fontSize: 13, color: theme.primary },

  listContent: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 100, flexGrow: 1, gap: 10 },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.backgroundTertiary,
    overflow: 'hidden',
    height: 190,
  },
  cardSelected: { borderColor: theme.primary, borderWidth: 2 },

  // Painel esquerdo — nível
  levelPanel: {
    width: 82,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 6,
    backgroundColor: '#161616',
  },
  levelName: { fontFamily: theme.fontFamily.uiSemiBold, fontSize: 10, color: theme.textPrimary, textAlign: 'center' },
  levelDivider: { width: 36, height: 1, backgroundColor: theme.backgroundTertiary, marginTop: 10, marginBottom: 6 },
  reviewTxt: { fontFamily: theme.fontFamily.uiMedium, fontSize: 10 },

  separator: { width: 1, backgroundColor: theme.backgroundTertiary },

  // Painel direito — conteúdo
  contentPanel: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 2, justifyContent: 'center' },
  questionLabel: { fontFamily: theme.fontFamily.uiBold, fontSize: 11, color: '#FFFFFF', letterSpacing: 0.5 },
  questionText: { fontFamily: theme.fontFamily.uiSemiBold, fontSize: 13, color: '#FFFFFF', lineHeight: 19 },
  divider: { height: 1, backgroundColor: theme.primary + '33', marginVertical: 7 },
  answerLabel: { fontFamily: theme.fontFamily.uiBold, fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 },
  answerText: { fontFamily: theme.fontFamily.ui, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 17 },

  // Menu / checkbox
  menuBtn: { position: 'absolute', top: 8, right: 6, padding: 4 },
  checkWrap: { position: 'absolute', top: 8, right: 8 },
  checkCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: theme.textMuted, backgroundColor: theme.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  checkCircleActive: { backgroundColor: theme.primary, borderColor: theme.primary },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTxt: { fontFamily: theme.fontFamily.ui, fontSize: 14, color: theme.textMuted },

  deleteFab: { position: 'absolute', right: 20, bottom: 24, width: 52, height: 52, borderRadius: 26, backgroundColor: theme.danger, alignItems: 'center', justifyContent: 'center', elevation: 6 },

});

const ctx = StyleSheet.create({
  menu: {
    position: 'absolute', width: 200,
    backgroundColor: '#1e1e1e',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 18, elevation: 14,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  itemText: { flex: 1, fontFamily: theme.fontFamily.uiMedium, fontSize: 14, color: theme.textPrimary },
  sep: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
});

const sd = StyleSheet.create({
  dropdown: {
    backgroundColor: '#1e1e1e', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 12 },
  headerTxt: { color: theme.primary, fontFamily: theme.fontFamily.uiSemiBold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  sep: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  itemActive: { backgroundColor: 'rgba(93,214,44,0.06)' },
  iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  iconWrapActive: { backgroundColor: 'rgba(93,214,44,0.12)' },
  itemTxt: { flex: 1, color: theme.textSecondary, fontFamily: theme.fontFamily.uiMedium, fontSize: 14 },
  itemTxtActive: { color: theme.primary, fontFamily: theme.fontFamily.uiSemiBold },
});

export default FlashcardHistoryScreen;
