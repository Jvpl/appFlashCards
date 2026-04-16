import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, Pressable,
  StyleSheet, ScrollView, KeyboardAvoidingView, Dimensions, LayoutAnimation, Platform, UIManager, Keyboard, BackHandler,
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
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

const CategoryTile = ({ item, selected, onPress, onBlurInput, deckCount = 0 }) => (
  <TouchableOpacity
    onPress={() => { Keyboard.dismiss(); onBlurInput?.(); onPress(); }}
    activeOpacity={0.75}
    style={s.catTile}
  >
    {/* Fundo SVG */}
    <SvgXml xml={CATEGORY_TILE_SVG} width="100%" height="100%" style={StyleSheet.absoluteFill} />
    {/* Overlay de seleção — stroke verde no mesmo shape */}
    {selected && <SvgXml xml={CATEGORY_TILE_SELECTED_SVG} width="100%" height="100%" style={StyleSheet.absoluteFill} />}

    {/* Checkmark de seleção */}
    {selected && (
      <View style={s.catTileCheck}>
        <Ionicons name="checkmark" size={10} color="#0F0F0F" />
      </View>
    )}

    {/* Ícone + label centralizados */}
    <View style={s.catTileContent}>
      <GlowIcon iconData={item.icon} size={44} color={theme.primary} glowBlur={7} />
      <Text style={[s.catTileLabel, selected && s.catTileLabelSelected]} numberOfLines={2}>
        {item.name}
      </Text>
    </View>

    {/* Contador de decks no recorte inferior esquerdo — sempre visível */}
    <View style={s.catTileBadge}>
      <Text style={s.catTileBadgeText}>{String(deckCount).padStart(2, '0')}</Text>
    </View>
  </TouchableOpacity>
);

