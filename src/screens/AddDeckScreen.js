import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, Pressable,
  StyleSheet, ScrollView, KeyboardAvoidingView, Dimensions, LayoutAnimation, Keyboard, BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { getAppData, saveAppData } from '../services/storage';
import { getCustomCategories, saveCustomCategories } from '../config/categories';
import { CustomAlert } from '../components/ui/CustomAlert';
import GlowIcon from '../components/ui/GlowIcon';
import { CATEGORY_TILE_SVG, CATEGORY_TILE_SELECTED_SVG } from '../assets/svg-cards/categoryCardSvgs';
import theme from '../styles/theme';

// Dados dos ícones para Skia GlowIcon
import {
  administrativoIcon,
  educacaoIcon,
  fiscalIcon,
  justicaIcon,
  militarIcon,
  operacionalIcon,
  saudeIcon,
  segurancaIcon,
} from '../assets/svgIconPaths';


const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
const COL_GAP = 10;



const CATEGORIES = [
  { id: 'seguranca',      name: 'Segurança Pública',  icon: segurancaIcon },
  { id: 'justica',        name: 'Justiça & Direito',   icon: justicaIcon },
  { id: 'administrativo', name: 'Administrativo',      icon: administrativoIcon },
  { id: 'fiscal',         name: 'Fiscal & Controle',   icon: fiscalIcon },
  { id: 'operacional',    name: 'Operacional & Logística',  icon: operacionalIcon },
  { id: 'saude',          name: 'Saúde',               icon: saudeIcon },
  { id: 'educacao',       name: 'Educação',            icon: educacaoIcon },
  { id: 'militar',        name: 'Militar',             icon: militarIcon },
];

// ── Category tile ─────────────────────────────────────────────────

