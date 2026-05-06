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
  StatusBar, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';

// Hook para animar overlay (fade) independente do sheet (slide) em modais bottom-sheet
function useSlideModal(visible, sheetHeight = SH * 0.5) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(sheetHeight)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]).start();
    } else {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(sheetHeight);
    }
  }, [visible]);

  const animateOut = useCallback((cb) => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: sheetHeight, duration: 260, useNativeDriver: true }),
    ]).start(cb);
  }, []);

  return { overlayOpacity, sheetTranslateY, animateOut };
}
import { BottomSheet } from '../components/ui/BottomSheet';
import { EditCategoryModal } from '../components/ui/EditCategoryModal';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import { ScrollView as RNGHScrollView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { getAppData, saveAppData, removePurchasedDeck, getUsedCategoryIds } from '../services/storage';
import { NativeKeyboardAvoidingContainer } from '../native/NativeKeyboardAvoidingContainer';
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
import { GlowFab } from '../components/ui/GlowFab';
import {
  administrativoIcon, educacaoIcon, fiscalIcon, justicaIcon,
  militarIcon, operacionalIcon, saudeIcon, segurancaIcon,
} from '../assets/svgIconPaths';

const { width, height: SH } = Dimensions.get('window');

const SORT_OPTIONS = [
  { key: 'az', label: 'A–Z', icon: 'arrow-up-outline' },
  { key: 'za', label: 'Z–A', icon: 'arrow-down-outline' },
  { key: 'more', label: 'Mais matérias', icon: 'layers-outline' },
  { key: 'less', label: 'Menos matérias', icon: 'layers-outline' },
];
const SORT_LABELS = Object.fromEntries(SORT_OPTIONS.map(o => [o.key, o.label]));

const SUBJECT_SORT_OPTIONS = [
  { key: 'az', label: 'A–Z', icon: 'arrow-up-outline' },
  { key: 'za', label: 'Z–A', icon: 'arrow-down-outline' },
  { key: 'more', label: 'Mais cards', icon: 'layers-outline' },
  { key: 'less', label: 'Menos cards', icon: 'layers-outline' },
];
const SUBJECT_SORT_LABELS = Object.fromEntries(SUBJECT_SORT_OPTIONS.map(o => [o.key, o.label]));
const GRID_PADDING = 16;
const GRID_GAP = 10;
const CARD_MARGIN = 6;
const CARDS_PER_ROW = 2; // Forçando a grade (layout do Notion) com 2 colunas

// Componente para resolver delay de digitação em modals grandes (desacopla re-render)
const LocalTextInput = React.forwardRef(({ value, onChangeText, ...props }, ref) => {
  const [text, setText] = React.useState(value);
  const internalRef = React.useRef(null);
  const resolvedRef = ref || internalRef;
  React.useEffect(() => {
    if (value === '') setText('');
  }, [value]);
  return (
    <TextInput
      ref={resolvedRef}
      {...props}
      value={text}
      onChangeText={(v) => {
        setText(v);
        onChangeText(v);
      }}
    />
  );
});

const CARD_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP) / 2;
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.25);
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

// ─────────────────────────────────────────────
// Ícones SVG por categoria (mesmos do AddDeckScreen)
// ─────────────────────────────────────────────
const CATEGORY_SVG_ICONS = {
  administrativo: administrativoIcon,
  educacao: educacaoIcon,
  fiscal: fiscalIcon,
  justica: justicaIcon,
  militar: militarIcon,
  operacional: operacionalIcon,
  saude: saudeIcon,
  seguranca: segurancaIcon,
};

/** Ícone com glow verde para listas (usando Skia, igual ao home screen) */
const CategoryIconGlow = ({ categoryId, ionIcon, size = 22 }) => {
  if (ionIcon) return <Ionicons name={ionIcon} size={size} color={theme.primary} />;
  const iconData = CATEGORY_SVG_ICONS[categoryId];
  if (!iconData) return <Ionicons name="folder-outline" size={size} color={theme.primary} />;
  return <GlowIcon iconData={iconData} size={size} color={theme.primary} glowBlur={5} />;
};

// Dados pro grid de categorias (igual ao AddDeckScreen)
const PRESET_CATEGORIES = [
  { id: 'seguranca', name: 'Segurança Pública', icon: segurancaIcon },
  { id: 'justica', name: 'Justiça \u0026 Direito', icon: justicaIcon },
  { id: 'administrativo', name: 'Administrativo', icon: administrativoIcon },
  { id: 'fiscal', name: 'Fiscal \u0026 Controle', icon: fiscalIcon },
  { id: 'operacional', name: 'Operacional \u0026 Logística', icon: operacionalIcon },
  { id: 'saude', name: 'Saúde', icon: saudeIcon },
  { id: 'educacao', name: 'Educação', icon: educacaoIcon },
  { id: 'militar', name: 'Militar', icon: militarIcon },
];

const ICON_GROUPS = [
  { label: 'Estudo', icons: ['book-outline', 'school-outline', 'document-text-outline', 'library-outline', 'pencil-outline', 'calculator-outline', 'flask-outline', 'language-outline', 'reader-outline', 'journal-outline', 'clipboard-outline', 'easel-outline'] },
  { label: 'Objetivo', icons: ['trophy-outline', 'star-outline', 'ribbon-outline', 'flag-outline', 'podium-outline', 'rocket-outline', 'diamond-outline', 'sparkles-outline', 'medal-outline', 'trending-up-outline', 'flame-outline', 'compass-outline'] },
  { label: 'Organização', icons: ['calendar-outline', 'checkmark-circle-outline', 'time-outline', 'people-outline', 'list-outline', 'albums-outline', 'folder-outline', 'bookmark-outline', 'filing-outline', 'grid-outline', 'layers-outline', 'filter-outline'] },
  { label: 'Concurso', icons: ['shield-outline', 'briefcase-outline', 'globe-outline', 'megaphone-outline', 'newspaper-outline', 'scale-outline', 'build-outline', 'id-card-outline', 'document-outline', 'people-circle-outline', 'chatbubbles-outline', 'pie-chart-outline'] },
  { label: 'Outros', icons: ['medkit-outline', 'cash-outline', 'hammer-outline', 'stats-chart-outline', 'heart-outline', 'bus-outline', 'car-outline', 'home-outline', 'leaf-outline', 'nutrition-outline', 'fitness-outline', 'bicycle-outline'] },
];

