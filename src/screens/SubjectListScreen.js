import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, BackHandler, Dimensions, TextInput,
  Keyboard, LayoutAnimation, UIManager, FlatList,
  InteractionManager,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAppData, saveAppData } from '../services/storage';
import { isDefaultDeck, canEditDefaultDecks } from '../config/constants';
import { CustomBottomModal } from '../components/ui/CustomBottomModal';
import { SkeletonItem } from '../components/ui/SkeletonItem';
import { CustomAlert } from '../components/ui/CustomAlert';
import theme from '../styles/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

// ── Progress bar ──────────────────────────────────────────────────

const ProgressBar = ({ progress }) => (
  <View style={s.progressTrack}>
    <View style={[s.progressFill, { width: `${progress}%` }]} />
  </View>
);

// ── Subject card (accordion) ──────────────────────────────────────

const SubjectItem = React.memo(({
  item,
  isExpanded,
  onToggle,
  onStudy,
  onManageCards,
  onOptions,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  allowDefaultDeckEditing,
  calculateProgress,
}) => {
  const progress = calculateProgress(item.flashcards);
  const cardCount = item.flashcards?.length ?? 0;
  const isDefault = !item.isUserCreated;
  const canSelect = !isDefault || allowDefaultDeckEditing;

  const handlePress = () => {
    if (isSelectionMode) {
      if (canSelect) onToggleSelection(item.id);
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onToggle(item.id);
    }
  };

  const handleLongPress = () => {
    if (!isSelectionMode && (!isDefault || allowDefaultDeckEditing)) {
      onToggleSelection(item.id);
    }
  };

  return (
    <TouchableOpacity
      style={[s.card, isExpanded && s.cardExpanded, isSelected && s.cardSelected]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.75}
    >
      {/* Left accent stripe */}
      <View style={[s.cardAccent, isExpanded && s.cardAccentOn]} />

      <View style={s.cardBody}>
        {/* Top row */}
        <View style={s.cardRow}>
          {isSelectionMode ? (
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={20}
              color={isSelected ? theme.primary : theme.textMuted}
              style={{ marginRight: 10 }}
            />
          ) : (
            <View style={[s.dot, isDefault && s.dotDefault]} />
          )}

          <View style={s.cardMeta}>
            <Text style={s.cardTitle} numberOfLines={1}>{item.name}</Text>
            <Text style={s.cardSub}>
              {cardCount} {cardCount === 1 ? 'card' : 'cards'}
              {isDefault ? <Text style={s.badgeDefault}> · padrão</Text> : null}
            </Text>
          </View>

          <View style={s.cardRight}>
            <Text style={[s.pct, progress === 100 && s.pctDone]}>{progress}%</Text>
            {!isSelectionMode && (
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={theme.textMuted}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>

        {/* Progress bar */}
        <ProgressBar progress={progress} />

        {/* Expanded actions */}
        {isExpanded && !isSelectionMode && (
          <View style={s.actions}>
            <TouchableOpacity style={s.btnStudy} onPress={() => onStudy(item)} activeOpacity={0.8}>
              <Ionicons name="play" size={13} color="#0F0F0F" style={{ marginRight: 5 }} />
              <Text style={s.btnStudyTxt}>Estudar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.btnManage} onPress={() => onManageCards(item)} activeOpacity={0.8}>
              <Ionicons name="layers-outline" size={13} color={theme.primary} style={{ marginRight: 5 }} />
              <Text style={s.btnManageTxt}>Gerenciar Cards</Text>
            </TouchableOpacity>

            {(item.isUserCreated || allowDefaultDeckEditing) && (
              <TouchableOpacity
                style={s.btnMore}
                onPress={() => onOptions(item)}
                activeOpacity={0.8}
                hitSlop={HIT_SLOP}
              >
                <Ionicons name="ellipsis-horizontal" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ── Skeleton ──────────────────────────────────────────────────────

const Skeleton = () => (
  <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
    {[1, 2, 3, 4].map(i => (
      <View key={i} style={[s.card, { marginBottom: 10, overflow: 'hidden' }]}>
        <View style={s.cardAccent} />
        <View style={s.cardBody}>
          <View style={s.cardRow}>
            <SkeletonItem style={{ width: 8, height: 8, borderRadius: 4, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <SkeletonItem style={{ width: '55%', height: 15, marginBottom: 6 }} />
              <SkeletonItem style={{ width: '30%', height: 11 }} />
            </View>
            <SkeletonItem style={{ width: 34, height: 14, borderRadius: 4 }} />
          </View>
          <SkeletonItem style={{ height: 4, borderRadius: 2, marginTop: 10 }} />
        </View>
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

const EmptyState = ({ onAdd }) => (
  <View style={s.emptyWrap}>
    <View style={s.emptyIconRing}>
      <Ionicons name="albums-outline" size={30} color={theme.primary} />
    </View>
    <Text style={s.emptyTitle}>Deck vazio</Text>
    <Text style={s.emptyHint}>Siga os passos para começar a estudar</Text>

    <View style={s.stepsList}>
      {STEPS.map((step, i) => (
        <View key={i} style={s.stepRow}>
          <View style={s.stepNumWrap}>
            <Text style={s.stepNum}>{i + 1}</Text>
            {i < STEPS.length - 1 && <View style={s.stepLine} />}
          </View>
          <View style={s.stepContent}>
            <Text style={s.stepLabel}>{step.label}</Text>
            <Text style={s.stepHint}>{step.hint}</Text>
          </View>
        </View>
      ))}
    </View>

    <TouchableOpacity style={s.emptyBtn} onPress={onAdd} activeOpacity={0.85}>
      <Ionicons name="add" size={18} color="#0F0F0F" style={{ marginRight: 7 }} />
      <Text style={s.emptyBtnTxt}>Adicionar matéria</Text>
    </TouchableOpacity>
  </View>
);

// ── Main screen ───────────────────────────────────────────────────

export const SubjectListScreen = ({ route, navigation }) => {
  const { deckId, deckName, preloadedSubjects } = route.params;
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [subjects, setSubjects] = useState(preloadedSubjects || []);
  const [loading, setLoading] = useState(preloadedSubjects ? false : true);
  const [allowDefaultDeckEditing, setAllowDefaultDeckEditing] = useState(false);

  // Accordion
  const [expandedId, setExpandedId] = useState(null);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Selection mode
  const [isSelectionMode, setSelectionMode] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  // Options modal
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isOptionsVisible, setOptionsVisible] = useState(false);

  // Add subject modal
  const [isAddVisible, setAddVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const addInputRef = useRef(null);

  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

  // ── Data ────────────────────────────────────────────────────────

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
      const task = InteractionManager.runAfterInteractions(() => loadData());
      return () => task.cancel();
    }
  }, [isFocused, loadData]);

  const calculateProgress = useCallback((flashcards) => {
    if (!flashcards?.length) return 0;
    const total = flashcards.length * 5;
    const current = flashcards.reduce((s, c) => s + (c.level || 0), 0);
    return total > 0 ? Math.round((current / total) * 100) : 0;
  }, []);

  const filteredSubjects = useMemo(() => {
    if (!searchTerm.trim()) return subjects;
    const q = searchTerm.toLowerCase();
    return subjects.filter(s => s.name.toLowerCase().includes(q));
  }, [subjects, searchTerm]);

  // ── Accordion ────────────────────────────────────────────────────

  const handleToggle = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  // ── Navigation ───────────────────────────────────────────────────

  const handleStudy = useCallback((subject) => {
    navigation.navigate('Flashcard', {
      deckId,
      subjectId: subject.id,
      subjectName: subject.name,
      preloadedCards: subject.flashcards,
    });
  }, [navigation, deckId]);

  const handleManageCards = useCallback((subject) => {
    navigation.navigate('ManageFlashcards', {
      deckId,
      subjectId: subject.id,
      preloadedCards: subject.flashcards,
    });
  }, [navigation, deckId]);

  // ── Add subject inline ───────────────────────────────────────────

  const openAdd = useCallback(() => {
    setNewName('');
    setAddVisible(true);
    setTimeout(() => addInputRef.current?.focus(), 200);
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setAlertConfig({
        visible: true,
        title: 'Atenção',
        message: 'Por favor, insira um nome para a matéria.',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }],
      });
      return;
    }
    setIsSaving(true);
    Keyboard.dismiss();
    const allData = await getAppData();
    const newSubject = {
      id: `subject_${Date.now()}`,
      name: trimmed,
      flashcards: [],
      isUserCreated: true,
    };
    const newData = allData.map(d =>
      d.id === deckId ? { ...d, subjects: [...d.subjects, newSubject] } : d
    );
    await saveAppData(newData);
    setSubjects(prev => [...prev, newSubject]);
    setIsSaving(false);
    setAddVisible(false);
    setNewName('');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(newSubject.id);
  }, [newName, deckId]);

  // ── Selection ────────────────────────────────────────────────────

  const handleToggleSelection = useCallback((id) => {
    setSelectionMode(true);
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedSubjects([]);
  }, []);

  const handleSelectAll = () => {
    if (selectedSubjects.length > 0) { setSelectedSubjects([]); return; }
    if (!allowDefaultDeckEditing) {
      setSelectedSubjects(subjects.filter(s => s.isUserCreated).map(s => s.id));
      return;
    }
    setAlertConfig({
      visible: true,
      title: 'Seleção Rápida',
      message: 'O que você deseja selecionar?',
      buttons: [
        { text: 'Todas', onPress: () => { setSelectedSubjects(subjects.map(s => s.id)); setAlertConfig(p => ({ ...p, visible: false })); } },
        { text: 'Apenas padrão', onPress: () => { setSelectedSubjects(subjects.filter(s => !s.isUserCreated).map(s => s.id)); setAlertConfig(p => ({ ...p, visible: false })); } },
        { text: 'Apenas minhas', onPress: () => { setSelectedSubjects(subjects.filter(s => s.isUserCreated).map(s => s.id)); setAlertConfig(p => ({ ...p, visible: false })); } },
        { text: 'Cancelar', style: 'cancel', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) },
      ],
    });
  };

  // ── Options ──────────────────────────────────────────────────────

  const handleOptions = useCallback(async (subject) => {
    if (isDefaultDeck(deckId) && !subject.isUserCreated) {
      const canEdit = await canEditDefaultDecks();
      if (!canEdit) {
        setAlertConfig({
          visible: true,
          title: 'Matéria Protegida',
          message: 'Para editá-la, ative a opção nas Configurações.',
          buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }],
        });
        return;
      }
    }
    setSelectedSubject(subject);
    setOptionsVisible(true);
  }, [deckId]);

  const performDelete = useCallback(async () => {
    if (!selectedSubject) return;
    if (isDefaultDeck(deckId) && !selectedSubject.isUserCreated) {
      const canEdit = await canEditDefaultDecks();
      if (!canEdit) {
        setOptionsVisible(false);
        setAlertConfig({
          visible: true,
          title: 'Matéria Protegida',
          message: 'Ative a edição de decks padrão nas Configurações.',
          buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }],
        });
        return;
      }
    }
    setOptionsVisible(false);
    setAlertConfig({
      visible: true,
      title: 'Apagar Matéria',
      message: `Tem certeza que deseja apagar "${selectedSubject.name}" e todos os seus flashcards?`,
      buttons: [
        { text: 'Cancelar', style: 'cancel', onPress: () => { setSelectedSubject(null); setAlertConfig(p => ({ ...p, visible: false })); } },
        {
          text: 'Confirmar', style: 'destructive',
          onPress: async () => {
            const allData = await getAppData();
            await saveAppData(allData.map(d =>
              d.id === deckId ? { ...d, subjects: d.subjects.filter(s => s.id !== selectedSubject.id) } : d
            ));
            setSubjects(prev => prev.filter(s => s.id !== selectedSubject.id));
            setSelectedSubject(null);
            setAlertConfig(p => ({ ...p, visible: false }));
          },
        },
      ],
    });
  }, [selectedSubject, deckId]);

  const handleBulkDelete = useCallback(async () => {
    if (!selectedSubjects.length) return;
    const items = subjects.filter(s => selectedSubjects.includes(s.id));
    const hasDefault = items.some(s => !s.isUserCreated);
    if (hasDefault) {
      const canEdit = await canEditDefaultDecks();
      if (!canEdit) {
        setAlertConfig({
          visible: true,
          title: 'Matérias Protegidas',
          message: 'Sua seleção contém matérias padrão. Ative nas Configurações.',
          buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }],
        });
        return;
      }
    }
    setAlertConfig({
      visible: true,
      title: `Apagar ${selectedSubjects.length} matérias`,
      message: 'Esta ação apagará todos os flashcards dentro delas. Continuar?',
      buttons: [
        { text: 'Cancelar', style: 'cancel', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) },
        {
          text: 'Confirmar', style: 'destructive',
          onPress: async () => {
            const allData = await getAppData();
            await saveAppData(allData.map(d =>
              d.id === deckId ? { ...d, subjects: d.subjects.filter(s => !selectedSubjects.includes(s.id)) } : d
            ));
            setSubjects(prev => prev.filter(s => !selectedSubjects.includes(s.id)));
            exitSelection();
            setAlertConfig(p => ({ ...p, visible: false }));
          },
        },
      ],
    });
  }, [selectedSubjects, deckId, subjects, exitSelection]);

  // ── Back handler ─────────────────────────────────────────────────

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFocused && isSelectionMode) { exitSelection(); return true; }
      return false;
    });
    return () => handler.remove();
  }, [isFocused, isSelectionMode, exitSelection]);

  // ── Render ───────────────────────────────────────────────────────

  const subjectCount = subjects.length;
  const selCount = selectedSubjects.length;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Custom header ─────────────────────────────────────── */}
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
                <Text style={s.headerSub}>
                  {loading ? '...' : `${subjectCount} ${subjectCount === 1 ? 'matéria' : 'matérias'}`}
                </Text>
              </>
            )}
          </View>

          {isSelectionMode ? (
            <TouchableOpacity
              onPress={handleSelectAll}
              style={s.headerBtn}
              hitSlop={HIT_SLOP}
            >
              <Ionicons
                name={selCount > 0 ? 'checkbox' : 'square-outline'}
                size={20}
                color={theme.primary}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={openAdd} style={s.headerBtn} hitSlop={HIT_SLOP}>
              <Ionicons name="add" size={24} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
        <View style={s.headerDivider} />
      </View>

      {/* ── Loading ────────────────────────────────────────────── */}
      {loading && <Skeleton />}

      {/* ── List ──────────────────────────────────────────────── */}
      {!loading && (
        <>
          {/* Search — only show when there are subjects */}
          {subjectCount > 0 && (
            <View style={s.searchRow}>
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

          <FlatList
            data={filteredSubjects}
            keyExtractor={item => item.id}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: isSelectionMode ? 110 : 32,
              paddingTop: subjectCount > 0 ? 8 : 0,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              searchTerm ? (
                <View style={s.emptySearch}>
                  <Text style={s.emptySearchTxt}>Nenhuma matéria encontrada</Text>
                </View>
              ) : (
                <EmptyState onAdd={openAdd} />
              )
            }
            renderItem={({ item }) => (
              <SubjectItem
                item={item}
                isExpanded={expandedId === item.id}
                onToggle={handleToggle}
                onStudy={handleStudy}
                onManageCards={handleManageCards}
                onOptions={handleOptions}
                isSelectionMode={isSelectionMode}
                isSelected={selectedSubjects.includes(item.id)}
                onToggleSelection={handleToggleSelection}
                allowDefaultDeckEditing={allowDefaultDeckEditing}
                calculateProgress={calculateProgress}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />

          {/* FAB — only when there are subjects and NOT empty */}
          {subjectCount > 0 && (
            !isSelectionMode ? (
              <TouchableOpacity style={s.fab} onPress={openAdd} activeOpacity={0.85}>
                <Ionicons name="add" size={26} color="#0F0F0F" />
              </TouchableOpacity>
            ) : (
              <View style={s.selectionBar}>
                <TouchableOpacity
                  style={[s.selBtn, s.selBtnDanger, selCount === 0 && { opacity: 0.4 }]}
                  onPress={selCount > 0 ? handleBulkDelete : null}
                  activeOpacity={selCount === 0 ? 1 : 0.8}
                >
                  <Ionicons name="trash-outline" size={18} color="white" style={{ marginRight: 6 }} />
                  <Text style={s.selBtnTxt}>
                    Apagar{selCount > 0 ? ` (${selCount})` : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          )}
        </>
      )}

      {/* ── Options modal ────────────────────────────────────── */}
      <CustomBottomModal
        visible={isOptionsVisible}
        onClose={() => setOptionsVisible(false)}
        title="Opções da Matéria"
      >
        <TouchableOpacity
          style={s.optRow}
          onPress={() => { setOptionsVisible(false); navigation.navigate('EditSubject', { deckId, subjectId: selectedSubject?.id }); }}
        >
          <Ionicons name="create-outline" size={19} color={theme.textSecondary} style={s.optIcon} />
          <Text style={s.optTxt}>Editar nome</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.optRow}
          onPress={() => { setOptionsVisible(false); setSelectionMode(true); setSelectedSubjects([selectedSubject?.id]); }}
        >
          <Ionicons name="checkbox-outline" size={19} color={theme.textSecondary} style={s.optIcon} />
          <Text style={s.optTxt}>Selecionar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.optRow, s.optRowLast]} onPress={performDelete}>
          <Ionicons name="trash-outline" size={19} color={theme.danger} style={s.optIcon} />
          <Text style={[s.optTxt, { color: theme.danger }]}>Apagar matéria</Text>
        </TouchableOpacity>
      </CustomBottomModal>

      {/* ── Add subject modal ─────────────────────────────────── */}
      <CustomBottomModal
        visible={isAddVisible}
        onClose={() => { setAddVisible(false); setNewName(''); }}
        title="Nova Matéria"
      >
        <View style={s.addRow}>
          <Ionicons name="layers-outline" size={17} color={theme.primary} style={{ marginRight: 10 }} />
          <TextInput
            ref={addInputRef}
            style={s.addInput}
            placeholder="Ex: Direito Penal"
            placeholderTextColor={theme.textMuted}
            value={newName}
            onChangeText={setNewName}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            maxLength={60}
          />
        </View>
        <View style={s.addLine} />
        <TouchableOpacity
          style={[s.addBtn, (!newName.trim() || isSaving) && { opacity: 0.4 }]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={!newName.trim() || isSaving}
        >
          <Text style={s.addBtnTxt}>{isSaving ? 'Salvando...' : 'Criar Matéria'}</Text>
        </TouchableOpacity>
      </CustomBottomModal>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(p => ({ ...p, visible: false }))}
      />
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.background,
  },

  // ── Header
  header: {
    backgroundColor: theme.background,
  },
  headerInner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  headerDivider: {
    height: 1,
    backgroundColor: theme.backgroundSecondary,
  },

  // ── Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  searchInput: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
  },

  // ── Subject card
  card: {
    flexDirection: 'row',
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardExpanded: {
    borderColor: 'rgba(93,214,44,0.2)',
  },
  cardSelected: {
    borderColor: theme.primary,
    backgroundColor: 'rgba(93,214,44,0.06)',
  },
  cardAccent: {
    width: 4,
    backgroundColor: theme.backgroundTertiary,
  },
  cardAccentOn: {
    backgroundColor: theme.primary,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.primary,
    marginRight: 12,
  },
  dotDefault: {
    backgroundColor: theme.textMuted,
  },
  cardMeta: { flex: 1 },
  cardTitle: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardSub: {
    color: theme.textSecondary,
    fontSize: 12,
  },
  badgeDefault: {
    color: theme.textMuted,
    fontSize: 11,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  pct: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  pctDone: { color: theme.primary },

  // ── Progress bar
  progressTrack: {
    height: 3,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.primary,
    borderRadius: 2,
  },

  // ── Expanded actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  btnStudy: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnStudyTxt: {
    color: '#0F0F0F',
    fontSize: 13,
    fontWeight: '700',
  },
  btnManage: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: theme.primary,
  },
  btnManageTxt: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  btnMore: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: theme.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },

  // ── Selection bar
  selectionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: theme.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  selBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    height: 50,
  },
  selBtnDanger: {
    backgroundColor: theme.danger,
  },
  selBtnTxt: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyIconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(93,214,44,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(93,214,44,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyHint: {
    color: theme.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 32,
  },

  // Steps
  stepsList: {
    width: '100%',
    marginBottom: 32,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  stepNumWrap: {
    width: 32,
    alignItems: 'center',
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(93,214,44,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(93,214,44,0.35)',
    textAlign: 'center',
    lineHeight: 24,
    color: theme.primary,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  stepLine: {
    width: 1.5,
    flex: 1,
    minHeight: 20,
    backgroundColor: 'rgba(93,214,44,0.15)',
    marginTop: 4,
    marginBottom: 4,
  },
  stepContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  stepLabel: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  stepHint: {
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },

  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 13,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  emptyBtnTxt: {
    color: '#0F0F0F',
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Empty search
  emptySearch: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptySearchTxt: {
    color: theme.textSecondary,
    fontSize: 14,
  },

  // ── Options modal
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  optRowLast: {
    borderBottomWidth: 0,
  },
  optIcon: { marginRight: 14 },
  optTxt: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },

  // ── Add modal
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    height: 52,
  },
  addInput: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
  },
  addLine: {
    height: 1.5,
    backgroundColor: theme.primary,
    opacity: 0.5,
    borderRadius: 1,
    marginBottom: 20,
  },
  addBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  addBtnTxt: {
    color: '#0F0F0F',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default SubjectListScreen;
