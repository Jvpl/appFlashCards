/**
 * CategoryDetailScreen
 * Tela de detalhe de uma categoria.
 * Mostra todos os decks e matérias da categoria, com suporte a:
 * - Seleção em massa (long press)
 * - Mover decks para outra categoria
 * - Criar nova categoria customizada
 * - Renomear e excluir decks/matérias
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions,
  Modal, TouchableWithoutFeedback, TextInput, FlatList, BackHandler,
  StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { getAppData, saveAppData, removePurchasedDeck, getUsedCategoryIds } from '../services/storage';
import {
  CONCURSO_CATEGORIES,
  getDeckCatId,
  getCustomCategories,
  saveCustomCategories,
} from '../config/categories';
import DeckStackCard from '../components/home/DeckStackCard';
import MateriaCard from '../components/home/MateriaCard';
import { CustomAlert } from '../components/ui/CustomAlert';
import theme from '../styles/theme';
import { SvgXml } from 'react-native-svg';
import GlowIcon from '../components/ui/GlowIcon';
import {
  administrativoIcon, educacaoIcon, fiscalIcon, justicaIcon,
  militarIcon, operacionalIcon, saudeIcon, segurancaIcon,
} from '../assets/svgIconPaths';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 10;
const CARD_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP) / 2;
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.25);
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

// ─────────────────────────────────────────────
// Ícones SVG por categoria (mesmos do AddDeckScreen)
// ─────────────────────────────────────────────
const CATEGORY_SVG_ICONS = {
  administrativo: administrativoIcon,
  educacao:       educacaoIcon,
  fiscal:         fiscalIcon,
  justica:        justicaIcon,
  militar:        militarIcon,
  operacional:    operacionalIcon,
  saude:          saudeIcon,
  seguranca:      segurancaIcon,
};

/** Ícone com glow verde para listas (usando Skia, igual ao home screen) */
const CategoryIconGlow = ({ categoryId, size = 22 }) => {
  const iconData = CATEGORY_SVG_ICONS[categoryId];
  if (!iconData) return <Ionicons name="folder-outline" size={size} color={theme.primary} />;
  return <GlowIcon iconData={iconData} size={size} color={theme.primary} glowBlur={5} />;
};

// Dados pro grid de categorias (igual ao AddDeckScreen)
const PRESET_CATEGORIES = [
  { id: 'seguranca',      name: 'Segurança Pública',        icon: segurancaIcon },
  { id: 'justica',        name: 'Justiça \u0026 Direito',      icon: justicaIcon },
  { id: 'administrativo', name: 'Administrativo',            icon: administrativoIcon },
  { id: 'fiscal',         name: 'Fiscal \u0026 Controle',      icon: fiscalIcon },
  { id: 'operacional',    name: 'Operacional \u0026 Logística', icon: operacionalIcon },
  { id: 'saude',          name: 'Saúde',                    icon: saudeIcon },
  { id: 'educacao',       name: 'Educação',                 icon: educacaoIcon },
  { id: 'militar',        name: 'Militar',                   icon: militarIcon },
];

const ICON_GROUPS = [
  { label: 'Estudo',       icons: ['book-outline','school-outline','document-text-outline','library-outline','pencil-outline','calculator-outline','flask-outline','language-outline','reader-outline','journal-outline','clipboard-outline','easel-outline'] },
  { label: 'Objetivo',     icons: ['trophy-outline','star-outline','ribbon-outline','flag-outline','podium-outline','rocket-outline','diamond-outline','sparkles-outline','medal-outline','trending-up-outline','flame-outline','compass-outline'] },
  { label: 'Organização', icons: ['calendar-outline','checkmark-circle-outline','time-outline','people-outline','list-outline','albums-outline','folder-outline','bookmark-outline','filing-outline','grid-outline','layers-outline','filter-outline'] },
  { label: 'Concurso',     icons: ['shield-outline','briefcase-outline','globe-outline','megaphone-outline','newspaper-outline','scale-outline','build-outline','id-card-outline','document-outline','people-circle-outline','chatbubbles-outline','pie-chart-outline'] },
  { label: 'Outros',       icons: ['medkit-outline','cash-outline','hammer-outline','stats-chart-outline','heart-outline','bus-outline','car-outline','home-outline','leaf-outline','nutrition-outline','fitness-outline','bicycle-outline'] },
];

// ─────────────────────────────────────────────
// Header da tela
// ─────────────────────────────────────────────
const CatHeader = ({ category, insetTop, onBack, selectedCount, selectMode, onCancelSelect }) => (
  <View style={[hdr.wrapper, { paddingTop: insetTop }]}>
    <View style={hdr.row}>
      <TouchableOpacity onPress={selectMode ? onCancelSelect : onBack} style={hdr.iconBtn} hitSlop={HIT_SLOP}>
        <Ionicons name={selectMode ? 'close' : 'arrow-back'} size={24} color={theme.textPrimary} />
      </TouchableOpacity>

      {selectMode ? (
        <Text style={hdr.title}>{selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}</Text>
      ) : (
        <Text style={hdr.title} numberOfLines={1}>{category?.name || 'Categoria'}</Text>
      )}

      {/* Espaçador */}
      <View style={hdr.iconBtn} />
    </View>
    <View style={hdr.divider} />
  </View>
);

