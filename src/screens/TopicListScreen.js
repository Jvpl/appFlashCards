import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions,
  ScrollView, TouchableOpacity, TextInput,
  Modal, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { getAppData, saveAppData } from '../services/storage';
import { GlowFab } from '../components/ui/GlowFab';
import { CustomAlert } from '../components/ui/CustomAlert';
import MateriaCard, { MATERIA_CARD_WIDTH, MATERIA_CARD_HEIGHT } from '../components/home/MateriaCard';
import theme from '../styles/theme';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 10;
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

// ── InputBar ──────────────────────────────────────────────────────

function InputBar({ inputRef, value, onChange, saving, onSave }) {
  return (
    <View style={s.inputBar}>
      <View style={s.inputBarInner}>
        <View style={s.inputUnderlineWrap}>
          <View style={s.inputBarRow}>
            <TextInput
              ref={inputRef}
              style={s.inputBarInput}
              placeholder="Nome do assunto..."
              placeholderTextColor={theme.textMuted}
              value={value}
              onChangeText={t => onChange(t.slice(0, 30))}
              maxLength={30}
              returnKeyType="done"
              autoFocus
              onSubmitEditing={() => onSave()}
            />
            {value.length > 0 && (
              <Text style={[s.createCounter, value.length >= 24 && s.createCounterWarn]}>
                {value.length}/30
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

export const TopicListScreen = ({ route, navigation }) => {
  const { deckId, deckName, subjectId, subjectName, preloadedTopics } = route.params;
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [topics, setTopics] = useState(preloadedTopics || []);

  const [isCreating, setIsCreating] = useState(false);
  const [createText, setCreateText] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const createInputRef = useRef(null);

  const [contextMenu, setContextMenu] = useState({ visible: false, topic: null, x: 0, y: 0 });
  const [renameModal, setRenameModal] = useState({ visible: false, topic: null, text: '' });
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });

  // ── Load ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isFocused) return;
    const load = async () => {
      const allData = await getAppData();
      const deck = allData.find(d => d.id === deckId);
      const subject = deck?.subjects?.find(s => s.id === subjectId);
      if (subject?.topics) setTopics(subject.topics);
    };
    load();
  }, [isFocused, deckId, subjectId]);

  useEffect(() => {
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setIsCreating(false);
      setCreateText('');
    });
    return () => hide.remove();
  }, []);

  // ── Save helpers ─────────────────────────────────────────────────

  const persistTopics = useCallback(async (updatedTopics) => {
    const allData = await getAppData();
    const newData = allData.map(deck => {
      if (deck.id !== deckId) return deck;
      return {
        ...deck,
        subjects: deck.subjects.map(s =>
          s.id !== subjectId ? s : { ...s, topics: updatedTopics, flashcards: [] }
        ),
      };
    });
    await saveAppData(newData);
  }, [deckId, subjectId]);

  // ── Create topic ─────────────────────────────────────────────────

  const handleAddSave = useCallback(async (name) => {
    const nameLower = name.trim().toLowerCase();
    if (topics.find(t => t.name?.trim().toLowerCase() === nameLower)) {
      setAlertConfig({
        visible: true,
        title: 'Nome já existe',
        message: `Já existe um assunto chamado "${name.trim()}". Escolha um nome diferente.`,
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }],
      });
      return false;
    }
    const newTopic = { id: `topic_${Date.now()}`, name: name.trim(), flashcards: [] };
    let updated = [...topics, newTopic];

    // Primeiro tópico: migra cards diretos da matéria para um tópico "Geral"
    if (topics.length === 0) {
      const allData = await getAppData();
      const deck = allData.find(d => d.id === deckId);
      const subject = deck?.subjects?.find(s => s.id === subjectId);
      const existingCards = subject?.flashcards || [];
      if (existingCards.length > 0) {
        const geralTopic = { id: `topic_geral_${Date.now()}`, name: 'Geral', flashcards: existingCards };
        updated = [geralTopic, newTopic];
      }
    }

    await persistTopics(updated);
    setTopics(updated);
    return true;
  }, [topics, persistTopics, deckId, subjectId]);

  // ── Study ────────────────────────────────────────────────────────

  const handleStudy = useCallback((topic) => {
    navigation.navigate('Flashcard', {
      deckId, deckName,
      subjectId: topic.id,
      subjectName: topic.name,
      preloadedCards: topic.flashcards || [],
    });
  }, [navigation, deckId, deckName]);

  const handleManageCards = useCallback((topic) => {
    navigation.navigate('ManageFlashcards', {
      deckId, subjectId: topic.id,
      preloadedCards: topic.flashcards || [],
      subjectName: topic.name,
    });
  }, [navigation, deckId]);

  // ── Context menu ──────────────────────────────────────────────────

  const handleMenuPress = useCallback((topic, event) => {
    const { pageX, pageY } = event.nativeEvent;
    setContextMenu({ visible: true, topic, x: pageX, y: pageY });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(p => ({ ...p, visible: false })), []);

  // ── Rename ────────────────────────────────────────────────────────

  const handleRenameConfirm = useCallback(async () => {
    const newName = renameModal.text.trim();
    if (!newName || !renameModal.topic) return;
    const nameLower = newName.toLowerCase();
    if (topics.find(t => t.name?.trim().toLowerCase() === nameLower && t.id !== renameModal.topic.id)) {
      setAlertConfig({
        visible: true,
        title: 'Nome já existe',
        message: `Já existe um assunto chamado "${newName}". Escolha um nome diferente.`,
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }],
      });
      return;
    }
    const updated = topics.map(t => t.id === renameModal.topic.id ? { ...t, name: newName } : t);
    await persistTopics(updated);
    setTopics(updated);
    setRenameModal({ visible: false, topic: null, text: '' });
  }, [renameModal, topics, persistTopics]);

  // ── Delete ────────────────────────────────────────────────────────

  const handleDeleteTopic = useCallback((topic) => {
    setAlertConfig({
      visible: true,
      title: 'Apagar Assunto',
      message: `Apagar "${topic.name}" e todos os seus flashcards?`,
      buttons: [
        { text: 'Cancelar', style: 'cancel', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) },
        {
          text: 'Apagar', style: 'destructive', onPress: async () => {
            const updated = topics.filter(t => t.id !== topic.id);
            await persistTopics(updated);
            setTopics(updated);
            setAlertConfig(p => ({ ...p, visible: false }));
          },
        },
      ],
    });
  }, [topics, persistTopics]);

  // ── Grid ──────────────────────────────────────────────────────────

  const renderGrid = (items) => {
    const rows = [];
    for (let i = 0; i < items.length; i += 2) {
      rows.push(
        <View key={i} style={s.gridRow}>
          <MateriaCard
            subject={items[i]}
            deck={{ id: deckId, name: subjectName }}
            width={MATERIA_CARD_WIDTH}
            height={MATERIA_CARD_HEIGHT}
            onPress={() => handleStudy(items[i])}
            onMenuPress={(e) => handleMenuPress(items[i], e)}
          />
          {items[i + 1] ? (
            <MateriaCard
              subject={items[i + 1]}
              deck={{ id: deckId, name: subjectName }}
              width={MATERIA_CARD_WIDTH}
              height={MATERIA_CARD_HEIGHT}
              onPress={() => handleStudy(items[i + 1])}
              onMenuPress={(e) => handleMenuPress(items[i + 1], e)}
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

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerInner}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn} hitSlop={HIT_SLOP}>
            <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle} numberOfLines={1}>{subjectName}</Text>
            <Text style={s.headerSub} numberOfLines={1}>{deckName}</Text>
          </View>
          <View style={s.headerBtn} />
        </View>
        <View style={s.headerDivider} />
      </View>

      {/* Grid */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.gridContent, { paddingBottom: 90 + Math.max(insets.bottom, 0) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {topics.length === 0 && !isCreating ? (
          <View style={s.empty}>
            <View style={s.emptyIconRing}>
              <Ionicons name="layers-outline" size={28} color={theme.primary} />
            </View>
            <Text style={s.emptyTitle}>Sem assuntos</Text>
            <Text style={s.emptyHint}>Crie assuntos para organizar os flashcards desta matéria.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setIsCreating(true)} activeOpacity={0.8}>
              <Ionicons name="add-circle" size={18} color="#0F0F0F" />
              <Text style={s.emptyBtnTxt}>Criar assunto</Text>
            </TouchableOpacity>
          </View>
        ) : renderGrid(topics)}
      </ScrollView>

      {/* FAB */}
      {topics.length > 0 && !isCreating && (
        <View style={[s.fabPos, { bottom: 20 }]}>
          <GlowFab onPress={() => setIsCreating(true)} color={theme.primary}>
            <Ionicons name="add" size={26} color="#0F0F0F" />
          </GlowFab>
        </View>
      )}

      {/* InputBar */}
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
              if (ok) { setCreateText(''); setIsCreating(false); }
            }}
          />
        )}
      </KeyboardStickyView>

      {/* Context menu */}
      <Modal transparent animationType="fade" visible={contextMenu.visible} onRequestClose={closeContextMenu} statusBarTranslucent>
        <TouchableWithoutFeedback onPress={closeContextMenu}>
          <View style={ctx.overlay}>
            {(() => {
              const menuW = 200, menuH = 160;
              let menuLeft = contextMenu.x - menuW + 16;
              let menuTop = contextMenu.y - menuH - 10;
              if (menuLeft < 8) menuLeft = 8;
              if (menuLeft + menuW > width - 8) menuLeft = width - menuW - 8;
              if (menuTop < 60) menuTop = contextMenu.y + 10;
              const topic = contextMenu.topic;
              return (
                <View style={[ctx.menu, { left: menuLeft, top: menuTop }]}>
                  <TouchableOpacity style={ctx.item} onPress={() => { closeContextMenu(); if (topic) handleManageCards(topic); }}>
                    <Ionicons name="add-circle-outline" size={16} color={theme.textPrimary} />
                    <Text style={ctx.itemText}>Criar card</Text>
                  </TouchableOpacity>
                  <View style={ctx.sep} />
                  <TouchableOpacity style={ctx.item} onPress={() => { closeContextMenu(); if (topic) setRenameModal({ visible: true, topic, text: topic.name || '' }); }}>
                    <Ionicons name="create-outline" size={16} color={theme.textPrimary} />
                    <Text style={ctx.itemText}>Renomear</Text>
                  </TouchableOpacity>
                  <View style={ctx.sep} />
                  <TouchableOpacity style={ctx.item} onPress={() => { closeContextMenu(); if (topic) setTimeout(() => handleDeleteTopic(topic), 50); }}>
                    <Ionicons name="trash-outline" size={16} color={theme.danger} />
                    <Text style={[ctx.itemText, { color: theme.danger }]}>Excluir</Text>
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
                  <Text style={ren.title}>Renomear assunto</Text>
                  {renameModal.text.length > 0 && (
                    <Text style={[ren.charCount, renameModal.text.length >= 24 && ren.charCountWarn]}>{renameModal.text.length}/30</Text>
                  )}
                </View>
                <TextInput
                  style={ren.input}
                  value={renameModal.text}
                  onChangeText={t => setRenameModal(p => ({ ...p, text: t.slice(0, 30) }))}
                  autoFocus selectTextOnFocus
                  placeholderTextColor={theme.textMuted}
                  placeholder="Nome do assunto"
                  maxLength={30}
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
  gridContent: { paddingHorizontal: GRID_PADDING, paddingTop: 12 },
  gridRow: { flexDirection: 'row', gap: GRID_GAP, marginBottom: GRID_GAP },

  empty: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 80 },
  emptyIconRing: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(93,214,44,0.08)',
    borderWidth: 1.5, borderColor: 'rgba(93,214,44,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { color: theme.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptyHint: { color: theme.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.primary, borderRadius: 14, height: 50, width: '100%',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 6,
  },
  emptyBtnTxt: { color: '#0F0F0F', fontSize: 15, fontWeight: '700' },

  fabPos: { position: 'absolute', right: 20 },

  inputBar: {
    backgroundColor: theme.background,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(93,214,44,0.35)',
  },
  inputBarInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 14,
  },
  inputUnderlineWrap: { flex: 1 },
  inputBarRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6 },
  inputBarInput: {
    flex: 1, color: theme.textPrimary, fontSize: 16, paddingVertical: 0,
  },
  inputLine: { height: 1.5, borderRadius: 1, backgroundColor: theme.primary },
  inputBarBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center',
  },
  createCounter: { color: theme.primaryDark, fontSize: 11, fontWeight: '600', marginLeft: 6 },
  createCounterWarn: { color: theme.primary },
});

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
});

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

export default TopicListScreen;