const CategoryTile = ({ item, selected, onPress, onBlurInput, deckCount = 0, onScrollToInput }) => (
  <TouchableOpacity
    onPress={() => { Keyboard.dismiss(); onBlurInput?.(); onPress(); }}
    activeOpacity={0.75}
    style={s.catTile}
  >
    <SvgXml xml={CATEGORY_TILE_SVG} width="100%" height="100%" style={StyleSheet.absoluteFill} />
    {selected && <SvgXml xml={CATEGORY_TILE_SELECTED_SVG} width="100%" height="100%" style={StyleSheet.absoluteFill} />}
    {selected && (
      <View style={s.catTileCheck}>
        <Ionicons name="checkmark" size={10} color="#0F0F0F" />
      </View>
    )}
    {/* Seta para cima — scroll até o input — aparece só quando input saiu da tela */}
    {selected && onScrollToInput !== undefined && (
      <TouchableOpacity style={s.catTileArrow} onPress={e => { e.stopPropagation(); onScrollToInput?.(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-up" size={16} color={theme.primary} />
      </TouchableOpacity>
    )}
    <View style={s.catTileContent}>
      <GlowIcon iconData={item.icon} size={44} color={theme.primary} glowBlur={7} />
      <Text style={[s.catTileLabel, selected && s.catTileLabelSelected]} numberOfLines={2}>
        {item.name}
      </Text>
    </View>
    <View style={s.catTileBadge}>
      <Text style={s.catTileBadgeText}>{String(deckCount).padStart(2, '0')}</Text>
    </View>
  </TouchableOpacity>
);

const CustomCategoryTile = ({ item, selected, onPress, onLongPress, onBlurInput, deckCount = 0, onScrollToInput, deleteMode, deleteSelected }) => (
  <TouchableOpacity
    onPress={() => { Keyboard.dismiss(); onBlurInput?.(); onPress(); }}
    onLongPress={() => { Keyboard.dismiss(); onLongPress?.(); }}
    delayLongPress={400}
    activeOpacity={0.75}
    style={s.catTile}
  >
    <SvgXml xml={CATEGORY_TILE_SVG} width="100%" height="100%" style={StyleSheet.absoluteFill} />
    {selected && !deleteMode && <SvgXml xml={CATEGORY_TILE_SELECTED_SVG} width="100%" height="100%" style={StyleSheet.absoluteFill} />}
    {/* Modo normal: checkmark de seleção */}
    {selected && !deleteMode && (
      <View style={s.catTileCheck}>
        <Ionicons name="checkmark" size={10} color="#0F0F0F" />
      </View>
    )}
    {selected && !deleteMode && onScrollToInput !== undefined && (
      <TouchableOpacity style={s.catTileArrow} onPress={e => { e.stopPropagation(); onScrollToInput?.(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-up" size={16} color={theme.primary} />
      </TouchableOpacity>
    )}
    {/* Modo deleção: círculo vermelho */}
    {deleteMode && (
      <View style={[s.catTileDeleteDot, deleteSelected && s.catTileDeleteDotActive]}>
        {deleteSelected && <Ionicons name="checkmark" size={10} color="#fff" />}
      </View>
    )}
    <View style={s.catTileContent}>
      <Ionicons name={item.icon || 'folder-outline'} size={44} color={deleteMode ? 'rgba(93,214,44,0.4)' : theme.primary} />
      <Text style={[s.catTileLabel, selected && !deleteMode && s.catTileLabelSelected, deleteMode && { color: theme.textMuted }]} numberOfLines={2}>
        {item.name}
      </Text>
    </View>
    <View style={s.catTileBadge}>
      <Text style={s.catTileBadgeText}>{String(deckCount).padStart(2, '0')}</Text>
    </View>
  </TouchableOpacity>
);

// ── Main screen ───────────────────────────────────────────────────

export const AddDeckScreen = ({ route, navigation }) => {
  const editDeckId = route?.params?.editDeckId || null;
  const preselectedCategoryId = route?.params?.preselectedCategoryId || null;
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const initialName = useRef('');
  const initialCategory = useRef(null);
  const confirmLeave = useRef(false);
  const nameRef = useRef('');
  const categoryRef = useRef(null);
  const [customCatExpanded, setCustomCatExpanded] = useState(false);
  const [customCatName, setCustomCatName] = useState('');
  const [customCatIcon, setCustomCatIcon] = useState(null);
  const [alertConfig, setAlertConfig] = useState({
    visible: false, title: '', message: '', buttons: [],
  });
  const [inputFocused, setInputFocused] = useState(false);
  const [catInputFocused, setCatInputFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [customCategories, setCustomCategories] = useState([]);
  const [deckCountMap, setDeckCountMap] = useState({}); // { categoryId: count }
  const [catFilter, setCatFilter] = useState('preset'); // 'preset' | 'custom'
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteSelected, setDeleteSelected] = useState(new Set()); // ids selecionados para deletar
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteSelectAll, setDeleteSelectAll] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const catInputRef = useRef(null);
  const catSectionY = useRef(0);
  const catInputFocusedRef = useRef(false);
  const preselectedCardRef = useRef(null);
  const preselectedCardY = useRef(null);
  const cardYMap = useRef({});
  const pendingScrollToCard = useRef(false); // { categoryId: absoluteY }
  const scrollY = useRef(0);
  const inputSectionBottom = useRef(0);
  const selectedCategoryRef = useRef(null);
  const [showArrow, setShowArrow] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const showLabelRef = useRef(false);
  const showArrowRef = useRef(false);

  // Carrega categorias customizadas e contagem de decks por categoria
  useEffect(() => {
    const load = async () => {
      const [customs, allData] = await Promise.all([getCustomCategories(), getAppData()]);
      setCustomCategories(customs);
      const counts = {};
      allData.forEach(d => {
        const cat = d.category || 'personalizados';
        counts[cat] = (counts[cat] || 0) + 1;
      });
      setDeckCountMap(counts);
      // Pré-seleciona categoria se passada como param
      if (preselectedCategoryId && !editDeckId) {
        setSelectedCategory(preselectedCategoryId);
        initialCategory.current = preselectedCategoryId;
        if (preselectedCategoryId.startsWith('custom_')) {
          setCatFilter('custom');
        }
        // Scroll até o card pré-selecionado após o layout renderizar
        setTimeout(() => {
          const y = preselectedCardY.current;
          if (y !== null) {
            scrollRef.current?.scrollTo({ y: y - 24, animated: true });
          } else {
            scrollRef.current?.scrollTo({ y: catSectionY.current - 16, animated: true });
          }
        }, 350);
      }
    };
    load();
  }, []);

  // Pré-carrega dados ao editar
  useEffect(() => {
    if (!editDeckId) return;
    getAppData().then(allData => {
      const deck = allData.find(d => d.id === editDeckId);
      if (!deck) return;
      const cat = deck.category && deck.category !== 'personalizados' ? deck.category : null;
      setName(deck.name || '');
      setSelectedCategory(cat);
      initialName.current = deck.name || '';
      initialCategory.current = cat;
    });
  }, [editDeckId]);

  const updateVisibility = useCallback(() => {
    const sel = selectedCategoryRef.current;
    const sy = scrollY.current;
    const cardY = preselectedCardY.current;
    const inputBottom = inputSectionBottom.current;

    const nextArrow = !!(sel && inputBottom > 0 && sy > inputBottom);

    if (nextArrow !== showArrowRef.current) { showArrowRef.current = nextArrow; setShowArrow(nextArrow); }
  }, []);

  // Mantém refs sincronizados com state para o listener beforeRemove
  useEffect(() => { nameRef.current = name; }, [name]);
  useEffect(() => { categoryRef.current = selectedCategory; }, [selectedCategory]);

  const hasChanges = () =>
    nameRef.current.trim() !== initialName.current ||
    categoryRef.current !== initialCategory.current;

  const handleBack = () => {
    if (editDeckId && hasChanges()) {
      setAlertConfig({
        visible: true,
        title: 'Sair sem salvar?',
        message: 'Você fez alterações que não foram salvas.',
        buttons: [
          { text: 'Continuar editando', style: 'cancel', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) },
          { text: 'Sair sem salvar', style: 'destructive', onPress: () => { confirmLeave.current = true; setAlertConfig(p => ({ ...p, visible: false })); navigation.goBack(); } },
        ],
      });
    } else {
      navigation.goBack();
    }
  };

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', e => {
      const kh = e.endCoordinates.height;
      setKeyboardHeight(kh);
      if (catInputFocusedRef.current) {
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y: catSectionY.current - 16, animated: true });
        }, 50);
      }
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (deleteMode) {
        setDeleteMode(false);
        setDeleteSelected(new Set());
        return true;
      }
      handleBack();
      return true;
    });
    return () => backSub.remove();
  }, [name, selectedCategory, deleteMode]);

  // Intercepta gesto de swipe do React Navigation — usa refs para evitar re-registro
  useEffect(() => {
    if (!editDeckId) return;
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (confirmLeave.current) return;
      const changed = nameRef.current.trim() !== initialName.current ||
                      categoryRef.current !== initialCategory.current;
      if (!changed) return;
      e.preventDefault();
      setAlertConfig({
        visible: true,
        title: 'Sair sem salvar?',
        message: 'Você fez alterações que não foram salvas.',
        buttons: [
          { text: 'Continuar editando', style: 'cancel', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) },
          { text: 'Sair sem salvar', style: 'destructive', onPress: () => {
            confirmLeave.current = true;
            setAlertConfig(p => ({ ...p, visible: false }));
            navigation.dispatch(e.data.action);
          }},
        ],
      });
    });
    return unsub;
  }, [editDeckId]);

  const handleSave = async () => {
    if (name.trim().length === 0) {
      setAlertConfig({
        visible: true,
        title: 'Atenção',
        message: 'Por favor, insira um nome para o deck.',
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }],
      });
      return;
    }
    const allData = await getAppData();
    const trimmedName = name.trim().toLowerCase();
    const duplicateDeck = allData.find(d =>
      !d.isExample &&
      d.name?.trim().toLowerCase() === trimmedName &&
      d.id !== editDeckId
    );
    if (duplicateDeck) {
      setAlertConfig({
        visible: true,
        title: 'Nome já existe',
        message: `Já existe um deck chamado "${name.trim()}". Escolha um nome diferente.`,
        buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }],
      });
      return;
    }
    if (editDeckId) {
      // Modo edição — atualiza nome e categoria
      const updated = allData.map(d => d.id === editDeckId
        ? { ...d, name: name.trim(), category: selectedCategory || 'personalizados' }
        : d
      );
      await saveAppData(updated);
      navigation.goBack();
    } else {
      const newDeck = {
        id: `deck_${Date.now()}`,
        name: name.trim(),
        category: selectedCategory || 'personalizados',
        subjects: [],
        isUserCreated: true,
      };
      await saveAppData([...allData, newDeck]);
      navigation.replace('SubjectList', { deckId: newDeck.id, deckName: newDeck.name });
    }
  };

  const toggleCustomCat = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCustomCatExpanded(prev => {
      if (!prev) {
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y: catSectionY.current - 16, animated: true });
        }, 150);
      } else {
        catInputFocusedRef.current = false;
      }
      return !prev;
    });
  };

  const DEFAULT_CAT_ICON = 'folder-outline';
  const ICON_GROUPS = [
    {
      label: 'Estudo',
      icons: ['book-outline', 'school-outline', 'document-text-outline', 'library-outline', 'pencil-outline', 'calculator-outline', 'flask-outline', 'language-outline', 'reader-outline', 'journal-outline', 'clipboard-outline', 'easel-outline'],
    },
    {
      label: 'Objetivo',
      icons: ['trophy-outline', 'star-outline', 'ribbon-outline', 'flag-outline', 'podium-outline', 'rocket-outline', 'diamond-outline', 'sparkles-outline', 'medal-outline', 'trending-up-outline', 'flame-outline', 'compass-outline'],
    },
    {
      label: 'Organização',
      icons: ['calendar-outline', 'checkmark-circle-outline', 'time-outline', 'people-outline', 'list-outline', 'albums-outline', 'folder-outline', 'bookmark-outline', 'filing-outline', 'grid-outline', 'layers-outline', 'filter-outline'],
    },
    {
      label: 'Concurso',
      icons: ['shield-outline', 'briefcase-outline', 'globe-outline', 'megaphone-outline', 'newspaper-outline', 'scale-outline', 'build-outline', 'id-card-outline', 'document-outline', 'people-circle-outline', 'chatbubbles-outline', 'pie-chart-outline'],
    },
    {
      label: 'Outros',
      icons: ['medkit-outline', 'cash-outline', 'hammer-outline', 'stats-chart-outline', 'heart-outline', 'bus-outline', 'car-outline', 'home-outline', 'leaf-outline', 'nutrition-outline', 'fitness-outline', 'bicycle-outline'],
    },
  ];
  const [activeIconGroup, setActiveIconGroup] = useState(0);


  return (
    <View style={s.root}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <View style={[s.headerWrapper, { paddingTop: insets.top }]}>
        <View style={s.headerInner}>
          <TouchableOpacity onPress={handleBack} style={s.headerBtn} hitSlop={HIT_SLOP}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{editDeckId ? 'Editar Deck' : 'Novo Deck'}</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.headerDivider} />
      </View>

      {/* ── Content ─────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: keyboardHeight + 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={e => { scrollY.current = e.nativeEvent.contentOffset.y; updateVisibility(); }}
      >
      <Pressable onPress={() => inputRef.current?.blur()} style={s.scrollContent}>
        {/* ── Nome do deck ────────────────────────────────────── */}
        <View style={s.section} onLayout={e => { inputSectionBottom.current = e.nativeEvent.layout.y + e.nativeEvent.layout.height; }}>
          <Text style={[s.sectionTitle, { marginBottom: 10 }]}>NOME DO DECK</Text>
          <View style={s.inputAreaWrap}>
            <View style={s.inputUnderlineWrap}>
              <View style={s.inputWrap}>
                <Ionicons name="albums-outline" size={18} color={inputFocused ? theme.primary : theme.primaryDark} style={s.inputIcon} />
                <TextInput
                  ref={inputRef}
                  style={s.input}
                  placeholder="Ex: Concurso XYZ"
                  placeholderTextColor={theme.textMuted}
                  value={name}
                  onChangeText={t => setName(t.slice(0, 30))}
                  onFocus={() => {
                    setInputFocused(true);
                    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 150);
                  }}
                  onBlur={() => setInputFocused(false)}
                  returnKeyType="done"
                  maxLength={30}
                />
                {name.length > 0 && (
                  <Text style={[s.charCount, name.length >= 25 && s.charCountWarn]}>
                    {name.length}/30
                  </Text>
                )}
              </View>
              <View style={[s.inputLine, { backgroundColor: inputFocused ? theme.primary : theme.primaryDark }]} />
            </View>
            <TouchableOpacity
              style={[s.saveBtnCircle, !name.trim() && s.saveBtnOff]}
              onPress={() => { Keyboard.dismiss(); handleSave(); }}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={22} color="#0F0F0F" />
            </TouchableOpacity>
          </View>
          {/* Espaço fixo reservado para o label — evita layout shift */}
          <View style={s.labelReservedArea}>
            {selectedCategory && showLabel && (() => {
              const cat = [...CATEGORIES, ...customCategories].find(c => c.id === selectedCategory);
              if (!cat) return null;
              return (
                <TouchableOpacity
                  style={s.selectedCatLabel}
                  onPress={() => {
                    const y = preselectedCardY.current ?? catSectionY.current - 16;
                    scrollRef.current?.scrollTo({ y: y - 24, animated: true });
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="pricetag-outline" size={12} color={theme.primary} />
                  <Text style={s.selectedCatLabelText} numberOfLines={1}>{cat.name}</Text>
                  <Ionicons name="chevron-down" size={12} color={theme.primary} />
                </TouchableOpacity>
              );
            })()}
          </View>
        </View>

        {/* ── Categoria ───────────────────────────────────────── */}
        <View style={s.section} onLayout={e => { catSectionY.current = e.nativeEvent.layout.y; }}>
          {/* Título + filtro na mesma linha */}
          <View style={s.catHeaderRow}>
            <Text style={s.sectionTitle}>CATEGORIA</Text>
            <View style={s.catFilterInline}>
              {['preset', 'custom'].map((f, i) => (
                <React.Fragment key={f}>
                  {i > 0 && <View style={s.catFilterDivider} />}
                  <TouchableOpacity
                    onPress={() => {
                      setCatFilter(f);
                      setDeleteMode(false); setDeleteSelected(new Set());
                      if (f === 'preset' && selectedCategoryRef.current?.startsWith('custom_')) {
                        preselectedCardY.current = null; selectedCategoryRef.current = null; setShowLabel(false); setShowArrow(false); showLabelRef.current = false; showArrowRef.current = false; setSelectedCategory(null);
                      } else if (f === 'custom' && selectedCategoryRef.current && !selectedCategoryRef.current.startsWith('custom_')) {
                        preselectedCardY.current = null; selectedCategoryRef.current = null; setShowLabel(false); setShowArrow(false); showLabelRef.current = false; showArrowRef.current = false; setSelectedCategory(null);
                      }
                    }}
                    activeOpacity={0.7}
                    hitSlop={HIT_SLOP}
                  >
                    <Text style={[s.catFilterInlineText, catFilter === f && s.catFilterInlineTextActive]}>
                      {f === 'preset' ? 'Padrão' : 'Personalizar'}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* 2-column tile grid — padrão */}
          {catFilter === 'preset' && (() => {
            const left = CATEGORIES.filter((_, i) => i % 2 === 0);
            const right = CATEGORIES.filter((_, i) => i % 2 !== 0);
            return (
              <View style={s.colsWrap}>
                <View style={s.col}>
                  {left.map(item => (
                    <View key={item.id} onLayout={e => { const y = e.nativeEvent.layout.y + catSectionY.current; cardYMap.current[item.id] = y; if (selectedCategory === item.id || item.id === preselectedCategoryId) { preselectedCardY.current = y; updateVisibility(); if (pendingScrollToCard.current) { pendingScrollToCard.current = false; setTimeout(() => scrollRef.current?.scrollTo({ y: y - 24, animated: true }), 100); } } }}>
                      <CategoryTile
                        item={item}
                        selected={selectedCategory === item.id}
                        onPress={() => { const next = selectedCategoryRef.current === item.id ? null : item.id; const y = next ? (cardYMap.current[next] ?? null) : null; preselectedCardY.current = y; selectedCategoryRef.current = next; setShowLabel(!!(next && y !== null && y > SCREEN_HEIGHT)); setSelectedCategory(next); updateVisibility(); }}
                        onBlurInput={() => inputRef.current?.blur()}
                        deckCount={deckCountMap[item.id] || 0}
                        onScrollToInput={showArrow ? () => scrollRef.current?.scrollTo({ y: 0, animated: true }) : undefined}
                      />
                    </View>
                  ))}
                </View>
                <View style={s.col}>
                  {right.map(item => (
                    <View key={item.id} onLayout={e => { const y = e.nativeEvent.layout.y + catSectionY.current; cardYMap.current[item.id] = y; if (selectedCategory === item.id || item.id === preselectedCategoryId) { preselectedCardY.current = y; updateVisibility(); if (pendingScrollToCard.current) { pendingScrollToCard.current = false; setTimeout(() => scrollRef.current?.scrollTo({ y: y - 24, animated: true }), 100); } } }}>
                      <CategoryTile
                        item={item}
                        selected={selectedCategory === item.id}
                        onPress={() => { const next = selectedCategoryRef.current === item.id ? null : item.id; const y = next ? (cardYMap.current[next] ?? null) : null; preselectedCardY.current = y; selectedCategoryRef.current = next; setShowLabel(!!(next && y !== null && y > SCREEN_HEIGHT)); setSelectedCategory(next); updateVisibility(); }}
                        onBlurInput={() => inputRef.current?.blur()}
                        deckCount={deckCountMap[item.id] || 0}
                        onScrollToInput={showArrow ? () => scrollRef.current?.scrollTo({ y: 0, animated: true }) : undefined}
                      />
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}

          {/* 2-column tile grid — customizadas */}
          {catFilter === 'custom' && (() => {
            const left = customCategories.filter((_, i) => i % 2 === 0);
            const right = customCategories.filter((_, i) => i % 2 !== 0);
            return (
              <>
              {/* Botão criar nova categoria — fixo no topo da aba Personalizar */}
              {!customCatExpanded ? (
                <TouchableOpacity
                  style={s.newCatTrigger}
                  onPress={toggleCustomCat}
                  activeOpacity={0.75}
                >
                  <Ionicons name="add-circle-outline" size={16} color="rgba(93,214,44,0.7)" />
                  <Text style={s.newCatTriggerText}>Criar nova categoria</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.newCatPanel}>
                  <View style={s.panelHeader}>
                    <Text style={s.panelTitle}>NOVA CATEGORIA</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {customCatName.length > 0 && (
                        <Text style={[s.charCount, customCatName.length >= 20 && s.charCountWarn]}>
                          {customCatName.length}/25
                        </Text>
                      )}
                      <TouchableOpacity onPress={toggleCustomCat} hitSlop={HIT_SLOP}>
                        <Ionicons name="close" size={18} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={s.panelNameRow}>
                    <TouchableOpacity
                      style={s.panelIconPreview}
                      onPress={() => setCustomCatIcon(p => p === '__picker__' ? null : '__picker__')}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={customCatIcon && customCatIcon !== '__picker__' ? customCatIcon : DEFAULT_CAT_ICON}
                        size={22}
                        color={customCatIcon && customCatIcon !== '__picker__' ? theme.primary : theme.textMuted}
                      />
                    </TouchableOpacity>
                    <View style={s.panelInputWrap}>
                      <TextInput
                        ref={catInputRef}
                        style={s.panelInput}
                        placeholder="Nome da categoria"
                        placeholderTextColor={theme.textMuted}
                        value={customCatName}
                        onChangeText={t => setCustomCatName(t.slice(0, 25))}
                        onFocus={() => {
                          catInputFocusedRef.current = true;
                          if (keyboardHeight > 0) {
                            setTimeout(() => {
                              scrollRef.current?.scrollTo({ y: catSectionY.current - 16, animated: true });
                            }, 50);
                          }
                        }}
                        onBlur={() => { catInputFocusedRef.current = false; }}
                        returnKeyType="done"
                        maxLength={25}
                      />
                    </View>
                  </View>
                  {customCatIcon === '__picker__' && (
                    <View style={s.iconPickerWrap}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.iconTabsScroll} contentContainerStyle={s.iconTabsContent} keyboardShouldPersistTaps="always">
                        {ICON_GROUPS.map((g, i) => (
                          <TouchableOpacity
                            key={g.label}
                            style={[s.iconTab, activeIconGroup === i && s.iconTabActive]}
                            onPress={() => setActiveIconGroup(i)}
                            activeOpacity={0.75}
                          >
                            <Text style={[s.iconTabText, activeIconGroup === i && s.iconTabTextActive]}>{g.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      <View style={s.iconGrid}>
                        {ICON_GROUPS[activeIconGroup].icons.map(icon => (
                          <TouchableOpacity
                            key={icon}
                            style={s.iconOpt}
                            onPress={() => setCustomCatIcon(icon)}
                            activeOpacity={0.75}
                          >
                            <Ionicons name={icon} size={20} color={theme.textSecondary} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[s.saveCatBtn, !customCatName.trim() && s.saveCatBtnOff]}
                    onPress={async () => {
                      if (!customCatName.trim()) return;
                      const existing = await getCustomCategories();
                      if (existing.length >= 30) {
                        setAlertConfig({
                          visible: true,
                          title: 'Limite atingido',
                          message: 'Você já criou 30 categorias personalizadas. Exclua alguma para criar uma nova.',
                          buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }],
                        });
                        return;
                      }
                      const nameLower = customCatName.trim().toLowerCase();
                      const duplicate = existing.find(c => c.name?.trim().toLowerCase() === nameLower);
                      if (duplicate) {
                        setAlertConfig({
                          visible: true,
                          title: 'Nome já existe',
                          message: `Já existe uma categoria chamada "${customCatName.trim()}". Escolha um nome diferente.`,
                          buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }],
                        });
                        return;
                      }
                      const icon = customCatIcon && customCatIcon !== '__picker__' ? customCatIcon : 'folder-outline';
                      const newId = `custom_${Date.now()}`;
                      const newCat = { id: newId, name: customCatName.trim(), icon, color: theme.primary, keywords: [], isCustom: true };
                      await saveCustomCategories([...existing, newCat]);
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setCustomCategories(prev => [...prev, newCat]);
                      selectedCategoryRef.current = newId;
                      preselectedCardY.current = null;
                      pendingScrollToCard.current = true;
                      setSelectedCategory(newId);
                      setCustomCatExpanded(false);
                      setCustomCatName('');
                      setCustomCatIcon(null);
                      setCatFilter('custom');
                      // posição do card novo ainda não existe — onLayout vai atualizar e chamar updateVisibility
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark" size={15} color={theme.primary} style={{ marginRight: 6 }} />
                    <Text style={s.saveCatBtnText}>Salvar categoria</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={s.colsWrap}>
                <View style={s.col}>
                  {left.map(item => (
                    <View key={item.id} onLayout={e => { const y = e.nativeEvent.layout.y + catSectionY.current; cardYMap.current[item.id] = y; if (selectedCategory === item.id || item.id === preselectedCategoryId) { preselectedCardY.current = y; updateVisibility(); if (pendingScrollToCard.current) { pendingScrollToCard.current = false; setTimeout(() => scrollRef.current?.scrollTo({ y: y - 24, animated: true }), 100); } } }}>
                      <CustomCategoryTile
                        item={item}
                        selected={selectedCategory === item.id}
                        onPress={() => {
                          if (deleteMode) {
                            setDeleteSelected(prev => { const s = new Set(prev); s.has(item.id) ? s.delete(item.id) : s.add(item.id); return s; });
                            return;
                          }
                          const next = selectedCategoryRef.current === item.id ? null : item.id; const y = next ? (cardYMap.current[next] ?? null) : null; preselectedCardY.current = y; selectedCategoryRef.current = next; setShowLabel(!!(next && y !== null && y > SCREEN_HEIGHT)); setSelectedCategory(next); updateVisibility();
                        }}
                        onLongPress={() => { setDeleteMode(true); setDeleteSelected(new Set([item.id])); }}
                        onBlurInput={() => inputRef.current?.blur()}
                        deckCount={deckCountMap[item.id] || 0}
                        onScrollToInput={showArrow ? () => scrollRef.current?.scrollTo({ y: 0, animated: true }) : undefined}
                        deleteMode={deleteMode}
                        deleteSelected={deleteSelected.has(item.id)}
                      />
                    </View>
                  ))}
                </View>
                <View style={s.col}>
                  {right.map(item => (
                    <View key={item.id} onLayout={e => { const y = e.nativeEvent.layout.y + catSectionY.current; cardYMap.current[item.id] = y; if (selectedCategory === item.id || item.id === preselectedCategoryId) { preselectedCardY.current = y; updateVisibility(); if (pendingScrollToCard.current) { pendingScrollToCard.current = false; setTimeout(() => scrollRef.current?.scrollTo({ y: y - 24, animated: true }), 100); } } }}>
                      <CustomCategoryTile
                        item={item}
                        selected={selectedCategory === item.id}
                        onPress={() => {
                          if (deleteMode) {
                            setDeleteSelected(prev => { const s = new Set(prev); s.has(item.id) ? s.delete(item.id) : s.add(item.id); return s; });
                            return;
                          }
                          const next = selectedCategoryRef.current === item.id ? null : item.id; const y = next ? (cardYMap.current[next] ?? null) : null; preselectedCardY.current = y; selectedCategoryRef.current = next; setShowLabel(!!(next && y !== null && y > SCREEN_HEIGHT)); setSelectedCategory(next); updateVisibility();
                        }}
                        onLongPress={() => { setDeleteMode(true); setDeleteSelected(new Set([item.id])); }}
                        onBlurInput={() => inputRef.current?.blur()}
                        deckCount={deckCountMap[item.id] || 0}
                        onScrollToInput={showArrow ? () => scrollRef.current?.scrollTo({ y: 0, animated: true }) : undefined}
                        deleteMode={deleteMode}
                        deleteSelected={deleteSelected.has(item.id)}
                      />
                    </View>
                  ))}
                </View>
              </View>
              </>
            );
          })()}
        </View>

        <View style={{ height: insets.bottom + 28 }} />
      </Pressable>
      </ScrollView>

      {/* ── FAB de deleção — só no modo delete ── */}
      {deleteMode && (
        <View style={[s.deleteFabWrap, { bottom: 20 }]}>
          <TouchableOpacity style={[s.deleteFab, deleteSelected.size === 0 && { opacity: 0.4 }]} onPress={() => { if (deleteSelected.size === 0) return; setDeleteSelectAll(false); setDeleteConfirmVisible(true); }} activeOpacity={0.85}>
            <Ionicons name="trash-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={s.deleteFabCancel} onPress={() => { setDeleteMode(false); setDeleteSelected(new Set()); }} activeOpacity={0.8}>
            <Ionicons name="close" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Modal de confirmação de deleção ── */}
      {deleteConfirmVisible && (
        <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', paddingTop: insets.top + 56 }]} pointerEvents="box-none">
          <TouchableOpacity style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)' }]} activeOpacity={1} onPress={() => setDeleteConfirmVisible(false)} />
          <View style={s.deleteModal}>
            <Text style={s.deleteModalTitle}>Excluir {deleteSelectAll ? customCategories.length : deleteSelected.size} categoria{(deleteSelectAll ? customCategories.length : deleteSelected.size) !== 1 ? 's' : ''}?</Text>
            <Text style={s.deleteModalMsg}>Esta ação não pode ser desfeita.</Text>
            <TouchableOpacity style={s.deleteSelectAllRow} onPress={() => setDeleteSelectAll(p => !p)} activeOpacity={0.75}>
              <View style={[s.deleteCheckbox, deleteSelectAll && s.deleteCheckboxActive]}>
                {deleteSelectAll && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={s.deleteSelectAllText}>Selecionar todas as categorias personalizadas</Text>
            </TouchableOpacity>
            <View style={s.deleteModalBtns}>
              <TouchableOpacity style={s.deleteModalCancel} onPress={() => setDeleteConfirmVisible(false)} activeOpacity={0.75}>
                <Text style={s.deleteModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.deleteModalConfirm} onPress={async () => {
                const idsToDelete = deleteSelectAll ? new Set(customCategories.map(c => c.id)) : deleteSelected;
                const remaining = customCategories.filter(c => !idsToDelete.has(c.id));
                await saveCustomCategories(remaining);
                setCustomCategories(remaining);
                if (idsToDelete.has(selectedCategory)) { setSelectedCategory(null); selectedCategoryRef.current = null; preselectedCardY.current = null; setShowLabel(false); setShowArrow(false); }
                setDeleteConfirmVisible(false);
                setDeleteMode(false);
                setDeleteSelected(new Set());
              }} activeOpacity={0.85}>
                <Text style={s.deleteModalConfirmText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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
  root: { flex: 1, backgroundColor: theme.background },

  // ── Header
  headerWrapper: { backgroundColor: theme.background },
  headerInner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerDivider: { height: 1, backgroundColor: theme.backgroundSecondary },

  // ── Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24 },

  // ── Section
  section: { marginBottom: 10 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.3,
    marginBottom: 0,
  },
  clearBtn: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Name input
  inputAreaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  inputUnderlineWrap: {
    flex: 1,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  inputLine: {
    height: 1.5,
    borderRadius: 1,
  },
  inputIcon: { marginRight: 10 },
  charCount: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.primaryDark,
    marginLeft: 6,
  },
  charCountWarn: {
    color: theme.primary,
  },
  input: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
  },

  // ── 2-column tile grid
  colsWrap: {
    flexDirection: 'row',
    gap: COL_GAP,
  },
  col: {
    flex: 1,
    gap: 10,
  },

  // ── Category tile — fundo via SVG, sem borda CSS
  catTile: {
    alignSelf: 'stretch',
    aspectRatio: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },

  // Ícone + label centralizados na área principal (0 a 81.7% da altura)
  catTileContent: {
    position: 'absolute',
    top: '8%',
    left: 0,
    right: 0,
    bottom: '18.3%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  catIconArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // label
  catTileLabel: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  catTileLabelSelected: {
    color: theme.primary,
  },

  // Número de decks — centralizado na pill inferior esquerda
  // Pill: x=0..22.4%, y=87.1..100% → centro x=11.2%, y=93.6%
  catTileBadge: {
    position: 'absolute',
    top: '87.1%',
    left: 0,
    width: '22.4%',
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTileBadgeText: {
    color: theme.primary,
    fontSize: 13,
    fontFamily: theme.fontFamily.heading,
    letterSpacing: 0.3,
  },

  // filtro inline (sem pill)
  catHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  catFilterInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catFilterDivider: {
    width: 1,
    height: 14,
    backgroundColor: theme.primary,
    opacity: 0.6,
  },
  catFilterInlineText: {
    color: theme.textMuted,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  catFilterInlineTextActive: { color: theme.primary },

  // checkmark badge
  catTileCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  catTileArrow: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(93,214,44,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  labelReservedArea: {
    height: 26,
    marginTop: 2,
    overflow: 'visible',
  },
  selectedCatLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 22,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(93,214,44,0.45)',
  },
  selectedCatLabelText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 140,
  },

  // ── Create custom category trigger
  newCatTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  newCatTriggerText: {
    color: 'rgba(93,214,44,0.7)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // ── Custom category panel
  newCatPanel: {
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    marginBottom: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  panelTitle: {
    color: theme.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  panelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  panelIconPreview: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: theme.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  panelInputWrap: {
    flex: 1,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    justifyContent: 'center',
  },
  panelInput: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  panelIconHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  panelIconHintText: {
    color: theme.textMuted,
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  iconPicker: {
    marginTop: 4,
    gap: 8,
  },
  iconTabsScroll: {
    flexGrow: 0,
  },
  iconTabsContent: {
    gap: 6,
    paddingBottom: 2,
  },
  iconTab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: theme.backgroundTertiary,
  },
  iconTabActive: {
    backgroundColor: 'rgba(93,214,44,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(93,214,44,0.4)',
  },
  iconTabText: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  iconTabTextActive: {
    color: theme.primary,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  iconOpt: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  iconOptSelected: {
    borderColor: theme.primary,
    backgroundColor: 'rgba(93,214,44,0.12)',
  },
  saveCatBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 12,
    height: 44,
    borderWidth: 1.5,
    borderColor: theme.primary,
  },
  saveCatBtnOff: { opacity: 0.3 },
  saveCatBtnText: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Save deck circle button
  saveBtnCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnOff: { opacity: 0.35, shadowOpacity: 0 },

  // ── Delete mode
  catTileDeleteDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#e53935',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  catTileDeleteDotActive: {
    backgroundColor: '#e53935',
    borderColor: '#e53935',
  },
  catTileDeleteDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(229,57,53,0.4)',
  },
  deleteFabWrap: {
    position: 'absolute',
    right: 20,
    flexDirection: 'column-reverse',
    alignItems: 'center',
    gap: 8,
  },
  deleteFabCancel: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.backgroundSecondary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  deleteModal: {
    marginHorizontal: 16,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  deleteModalTitle: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  deleteModalMsg: {
    color: theme.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },
  deleteSelectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  deleteCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCheckboxActive: {
    backgroundColor: '#e53935',
    borderColor: '#e53935',
  },
  deleteSelectAllText: {
    color: theme.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  deleteModalBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteModalCancel: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalCancelText: {
    color: theme.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteModalConfirm: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default AddDeckScreen;