// ─────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────
const TabBar = ({ activeTab, onTabChange, deckCount, subjectCount }) => (
  <View style={tb.container}>
    {[
      { key: 'decks', label: 'Decks', count: deckCount },
      { key: 'materias', label: 'Matérias', count: subjectCount },
    ].map(tab => (
      <TouchableOpacity
        key={tab.key}
        style={[tb.tab, activeTab === tab.key && tb.tabActive]}
        onPress={() => onTabChange(tab.key)}
        activeOpacity={0.7}
      >
        <Text style={[tb.label, activeTab === tab.key && tb.labelActive]}>
          {tab.label}
        </Text>
        {tab.count > 0 && (
          <View style={[tb.badge, activeTab === tab.key && tb.badgeActive]}>
            <Text style={[tb.badgeText, activeTab === tab.key && tb.badgeTextActive]}>
              {tab.count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    ))}
  </View>
);

// ─────────────────────────────────────────────
// Grid helper
// ─────────────────────────────────────────────
const GridRows = ({ items, renderCard }) => {
  const rows = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(
      <View key={i} style={s.gridRow}>
        {renderCard(items[i], i)}
        {items[i + 1]
          ? renderCard(items[i + 1], i + 1)
          : <View style={{ width: CARD_WIDTH }} />}
      </View>
    );
  }
  return <>{rows}</>;
};

// ─────────────────────────────────────────────
// Tela principal
// ─────────────────────────────────────────────
export const CategoryDetailScreen = ({ route, navigation }) => {
  const { categoryId, categoryName, categoryIcon } = route.params;
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  // Dados
  const [decks, setDecks] = useState([]);
  const [allCategories, setAllCategories] = useState([...CONCURSO_CATEGORIES]);
  const [loading, setLoading] = useState(true);

  // UI
  const [activeTab, setActiveTab] = useState('decks');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const selectMode = selectedIds.size > 0;

  // Modais
  const [contextMenu, setContextMenu] = useState({ visible: false, type: '', item: null, x: 0, y: 0 });
  const [moveModal, setMoveModal] = useState({ visible: false, deckIds: [] });
  const [renameModal, setRenameModal] = useState({ visible: false, type: '', item: null, text: '' });
  // createCatModal: mode='preset'|'custom'
  const [createCatModal, setCreateCatModal] = useState({ visible: false, mode: 'preset', name: '', icon: 'folder-outline', pendingDeckIds: [] });
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });
  // Categorias efetivamente existentes (carregadas do storage)
  const [usedCategoryIds, setUsedCategoryIds] = useState(new Set());

  // Categoria atual
  const category = useMemo(() =>
    allCategories.find(c => c.id === categoryId) || { id: categoryId, name: categoryName, icon: categoryIcon || 'folder-outline', color: theme.primary },
    [allCategories, categoryId, categoryName, categoryIcon]
  );

  // ── Carregar dados ──────────────────────────
  const loadData = useCallback(async () => {
    const [allData, customCats, usedIds] = await Promise.all([
      getAppData(),
      getCustomCategories(),
      getUsedCategoryIds(),
    ]);
    const categoryDecks = allData.filter(d => !d.isExample && getDeckCatId(d) === categoryId);
    setDecks(categoryDecks);
    setAllCategories([...CONCURSO_CATEGORIES, ...customCats]);
    setUsedCategoryIds(usedIds);
    setLoading(false);
  }, [categoryId]);

  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused, loadData]);

  // Back handler para cancelar seleção
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFocused && selectMode) { clearSelection(); return true; }
      return false;
    });
    return () => handler.remove();
  }, [isFocused, selectMode]);

  // ── Seleção ─────────────────────────────────
  const toggleSelection = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectAll = useCallback(() => {
    if (activeTab === 'decks') {
      setSelectedIds(new Set(decks.map(d => d.id)));
    } else {
      const allSubjectKeys = decks.flatMap(d =>
        (d.subjects || []).map(s => `${d.id}:${s.id}`)
      );
      setSelectedIds(new Set(allSubjectKeys));
    }
  }, [activeTab, decks]);

  // ── Matérias flat ─────────────────────────────
  const allSubjects = useMemo(() =>
    decks.flatMap(deck => (deck.subjects || []).map(s => ({ subject: s, deck }))),
    [decks]
  );

  // ── Rename ──────────────────────────────────
  const handleRename = async () => {
    const newName = renameModal.text.trim();
    if (!newName) return;
    const allData = await getAppData();
    let updated;
    if (renameModal.type === 'deck') {
      updated = allData.map(d => d.id === renameModal.item.id ? { ...d, name: newName } : d);
    } else {
      // materia
      const { deck, subject } = renameModal.item;
      updated = allData.map(d => {
        if (d.id !== deck.id) return d;
        return { ...d, subjects: (d.subjects || []).map(s => s.id === subject.id ? { ...s, name: newName } : s) };
      });
    }
    await saveAppData(updated);
    setRenameModal({ visible: false, type: '', item: null, text: '' });
    loadData();
  };

  // ── Delete ──────────────────────────────────
  const handleDeleteDeck = useCallback((deck) => {
    setAlertConfig({
      visible: true,
      title: `Excluir "${deck.name}"?`,
      message: 'Isso apagará o deck e todos os flashcards. Não pode ser desfeito.',
      buttons: [
        { text: 'Cancelar', style: 'cancel', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) },
        { text: 'Excluir', style: 'destructive', onPress: async () => {
          setAlertConfig(p => ({ ...p, visible: false }));
          const allData = await getAppData();
          await saveAppData(allData.filter(d => d.id !== deck.id));
          if (deck.isPurchased) await removePurchasedDeck(deck.id);
          loadData();
        }},
      ],
    });
  }, [loadData]);

  const handleDeleteSubject = useCallback((item) => {
    setAlertConfig({
      visible: true,
      title: `Excluir "${item.subject.name}"?`,
      message: 'Isso apagará a matéria e todos os flashcards. Não pode ser desfeito.',
      buttons: [
        { text: 'Cancelar', style: 'cancel', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) },
        { text: 'Excluir', style: 'destructive', onPress: async () => {
          setAlertConfig(p => ({ ...p, visible: false }));
          const allData = await getAppData();
          const updated = allData.map(d => {
            if (d.id !== item.deck.id) return d;
            return { ...d, subjects: (d.subjects || []).filter(s => s.id !== item.subject.id) };
          });
          await saveAppData(updated);
          loadData();
        }},
      ],
    });
  }, [loadData]);

  // ── Delete em massa ─────────────────────────
  const handleDeleteSelected = useCallback(() => {
    const count = selectedIds.size;
    const isDecks = activeTab === 'decks';
    setAlertConfig({
      visible: true,
      title: `Excluir ${count} ${isDecks ? 'deck' : 'matéria'}${count !== 1 ? 's' : ''}?`,
      message: 'Isso apagará todos os flashcards selecionados. Não pode ser desfeito.',
      buttons: [
        { text: 'Cancelar', style: 'cancel', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) },
        { text: 'Excluir', style: 'destructive', onPress: async () => {
          setAlertConfig(p => ({ ...p, visible: false }));
          const allData = await getAppData();
          let updated;
          if (isDecks) {
            updated = allData.filter(d => !selectedIds.has(d.id));
            await Promise.all(
              [...selectedIds].map(id => {
                const deck = decks.find(d => d.id === id);
                return deck?.isPurchased ? removePurchasedDeck(id) : Promise.resolve();
              })
            );
          } else {
            updated = allData.map(deck => {
              if (!decks.find(d => d.id === deck.id)) return deck;
              return {
                ...deck,
                subjects: (deck.subjects || []).filter(s => !selectedIds.has(`${deck.id}:${s.id}`)),
              };
            });
          }
          await saveAppData(updated);
          clearSelection();
          loadData();
        }},
      ],
    });
  }, [selectedIds, activeTab, decks, clearSelection, loadData]);

  // ── Mover para categoria ─────────────────────
  const handleMoveDecks = useCallback(async (targetCatId) => {
    const deckIds = moveModal.deckIds;
    const allData = await getAppData();
    const updated = allData.map(d =>
      deckIds.includes(d.id) ? { ...d, category: targetCatId } : d
    );
    await saveAppData(updated);
    setMoveModal({ visible: false, deckIds: [] });
    clearSelection();
    loadData();
  }, [moveModal.deckIds, clearSelection, loadData]);

  // ── Criar/mover para categoria ──────────────
  // Categorias padrão que ainda NÃO existem (não foram usadas), exceto a atual
  const presetCategoriesAvailable = useMemo(() =>
    PRESET_CATEGORIES.filter(c =>
      c.id !== categoryId &&
      !usedCategoryIds.has(c.id)
    ),
    [categoryId, usedCategoryIds]
  );

  // Estado para painel de nova categoria customizada (igual ao AddDeckScreen)
  const [customCatExpanded, setCustomCatExpanded] = useState(false);
  const [customCatName, setCustomCatName] = useState('');
  const [customCatIcon, setCustomCatIcon] = useState(null);
  const [activeIconGroup, setActiveIconGroup] = useState(0);

  const DEFAULT_CAT_ICON = 'folder-outline';

  const handleCreateCategory = async (pendingIds) => {
    const name = customCatName.trim();
    if (!name) return;
    const newCat = {
      id: `custom_${Date.now()}`,
      name,
      icon: customCatIcon && customCatIcon !== '__picker__' ? customCatIcon : DEFAULT_CAT_ICON,
      color: theme.primary,
      keywords: [],
      isCustom: true,
    };
    const customCats = await getCustomCategories();
    await saveCustomCategories([...customCats, newCat]);
    const ids = pendingIds || createCatModal.pendingDeckIds;
    if (ids.length > 0) {
      const allData = await getAppData();
      const updated = allData.map(d =>
        ids.includes(d.id) ? { ...d, category: newCat.id } : d
      );
      await saveAppData(updated);
    }
    setCustomCatName('');
    setCustomCatIcon(null);
    setCustomCatExpanded(false);
    setCreateCatModal({ visible: false, mode: 'preset', name: '', icon: 'folder-outline', pendingDeckIds: [] });
    setMoveModal({ visible: false, deckIds: [] });
    clearSelection();
    loadData();
  };

  // Mover para uma categoria padrão que ainda não existia (ativa ela ao mover)
  const handleMoveToPreset = async (presetCat) => {
    const deckIds = createCatModal.pendingDeckIds;
    const allData = await getAppData();
    const updated = allData.map(d =>
      deckIds.includes(d.id) ? { ...d, category: presetCat.id } : d
    );
    await saveAppData(updated);
    setCreateCatModal({ visible: false, mode: 'preset', name: '', icon: 'folder-outline', pendingDeckIds: [] });
    setMoveModal({ visible: false, deckIds: [] });
    clearSelection();
    loadData();
  };

  // ── Context menu ─────────────────────────────
  const openContextMenu = (type, item, x, y) => {
    setContextMenu({ visible: true, type, item, x, y });
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <View style={s.container}>
      <CatHeader
        category={category}
        insetTop={insets.top}
        onBack={() => navigation.goBack()}
        selectedCount={selectedIds.size}
        selectMode={selectMode}
        onCancelSelect={clearSelection}
      />

      {/* Tabs */}
      <TabBar
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); clearSelection(); }}
        deckCount={decks.length}
        subjectCount={allSubjects.length}
      />

      {/* Barra de ações de seleção */}
      {selectMode && (
        <View style={s.selectBar}>
          <TouchableOpacity onPress={selectAll} style={s.selectBarBtn} hitSlop={HIT_SLOP}>
            <Ionicons name="checkmark-done-outline" size={18} color={theme.textSecondary} />
            <Text style={s.selectBarBtnTxt}>Todos</Text>
          </TouchableOpacity>
          {activeTab === 'decks' && (
            <TouchableOpacity
              style={s.selectBarBtn}
              hitSlop={HIT_SLOP}
              onPress={() => setMoveModal({ visible: true, deckIds: [...selectedIds] })}
            >
              <Ionicons name="swap-horizontal-outline" size={18} color={theme.primary} />
              <Text style={[s.selectBarBtnTxt, { color: theme.primary }]}>Mover para...</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleDeleteSelected} style={s.selectBarBtn} hitSlop={HIT_SLOP}>
            <Ionicons name="trash-outline" size={18} color={theme.danger} />
            <Text style={[s.selectBarBtnTxt, { color: theme.danger }]}>Excluir</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Conteúdo */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'decks' ? (
          decks.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="layers-outline" size={40} color={theme.backgroundTertiary} />
              <Text style={s.emptyText}>Nenhum deck nesta categoria</Text>
            </View>
          ) : (
            <GridRows
              items={decks}
              renderCard={(deck) => (
                <DeckStackCard
                  key={deck.id}
                  deck={deck}
                  width={CARD_WIDTH}
                  height={CARD_HEIGHT}
                  categoryLabel={null}
                  isSelected={selectedIds.has(deck.id)}
                  multiSelectMode={selectMode}
                  onPress={() => {
                    if (selectMode) { toggleSelection(deck.id); return; }
                    navigation.navigate('SubjectList', {
                      deckId: deck.id,
                      deckName: deck.name,
                      preloadedSubjects: deck.subjects,
                    });
                  }}
                  onLongPress={() => toggleSelection(deck.id)}
                  onMenuPress={(e) => {
                    const { pageX, pageY } = e.nativeEvent;
                    openContextMenu('deck', deck, pageX, pageY);
                  }}
                />
              )}
            />
          )
        ) : (
          allSubjects.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="book-outline" size={40} color={theme.backgroundTertiary} />
              <Text style={s.emptyText}>Nenhuma matéria nesta categoria</Text>
            </View>
          ) : (
            <GridRows
              items={allSubjects}
              renderCard={(item) => {
                const key = `${item.deck.id}:${item.subject.id}`;
                return (
                  <MateriaCard
                    key={key}
                    subject={item.subject}
                    deck={item.deck}
                    width={CARD_WIDTH}
                    height={CARD_HEIGHT}
                    isSelected={selectedIds.has(key)}
                    selectMode={selectMode}
                    onPress={() => {
                      if (selectMode) { toggleSelection(key); return; }
                      navigation.navigate('Flashcard', {
                        deckId: item.deck.id,
                        subjectId: item.subject.id,
                        subjectName: item.subject.name,
                        preloadedCards: item.subject.flashcards,
                      });
                    }}
                    onLongPress={() => toggleSelection(key)}
                    onMenuPress={(e) => {
                      const { pageX, pageY } = e.nativeEvent;
                      openContextMenu('subject', item, pageX, pageY);
                    }}
                  />
                );
              }}
            />
          )
        )}
      </ScrollView>

      {/* ── Context Menu ── */}
      {contextMenu.visible && (() => {
        const menuW = 190;
        const menuH = contextMenu.type === 'deck' ? 148 : 104;
        let left = contextMenu.x - menuW + 16;
        let top = contextMenu.y - menuH - 10;
        if (left < 8) left = 8;
        if (left + menuW > width - 8) left = width - menuW - 8;
        if (top < 60) top = contextMenu.y + 10;
        return (
          <Modal transparent animationType="fade" visible onRequestClose={() => setContextMenu(p => ({ ...p, visible: false }))}>
            <TouchableWithoutFeedback onPress={() => setContextMenu(p => ({ ...p, visible: false }))}>
              <View style={ctx.overlay}>
                <View style={[ctx.menu, { left, top }]}>

                  {/* Renomear */}
                  <TouchableOpacity
                    style={ctx.item}
                    onPress={() => {
                      setContextMenu(p => ({ ...p, visible: false }));
                      if (contextMenu.type === 'deck') {
                        setRenameModal({ visible: true, type: 'deck', item: contextMenu.item, text: contextMenu.item.name || '' });
                      } else {
                        setRenameModal({ visible: true, type: 'subject', item: contextMenu.item, text: contextMenu.item.subject.name || '' });
                      }
                    }}
                  >
                    <Ionicons name="create-outline" size={16} color={theme.textPrimary} />
                    <Text style={ctx.itemText}>Renomear</Text>
                  </TouchableOpacity>

                  {/* Mover (só para decks) */}
                  {contextMenu.type === 'deck' && (
                    <>
                      <View style={ctx.sep} />
                      <TouchableOpacity
                        style={ctx.item}
                        onPress={() => {
                          setContextMenu(p => ({ ...p, visible: false }));
                          setMoveModal({ visible: true, deckIds: [contextMenu.item.id] });
                        }}
                      >
                        <Ionicons name="swap-horizontal-outline" size={16} color={theme.primary} />
                        <Text style={[ctx.itemText, { color: theme.primary }]}>Mover para...</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <View style={ctx.sep} />

                  {/* Excluir */}
                  <TouchableOpacity
                    style={ctx.item}
                    onPress={() => {
                      setContextMenu(p => ({ ...p, visible: false }));
                      setTimeout(() => {
                        if (contextMenu.type === 'deck') handleDeleteDeck(contextMenu.item);
                        else handleDeleteSubject(contextMenu.item);
                      }, 50);
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.danger} />
                    <Text style={[ctx.itemText, { color: theme.danger }]}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        );
      })()}

      {/* ── Modal Mover para Categoria ── */}
      <Modal
        transparent
        animationType="slide"
        visible={moveModal.visible}
        onRequestClose={() => setMoveModal({ visible: false, deckIds: [] })}
      >
        <TouchableWithoutFeedback onPress={() => setMoveModal({ visible: false, deckIds: [] })}>
          <View style={mv.overlay}>
            <TouchableWithoutFeedback>
              <View style={mv.sheet}>
                <View style={mv.handle} />
                <Text style={mv.title}>Mover para categoria</Text>
                <Text style={mv.sub}>
                  {moveModal.deckIds.length} deck{moveModal.deckIds.length !== 1 ? 's' : ''} selecionado{moveModal.deckIds.length !== 1 ? 's' : ''}
                </Text>

                <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                  {/* Opção: nova categoria (preset ou custom) */}
                  <TouchableOpacity
                    style={mv.createOption}
                    onPress={() => {
                      setMoveModal({ ...moveModal, visible: false });
                      setCreateCatModal({ visible: true, mode: 'preset', name: '', icon: 'folder-outline', pendingDeckIds: moveModal.deckIds });
                    }}
                  >
                    <View style={mv.createIconWrap}>
                      <Ionicons name="add" size={20} color={theme.primary} />
                    </View>
                    <Text style={mv.createLabel}>Nova categoria</Text>
                  </TouchableOpacity>

                  <View style={mv.separator} />

                  {/* Categorias existentes (usedCategoryIds), exceto a atual */}
                  {allCategories
                    .filter(c => c.id !== categoryId && c.id !== 'personalizados' && (usedCategoryIds.has(c.id) || c.isCustom))
                    .map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={mv.option}
                        onPress={() => handleMoveDecks(cat.id)}
                      >
                        <View style={mv.iconWrap}>
                          <CategoryIconGlow categoryId={cat.id} size={20} />
                        </View>
                        <Text style={mv.optionLabel}>{cat.name}</Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                      </TouchableOpacity>
                    ))
                  }

                  {/* Meus estudos */}
                  {categoryId !== 'personalizados' && usedCategoryIds.has('personalizados') && (
                    <TouchableOpacity
                      style={mv.option}
                      onPress={() => handleMoveDecks('personalizados')}
                    >
                      <View style={mv.iconWrap}>
                        <Ionicons name="albums-outline" size={20} color={theme.textMuted} />
                      </View>
                      <Text style={mv.optionLabel}>Meus estudos</Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Modal Nova Categoria ── */}
      <Modal
        transparent
        animationType="slide"
        visible={createCatModal.visible}
        onRequestClose={() => setCreateCatModal(p => ({ ...p, visible: false }))}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={() => setCreateCatModal(p => ({ ...p, visible: false }))}>
            <View style={mv.overlay}>
              <TouchableWithoutFeedback>
                <View style={mv.sheet}>
                  <View style={mv.handle} />

                  {/* Tabs preset / custom */}
                  <View style={cc.tabRow}>
                    <TouchableOpacity
                      style={[cc.tabBtn, createCatModal.mode === 'preset' && cc.tabBtnActive]}
                      onPress={() => setCreateCatModal(p => ({ ...p, mode: 'preset' }))}
                    >
                      <Text style={[cc.tabBtnTxt, createCatModal.mode === 'preset' && cc.tabBtnTxtActive]}>Categorias padrão</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[cc.tabBtn, createCatModal.mode === 'custom' && cc.tabBtnActive]}
                      onPress={() => setCreateCatModal(p => ({ ...p, mode: 'custom' }))}
                    >
                      <Text style={[cc.tabBtnTxt, createCatModal.mode === 'custom' && cc.tabBtnTxtActive]}>Personalizada</Text>
                    </TouchableOpacity>
                  </View>

                  {createCatModal.mode === 'preset' ? (
                    /* ── Modo Preset: lista categorias padrão não ativas ── */
                    <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                      {presetCategoriesAvailable.length === 0 ? (
                        <View style={cc.emptyPreset}>
                          <Text style={cc.emptyPresetTxt}>Todas as categorias padrão já foram criadas.</Text>
                          <TouchableOpacity onPress={() => setCreateCatModal(p => ({ ...p, mode: 'custom' }))}>
                            <Text style={[cc.emptyPresetTxt, { color: theme.primary, marginTop: 8 }]}>Criar personalizada →</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        presetCategoriesAvailable.map(cat => (
                          <TouchableOpacity
                            key={cat.id}
                            style={mv.option}
                            onPress={() => handleMoveToPreset(cat)}
                          >
                            <View style={mv.iconWrap}>
                              <CategoryIconGlow categoryId={cat.id} size={20} />
                            </View>
                            <Text style={mv.optionLabel}>{cat.name}</Text>
                            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  ) : (
                    /* ── Modo Custom: nome + ícone Ionicons expansível ── */
                    <View style={cc.customPanelWrap}>
                      <Text style={cc.sub}>
                        {createCatModal.pendingDeckIds.length} deck{createCatModal.pendingDeckIds.length !== 1 ? 's' : ''} será{createCatModal.pendingDeckIds.length !== 1 ? 'ão' : ''} movido{createCatModal.pendingDeckIds.length !== 1 ? 's' : ''} para ela.
                      </Text>

                      <View style={cc.panelInner}>
                        <View style={cc.panelRow}>
                          <TouchableOpacity 
                            style={cc.panelIconBtn} 
                            onPress={() => setCustomCatIcon(customCatIcon === '__picker__' ? null : '__picker__')}
                            activeOpacity={0.75}
                          >
                            <Ionicons 
                              name={customCatIcon && customCatIcon !== '__picker__' ? customCatIcon : DEFAULT_CAT_ICON} 
                              size={22} 
                              color={customCatIcon && customCatIcon !== '__picker__' ? theme.primary : theme.textMuted} 
                            />
                          </TouchableOpacity>
                          <View style={cc.panelInputWrap}>
                            <TextInput
                              style={cc.panelInput}
                              value={customCatName}
                              onChangeText={setCustomCatName}
                              placeholder="Nome da categoria"
                              placeholderTextColor={theme.textMuted}
                              autoFocus={createCatModal.mode === 'custom'}
                              maxLength={30}
                            />
                          </View>
                        </View>

                        <View style={cc.panelIconHint}>
                          <Ionicons name="information-circle-outline" size={14} color={theme.textMuted} />
                          <Text style={cc.panelIconHintText}>
                            Toque no ícone para personalizar. Se não escolher, um ícone padrão será usado.
                          </Text>
                        </View>

                        {/* Picker de ícones com abas */}
                        {customCatIcon === '__picker__' && (
                          <View style={cc.iconPicker}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cc.iconTabsScroll} contentContainerStyle={cc.iconTabsContent}>
                              {ICON_GROUPS.map((group, i) => (
                                <TouchableOpacity
                                  key={group.label}
                                  style={[cc.iconTab, activeIconGroup === i && cc.iconTabActive]}
                                  onPress={() => setActiveIconGroup(i)}
                                  activeOpacity={0.75}
                                >
                                  <Text style={[cc.iconTabText, activeIconGroup === i && cc.iconTabTextActive]}>
                                    {group.label}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                            <View style={cc.iconGrid}>
                              {ICON_GROUPS[activeIconGroup].icons.map(icon => (
                                <TouchableOpacity
                                  key={icon}
                                  style={cc.iconOpt}
                                  onPress={() => setCustomCatIcon(icon)}
                                  activeOpacity={0.75}
                                >
                                  <Ionicons name={icon} size={20} color={theme.textSecondary} />
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>

                      <View style={cc.actions}>
                        <TouchableOpacity
                          style={cc.btnCancel}
                          onPress={() => {
                            setCustomCatExpanded(false);
                            setCustomCatName('');
                            setCustomCatIcon(null);
                            setCreateCatModal(p => ({ ...p, visible: false }));
                          }}
                        >
                          <Text style={cc.btnCancelTxt}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[cc.btnSave, !customCatName.trim() && cc.btnDisabled]}
                          disabled={!customCatName.trim()}
                          onPress={() => handleCreateCategory(createCatModal.pendingDeckIds)}
                        >
                          <Text style={cc.btnSaveTxt}>Criar e mover</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>


      {/* ── Modal Renomear ── */}
      <Modal
        transparent
        animationType="fade"
        visible={renameModal.visible}
        onRequestClose={() => setRenameModal(p => ({ ...p, visible: false }))}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={() => setRenameModal(p => ({ ...p, visible: false }))}>
            <View style={rm.overlay}>
              <TouchableWithoutFeedback>
                <View style={rm.card}>
                  <Text style={rm.title}>Renomear {renameModal.type === 'deck' ? 'deck' : 'matéria'}</Text>
                  <TextInput
                    style={rm.input}
                    value={renameModal.text}
                    onChangeText={t => setRenameModal(p => ({ ...p, text: t }))}
                    placeholder="Novo nome"
                    placeholderTextColor={theme.textMuted}
                    autoFocus
                    selectTextOnFocus
                    maxLength={50}
                  />
                  <View style={rm.actions}>
                    <TouchableOpacity style={rm.btnCancel} onPress={() => setRenameModal(p => ({ ...p, visible: false }))}>
                      <Text style={rm.btnCancelTxt}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[rm.btnSave, !renameModal.text.trim() && rm.btnDisabled]}
                      disabled={!renameModal.text.trim()}
                      onPress={handleRename}
                    >
                      <Text style={rm.btnSaveTxt}>Salvar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

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

// =================================================================
// Estilos
// =================================================================

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { paddingHorizontal: GRID_PADDING, paddingTop: 12, paddingBottom: 32 },
  gridRow: { flexDirection: 'row', gap: GRID_GAP, marginBottom: GRID_GAP },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: theme.textMuted, fontSize: 14, fontFamily: theme.fontFamily.ui },
  selectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: theme.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.backgroundTertiary,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  selectBarBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  selectBarBtnTxt: { fontFamily: theme.fontFamily.uiMedium, fontSize: 13, color: theme.textSecondary },
});

// Header
const hdr = StyleSheet.create({
  wrapper: { backgroundColor: theme.background },
  row: { height: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  title: { color: theme.textPrimary, fontSize: 17, fontFamily: theme.fontFamily.headingSemiBold, flex: 1, textAlign: 'center' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: theme.backgroundSecondary, marginHorizontal: 0 },
});

// Tabs
const tb = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: GRID_PADDING,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.backgroundSecondary,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    backgroundColor: theme.backgroundSecondary,
  },
  tabActive: { backgroundColor: theme.primary },
  label: { fontFamily: theme.fontFamily.uiMedium, fontSize: 13, color: theme.textMuted },
  labelActive: { color: theme.background, fontFamily: theme.fontFamily.uiSemiBold },
  badge: {
    backgroundColor: theme.backgroundTertiary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeActive: { backgroundColor: theme.background + '40' },
  badgeText: { fontSize: 11, color: theme.textMuted, fontFamily: theme.fontFamily.uiSemiBold },
  badgeTextActive: { color: theme.background },
});

// Context menu
const ctx = StyleSheet.create({
  overlay: { flex: 1 },
  menu: {
    position: 'absolute',
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.backgroundTertiary,
    width: 190,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  itemText: { fontFamily: theme.fontFamily.uiMedium, fontSize: 14, color: theme.textPrimary },
  sep: { height: 1, backgroundColor: theme.backgroundTertiary },
});

// Move modal
const mv = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: theme.backgroundSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.backgroundTertiary, alignSelf: 'center', marginBottom: 16 },
  title: { fontFamily: theme.fontFamily.headingSemiBold, fontSize: 17, color: theme.textPrimary, marginBottom: 4 },
  sub: { fontFamily: theme.fontFamily.ui, fontSize: 13, color: theme.textMuted, marginBottom: 16 },
  createOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 4,
  },
  createIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: theme.primaryTransparent,
    alignItems: 'center', justifyContent: 'center',
  },
  createLabel: { fontFamily: theme.fontFamily.uiSemiBold, fontSize: 15, color: theme.primary },
  separator: { height: 1, backgroundColor: theme.backgroundTertiary, marginVertical: 8 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 4,
  },
  iconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: theme.backgroundTertiary, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { flex: 1, fontFamily: theme.fontFamily.uiMedium, fontSize: 15, color: theme.textPrimary },
});

// Create category modal
const cc = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 24 },
  card: { backgroundColor: theme.backgroundSecondary, borderRadius: 16, padding: 20, gap: 12 },
  title: { fontFamily: theme.fontFamily.headingSemiBold, fontSize: 18, color: theme.textPrimary },
  sub: { fontFamily: theme.fontFamily.ui, fontSize: 13, color: theme.textMuted, marginBottom: 8 },
  // Tabs preset / custom
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.backgroundTertiary,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: theme.primary },
  tabBtnTxt: { fontFamily: theme.fontFamily.uiMedium, fontSize: 13, color: theme.textMuted },
  tabBtnTxtActive: { color: theme.background, fontFamily: theme.fontFamily.uiSemiBold },
  // Empty preset state
  emptyPreset: { paddingVertical: 24, alignItems: 'center' },
  emptyPresetTxt: { fontFamily: theme.fontFamily.ui, fontSize: 13, color: theme.textMuted, textAlign: 'center' },
  // Input
  input: {
    backgroundColor: theme.background, borderRadius: 10,
    borderWidth: 1, borderColor: theme.backgroundTertiary,
    paddingHorizontal: 14, paddingVertical: 12,
    color: theme.textPrimary, fontFamily: theme.fontFamily.ui, fontSize: 15,
    marginBottom: 8,
  },
  iconLabel: { fontFamily: theme.fontFamily.uiMedium, fontSize: 13, color: theme.textMuted, marginBottom: 6 },
  
  // Custom Create Panel Styles
  customPanelWrap: { gap: 12 },
  panelInner: { backgroundColor: theme.background, borderRadius: 12, borderWidth: 1, borderColor: theme.backgroundTertiary, overflow: 'hidden' },
  panelRow: { flexDirection: 'row', alignItems: 'center' },
  panelIconBtn: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: theme.backgroundTertiary },
  panelInputWrap: { flex: 1, paddingHorizontal: 12 },
  panelInput: { flex: 1, color: theme.textPrimary, fontFamily: theme.fontFamily.ui, fontSize: 15, paddingVertical: 14 },
  panelIconHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 12 },
  panelIconHintText: { flex: 1, fontFamily: theme.fontFamily.ui, fontSize: 12, color: theme.textMuted },
  iconPicker: { borderTopWidth: 1, borderTopColor: theme.backgroundTertiary, backgroundColor: theme.backgroundSecondary },
  iconTabsScroll: { borderBottomWidth: 1, borderBottomColor: theme.backgroundTertiary },
  iconTabsContent: { paddingHorizontal: 4 },
  iconTab: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  iconTabActive: { borderBottomColor: theme.primary },
  iconTabText: { fontFamily: theme.fontFamily.uiMedium, fontSize: 12, color: theme.textMuted },
  iconTabTextActive: { color: theme.primary },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 8, justifyContent: 'center' },
  iconOpt: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  
  actions: { flexDirection: 'row', gap: 10 },
  btnCancel: {
    flex: 1, borderRadius: 10, paddingVertical: 12,
    borderWidth: 1, borderColor: theme.backgroundTertiary,
    alignItems: 'center',
  },
  btnCancelTxt: { color: theme.textSecondary, fontFamily: theme.fontFamily.uiMedium, fontSize: 14 },
  btnSave: { flex: 1, borderRadius: 10, paddingVertical: 12, backgroundColor: theme.primary, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnSaveTxt: { color: theme.background, fontFamily: theme.fontFamily.uiSemiBold, fontSize: 14 },
});

// Rename modal
const rm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 24 },
  card: { backgroundColor: theme.backgroundSecondary, borderRadius: 16, padding: 20, gap: 14 },
  title: { fontFamily: theme.fontFamily.headingSemiBold, fontSize: 17, color: theme.textPrimary },
  input: {
    backgroundColor: theme.background, borderRadius: 10,
    borderWidth: 1, borderColor: theme.backgroundTertiary,
    paddingHorizontal: 14, paddingVertical: 12,
    color: theme.textPrimary, fontFamily: theme.fontFamily.ui, fontSize: 15,
  },
  actions: { flexDirection: 'row', gap: 10 },
  btnCancel: {
    flex: 1, borderRadius: 10, paddingVertical: 12,
    borderWidth: 1, borderColor: theme.backgroundTertiary, alignItems: 'center',
  },
  btnCancelTxt: { color: theme.textSecondary, fontFamily: theme.fontFamily.uiMedium, fontSize: 14 },
  btnSave: { flex: 1, borderRadius: 10, paddingVertical: 12, backgroundColor: theme.primary, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnSaveTxt: { color: theme.background, fontFamily: theme.fontFamily.uiSemiBold, fontSize: 14 },
});

export default CategoryDetailScreen;
