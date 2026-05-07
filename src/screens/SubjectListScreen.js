import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, BackHandler, Dimensions, TextInput,
  Keyboard, UIManager, ScrollView,
  InteractionManager, Modal, TouchableWithoutFeedback,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAppData, saveAppData } from '../services/storage';
import { isDefaultDeck, canEditDefaultDecks } from '../config/constants';
import { SkeletonItem } from '../components/ui/SkeletonItem';
import { CustomAlert } from '../components/ui/CustomAlert';
import MateriaCard, { MATERIA_CARD_WIDTH, MATERIA_CARD_HEIGHT } from '../components/home/MateriaCard';
import theme from '../styles/theme';
import { GlowFab } from '../components/ui/GlowFab';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 10;
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

const SORT_OPTIONS = [
  { key: 'az', label: 'A–Z', icon: 'arrow-up-outline' },
  { key: 'za', label: 'Z–A', icon: 'arrow-down-outline' },
  { key: 'more', label: 'Mais cards', icon: 'layers-outline' },
  { key: 'less', label: 'Menos cards', icon: 'layers-outline' },
  { key: 'recent', label: 'Mais novos', icon: 'time-outline' },
];
const SORT_LABELS = Object.fromEntries(SORT_OPTIONS.map(o => [o.key, o.label]));

// ── Skeleton ──────────────────────────────────────────────────────

const Skeleton = () => (
  <View style={{ paddingHorizontal: GRID_PADDING, paddingTop: 8 }}>
    {[[1, 2], [3, 4]].map((row, ri) => (
      <View key={ri} style={{ flexDirection: 'row', gap: GRID_GAP, marginBottom: GRID_GAP }}>
        {row.map(i => (
          <View key={i} style={{
            width: MATERIA_CARD_WIDTH, height: MATERIA_CARD_HEIGHT,
            borderRadius: 12, overflow: 'hidden',
            backgroundColor: theme.backgroundSecondary,
            opacity: 1 - ri * 0.3,
          }}>
            <SkeletonItem style={{ flex: 1 }} />
          </View>
        ))}
      </View>
    ))}
  </View>
);

// ── Empty state ───────────────────────────────────────────────────

const STEPS = [
  { icon: 'layers-outline', label: 'Adicione uma matéria', hint: 'Ex: Direito Penal, Português, Matemática' },
  { icon: 'duplicate-outline', label: 'Crie seus flashcards', hint: 'Pergunta na frente, resposta no verso' },
  { icon: 'trending-up-outline', label: 'Estude e evolua', hint: 'O app adapta a revisão ao seu ritmo' },
];

const EmptyState = ({ onCreatePress }) => (
  <View style={s.emptyWrap}>
    <View style={s.emptyIconRing}>
      <Ionicons name="albums-outline" size={32} color={theme.primary} />
    </View>
    <Text style={s.emptyTitle}>Deck sem matérias</Text>
    <Text style={s.emptyHint}>Adicione matérias para organizar seus flashcards e começar a estudar.</Text>
    <View style={s.stepsCard}>
      {STEPS.map((step, i) => (
        <View key={i} style={[s.stepRow, i > 0 && s.stepRowBorder]}>
          <View style={s.stepIcon}>
            <Ionicons name={step.icon} size={16} color={theme.primary} />
          </View>
          <View style={s.stepContent}>
            <Text style={s.stepLabel}>{step.label}</Text>
            <Text style={s.stepHintTxt}>{step.hint}</Text>
          </View>
        </View>
      ))}
    </View>
    <TouchableOpacity style={s.emptyCreateBtn} onPress={onCreatePress} activeOpacity={0.8}>
      <Ionicons name="add-circle" size={18} color="#0F0F0F" />
      <Text style={s.emptyCreateTxt}>Adicionar matéria</Text>
    </TouchableOpacity>
  </View>
);


// ── InputBar — hook só ativo quando montado (isCreating) ─────────