// ─────────────────────────────────────────────
// Header da tela
// ─────────────────────────────────────────────
const CatHeader = ({ category, insetTop, onBack, selectedCount, selectMode, onCancelSelect, onCategoryMenu }) => (
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

      {/* Botão de opções da categoria */}
      {!selectMode ? (
        <TouchableOpacity onPress={onCategoryMenu} style={hdr.iconBtn} hitSlop={HIT_SLOP}>
          <Ionicons name="ellipsis-vertical" size={22} color={theme.textSecondary} />
        </TouchableOpacity>
      ) : (
        <View style={hdr.iconBtn} />
      )}
    </View>
    <View style={hdr.divider} />
  </View>
);

// ─────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────
const TabBar = ({
  activeTab, onTabChange, deckCount, subjectCount,
  sortOrder, subjectSortOrder, sortBtnRef, subjectSortBtnRef,
  onSortPress, onSubjectSortPress, SORT_LABELS, SUBJECT_SORT_LABELS,
}) => (
  <View style={tb.wrapper}>
    <View style={tb.container}>
      {[
        { key: 'decks', label: 'Decks', count: deckCount },
        { key: 'materias', label: 'Matérias', count: subjectCount },
      ].map(tab => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[tb.tab, active && tb.tabActive]}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[tb.label, active && tb.labelActive]}>
              {tab.label}
            </Text>
            <View style={[tb.badge, active && tb.badgeActive]}>
              <Text style={[tb.badgeText, active && tb.badgeTextActive]}>
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>

    {/* Linha separadora com botão Ordenar */}
    {activeTab === 'decks' && deckCount >= 2 && (
      <View style={tb.sortRow}>
        <View style={tb.sortLine} />
        <TouchableOpacity
          ref={sortBtnRef}
          style={[tb.sortBtn, sortOrder && tb.sortBtnActive]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={onSortPress}
          activeOpacity={0.75}
        >
          <Ionicons name="swap-vertical-outline" size={13} color={sortOrder ? theme.primary : theme.textMuted} />
          <Text style={[tb.sortBtnTxt, sortOrder && tb.sortBtnTxtActive]}>
            {sortOrder ? SORT_LABELS[sortOrder] : 'Ordenar'}
          </Text>
        </TouchableOpacity>
        <View style={[tb.sortLine, { width: 24 }]} />
      </View>
    )}
    {activeTab === 'materias' && subjectCount >= 2 && (
      <View style={tb.sortRow}>
        <View style={tb.sortLine} />
        <TouchableOpacity
          ref={subjectSortBtnRef}
          style={[tb.sortBtn, subjectSortOrder && tb.sortBtnActive]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={onSubjectSortPress}
          activeOpacity={0.75}
        >
          <Ionicons name="swap-vertical-outline" size={13} color={subjectSortOrder ? theme.primary : theme.textMuted} />
          <Text style={[tb.sortBtnTxt, subjectSortOrder && tb.sortBtnTxtActive]}>
            {subjectSortOrder ? SUBJECT_SORT_LABELS[subjectSortOrder] : 'Ordenar'}
          </Text>
        </TouchableOpacity>
        <View style={[tb.sortLine, { width: 24 }]} />
      </View>
    )}
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
  const [moveFilter, setMoveFilter] = useState('all'); // 'all' | 'preset' | 'custom'
  const [renameModal, setRenameModal] = useState({ visible: false, type: '', item: null, text: '' });
  // createCatModal: mode='preset'|'custom'
  const [createCatModal, setCreateCatModal] = useState({ visible: false, mode: 'preset', name: '', icon: 'folder-outline', pendingDeckIds: [] });
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });
  // Categorias efetivamente existentes (carregadas do storage)
  const [usedCategoryIds, setUsedCategoryIds] = useState(new Set());
  // Ordenação
  const [sortOrder, setSortOrder] = useState(null);
  const [subjectSortOrder, setSubjectSortOrder] = useState(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [subjectSortMenuOpen, setSubjectSortMenuOpen] = useState(false);
  const [sortMenuPos, setSortMenuPos] = useState({ x: 0, y: 0, w: 0 });
  const [subjectSortMenuPos, setSubjectSortMenuPos] = useState({ x: 0, y: 0, w: 0 });
  const sortBtnRef = useRef(null);
  const subjectSortBtnRef = useRef(null);
  // Menu de opções da categoria (header)
  const [catMenuVisible, setCatMenuVisible] = useState(false);

  // Animações de slide+fade para modais bottom-sheet
  const moveModalAnim = useSlideModal(moveModal?.visible, SH * 0.6);
  const deleteCatModalAnim = useSlideModal(deleteCatModal?.visible, SH * 0.4);
  const moveBeforeDeleteModalAnim = useSlideModal(moveBeforeDeleteModal?.visible, SH * 0.6);
  const createCatModalAnim = useSlideModal(createCatModal?.visible, SH * 0.4);
  // Modal editar categoria
  const [editCatModal, setEditCatModal] = useState({
    visible: false,
    selectedPresetId: null,
    customName: '',
    customIcon: null,   // null = sem ícone, '__picker__' = picker aberto, string = ícone selecionado
    activeIconGroup: 0,
  });

  const editScrollRef = useRef(null);
  const editTextInputRef = useRef(null);
  // Modal excluir categoria
  const [deleteCatModal, setDeleteCatModal] = useState({ visible: false });
  // Sub-modal para mover decks ao excluir categoria
  const [moveBeforeDeleteModal, setMoveBeforeDeleteModal] = useState({ visible: false });



  // Categoria atual
  const category = useMemo(() =>
    allCategories.find(c => c.id === categoryId) || { id: categoryId, name: categoryName, icon: categoryIcon || 'folder-outline', color: theme.primary },
    [allCategories, categoryId, categoryName, categoryIcon]
  );



  const loadData = useCallback(async () => {
    const [allData, customCats, usedIds] = await Promise.all([
      getAppData(),
      getCustomCategories(),
      getUsedCategoryIds(),
    ]);
    const categoryDecks = allData.filter(d => !d.isExample && getDeckCatId(d) === categoryId);
    setDecks(categoryDecks);
    setAllCategories([...CONCURSO_CATEGORIES, ...customCats]);
    // Combina IDs do storage com IDs derivados dos decks existentes
    const derivedIds = new Set(usedIds);
    allData.filter(d => !d.isExample).forEach(d => {
      if (d.category) derivedIds.add(d.category);
    });
    customCats.forEach(c => derivedIds.add(c.id));
    setUsedCategoryIds(derivedIds);
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
        {
          text: 'Excluir', style: 'destructive', onPress: async () => {
            setAlertConfig(p => ({ ...p, visible: false }));
            const allData = await getAppData();
            await saveAppData(allData.filter(d => d.id !== deck.id));
            if (deck.isPurchased) await removePurchasedDeck(deck.id);
            loadData();
          }
        },
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
        {
          text: 'Excluir', style: 'destructive', onPress: async () => {
            setAlertConfig(p => ({ ...p, visible: false }));
            const allData = await getAppData();
            const updated = allData.map(d => {
              if (d.id !== item.deck.id) return d;
              return { ...d, subjects: (d.subjects || []).filter(s => s.id !== item.subject.id) };
            });
            await saveAppData(updated);
            loadData();
          }
        },
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
        {
          text: 'Excluir', style: 'destructive', onPress: async () => {
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
          }
        },
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
      !usedCategoryIds.has(c.id) &&
      c.id !== 'personalizados'
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

  // ── Editar categoria ────────────────────────
  const closeEditCatModal = useCallback(() => {
    setEditCatModal({ visible: false, selectedPresetId: null, customName: '', customIcon: null, activeIconGroup: 0 });
  }, []);



  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (editCatModal.visible) {
          closeEditCatModal();
          return true;
        }
        return false;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [editCatModal.visible, closeEditCatModal])
  );

  const handleEditCategorySubmit = async () => {
    const { selectedPresetId, customName, customIcon } = editCatModal;
    const DEFAULT_CAT_ICON = 'folder-outline';

    if (selectedPresetId) {
      // Mover todos os decks desta categoria para o preset escolhido
      const allData = await getAppData();
      const updated = allData.map(d =>
        getDeckCatId(d) === categoryId ? { ...d, category: selectedPresetId } : d
      );
      await saveAppData(updated);
      // Se for categoria custom, remover
      const customCats = await getCustomCategories();
      if (customCats.find(c => c.id === categoryId)) {
        await saveCustomCategories(customCats.filter(c => c.id !== categoryId));
      }
      closeEditCatModal();
      navigation.goBack();

    } else if (customName.trim()) {
      const resolvedIcon = customIcon && customIcon !== '__picker__' ? customIcon : DEFAULT_CAT_ICON;
      const customCats = await getCustomCategories();
      const isExistingCustom = customCats.find(c => c.id === categoryId);

      if (isExistingCustom) {
        await saveCustomCategories(customCats.map(c =>
          c.id === categoryId ? { ...c, name: customName.trim(), icon: resolvedIcon } : c
        ));
        closeEditCatModal();
        navigation.setParams({ categoryName: customName.trim() });
        loadData();
      } else {
        // Era preset — criar nova custom e mover decks
        const newId = `custom_${Date.now()}`;
        await saveCustomCategories([...customCats, {
          id: newId, name: customName.trim(), icon: resolvedIcon,
          color: theme.primary, keywords: [], isCustom: true,
        }]);
        const allData = await getAppData();
        await saveAppData(allData.map(d =>
          getDeckCatId(d) === categoryId ? { ...d, category: newId } : d
        ));
        closeEditCatModal();
        navigation.goBack();
      }
    }
  };

  // ── Excluir categoria ───────────────────────
  const handleDeleteCategoryAll = async () => {
    setDeleteCatModal({ visible: false });
    const allData = await getAppData();
    const deckIds = decks.map(d => d.id);
    await saveAppData(allData.filter(d => !deckIds.includes(d.id)));
    // Remove custom cat se for custom
    const customCats = await getCustomCategories();
    const isCustom = customCats.find(c => c.id === categoryId);
    if (isCustom) {
      await saveCustomCategories(customCats.filter(c => c.id !== categoryId));
    }
    navigation.goBack();
  };

  // ── Sort ─────────────────────────────────────
  const sortedDecks = useMemo(() => {
    if (!sortOrder) return decks;
    const copy = [...decks];
    switch (sortOrder) {
      case 'az': return copy.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt'));
      case 'za': return copy.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'pt'));
      case 'more': return copy.sort((a, b) => (b.subjects?.length || 0) - (a.subjects?.length || 0));
      case 'less': return copy.sort((a, b) => (a.subjects?.length || 0) - (b.subjects?.length || 0));
      default: return copy;
    }
  }, [decks, sortOrder]);

  const sortedSubjects = useMemo(() => {
    if (!subjectSortOrder) return allSubjects;
    const copy = [...allSubjects];
    switch (subjectSortOrder) {
      case 'az': return copy.sort((a, b) => (a.subject.name || '').localeCompare(b.subject.name || '', 'pt'));
      case 'za': return copy.sort((a, b) => (b.subject.name || '').localeCompare(a.subject.name || '', 'pt'));
      case 'more': return copy.sort((a, b) => (b.subject.flashcards?.length || 0) - (a.subject.flashcards?.length || 0));
      case 'less': return copy.sort((a, b) => (a.subject.flashcards?.length || 0) - (b.subject.flashcards?.length || 0));
      default: return copy;
    }
  }, [allSubjects, subjectSortOrder]);

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
        onCategoryMenu={() => setCatMenuVisible(true)}
      />

      {/* Tabs */}
      <TabBar
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); clearSelection(); setSortMenuOpen(false); setSubjectSortMenuOpen(false); }}
        deckCount={decks.length}
        subjectCount={allSubjects.length}
        sortOrder={sortOrder}
        subjectSortOrder={subjectSortOrder}
        sortBtnRef={sortBtnRef}
        subjectSortBtnRef={subjectSortBtnRef}
        SORT_LABELS={SORT_LABELS}
        SUBJECT_SORT_LABELS={SUBJECT_SORT_LABELS}
        onSortPress={() => {
          sortBtnRef.current?.measureInWindow((x, y, bw, bh) => {
            const sbH = StatusBar.currentHeight || 0;
            setSortMenuPos({ x, y: y + bh + sbH, w: bw });
            setSortMenuOpen(true);
          });
        }}
        onSubjectSortPress={() => {
          subjectSortBtnRef.current?.measureInWindow((x, y, bw, bh) => {
            const sbH = StatusBar.currentHeight || 0;
            setSubjectSortMenuPos({ x, y: y + bh + sbH, w: bw });
            setSubjectSortMenuOpen(true);
          });
        }}
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
              onPress={() => { setMoveModal({ visible: true, deckIds: [...selectedIds] }); setMoveFilter('all'); }}
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
              items={sortedDecks}
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
              items={sortedSubjects}
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
                        preloadedCards: item.subject.flashcards || [],
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

      {/* ── FAB: adicionar deck nesta categoria ── */}
      {!selectMode && activeTab === 'decks' && (
        <View style={[s.fabPos, { bottom: 20 }]}>
          <GlowFab
            onPress={() => navigation.navigate('AddDeck', { preselectedCategoryId: categoryId })}
            color={theme.primary}
          >
            <Ionicons name="add" size={26} color={theme.background} />
          </GlowFab>
        </View>
      )}

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
                          setMoveFilter('all');
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
        animationType="none"
        visible={moveModal.visible}
        onRequestClose={() => moveModalAnim.animateOut(() => setMoveModal({ visible: false, deckIds: [] }))}
      >
        <TouchableWithoutFeedback onPress={() => moveModalAnim.animateOut(() => setMoveModal({ visible: false, deckIds: [] }))}>
          <Animated.View style={[mv.overlay, { opacity: moveModalAnim.overlayOpacity }]}>
            <TouchableWithoutFeedback>
              <Animated.View style={[mv.sheet, { transform: [{ translateY: moveModalAnim.sheetTranslateY }] }]}>
                <View style={mv.handle} />

                {/* Header */}
                <View style={mv.header}>
                  <View style={mv.headerIconWrap}>
                    <CategoryIconGlow
                      categoryId={categoryId}
                      ionIcon={category?.isCustom ? (category.icon || null) : null}
                      size={18}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={mv.title}>Mover para categoria</Text>
                    <Text style={mv.sub} numberOfLines={1}>
                      {moveModal.deckIds.length} deck{moveModal.deckIds.length !== 1 ? 's' : ''} de <Text style={mv.subBold}>{categoryName}</Text>
                    </Text>
                  </View>
                </View>

                <View style={mv.divider} />

                {/* Filtros */}
                <View style={mv.filterRow}>
                  {[{ key: 'all', label: 'Todas' }, { key: 'preset', label: 'Padrão' }, { key: 'custom', label: 'Personalizada' }].map(f => (
                    <TouchableOpacity
                      key={f.key}
                      style={[mv.filterBtn, moveFilter === f.key && mv.filterBtnActive]}
                      onPress={() => setMoveFilter(f.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[mv.filterTxt, moveFilter === f.key && mv.filterTxtActive]}>{f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Lista */}
                <ScrollView
                  style={mv.listScroll}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={mv.listContent}
                >
                  {allCategories
                    .filter(c => {
                      if (c.id === categoryId || c.id === 'personalizados') return false;
                      if (!usedCategoryIds.has(c.id) && !c.isCustom) return false;
                      if (moveFilter === 'preset') return !c.isCustom;
                      if (moveFilter === 'custom') return !!c.isCustom;
                      return true;
                    })
                    .map((cat, index, arr) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[mv.option, index === arr.length - 1 && { borderBottomWidth: 0 }]}
                        onPress={() => handleMoveDecks(cat.id)}
                        activeOpacity={0.75}
                      >
                        <View style={mv.iconWrap}>
                          <CategoryIconGlow categoryId={cat.id} ionIcon={cat.isCustom ? (cat.icon || null) : null} size={20} />
                        </View>
                        <Text style={mv.optionLabel} numberOfLines={1}>{cat.name}</Text>
                        <Ionicons name="chevron-forward" size={15} color={theme.textMuted} />
                      </TouchableOpacity>
                    ))
                  }
                  {allCategories.filter(c => {
                    if (c.id === categoryId || c.id === 'personalizados') return false;
                    if (!usedCategoryIds.has(c.id) && !c.isCustom) return false;
                    if (moveFilter === 'preset') return !c.isCustom;
                    if (moveFilter === 'custom') return !!c.isCustom;
                    return true;
                  }).length === 0 && (
                    <View style={mv.empty}>
                      <Ionicons name="folder-open-outline" size={22} color={theme.textMuted} />
                      <Text style={mv.emptyTxt}>Nenhuma categoria disponível.</Text>
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Modal Nova Categoria ── */}
      <Modal
        transparent
        animationType="none"
        visible={createCatModal.visible}
        onRequestClose={() => createCatModalAnim.animateOut(() => setCreateCatModal(p => ({ ...p, visible: false })))}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={() => createCatModalAnim.animateOut(() => setCreateCatModal(p => ({ ...p, visible: false })))}>
            <Animated.View style={[mv.overlay, { opacity: createCatModalAnim.overlayOpacity }]}>
              <TouchableWithoutFeedback>
                <Animated.View style={[mv.sheet, { transform: [{ translateY: createCatModalAnim.sheetTranslateY }] }]}>
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
                            createCatModalAnim.animateOut(() => setCreateCatModal(p => ({ ...p, visible: false })));
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
                </Animated.View>
              </TouchableWithoutFeedback>
            </Animated.View>
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

      {/* ── Menu de opções da categoria (header) ── */}
      {catMenuVisible && (
        <Modal transparent animationType="fade" visible onRequestClose={() => setCatMenuVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setCatMenuVisible(false)}>
            <View style={catm.overlay}>
              <TouchableWithoutFeedback>
                <View style={[catm.menu, { top: insets.top + 58 }]}>
                  <TouchableOpacity
                    style={catm.item}
                    onPress={() => {
                      setCatMenuVisible(false);
                      setTimeout(() => {
                        setEditCatModal(p => ({ ...p, visible: true }));
                      }, 50);
                    }}
                  >
                    <Ionicons name="create-outline" size={17} color={theme.textPrimary} />
                    <Text style={catm.itemText}>Editar</Text>
                  </TouchableOpacity>
                  <View style={catm.sep} />
                  <TouchableOpacity
                    style={catm.item}
                    onPress={() => {
                      setCatMenuVisible(false);
                      setTimeout(() => setDeleteCatModal({ visible: true }), 50);
                    }}
                  >
                    <Ionicons name="trash-outline" size={17} color={theme.danger} />
                    <Text style={[catm.itemText, { color: theme.danger }]}>Excluir categoria</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* ── Modal Excluir Categoria ── */}
      <Modal
        transparent
        animationType="none"
        visible={deleteCatModal.visible}
        onRequestClose={() => deleteCatModalAnim.animateOut(() => setDeleteCatModal({ visible: false }))}
      >
        <TouchableWithoutFeedback onPress={() => deleteCatModalAnim.animateOut(() => setDeleteCatModal({ visible: false }))}>
          <Animated.View style={[mv.overlay, { opacity: deleteCatModalAnim.overlayOpacity }]}>
            <TouchableWithoutFeedback>
              <Animated.View style={[mv.sheet, { transform: [{ translateY: deleteCatModalAnim.sheetTranslateY }] }]}>
                <View style={mv.handle} />
                <Text style={mv.title}>Excluir "{category?.name}"?</Text>
                <Text style={mv.sub}>Esta categoria tem {decks.length} deck{decks.length !== 1 ? 's' : ''}. O que deseja fazer?</Text>

                {/* Opção 1: mover antes */}
                {decks.length > 0 && (
                  <TouchableOpacity
                    style={mv.option}
                    onPress={() => {
                      setDeleteCatModal({ visible: false });
                      setTimeout(() => setMoveBeforeDeleteModal({ visible: true }), 50);
                    }}
                  >
                    <View style={mv.iconWrap}>
                      <Ionicons name="swap-horizontal-outline" size={20} color={theme.primary} />
                    </View>
                    <Text style={[mv.optionLabel, { color: theme.primary }]}>Mover decks para outra categoria</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.primary} />
                  </TouchableOpacity>
                )}

                <View style={mv.separator} />

                {/* Opção 2: excluir tudo */}
                <TouchableOpacity
                  style={mv.option}
                  onPress={handleDeleteCategoryAll}
                >
                  <View style={[mv.iconWrap, { backgroundColor: theme.danger + '22' }]}>
                    <Ionicons name="trash-outline" size={20} color={theme.danger} />
                  </View>
                  <Text style={[mv.optionLabel, { color: theme.danger }]}>Excluir tudo (decks e matérias)</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.danger} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[mv.option, { justifyContent: 'center', marginTop: 8 }]}
                  onPress={() => deleteCatModalAnim.animateOut(() => setDeleteCatModal({ visible: false }))}
                >
                  <Text style={{ color: theme.textMuted, fontFamily: theme.fontFamily.uiMedium, fontSize: 14 }}>Cancelar</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Modal Mover antes de Excluir ── */}
      <Modal
        transparent
        animationType="none"
        visible={moveBeforeDeleteModal.visible}
        onRequestClose={() => moveBeforeDeleteModalAnim.animateOut(() => setMoveBeforeDeleteModal({ visible: false }))}
      >
        <TouchableWithoutFeedback onPress={() => moveBeforeDeleteModalAnim.animateOut(() => setMoveBeforeDeleteModal({ visible: false }))}>
          <Animated.View style={[mv.overlay, { opacity: moveBeforeDeleteModalAnim.overlayOpacity }]}>
            <TouchableWithoutFeedback>
              <Animated.View style={[mv.sheet, { transform: [{ translateY: moveBeforeDeleteModalAnim.sheetTranslateY }] }]}>
                <View style={mv.handle} />
                <Text style={mv.title}>Mover decks para...</Text>
                <Text style={mv.sub}>Os {decks.length} deck{decks.length !== 1 ? 's' : ''} serão movidos e a categoria será excluída.</Text>
                <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                  {allCategories
                    .filter(c => c.id !== categoryId && c.id !== 'personalizados' && (usedCategoryIds.has(c.id) || c.isCustom))
                    .map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={mv.option}
                        onPress={async () => {
                          setMoveBeforeDeleteModal({ visible: false });
                          const deckIds = decks.map(d => d.id);
                          const allData = await getAppData();
                          const updated = allData.map(d =>
                            deckIds.includes(d.id) ? { ...d, category: cat.id } : d
                          );
                          await saveAppData(updated);
                          const customCats = await getCustomCategories();
                          const isCustom = customCats.find(c => c.id === categoryId);
                          if (isCustom) {
                            await saveCustomCategories(customCats.filter(c => c.id !== categoryId));
                          }
                          navigation.goBack();
                        }}
                      >
                        <View style={mv.iconWrap}>
                          <CategoryIconGlow categoryId={cat.id} size={20} />
                        </View>
                        <Text style={mv.optionLabel}>{cat.name}</Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                      </TouchableOpacity>
                    ))
                  }
                  {categoryId !== 'personalizados' && usedCategoryIds.has('personalizados') && (
                    <TouchableOpacity
                      style={mv.option}
                      onPress={async () => {
                        setMoveBeforeDeleteModal({ visible: false });
                        const deckIds = decks.map(d => d.id);
                        const allData = await getAppData();
                        const updated = allData.map(d =>
                          deckIds.includes(d.id) ? { ...d, category: 'personalizados' } : d
                        );
                        await saveAppData(updated);
                        const customCats = await getCustomCategories();
                        const isCustom = customCats.find(c => c.id === categoryId);
                        if (isCustom) {
                          await saveCustomCategories(customCats.filter(c => c.id !== categoryId));
                        }
                        navigation.goBack();
                      }}
                    >
                      <View style={mv.iconWrap}>
                        <Ionicons name="albums-outline" size={20} color={theme.textMuted} />
                      </View>
                      <Text style={mv.optionLabel}>Meus estudos</Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* BottomSheet de edição migrado para EditCategoryScreen */}
      <BottomSheet
        visible={false}
        snapPoint="90%"
        onDismiss={closeEditCatModal}
        scrollRef={editScrollRef}
      >
          <Text style={[mv.title, { marginBottom: 16, marginTop: 4, paddingHorizontal: 20 }]}>Editar Categoria</Text>
          <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          {/* SEÇÃO 1 — Info atual (não editável) */}
          <View style={edit.currentInfo}>
            <View style={edit.currentIconWrap}>
              <CategoryIconGlow categoryId={categoryId} size={26} />
            </View>
            <Text style={edit.currentName}>{category?.name}</Text>
            <Text style={edit.currentTag}>atual</Text>
          </View>

          {/* SEÇÃO 2 — Categorias padrão disponíveis */}
          <View style={edit.sectionHeader}>
            <Text style={edit.sectionLabel}>CATEGORIAS DISPONÍVEIS</Text>
            {presetCategoriesAvailable.length > 0 && (
              <Text style={edit.sectionCount}>{presetCategoriesAvailable.length} categorias</Text>
            )}
          </View>
          {presetCategoriesAvailable.length === 0 ? (
            <View style={[edit.emptyPreset, { marginBottom: 20 }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.textMuted} />
              <Text style={edit.emptyPresetTxt}>Todas as categorias padrão já estão em uso.</Text>
            </View>
          ) : (
            <LinearGradient
              colors={['#1E2420', '#181818']}
              style={[edit.presetList, { marginBottom: 20 }]}
            >
              {presetCategoriesAvailable.map((cat, index) => {
                const isSelected = editCatModal.selectedPresetId === cat.id;
                const isLast = index === presetCategoriesAvailable.length - 1;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      edit.presetRowList,
                      isSelected && edit.presetRowListActive,
                      isLast && { borderBottomWidth: 0 }
                    ]}
                    onPress={() => setEditCatModal(p => ({
                      ...p,
                      selectedPresetId: p.selectedPresetId === cat.id ? null : cat.id,
                      customName: '',
                    }))}
                    activeOpacity={0.75}
                    delayPressIn={60}
                  >
                    <View style={[edit.presetIconWrapList, isSelected && edit.presetIconWrapListActive]}>
                      <CategoryIconGlow categoryId={cat.id} size={22} />
                    </View>
                    <Text style={[edit.presetRowNameList, isSelected && edit.presetRowNameListActive]} numberOfLines={1}>
                      {cat.name}
                    </Text>
                    {isSelected
                      ? <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                      : <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                    }
                  </TouchableOpacity>
                );
              })}
            </LinearGradient>
          )}

          <View style={edit.sectionHeader}>
            <Text style={edit.sectionLabel}>PERSONALIZADA</Text>
          </View>
          <View style={edit.customPanel}>
            <View style={edit.panelNameRow}>
              <TouchableOpacity
                style={[edit.panelIconPreview, editCatModal.customIcon && editCatModal.customIcon !== '__picker__' && edit.panelIconPreviewActive]}
                onPress={() => setEditCatModal(p => ({
                  ...p,
                  customIcon: p.customIcon === '__picker__' ? null : '__picker__',
                }))}
                activeOpacity={0.75}
                delayPressIn={60}
              >
                <Ionicons
                  name={editCatModal.customIcon && editCatModal.customIcon !== '__picker__'
                    ? editCatModal.customIcon : 'folder-outline'}
                  size={22}
                  color={editCatModal.customIcon && editCatModal.customIcon !== '__picker__'
                    ? theme.primary : theme.textMuted}
                />
              </TouchableOpacity>
              <View style={edit.panelInputWrap}>
                <TextInput
                  ref={editTextInputRef}
                  style={edit.panelInput}
                  value={editCatModal.customName}
                  onChangeText={t => setEditCatModal(p => ({ ...p, customName: t, selectedPresetId: null }))}
                  placeholder="Nome da categoria"
                  placeholderTextColor={theme.textMuted}
                  autoFocus={false}
                  maxLength={25}
                  onFocus={() => {}}
                />
                {editCatModal.customName.length > 0 && (
                  <Text style={[edit.charCount, editCatModal.customName.length >= 20 && edit.charCountWarn]}>
                    {editCatModal.customName.length}/25
                  </Text>
                )}
              </View>
            </View>
            <View style={edit.panelIconHint}>
              <Ionicons name="information-circle-outline" size={13} color={theme.textMuted} />
              <Text style={edit.panelIconHintText}>
                Toque no ícone para escolher. Sem escolha, será usado o ícone genérico.
              </Text>
            </View>
          </View>

          {editCatModal.customIcon === '__picker__' && (
            <View style={edit.iconPicker}>
              <RNGHScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={edit.iconTabsScroll}
                contentContainerStyle={edit.iconTabsContent}
                activeOffsetX={[-20, 20]}
              >
                {ICON_GROUPS.map((group, i) => (
                  <TouchableOpacity
                    key={group.label}
                    style={[edit.iconTab, editCatModal.activeIconGroup === i && edit.iconTabActive]}
                    onPress={() => setEditCatModal(p => ({ ...p, activeIconGroup: i }))}
                    activeOpacity={0.75}
                    delayPressIn={60}
                  >
                    <Text style={[edit.iconTabText, editCatModal.activeIconGroup === i && edit.iconTabTextActive]}>
                      {group.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </RNGHScrollView>
              <View style={edit.iconGrid}>
                {ICON_GROUPS[editCatModal.activeIconGroup].icons.map(ic => (
                  <TouchableOpacity
                    key={ic}
                    style={[edit.iconOpt, editCatModal.customIcon === ic && edit.iconOptSelected]}
                    onPress={() => setEditCatModal(p => ({ ...p, customIcon: ic }))}
                    activeOpacity={0.75}
                    delayPressIn={60}
                  >
                    <Ionicons name={ic} size={20} color={editCatModal.customIcon === ic ? theme.primary : theme.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Botão Salvar */}
          {(() => {
            const canSave = !!editCatModal.selectedPresetId || !!editCatModal.customName.trim();
            return (
              <TouchableOpacity
                style={[edit.saveBtn, !canSave && edit.saveBtnDisabled]}
                disabled={!canSave}
                onPress={handleEditCategorySubmit}
                activeOpacity={0.85}
                delayPressIn={60}
              >
                <Text style={[edit.saveBtnTxt, !canSave && edit.saveBtnTxtDisabled]}>Salvar</Text>
              </TouchableOpacity>
            );
          })()}
          </View>
      </BottomSheet>

      {/* ── Modal Sort Decks ── */}
      <Modal
        transparent
        animationType="fade"
        visible={sortMenuOpen}
        onRequestClose={() => setSortMenuOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSortMenuOpen(false)}>
          <View style={{ flex: 1 }}>
            <View style={[sortSt.dropdown, { position: 'absolute', top: sortMenuPos.y, right: 16 }]}>
              <View style={sortSt.header}>
                <Ionicons name="swap-vertical-outline" size={13} color={theme.primary} />
                <Text style={sortSt.headerTxt}>ORDENAR POR</Text>
              </View>
              <View style={sortSt.sep} />
              {SORT_OPTIONS.map(opt => {
                const isActive = sortOrder === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[sortSt.item, isActive && sortSt.itemActive]}
                    onPress={() => { setSortOrder(isActive ? null : opt.key); setSortMenuOpen(false); }}
                  >
                    <View style={[sortSt.itemIconWrap, isActive && sortSt.itemIconWrapActive]}>
                      <Ionicons name={opt.icon} size={14} color={isActive ? theme.primary : theme.textMuted} />
                    </View>
                    <Text style={[sortSt.itemTxt, isActive && sortSt.itemTxtActive]}>{opt.label}</Text>
                    {isActive && <Ionicons name="checkmark" size={14} color={theme.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Modal Sort Matérias ── */}
      <Modal
        transparent
        animationType="fade"
        visible={subjectSortMenuOpen}
        onRequestClose={() => setSubjectSortMenuOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSubjectSortMenuOpen(false)}>
          <View style={{ flex: 1 }}>
            <View style={[sortSt.dropdown, { position: 'absolute', top: subjectSortMenuPos.y, right: 16 }]}>
              <View style={sortSt.header}>
                <Ionicons name="swap-vertical-outline" size={13} color={theme.primary} />
                <Text style={sortSt.headerTxt}>ORDENAR POR</Text>
              </View>
              <View style={sortSt.sep} />
              {SUBJECT_SORT_OPTIONS.map(opt => {
                const isActive = subjectSortOrder === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[sortSt.item, isActive && sortSt.itemActive]}
                    onPress={() => { setSubjectSortOrder(isActive ? null : opt.key); setSubjectSortMenuOpen(false); }}
                  >
                    <View style={[sortSt.itemIconWrap, isActive && sortSt.itemIconWrapActive]}>
                      <Ionicons name={opt.icon} size={14} color={isActive ? theme.primary : theme.textMuted} />
                    </View>
                    <Text style={[sortSt.itemTxt, isActive && sortSt.itemTxtActive]}>{opt.label}</Text>
                    {isActive && <Ionicons name="checkmark" size={14} color={theme.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <EditCategoryModal
        visible={editCatModal.visible}
        onDismiss={() => setEditCatModal(p => ({ ...p, visible: false }))}
        onSaved={() => { setEditCatModal(p => ({ ...p, visible: false })); loadData(); }}
        categoryId={categoryId}
        categoryName={category?.name}
        presetCategoriesAvailable={presetCategoriesAvailable}
        customCategoriesAvailable={allCategories.filter(c => c.isCustom)}
      />

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
  scrollContent: { paddingHorizontal: GRID_PADDING, paddingTop: 12, paddingBottom: 100 },
  fabPos: {
    position: 'absolute',
    right: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
  },
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
  wrapper: { borderBottomWidth: 1, borderBottomColor: theme.backgroundSecondary, paddingBottom: 10 },
  // Container único com fundo — igual ao HomeTabBar
  container: {
    flexDirection: 'row',
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 12,
    padding: 4,
    gap: 2,
    marginHorizontal: GRID_PADDING,
    marginTop: 12,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  tabActive: { backgroundColor: theme.primary },
  label: { fontFamily: theme.fontFamily.uiMedium, fontSize: 13, color: theme.textMuted },
  labelActive: { color: '#0F0F0F', fontFamily: theme.fontFamily.uiSemiBold },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeActive: { backgroundColor: 'rgba(0,0,0,0.25)' },
  badgeText: { fontSize: 12, color: theme.textMuted, fontFamily: theme.fontFamily.uiSemiBold, lineHeight: 14 },
  badgeTextActive: { color: '#0F0F0F' },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID_PADDING,
  },
  sortLine: { height: 1.5, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginHorizontal: 6 },
  sortBtnActive: {},
  sortBtnTxt: { color: theme.textMuted, fontFamily: theme.fontFamily.uiMedium, fontSize: 12 },
  sortBtnTxtActive: { color: theme.primary, fontFamily: theme.fontFamily.uiSemiBold },
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
    backgroundColor: '#141414',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingTop: 0,
    paddingBottom: 32,
    maxHeight: '75%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginTop: 8, marginBottom: 12 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12 },
  headerIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(93,214,44,0.08)',
    borderWidth: 1, borderColor: 'rgba(93,214,44,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: theme.fontFamily.headingSemiBold, fontSize: 14, color: theme.textPrimary },
  sub: { fontFamily: theme.fontFamily.ui, fontSize: 12, color: theme.textMuted, marginTop: 1 },
  subBold: { fontFamily: theme.fontFamily.uiSemiBold, color: theme.textSecondary },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingVertical: 10 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'transparent',
  },
  filterBtnActive: { backgroundColor: 'rgba(93,214,44,0.1)', borderColor: 'rgba(93,214,44,0.35)' },
  filterTxt: { fontFamily: theme.fontFamily.uiSemiBold, fontSize: 12, color: theme.textMuted },
  filterTxtActive: { color: theme.primary },

  listScroll: { flex: 0 },
  listContent: {
    marginHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  optionLabel: { flex: 1, fontFamily: theme.fontFamily.uiMedium, fontSize: 14, color: theme.textPrimary },

  empty: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 20, paddingHorizontal: 14,
  },
  emptyTxt: { color: theme.textMuted, fontSize: 13, fontFamily: theme.fontFamily.uiMedium },

  // Mantidos para o modal de criar categoria que também usa mv
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
});

// Edit category modal — sheet posicionado absolutamente, sobe com teclado
const editSt = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    flex: 1,
    backgroundColor: theme.backgroundSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 0,
    overflow: 'hidden',
  },
  dragZone: {
    paddingHorizontal: 0,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 6,
  },
});

// Create category modal
const cc = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 24 },
  card: { backgroundColor: theme.backgroundSecondary, borderRadius: 16, padding: 20, gap: 12 },
  title: { fontFamily: theme.fontFamily.headingSemiBold, fontSize: 18, color: theme.textPrimary },
  sub: { fontFamily: theme.fontFamily.ui, fontSize: 13, color: theme.textMuted, marginBottom: 8 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.backgroundTertiary, alignItems: 'center' },
  tabBtnActive: { backgroundColor: theme.primary },
  tabBtnTxt: { fontFamily: theme.fontFamily.uiMedium, fontSize: 13, color: theme.textMuted },
  tabBtnTxtActive: { color: theme.background, fontFamily: theme.fontFamily.uiSemiBold },
  emptyPreset: { paddingVertical: 24, alignItems: 'center' },
  emptyPresetTxt: { fontFamily: theme.fontFamily.ui, fontSize: 13, color: theme.textMuted, textAlign: 'center' },
  input: {
    backgroundColor: theme.background, borderRadius: 10,
    borderWidth: 1, borderColor: theme.backgroundTertiary,
    paddingHorizontal: 14, paddingVertical: 12,
    color: theme.textPrimary, fontFamily: theme.fontFamily.ui, fontSize: 15, marginBottom: 8,
  },
  customPanelWrap: { gap: 12 },
  panelInner: { backgroundColor: theme.background, borderRadius: 12, borderWidth: 1, borderColor: theme.backgroundTertiary, overflow: 'hidden' },
  panelRow: { flexDirection: 'row', alignItems: 'center' },
  panelIconBtn: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: theme.backgroundTertiary },
  panelInputWrap: { flex: 1, paddingHorizontal: 12 },
  panelInput: { flex: 1, color: theme.textPrimary, fontFamily: theme.fontFamily.ui, fontSize: 15, paddingVertical: 14 },
  panelIconHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 10 },
  panelIconHintText: { flex: 1, fontFamily: theme.fontFamily.ui, fontSize: 11, color: theme.textMuted, lineHeight: 15 },
  // Icon picker — igual ao AddDeckScreen
  iconPicker: { marginTop: 4, gap: 8 },
  iconTabsScroll: { flexGrow: 0 },
  iconTabsContent: { gap: 6, paddingBottom: 2 },
  iconTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: theme.backgroundTertiary },
  iconTabActive: { backgroundColor: 'rgba(93,214,44,0.15)', borderWidth: 1, borderColor: 'rgba(93,214,44,0.4)' },
  iconTabText: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
  iconTabTextActive: { color: theme.primary },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  iconOpt: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: theme.backgroundTertiary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  iconOptSelected: { borderColor: theme.primary, backgroundColor: 'rgba(93,214,44,0.12)' },
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

// Category header menu
const catm = StyleSheet.create({
  overlay: { flex: 1 },
  menu: {
    position: 'absolute',
    top: 60,
    right: 12,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.backgroundTertiary,
    width: 210,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  itemText: { fontFamily: theme.fontFamily.uiMedium, fontSize: 14, color: theme.textPrimary },
  sep: { height: 1, backgroundColor: theme.backgroundTertiary },
});

// Sort dropdown
const sortSt = StyleSheet.create({
  dropdown: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
    minWidth: 190,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTxt: {
    color: theme.primary, fontFamily: theme.fontFamily.uiSemiBold,
    fontSize: 11, letterSpacing: 0.8,
  },
  sep: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  itemActive: { backgroundColor: 'rgba(93,214,44,0.06)' },
  itemIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  itemIconWrapActive: { backgroundColor: theme.primaryTransparent },
  itemTxt: { flex: 1, color: theme.textSecondary, fontFamily: theme.fontFamily.uiMedium, fontSize: 14 },
  itemTxtActive: { color: theme.primary, fontFamily: theme.fontFamily.uiSemiBold },
});

// Edit category modal - Antigravity Expert Design
const edit = StyleSheet.create({
  // Section headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 20 },
  sectionLabel: { color: theme.primary, fontSize: 11, fontFamily: theme.fontFamily.headingSemiBold, letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionCount: { color: theme.textSecondary, fontSize: 11, fontFamily: theme.fontFamily.uiMedium },

  // Current Info Badge
  currentInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: 'rgba(93,214,44,0.4)',
    borderRadius: 16, padding: 14, marginBottom: 8,
  },
  currentIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  currentName: { flex: 1, color: theme.textPrimary, fontFamily: theme.fontFamily.headingSemiBold, fontSize: 17 },
  currentTag: { color: theme.primary, fontFamily: theme.fontFamily.uiBold, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', backgroundColor: 'rgba(93,214,44,0.12)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden' },

  // Empty Preset
  emptyPreset: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 24, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  emptyPresetTxt: { color: theme.textSecondary, fontFamily: theme.fontFamily.uiMedium, fontSize: 14 },

  // Preset List (Continuous List with Linear Gradient)
  presetList: {
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  presetRowList: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 16, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  presetRowListActive: { backgroundColor: 'rgba(93,214,44,0.05)' },
  presetIconWrapList: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  presetIconWrapListActive: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' },
  presetRowNameList: { flex: 1, color: theme.textPrimary, fontFamily: theme.fontFamily.uiMedium, fontSize: 15 },
  presetRowNameListActive: { color: theme.primary, fontFamily: theme.fontFamily.uiBold },

  // Custom Panel - borda verde, fundo neutro (igual currentInfo)
  customPanel: {
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(93,214,44,0.4)',
    padding: 16,
    marginBottom: 8,
  },
  panelNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  panelIconPreview: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: theme.backgroundTertiary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  panelIconPreviewActive: { borderColor: theme.primary },
  panelInputWrap: {
    flex: 1, backgroundColor: theme.backgroundTertiary,
    borderRadius: 12, paddingHorizontal: 14, height: 46,
    flexDirection: 'row', alignItems: 'center',
  },
  panelInput: { flex: 1, color: theme.textPrimary, fontFamily: theme.fontFamily.uiMedium, fontSize: 14, paddingVertical: 0 },
  charCount: { fontSize: 11, fontWeight: '600', color: theme.primaryDark },
  charCountWarn: { color: theme.primary },
  panelIconHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  panelIconHintText: { flex: 1, color: theme.textMuted, fontSize: 11, lineHeight: 15 },

  // Icon Picker (idêntico ao AddDeckScreen)
  iconPicker: { marginTop: 4, gap: 8 },
  iconTabsScroll: { flexGrow: 0 },
  iconTabsContent: { gap: 6, paddingBottom: 2 },
  iconTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: theme.backgroundTertiary },
  iconTabActive: { backgroundColor: theme.backgroundTertiary, borderWidth: 1, borderColor: 'rgba(93,214,44,0.5)' },
  iconTabText: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
  iconTabTextActive: { color: theme.primary },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  iconOpt: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: theme.backgroundTertiary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  iconOptSelected: { borderColor: theme.primary, backgroundColor: 'rgba(255,255,255,0.1)' },

  // Save Btn
  saveBtn: {
    borderRadius: 16, paddingVertical: 16,
    backgroundColor: theme.primary,
    alignItems: 'center', marginTop: 28,
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8
  },
  saveBtnDisabled: { backgroundColor: 'rgba(93,214,44,0.35)', shadowOpacity: 0, elevation: 0 },
  saveBtnTxt: { color: '#0F0F0F', fontFamily: theme.fontFamily.uiBold, fontSize: 16 },
  saveBtnTxtDisabled: { color: 'rgba(15,15,15,0.5)', fontFamily: theme.fontFamily.uiBold, fontSize: 16 },
});

export default CategoryDetailScreen;