const CustomCategoryTile = ({ item, selected, onPress, onBlurInput, deckCount = 0 }) => (
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

    <View style={s.catTileContent}>
      <Ionicons name={item.icon || 'folder-outline'} size={44} color={theme.primary} />
      <Text style={[s.catTileLabel, selected && s.catTileLabelSelected]} numberOfLines={2}>
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
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const catInputRef = useRef(null);
  const catSectionY = useRef(0);
  const catInputFocusedRef = useRef(false);
  const preselectedCardRef = useRef(null);
  const preselectedCardY = useRef(null);

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
      handleBack();
      return true;
    });
    return () => backSub.remove();
  }, [name, selectedCategory]);

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
      >
      <Pressable onPress={() => inputRef.current?.blur()} style={s.scrollContent}>
        {/* ── Nome do deck ────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { marginBottom: 10 }]}>NOME DO DECK</Text>
          <TouchableOpacity
            style={s.inputWrap}
            onPress={() => inputRef.current?.focus()}
            activeOpacity={1}
          >
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
          </TouchableOpacity>
          <View style={[s.inputLine, { backgroundColor: inputFocused ? theme.primary : theme.primaryDark }]} />
        </View>

        {/* ── Categoria ───────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { marginBottom: 10 }]}>CATEGORIA</Text>

          {/* Filtro padrão / customizadas — só aparece se tiver customizadas */}
          {customCategories.length > 0 && (
            <View style={s.catFilterRow}>
              {['preset', 'custom'].map(f => (
                <TouchableOpacity
                  key={f}
                  style={[s.catFilterChip, catFilter === f && s.catFilterChipActive]}
                  onPress={() => setCatFilter(f)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.catFilterText, catFilter === f && s.catFilterTextActive]}>
                    {f === 'preset' ? 'Padrão' : 'Personalizadas'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 2-column tile grid — padrão */}
          {catFilter === 'preset' && (() => {
            const left = CATEGORIES.filter((_, i) => i % 2 === 0);
            const right = CATEGORIES.filter((_, i) => i % 2 !== 0);
            return (
              <View style={s.colsWrap}>
                <View style={s.col}>
                  {left.map(item => (
                    <View key={item.id} onLayout={item.id === preselectedCategoryId ? e => { preselectedCardY.current = e.nativeEvent.layout.y + catSectionY.current; } : undefined}>
                      <CategoryTile
                        item={item}
                        selected={selectedCategory === item.id}
                        onPress={() => setSelectedCategory(p => p === item.id ? null : item.id)}
                        onBlurInput={() => inputRef.current?.blur()}
                        deckCount={deckCountMap[item.id] || 0}
                      />
                    </View>
                  ))}
                </View>
                <View style={s.col}>
                  {right.map(item => (
                    <View key={item.id} onLayout={item.id === preselectedCategoryId ? e => { preselectedCardY.current = e.nativeEvent.layout.y + catSectionY.current; } : undefined}>
                      <CategoryTile
                        item={item}
                        selected={selectedCategory === item.id}
                        onPress={() => setSelectedCategory(p => p === item.id ? null : item.id)}
                        onBlurInput={() => inputRef.current?.blur()}
                        deckCount={deckCountMap[item.id] || 0}
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
              <View style={s.colsWrap}>
                <View style={s.col}>
                  {left.map(item => (
                    <View key={item.id} onLayout={item.id === preselectedCategoryId ? e => { preselectedCardY.current = e.nativeEvent.layout.y + catSectionY.current; } : undefined}>
                      <CustomCategoryTile
                        item={item}
                        selected={selectedCategory === item.id}
                        onPress={() => setSelectedCategory(p => p === item.id ? null : item.id)}
                        onBlurInput={() => inputRef.current?.blur()}
                        deckCount={deckCountMap[item.id] || 0}
                      />
                    </View>
                  ))}
                </View>
                <View style={s.col}>
                  {right.map(item => (
                    <View key={item.id} onLayout={item.id === preselectedCategoryId ? e => { preselectedCardY.current = e.nativeEvent.layout.y + catSectionY.current; } : undefined}>
                      <CustomCategoryTile
                        item={item}
                        selected={selectedCategory === item.id}
                        onPress={() => setSelectedCategory(p => p === item.id ? null : item.id)}
                        onBlurInput={() => inputRef.current?.blur()}
                        deckCount={deckCountMap[item.id] || 0}
                      />
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}
        </View>

        {/* ── Criar nova categoria ─────────────────────────────── */}
        <View style={s.section} onLayout={e => { catSectionY.current = e.nativeEvent.layout.y; }}>
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
              {/* Header do painel */}
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

              {/* Nome + ícone selecionado lado a lado */}
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
                      // se teclado já está aberto, rola imediatamente
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

              {/* Hint para abrir picker */}
              <View style={s.panelIconHint}>
                <Ionicons name="information-circle-outline" size={14} color={theme.textMuted} />
                <Text style={s.panelIconHintText}>
                  Toque no ícone para personalizar. Se não escolher, um ícone padrão será usado.
                </Text>
              </View>

              {/* Picker de ícones com abas */}
              {customCatIcon === '__picker__' && (
                <View style={s.iconPicker}>
                  {/* Abas */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.iconTabsScroll} contentContainerStyle={s.iconTabsContent}>
                    {ICON_GROUPS.map((group, i) => (
                      <TouchableOpacity
                        key={group.label}
                        style={[s.iconTab, activeIconGroup === i && s.iconTabActive]}
                        onPress={() => setActiveIconGroup(i)}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.iconTabText, activeIconGroup === i && s.iconTabTextActive]}>
                          {group.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {/* Grid 4x2 */}
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
                  const newCat = {
                    id: newId,
                    name: customCatName.trim(),
                    icon,
                    color: theme.primary,
                    keywords: [],
                    isCustom: true,
                  };
                  await saveCustomCategories([...existing, newCat]);
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setCustomCategories(prev => [...prev, newCat]);
                  setSelectedCategory(newId);
                  setCustomCatExpanded(false);
                  setCustomCatName('');
                  setCustomCatIcon(null);
                  setCatFilter('custom');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={15} color={theme.primary} style={{ marginRight: 6 }} />
                <Text style={s.saveCatBtnText}>Salvar categoria</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Salvar deck ──────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.saveBtn, !name.trim() && s.saveBtnOff]}
          onPress={() => { Keyboard.dismiss(); handleSave(); }}
          activeOpacity={0.85}
        >
          <Text style={s.saveBtnText}>Salvar deck</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 28 }} />
      </Pressable>
      </ScrollView>

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
  section: { marginBottom: 24 },
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
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    height: 54,
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

  // filter chips
  catFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  catFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  catFilterChipActive: {
    backgroundColor: 'rgba(93,214,44,0.1)',
    borderColor: 'rgba(93,214,44,0.4)',
  },
  catFilterText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontFamily: theme.fontFamily.uiSemiBold,
  },
  catFilterTextActive: { color: theme.primary },

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

  // ── Save deck
  saveBtn: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  saveBtnOff: { opacity: 0.4, shadowOpacity: 0 },
  saveBtnText: {
    color: '#0F0F0F',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

export default AddDeckScreen;