function InputBar({ inputRef, value, onChange, saving, onSave }) {
  return (
    <View style={s.inputBar}>
      <View style={s.inputBarInner}>
        <View style={s.inputUnderlineWrap}>
          <View style={s.inputBarRow}>
            <TextInput
              ref={inputRef}
              style={s.inputBarInput}
              placeholder="Nome da matéria..."
              placeholderTextColor={theme.textMuted}
              value={value}
              onChangeText={t => onChange(t.slice(0, 25))}
              maxLength={25}
              returnKeyType="done"
              autoFocus
              onSubmitEditing={() => onSave()}
            />
            {value.length > 0 && (
              <Text style={[s.createCounter, value.length >= 20 && s.createCounterWarn]}>
                {value.length}/25
              </Text>
            )}
          </View>
          <View style={[s.inputLine, { backgroundColor: value.length > 0 ? theme.primary : theme.primaryDark }]} />
        </View>
        <TouchableOpacity
          style={[s.inputBarBtn, (!value.trim() || saving) && { opacity: 0.35 }]}
          disabled={!value.trim() || saving}
          onPress={() => onSave()}
          activeOpacity={0.75}
        >
          {saving
            ? <Text style={{ color: '#0F0F0F', fontSize: 16, fontWeight: '700' }}>…</Text>
            : <Ionicons name="checkmark" size={22} color="#0F0F0F" />
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────

export const SubjectListScreen = ({ route, navigation }) => {
  const { deckId, deckName, preloadedSubjects } = route.params;
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [subjects, setSubjects] = useState(preloadedSubjects || []);
  const [loading, setLoading] = useState(preloadedSubjects ? false : true);
  const [allowDefaultDeckEditing, setAllowDefaultDeckEditing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [isSelectionMode, setSelectionMode] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const [isCreating, setIsCreating] = useState(false);
  const [createText, setCreateText] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const createInputRef = useRef(null);

  // Sort
  const [sortOrder, setSortOrder] = useState(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortMenuPos, setSortMenuPos] = useState({ x: 0, y: 0 });
  const sortBtnRef = useRef(null);

  // Header menu (3-dot)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [headerMenuPos, setHeaderMenuPos] = useState({ x: 0, y: 0 });
  const headerMenuBtnRef = useRef(null);

  // Context menu (3-dot)
  const [contextMenu, setContextMenu] = useState({ visible: false, subject: null, x: 0, y: 0 });
  const [renameModal, setRenameModal] = useState({ visible: false, subject: null, text: '' });

  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

  const deckObj = useMemo(() => ({ id: deckId, name: deckName }), [deckId, deckName]);

  // ── Data ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!preloadedSubjects && subjects.length === 0) setLoading(true);
    const shouldDelay = !preloadedSubjects && subjects.length === 0;
    const minDelay = shouldDelay ? new Promise(r => setTimeout(r, 300)) : Promise.resolve();
    const [allData] = await Promise.all([getAppData(), minDelay]);
    const deck = allData.find(d => d.id === deckId);
    if (deck) setSubjects(deck.subjects);
    const canEdit = await canEditDefaultDecks();
    setAllowDefaultDeckEditing(canEdit);
    setLoading(false);
  }, [deckId, subjects.length]);

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, loadData]);

  useEffect(() => {
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setIsCreating(false);
      setCreateText('');
    });
    return () => hide.remove();
  }, []);

  const filteredSubjects = useMemo(() => {
    if (!searchTerm.trim()) return subjects;
    const q = searchTerm.toLowerCase();
    return subjects.filter(s => s.name.toLowerCase().includes(q));
  }, [subjects, searchTerm]);

  // ── Navigation ────────────────────────────────────────────────────

  const handleStudy = useCallback((subject) => {
    if (subject.topics?.length > 0) {
      navigation.navigate('TopicList', {
        deckId, deckName, subjectId: subject.id, subjectName: subject.name,
        preloadedTopics: subject.topics,
      });
    } else {
      navigation.navigate('Flashcard', {
        deckId, deckName, subjectId: subject.id, subjectName: subject.name,
        preloadedCards: subject.flashcards || [],
        reviewMode: !!subject.reviewMode,
      });
    }
  }, [navigation, deckId, deckName]);

  const handleManageCards = useCallback((subject) => {
    navigation.navigate('ManageFlashcards', { deckId, subjectId: subject.id, preloadedCards: subject.flashcards, subjectName: subject.name });
  }, [navigation, deckId]);

  // ── Delete deck ───────────────────────────────────────────────────

  const handleDeleteDeck = useCallback(() => {
    setHeaderMenuOpen(false);
    setTimeout(() => {
      setAlertConfig({
        visible: true, title: 'Excluir Deck',
        message: `Excluir "${deckName}" e todos os seus flashcards permanentemente?`,
      buttons: [
        { text: 'Cancelar', style: 'cancel', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) },
        {
          text: 'Excluir', style: 'destructive', onPress: async () => {
            const allData = await getAppData();
            await saveAppData(allData.filter(d => d.id !== deckId));
            setAlertConfig(p => ({ ...p, visible: false }));
            navigation.goBack();
          }
        },
      ],
    });
    }, 50);
  }, [deckId, deckName, navigation]);

  // ── Add subject ───────────────────────────────────────────────────

  const handleAddSave = useCallback(async (name) => {
    const nameLower = name.trim().toLowerCase();
    const duplicate = subjects.find(s => s.name?.trim().toLowerCase() === nameLower);
    if (duplicate) {
      setAlertConfig({
        visible: true,
        title: 'Nome já existe',
        message: `Já existe uma matéria chamada "${name.trim()}" neste deck. Escolha um nome diferente.`,
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }],
      });
      return false;
    }
    const newSubject = { id: `subject_${Date.now()}`, name: name.trim(), flashcards: [], isUserCreated: true };
    const allData = await getAppData();
    await saveAppData(allData.map(d => d.id === deckId ? { ...d, subjects: [...(d.subjects || []), newSubject] } : d));
    setSubjects(prev => [...prev, newSubject]);
    return true;
  }, [deckId, subjects]);

  // ── Selection ─────────────────────────────────────────────────────

  const handleToggleSelection = useCallback((id) => {
    setSelectionMode(true);
    setSelectedSubjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const exitSelection = useCallback(() => { setSelectionMode(false); setSelectedSubjects([]); }, []);

  const handleSelectAll = () => {
    // Se todos já estão selecionados, desmarca tudo
    if (selectedSubjects.length === subjects.length) {
      setSelectedSubjects([]);
      return;
    }
    // Caso contrário, seleciona todos
    setSelectedSubjects(subjects.map(s => s.id));
  };

  // ── Review mode ───────────────────────────────────────────────────

  const handleToggleReview = useCallback(async (subject) => {
    const newVal = !subject.reviewMode;
    const allData = await getAppData();
    await saveAppData(allData.map(d => {
      if (d.id !== deckId) return d;
      return { ...d, subjects: d.subjects.map(s => s.id === subject.id ? { ...s, reviewMode: newVal } : s) };
    }));
    setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, reviewMode: newVal } : s));
  }, [deckId]);

  // ── Sort ──────────────────────────────────────────────────────────

  const sortedSubjects = useMemo(() => {
    const list = [...filteredSubjects];
    if (!sortOrder) return list;
    switch (sortOrder) {
      case 'az': return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt'));
      case 'za': return list.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'pt'));
      case 'more': return list.sort((a, b) => (b.flashcards?.length || 0) - (a.flashcards?.length || 0));
      case 'less': return list.sort((a, b) => (a.flashcards?.length || 0) - (b.flashcards?.length || 0));
      case 'recent': return list.reverse();
      default: return list;
    }
  }, [filteredSubjects, sortOrder]);

  // ── Context menu ──────────────────────────────────────────────────

  const handleMenuPress = useCallback((subject, event) => {
    const { pageX, pageY } = event.nativeEvent;
    setContextMenu({ visible: true, subject, x: pageX, y: pageY });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(p => ({ ...p, visible: false })), []);

  // ── Rename ────────────────────────────────────────────────────────

  const handleRenameConfirm = useCallback(async () => {
    const newName = renameModal.text.trim();
    if (!newName || !renameModal.subject) return;
    const nameLower = newName.toLowerCase();
    const duplicate = subjects.find(s => s.name?.trim().toLowerCase() === nameLower && s.id !== renameModal.subject.id);
    if (duplicate) {
      setAlertConfig({
        visible: true,
        title: 'Nome já existe',
        message: `Já existe uma matéria chamada "${newName}" neste deck. Escolha um nome diferente.`,
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }],
      });
      return;
    }
    const allData = await getAppData();
    await saveAppData(allData.map(d => {
      if (d.id !== deckId) return d;
      return { ...d, subjects: d.subjects.map(s => s.id === renameModal.subject.id ? { ...s, name: newName } : s) };
    }));
    setSubjects(prev => prev.map(s => s.id === renameModal.subject.id ? { ...s, name: newName } : s));
    setRenameModal({ visible: false, subject: null, text: '' });
  }, [renameModal, deckId]);

  // ── Delete ────────────────────────────────────────────────────────

  const handleDeleteSubject = useCallback((subject) => {
    setAlertConfig({
      visible: true, title: 'Apagar Matéria',
      message: `Apagar "${subject.name}" e todos os seus flashcards?`,
      buttons: [
        { text: 'Cancelar', style: 'cancel', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) },
        {
          text: 'Apagar', style: 'destructive', onPress: async () => {
            const allData = await getAppData();
            await saveAppData(allData.map(d => d.id === deckId ? { ...d, subjects: d.subjects.filter(s => s.id !== subject.id) } : d));
            setSubjects(prev => prev.filter(s => s.id !== subject.id));
            setAlertConfig(p => ({ ...p, visible: false }));
          }
        },
      ],
    });
  }, [deckId]);

  const handleBulkDelete = useCallback(async () => {
    if (!selectedSubjects.length) return;
    const hasDefault = subjects.filter(s => selectedSubjects.includes(s.id)).some(s => !s.isUserCreated);
    if (hasDefault) {
      const canEdit = await canEditDefaultDecks();
      if (!canEdit) {
        setAlertConfig({ visible: true, title: 'Matérias Protegidas', message: 'Sua seleção contém matérias padrão. Ative nas Configurações.', buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }] });
        return;
      }
    }
    setAlertConfig({
      visible: true, title: `Apagar ${selectedSubjects.length} matérias`,
      message: 'Esta ação apagará todos os flashcards dentro delas. Continuar?',
      buttons: [
        { text: 'Cancelar', style: 'cancel', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) },
        {
          text: 'Confirmar', style: 'destructive', onPress: async () => {
            const allData = await getAppData();
            await saveAppData(allData.map(d => d.id === deckId ? { ...d, subjects: d.subjects.filter(sub => !selectedSubjects.includes(sub.id)) } : d));
            setSubjects(prev => prev.filter(sub => !selectedSubjects.includes(sub.id)));
            exitSelection();
            setAlertConfig(p => ({ ...p, visible: false }));
          }
        },
      ],
    });
  }, [selectedSubjects, deckId, subjects, exitSelection]);

  // ── Back handler ──────────────────────────────────────────────────

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFocused && isSelectionMode) { exitSelection(); return true; }
      return false;
    });
    return () => handler.remove();
  }, [isFocused, isSelectionMode, exitSelection]);

  // ── Grid ──────────────────────────────────────────────────────────

  // For subjects with topics, aggregate cards from all topics for display
  const toDisplaySubject = (s) => {
    if (!s.topics?.length) return s;
    return { ...s, flashcards: s.topics.flatMap(t => t.flashcards || []) };
  };

  const renderGrid = (items) => {
    const rows = [];
    for (let i = 0; i < items.length; i += 2) {
      rows.push(
        <View key={i} style={s.gridRow}>
          <MateriaCard
            subject={toDisplaySubject(items[i])} deck={deckObj}
            width={MATERIA_CARD_WIDTH} height={MATERIA_CARD_HEIGHT}
            onPress={() => isSelectionMode ? handleToggleSelection(items[i].id) : handleStudy(items[i])}
            onLongPress={() => handleToggleSelection(items[i].id)}
            onMenuPress={(e) => handleMenuPress(items[i], e)}
            isSelected={selectedSubjects.includes(items[i].id)}
            selectMode={isSelectionMode}
          />
          {items[i + 1] ? (
            <MateriaCard
              subject={toDisplaySubject(items[i + 1])} deck={deckObj}
              width={MATERIA_CARD_WIDTH} height={MATERIA_CARD_HEIGHT}
              onPress={() => isSelectionMode ? handleToggleSelection(items[i + 1].id) : handleStudy(items[i + 1])}
              onLongPress={() => handleToggleSelection(items[i + 1].id)}
              onMenuPress={(e) => handleMenuPress(items[i + 1], e)}
              isSelected={selectedSubjects.includes(items[i + 1].id)}
              selectMode={isSelectionMode}
            />
          ) : (
            <View style={{ width: MATERIA_CARD_WIDTH }} />
          )}
        </View>
      );
    }
    return rows;
  };

  // ── Render ────────────────────────────────────────────────────────

  const subjectCount = subjects.length;
  const selCount = selectedSubjects.length;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerInner}>
          {isSelectionMode ? (
            <TouchableOpacity onPress={exitSelection} style={s.headerBtn} hitSlop={HIT_SLOP}>
              <Ionicons name="close" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn} hitSlop={HIT_SLOP}>
              <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={s.headerCenter}>
            {isSelectionMode ? (
              <Text style={s.headerTitle}>{selCount} selecionado{selCount !== 1 ? 's' : ''}</Text>
            ) : (
              <>
                <Text style={s.headerTitle} numberOfLines={1}>{deckName}</Text>
                <Text style={s.headerSub}>{loading ? '…' : `${subjectCount} ${subjectCount === 1 ? 'matéria' : 'matérias'}`}</Text>
              </>
            )}
          </View>
          {isSelectionMode ? (
            <TouchableOpacity onPress={handleSelectAll} style={s.headerBtn} hitSlop={HIT_SLOP}>
              <Ionicons name={selCount === subjectCount && subjectCount > 0 ? 'checkbox' : 'square-outline'} size={20} color={theme.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              ref={headerMenuBtnRef}
              style={s.headerBtn}
              hitSlop={HIT_SLOP}
              onPress={() => {
                headerMenuBtnRef.current?.measureInWindow((x, y, bw, bh) => {
                  setHeaderMenuPos({ x: x + bw, y: y + bh });
                  setHeaderMenuOpen(true);
                });
              }}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          )}
        </View>
        <View style={s.headerDivider} />
      </View>

      {loading && <Skeleton />}

      {!loading && (
        <>
          {/* Toolbar — search (8+) acima do grid, sort como linha cortada à direita */}
          {subjectCount >= 8 && !isCreating && (
            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={15} color={theme.textMuted} style={{ marginRight: 7 }} />
              <TextInput
                style={s.searchInput}
                placeholder="Pesquisar matérias..."
                placeholderTextColor={theme.textMuted}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm('')} hitSlop={HIT_SLOP}>
                  <Ionicons name="close-circle" size={15} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}
          {subjectCount >= 2 && !isCreating && (
            <View style={s.sortRow}>
              <View style={[s.sortLine, { flex: 1 }]} />
              <TouchableOpacity
                ref={sortBtnRef}
                style={s.sortBtn}
                hitSlop={HIT_SLOP}
                onPress={() => {
                  sortBtnRef.current?.measureInWindow((x, y, bw, bh) => {
                    setSortMenuPos({ x: x + bw, y: y + bh });
                    setSortMenuOpen(true);
                  });
                }}
              >
                <Ionicons name="swap-vertical-outline" size={13} color={sortOrder ? theme.primary : theme.textMuted} />
                <Text style={[s.sortBtnTxt, sortOrder && s.sortBtnTxtActive]}>
                  {sortOrder ? SORT_LABELS[sortOrder] : 'Ordenar'}
                </Text>
              </TouchableOpacity>
              <View style={[s.sortLine, { width: 40 }]} />
            </View>
          )}

          {subjectCount === 0 ? (
            // Empty state
            <View style={s.emptyOuter}>
              {!isSelectionMode && <EmptyState onCreatePress={() => setIsCreating(true)} />}
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={[s.gridContent, { paddingBottom: 90 + Math.max(insets.bottom, 0) }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {sortedSubjects.length === 0 ? (
                <View style={s.emptySearch}>
                  <Text style={s.emptySearchTxt}>Nenhuma matéria encontrada</Text>
                </View>
              ) : renderGrid(sortedSubjects)}
            </ScrollView>
          )}

          {/* FAB — + normal ou lixeira no modo seleção */}
          {subjectCount > 0 && !isCreating && (
            <View style={[s.fabPos, { bottom: 20 }, isSelectionMode && selCount === 0 && { opacity: 0.4 }]}>
              <GlowFab
                onPress={isSelectionMode ? (selCount > 0 ? handleBulkDelete : null) : () => setIsCreating(true)}
                color={isSelectionMode ? theme.danger : theme.primary}
                activeOpacity={isSelectionMode && selCount === 0 ? 1 : 0.85}
                disabled={isSelectionMode && selCount === 0}
              >
                {isSelectionMode
                  ? <Ionicons name="trash-outline" size={24} color="white" />
                  : <Ionicons name="add" size={26} color="#0F0F0F" />
                }
              </GlowFab>
            </View>
          )}
        </>
      )}

      {/* InputBar colada acima do teclado via KeyboardStickyView */}
      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        {isCreating && (
          <InputBar
            inputRef={createInputRef}
            value={createText}
            onChange={setCreateText}
            saving={createSaving}
            onSave={async () => {
              const name = createText.trim();
              if (!name) return;
              setCreateSaving(true);
              const ok = await handleAddSave(name);
              setCreateSaving(false);
              if (ok) {
                setCreateText('');
                setIsCreating(false);
              }
            }}
            onClose={() => { setIsCreating(false); setCreateText(''); }}
          />
        )}
      </KeyboardStickyView>


      {/* Context menu (matéria) */}
      <Modal transparent animationType="fade" visible={contextMenu.visible} onRequestClose={closeContextMenu} statusBarTranslucent>
        <TouchableWithoutFeedback onPress={closeContextMenu}>
          <View style={ctx.overlay}>
            {(() => {
              const menuW = 210, menuH = 240;
              let menuLeft = contextMenu.x - menuW + 16;
              let menuTop = contextMenu.y - menuH - 10;
              if (menuLeft < 8) menuLeft = 8;
              if (menuLeft + menuW > width - 8) menuLeft = width - menuW - 8;
              if (menuTop < 60) menuTop = contextMenu.y + 10;
              const sub = contextMenu.subject;
              const isReview = sub?.reviewMode;
              return (
                <View style={[ctx.menu, { left: menuLeft, top: menuTop }]}>
                  <TouchableOpacity style={[ctx.item, ctx.itemReview, isReview && ctx.itemReviewActive]} onPress={() => { closeContextMenu(); if (sub) handleToggleReview(sub); }}>
                    <View style={[ctx.reviewIconWrap, isReview && ctx.reviewIconWrapActive]}>
                      <Ionicons name="repeat-outline" size={16} color={isReview ? '#0F0F0F' : theme.primary} />
                    </View>
                    <Text style={[ctx.itemText, ctx.reviewText, isReview && ctx.reviewTextActive]}>
                      {isReview ? 'Desativar Revisão' : 'Modo Revisão'}
                    </Text>
                    {isReview && <Ionicons name="checkmark-circle" size={16} color={theme.primary} />}
                  </TouchableOpacity>
                  <View style={ctx.sep} />
                  <TouchableOpacity style={ctx.item} onPress={() => { closeContextMenu(); if (sub) navigation.navigate('ManageFlashcards', { deckId, subjectId: sub.id, preloadedCards: [], subjectName: sub.name }); }}>
                    <Ionicons name="add-circle-outline" size={16} color={theme.textPrimary} /><Text style={ctx.itemText}>Criar card</Text>
                  </TouchableOpacity>
                  <View style={ctx.sep} />
                  <TouchableOpacity style={ctx.item} onPress={() => { closeContextMenu(); if (sub) navigation.navigate('FlashcardHistory', { deckId, subjectId: sub.id }); }}>
                    <Ionicons name="layers-outline" size={16} color={theme.textPrimary} /><Text style={ctx.itemText}>Gerenciar Cards</Text>
                  </TouchableOpacity>
                  <View style={ctx.sep} />
                  <TouchableOpacity style={ctx.item} onPress={() => { closeContextMenu(); if (sub) setRenameModal({ visible: true, subject: sub, text: sub.name || '' }); }}>
                    <Ionicons name="create-outline" size={16} color={theme.textPrimary} /><Text style={ctx.itemText}>Renomear</Text>
                  </TouchableOpacity>
                  <View style={ctx.sep} />
                  <TouchableOpacity style={ctx.item} onPress={() => {
                    closeContextMenu();
                    if (sub) {
                      setTimeout(() => handleDeleteSubject(sub), 50);
                    }
                  }}>
                    <Ionicons name="trash-outline" size={16} color={theme.danger} /><Text style={[ctx.itemText, { color: theme.danger }]}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Rename modal */}
      <Modal transparent animationType="fade" visible={renameModal.visible} onRequestClose={() => setRenameModal(p => ({ ...p, visible: false }))} statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => setRenameModal(p => ({ ...p, visible: false }))}>
          <View style={ren.overlay}>
            <TouchableWithoutFeedback>
              <View style={ren.card}>
                <View style={ren.titleRow}>
                  <Text style={ren.title}>Renomear matéria</Text>
                  {renameModal.text.length > 0 && (
                    <Text style={[ren.charCount, renameModal.text.length >= 20 && ren.charCountWarn]}>{renameModal.text.length}/25</Text>
                  )}
                </View>
                <TextInput
                  style={ren.input}
                  value={renameModal.text}
                  onChangeText={t => setRenameModal(p => ({ ...p, text: t.slice(0, 25) }))}
                  autoFocus selectTextOnFocus
                  placeholderTextColor={theme.textMuted}
                  placeholder="Nome da matéria"
                  maxLength={25}
                />
                <View style={ren.actions}>
                  <TouchableOpacity style={ren.btnCancel} onPress={() => setRenameModal(p => ({ ...p, visible: false }))}>
                    <Text style={ren.btnCancelTxt}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[ren.btnSave, !renameModal.text.trim() && ren.btnSaveDisabled]}
                    disabled={!renameModal.text.trim()}
                    onPress={handleRenameConfirm}
                  >
                    <Text style={ren.btnSaveTxt}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Header menu (3 pontos) */}
      <Modal transparent animationType="fade" visible={headerMenuOpen} onRequestClose={() => setHeaderMenuOpen(false)} statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => setHeaderMenuOpen(false)}>
          <View style={{ flex: 1 }}>
            <View style={[ctx.menu, { position: 'absolute', right: 12, top: headerMenuPos.y + 4, width: 200 }]}>
              <TouchableOpacity style={ctx.item} onPress={() => { setHeaderMenuOpen(false); navigation.navigate('AddDeck', { editDeckId: deckId }); }}>
                <Ionicons name="create-outline" size={16} color={theme.textPrimary} />
                <Text style={ctx.itemText}>Editar deck</Text>
              </TouchableOpacity>
              <View style={ctx.sep} />
              <TouchableOpacity style={ctx.item} onPress={handleDeleteDeck}>
                <Ionicons name="trash-outline" size={16} color={theme.danger} />
                <Text style={[ctx.itemText, { color: theme.danger }]}>Excluir deck</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Sort dropdown */}
      <Modal transparent animationType="fade" visible={sortMenuOpen} onRequestClose={() => setSortMenuOpen(false)} statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => setSortMenuOpen(false)}>
          <View style={{ flex: 1 }}>
            <View style={[sortDrop.dropdown, { position: 'absolute', right: GRID_PADDING, top: sortMenuPos.y + 4, width: 220 }]}>
              <View style={sortDrop.header}>
                <Ionicons name="swap-vertical-outline" size={13} color={theme.primary} />
                <Text style={sortDrop.headerTxt}>Ordenar por</Text>
              </View>
              <View style={sortDrop.sep} />
              {SORT_OPTIONS.map(opt => {
                const isActive = sortOrder === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[sortDrop.item, isActive && sortDrop.itemActive]}
                    onPress={() => { setSortOrder(isActive ? null : opt.key); setSortMenuOpen(false); }}
                  >
                    <View style={[sortDrop.iconWrap, isActive && sortDrop.iconWrapActive]}>
                      <Ionicons name={opt.icon} size={14} color={isActive ? theme.primary : theme.textMuted} />
                    </View>
                    <Text style={[sortDrop.itemTxt, isActive && sortDrop.itemTxtActive]} numberOfLines={1}>{opt.label}</Text>
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

// ── Styles ────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },

  header: { backgroundColor: theme.background },
  headerInner: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  headerSub: { color: theme.textMuted, fontSize: 12, marginTop: 1 },
  headerDivider: { height: 1, backgroundColor: theme.backgroundSecondary },

  searchInput: { flex: 1, color: theme.textPrimary, fontSize: 14, paddingVertical: 0 },

  gridContent: { paddingHorizontal: GRID_PADDING, paddingTop: 12 },
  gridRow: { flexDirection: 'row', gap: GRID_GAP, marginBottom: GRID_GAP },

  // Empty state
  emptyOuter: { flex: 1 },
  emptyWrap: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 80 },
  emptyIconRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(93,214,44,0.08)',
    borderWidth: 1.5, borderColor: 'rgba(93,214,44,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { color: theme.textPrimary, fontSize: 22, fontFamily: theme.fontFamily.heading, letterSpacing: -0.3, marginBottom: 8, textAlign: 'center' },
  emptyHint: { color: theme.textSecondary, fontSize: 14, fontFamily: theme.fontFamily.ui, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  stepsCard: {
    width: '100%', backgroundColor: theme.backgroundSecondary,
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 20,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  stepRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  stepIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(93,214,44,0.1)', alignItems: 'center', justifyContent: 'center' },
  stepContent: { flex: 1 },
  stepLabel: { color: theme.textPrimary, fontSize: 14, fontFamily: theme.fontFamily.uiSemiBold, marginBottom: 2 },
  stepHintTxt: { color: theme.textSecondary, fontSize: 12, fontFamily: theme.fontFamily.ui, lineHeight: 16 },
  emptyCreateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.primary, borderRadius: 14, height: 50, width: '100%',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 6,
  },
  emptyCreateTxt: { color: '#0F0F0F', fontSize: 15, fontFamily: theme.fontFamily.uiBold },

  // Floating input bar above keyboard (KeyboardStickyView cuida do posicionamento)
  inputBar: {
    backgroundColor: theme.background,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(93,214,44,0.35)',
  },
  inputBarInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 14,
  },
  inputUnderlineWrap: {
    flex: 1,
  },
  inputBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
  },
  inputBarInput: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 16,
    fontFamily: theme.fontFamily.ui,
    paddingVertical: 0,
  },
  inputLine: {
    height: 1.5,
    borderRadius: 1,
    backgroundColor: theme.primary,
  },
  inputBarBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCounter: {
    color: theme.primaryDark,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
  createCounterWarn: {
    color: theme.primary,
  },

  // FAB
  fabPos: {
    position: 'absolute',
    right: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  fabDanger: {
    backgroundColor: theme.danger,
    shadowColor: theme.danger,
  },

  // Search wrap
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 12, paddingHorizontal: 12, height: 40,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },

  // Sort row (linha + botão + linha)
  sortRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 14, marginBottom: 2,
    marginHorizontal: GRID_PADDING,
  },
  sortLine: { height: 1.5, backgroundColor: 'rgba(255,255,255,0.1)' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginHorizontal: 6 },
  sortBtnTxt: { color: theme.textMuted, fontFamily: theme.fontFamily.uiMedium, fontSize: 12 },
  sortBtnTxtActive: { color: theme.primary, fontFamily: theme.fontFamily.uiSemiBold },

  emptySearch: { flex: 1, alignItems: 'center', paddingTop: 40 },
  emptySearchTxt: { color: theme.textMuted, fontSize: 14 },

  // Selection bar
  selectionBar: {
    backgroundColor: theme.backgroundSecondary,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    padding: 16,
  },
  selBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, height: 50 },
  selBtnDanger: { backgroundColor: theme.danger },
  selBtnTxt: { color: 'white', fontSize: 15, fontWeight: '700' },

});

// ── Context menu styles ───────────────────────────────────────────

const ctx = StyleSheet.create({
  overlay: { flex: 1 },
  menu: {
    position: 'absolute', backgroundColor: theme.backgroundElevated,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    width: 200, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  itemText: { flex: 1, color: theme.textPrimary, fontSize: 14 },
  sep: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },

  // Modo revisão destacado
  itemReview: { paddingVertical: 14 },
  itemReviewActive: { backgroundColor: 'rgba(93,214,44,0.06)' },
  reviewIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(93,214,44,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  reviewIconWrapActive: { backgroundColor: theme.primary },
  reviewText: { flex: 1, color: theme.primary, fontSize: 14, fontFamily: theme.fontFamily.uiSemiBold },
  reviewTextActive: { color: theme.textPrimary },
});

// ── Rename modal styles ───────────────────────────────────────────

const ren = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: theme.backgroundElevated, borderRadius: 16, padding: 20, width: '85%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { color: theme.textPrimary, fontSize: 16, fontWeight: '700' },
  charCount: { color: theme.textMuted, fontSize: 12 },
  charCountWarn: { color: theme.primary },
  input: {
    backgroundColor: theme.backgroundSecondary, borderRadius: 10, padding: 12,
    color: theme.textPrimary, fontSize: 15,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 16,
  },
  actions: { flexDirection: 'row', gap: 10 },
  btnCancel: { flex: 1, height: 44, borderRadius: 10, backgroundColor: theme.backgroundTertiary, alignItems: 'center', justifyContent: 'center' },
  btnCancelTxt: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  btnSave: { flex: 1, height: 44, borderRadius: 10, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  btnSaveDisabled: { opacity: 0.4 },
  btnSaveTxt: { color: '#0F0F0F', fontSize: 14, fontWeight: '700' },
});

// ── Sort dropdown styles ──────────────────────────────────────────

const sortDrop = StyleSheet.create({
  dropdown: {
    backgroundColor: '#1e1e1e', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden', shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 16,
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

export default SubjectListScreen;
