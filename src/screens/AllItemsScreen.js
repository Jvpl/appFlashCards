/**
 * AllItemsScreen
 * Tela gerenciadora contextual — exibe todos os itens de uma seção
 * (decks-meus, decks-comprados, categorias ou materias-comprados)
 * quando o usuário toca em "Ver todos" na aba Início.
 *
 * Params:
 *  sectionKey: 'decks-meus' | 'decks-comprados' | 'categorias' | 'materias-comprados'
 *  title: string
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, FlatList, Dimensions, Platform,
  ScrollView, InteractionManager, Animated,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getAppData, saveAppData, getPurchasedDecks, getDeckCache,
} from '../services/storage';
import { CustomAlert } from '../components/ui/CustomAlert';
import { SkeletonItem } from '../components/ui/SkeletonItem';
import DeckStackCard from '../components/home/DeckStackCard';
import MateriaCard from '../components/home/MateriaCard';
import CategorySvgCard from '../components/home/CategorySvgCard';
import theme from '../styles/theme';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 10;
export const CARD_W = (width - GRID_PADDING * 2 - GRID_GAP) / 2;
export const CARD_H = Math.round(CARD_W * 1.35);

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

// ── Categorias (espelhadas de DeckListScreen) ──────────────────────

const CATEGORIES = [
  { id: 'justica',       name: 'Justiça & Direito',    icon: 'scale-outline',        color: '#818CF8',
    keywords: ['tribunal','tj-','tjmg','tjsp','trf','trt','tre-','tse','tst','stj','stf','judiciário','judiciario','oficial de justiça','oficial de justica','juiz','promotor','defensor','procurador','ministério público','oab','advogado público','delegado federal','direito'] },
  { id: 'seguranca',     name: 'Segurança Pública',    icon: 'shield-half-outline',  color: '#A78BFA',
    keywords: ['policia','polícia','pm ','pmmg','pc-','pcesp','pcsp','prf','pf ','investigador','soldado','delegado','agente policial','polícia penal','policia penal','segurança pública','seguranca publica'] },
  { id: 'administrativo',name: 'Administrativo',       icon: 'briefcase-outline',    color: '#FBBF24',
    keywords: ['inss','ibge','prefeitura','ministério','ministerio','agente administrativo','assistente administrativo','anp','anatel','anvisa','banco','bancario','bancário','banco central','bacen','bb ','caixa econômica','escriturário','escriturario'] },
  { id: 'operacional',   name: 'Operacional & Logística',   icon: 'git-network-outline',  color: '#34D399',
    keywords: ['operacional','logística','logistica','agente de trânsito','agente de transito','técnico','tecnico','suporte','manutenção','manutencao','agente federal'] },
  { id: 'fiscal',        name: 'Fiscal & Controle',    icon: 'reader-outline',       color: '#FB923C',
    keywords: ['receita federal','sefaz','iss ','fiscal','auditor','tributário','tributario','fisco','tcu','cgu','controladoria','controle interno','auditoria','tcm','tce'] },
  { id: 'saude',         name: 'Saúde',                icon: 'fitness-outline',      color: '#F472B6',
    keywords: ['saúde','saude','sus','enfermeiro','médico','medico','hospital','técnico em saúde','tecnico em saude','farmacêutico','farmaceutico','nutricionista'] },
  { id: 'educacao',      name: 'Educação',             icon: 'book-outline',         color: '#86EFAC',
    keywords: ['professor','educação','educacao','universidade','instituto federal','if ','ufmg','usp','unicamp','docente','pedagogia','escola'] },
  { id: 'militar',       name: 'Militar',              icon: 'medal-outline',        color: '#F87171',
    keywords: ['bombeiro','militar','exército','exercito','marinha','aeronáutica','aeronautica','cfsd','esa','efomm','afa','força'] },
  { id: 'personalizados',name: 'Meus estudos',         icon: 'albums-outline',       color: '#60A5FA', keywords: [] },
];

const matchCategory = (deck) => {
  if (deck.isUserCreated || deck.isExample) return 'personalizados';
  const text = `${deck.name || ''} ${deck.category || ''}`.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.id === 'personalizados') continue;
    if (cat.keywords.some(kw => text.includes(kw))) return cat.id;
  }
  return 'personalizados';
};

// ── Sort config ───────────────────────────────────────────────────

const SORT_OPTIONS = {
  'decks-meus':         [{ id: 'az', label: 'A–Z' }, { id: 'za', label: 'Z–A' }, { id: 'materias', label: 'Mais matérias' }, { id: 'progresso', label: 'Maior %' }],
  'decks-comprados':    [{ id: 'az', label: 'A–Z' }, { id: 'za', label: 'Z–A' }, { id: 'materias', label: 'Mais matérias' }, { id: 'progresso', label: 'Maior %' }],
  'categorias':         [{ id: 'az', label: 'A–Z' }, { id: 'za', label: 'Z–A' }, { id: 'decks', label: 'Mais decks' }],
  'materias-comprados': [{ id: 'az', label: 'A–Z' }, { id: 'za', label: 'Z–A' }, { id: 'cards', label: 'Mais cards' }, { id: 'progresso', label: 'Maior %' }],
};

const getProgress = (subjects = []) => {
  let total = 0, sum = 0;
  subjects.forEach(s => (s.flashcards || []).forEach(c => { total++; sum += c.level || 0; }));
  return total > 0 ? Math.round((sum / (total * 5)) * 100) : 0;
};

const applySort = (items, sortId, sectionKey) => {
  const arr = [...items];
  switch (sortId) {
    case 'az':
      return arr.sort((a, b) => {
        const na = sectionKey === 'categorias' ? a.category.name : sectionKey === 'materias-comprados' ? a.subject.name : a.name;
        const nb = sectionKey === 'categorias' ? b.category.name : sectionKey === 'materias-comprados' ? b.subject.name : b.name;
        return na.localeCompare(nb);
      });
    case 'za':
      return arr.sort((a, b) => {
        const na = sectionKey === 'categorias' ? a.category.name : sectionKey === 'materias-comprados' ? a.subject.name : a.name;
        const nb = sectionKey === 'categorias' ? b.category.name : sectionKey === 'materias-comprados' ? b.subject.name : b.name;
        return nb.localeCompare(na);
      });
    case 'materias':
      return arr.sort((a, b) => (b.subjects?.length || 0) - (a.subjects?.length || 0));
    case 'progresso':
      if (sectionKey === 'materias-comprados')
        return arr.sort((a, b) => {
          const pa = a.subject.flashcards?.length ? Math.round(a.subject.flashcards.reduce((s,c) => s + (c.level||0), 0) / (a.subject.flashcards.length * 5) * 100) : 0;
          const pb = b.subject.flashcards?.length ? Math.round(b.subject.flashcards.reduce((s,c) => s + (c.level||0), 0) / (b.subject.flashcards.length * 5) * 100) : 0;
          return pb - pa;
        });
      return arr.sort((a, b) => getProgress(b.subjects) - getProgress(a.subjects));
    case 'decks':
      return arr.sort((a, b) => (b.decks?.length || 0) - (a.decks?.length || 0));
    case 'cards':
      return arr.sort((a, b) => (b.subject.flashcards?.length || 0) - (a.subject.flashcards?.length || 0));
    default:
      return arr;
  }
};

// ── Loading skeleton ──────────────────────────────────────────────

const GridSkeleton = () => (
  <View style={{ paddingHorizontal: GRID_PADDING, paddingTop: 12 }}>
    {[0, 1, 2].map(row => (
      <View key={row} style={[s.gridRow, { marginBottom: GRID_GAP }]}>
        <SkeletonItem style={{ width: CARD_W, height: CARD_H, borderRadius: 12 }} />
        <SkeletonItem style={{ width: CARD_W, height: CARD_H, borderRadius: 12, opacity: 0.7 }} />
      </View>
    ))}
  </View>
);

// ── Module-level cache (evita flash vazio→skeleton→conteúdo) ──────
const _cache = {};

// ── Main screen ───────────────────────────────────────────────────

export const AllItemsScreen = ({ route, navigation }) => {
  const { sectionKey, title } = route.params;
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [items, setItems] = useState(() => _cache[sectionKey] || []);
  const [loading, setLoading] = useState(!_cache[sectionKey]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSort, setActiveSort] = useState('az');
  const [searchFocused, setSearchFocused] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });
  const searchBorderAnim = useRef(new Animated.Value(0)).current;

  // ── Data loading ───────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const userDecks = await getAppData();
      const purchasedIds = await getPurchasedDecks();
      const purchasedDecks = (await Promise.all(
        purchasedIds.map(id => getDeckCache(id))
      )).filter(Boolean).map(d => ({ ...d, isPurchased: true }));

      switch (sectionKey) {
        case 'decks-meus': {
          const result = userDecks.filter(d => d.isUserCreated && !d.isExample);
          _cache[sectionKey] = result;
          setItems(result);
          break;
        }

        case 'decks-comprados': {
          _cache[sectionKey] = purchasedDecks;
          setItems(purchasedDecks);
          break;
        }

        case 'materias-comprados': {
          const result = [];
          purchasedDecks.forEach(deck => {
            (deck.subjects || []).forEach(subject => {
              result.push({ subject, deck });
            });
          });
          _cache[sectionKey] = result;
          setItems(result);
          break;
        }

        case 'categorias': {
          const result = [];
          CATEGORIES.filter(c => c.id !== 'personalizados').forEach(cat => {
            const catDecks = purchasedDecks.filter(d => matchCategory(d) === cat.id);
            if (catDecks.length > 0) result.push({ category: cat, decks: catDecks });
          });
          const myDecks = userDecks.filter(d => !d.isExample);
          if (myDecks.length > 0) {
            const meusEstudos = CATEGORIES.find(c => c.id === 'personalizados');
            result.push({ category: meusEstudos, decks: myDecks });
          }
          _cache[sectionKey] = result;
          setItems(result);
          break;
        }
      }
    } finally {
      setLoading(false);
    }
  }, [sectionKey]);

  useEffect(() => {
    if (isFocused) {
      const task = InteractionManager.runAfterInteractions(() => loadData());
      return () => task.cancel();
    }
  }, [isFocused, loadData]);

  // ── Derived data ───────────────────────────────────────────────

  const filteredAndSorted = useMemo(() => {
    let result = items;

    // Filter by search
    const q = searchTerm.toLowerCase().trim();
    if (q) {
      result = result.filter(item => {
        switch (sectionKey) {
          case 'decks-meus':
          case 'decks-comprados':
            return item.name?.toLowerCase().includes(q);
          case 'categorias':
            return item.category.name.toLowerCase().includes(q);
          case 'materias-comprados':
            return item.subject.name.toLowerCase().includes(q) ||
                   item.deck.name?.toLowerCase().includes(q);
          default: return true;
        }
      });
    }

    return applySort(result, activeSort, sectionKey);
  }, [items, searchTerm, activeSort, sectionKey]);

  // ── Search focus animation ─────────────────────────────────────

  const onSearchFocus = useCallback(() => {
    setSearchFocused(true);
    Animated.timing(searchBorderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  }, [searchBorderAnim]);

  const onSearchBlur = useCallback(() => {
    if (!searchTerm) {
      setSearchFocused(false);
      Animated.timing(searchBorderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    }
  }, [searchTerm, searchBorderAnim]);

  const searchBorderColor = searchBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.07)', 'rgba(93,214,44,0.45)'],
  });

  // ── Handlers ──────────────────────────────────────────────────

  const handleItemPress = useCallback((item) => {
    switch (sectionKey) {
      case 'decks-meus':
      case 'decks-comprados':
        navigation.navigate('SubjectList', {
          deckId: item.id,
          deckName: item.name,
          preloadedSubjects: item.subjects,
        });
        break;
      case 'categorias':
        // Navigate showing only decks from this category
        // For now, press the first deck in the category, or handle at parent level
        break;
      case 'materias-comprados':
        navigation.navigate('Flashcard', {
          deckId: item.deck.id,
          subjectId: item.subject.id,
          subjectName: item.subject.name,
          preloadedCards: item.subject.flashcards,
        });
        break;
    }
  }, [sectionKey, navigation]);

  const handleDeleteDeck = useCallback(async (deck) => {
    setAlertConfig({
      visible: true,
      title: 'Apagar Deck',
      message: `Apagar "${deck.name}" e todos os seus dados?`,
      buttons: [
        { text: 'Cancelar', style: 'cancel', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) },
        {
          text: 'Apagar', style: 'destructive',
          onPress: async () => {
            const allData = await getAppData();
            await saveAppData(allData.filter(d => d.id !== deck.id));
            setItems(prev => {
              const updated = prev.filter(d => d.id !== deck.id);
              _cache[sectionKey] = updated;
              return updated;
            });
            setAlertConfig(p => ({ ...p, visible: false }));
          },
        },
      ],
    });
  }, [sectionKey]);

  // ── Grid rendering ─────────────────────────────────────────────

  const renderItem = useCallback(({ item }) => {
    switch (sectionKey) {
      case 'decks-meus':
      case 'decks-comprados':
        return (
          <DeckStackCard
            deck={item}
            width={CARD_W}
            height={CARD_H}
            onPress={() => handleItemPress(item)}
            onLongPress={() => {
              if (sectionKey === 'decks-meus') {
                setAlertConfig({
                  visible: true,
                  title: item.name,
                  message: 'O que deseja fazer?',
                  buttons: [
                    { text: 'Renomear', onPress: () => { setAlertConfig(p => ({ ...p, visible: false })); navigation.navigate('EditDeck', { deckId: item.id, deckName: item.name }); } },
                    { text: 'Apagar', style: 'destructive', onPress: () => { setAlertConfig(p => ({ ...p, visible: false })); handleDeleteDeck(item); } },
                    { text: 'Cancelar', style: 'cancel', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) },
                  ],
                });
              }
            }}
          />
        );

      case 'materias-comprados':
        return (
          <MateriaCard
            subject={item.subject}
            deck={item.deck}
            width={CARD_W}
            height={CARD_H}
            onPress={() => handleItemPress(item)}
          />
        );

      case 'categorias':
        return (
          <CategorySvgCard
            category={item.category}
            decks={item.decks}
            onPress={() => handleItemPress(item)}
          />
        );

      default:
        return null;
    }
  }, [sectionKey, handleItemPress, handleDeleteDeck, navigation]);

  const keyExtractor = useCallback((item, index) => {
    switch (sectionKey) {
      case 'decks-meus':
      case 'decks-comprados':
        return item.id || String(index);
      case 'materias-comprados':
        return `${item.deck.id}-${item.subject.id}`;
      case 'categorias':
        return item.category.id;
      default:
        return String(index);
    }
  }, [sectionKey]);

  // ── Render ─────────────────────────────────────────────────────

  const sortOptions = SORT_OPTIONS[sectionKey] || [];
  const canCreate = sectionKey === 'decks-meus';

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Header ──────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerInner}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn} hitSlop={HIT_SLOP}>
            <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
            {!loading && (
              <Text style={s.headerSub}>
                {filteredAndSorted.length} {filteredAndSorted.length === 1 ? 'item' : 'itens'}
                {searchTerm ? ' encontrado' + (filteredAndSorted.length !== 1 ? 's' : '') : ''}
              </Text>
            )}
          </View>

          {canCreate ? (
            <TouchableOpacity
              style={s.headerBtn}
              onPress={() => navigation.navigate('AddDeck')}
              hitSlop={HIT_SLOP}
            >
              <Ionicons name="add" size={24} color={theme.primary} />
            </TouchableOpacity>
          ) : (
            <View style={s.headerBtn} />
          )}
        </View>
        <View style={s.headerDivider} />
      </View>

      {/* ── Search + Sort ──────────────────────────────────── */}
      <View style={s.searchSection}>
        {/* Barra de busca com borda animada */}
        <Animated.View style={[s.searchRow, { borderColor: searchBorderColor }]}>
          <Ionicons
            name="search-outline"
            size={17}
            color={searchFocused ? theme.primary : theme.textMuted}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={s.searchInput}
            placeholder={`Buscar em ${title.toLowerCase()}...`}
            placeholderTextColor={theme.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
            returnKeyType="search"
          />
          {searchTerm.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchTerm('')} hitSlop={HIT_SLOP}>
              <Ionicons name="close-circle" size={17} color={theme.textMuted} />
            </TouchableOpacity>
          ) : (
            !loading && (
              <View style={s.countBadge}>
                <Text style={s.countBadgeTxt}>{items.length}</Text>
              </View>
            )
          )}
        </Animated.View>

        {/* Resultado da busca */}
        {searchTerm.length > 0 && !loading && (
          <View style={s.searchResultRow}>
            <Ionicons name="filter-outline" size={12} color={theme.textMuted} />
            <Text style={s.searchResultTxt}>
              {filteredAndSorted.length === 0
                ? 'Nenhum resultado'
                : `${filteredAndSorted.length} resultado${filteredAndSorted.length !== 1 ? 's' : ''} para "${searchTerm}"`}
            </Text>
          </View>
        )}

        {/* Ordenação */}
        <View style={s.sortHeader}>
          <Ionicons name="swap-vertical-outline" size={13} color={theme.textMuted} />
          <Text style={s.sortHeaderTxt}>Ordenar por</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.sortRow}
        >
          {sortOptions.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[s.sortChip, activeSort === opt.id && s.sortChipActive]}
              onPress={() => setActiveSort(opt.id)}
              activeOpacity={0.75}
            >
              {activeSort === opt.id && (
                <Ionicons name="checkmark" size={11} color={theme.primary} style={{ marginRight: 3 }} />
              )}
              <Text style={[s.sortChipTxt, activeSort === opt.id && s.sortChipTxtActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Content ────────────────────────────────────────── */}
      {loading ? (
        <GridSkeleton />
      ) : filteredAndSorted.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="search-outline" size={36} color={theme.backgroundTertiary} />
          <Text style={s.emptyTxt}>
            {searchTerm ? `Nenhum resultado para "${searchTerm}"` : 'Nenhum item aqui ainda'}
          </Text>
          {canCreate && !searchTerm && (
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => navigation.navigate('AddDeck')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={17} color="#0F0F0F" style={{ marginRight: 6 }} />
              <Text style={s.emptyBtnTxt}>Criar deck</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredAndSorted}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={s.gridRow}
          contentContainerStyle={{ paddingHorizontal: GRID_PADDING, paddingBottom: 24, paddingTop: 12 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
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
  root: {
    flex: 1,
    backgroundColor: theme.background,
  },

  // ── Header
  header: { backgroundColor: theme.background },
  headerInner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  headerSub: { color: theme.textMuted, fontSize: 12, marginTop: 1 },
  headerDivider: { height: 1, backgroundColor: theme.backgroundSecondary },

  // ── Search + Sort
  searchSection: {
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    // borderColor é animada no JSX via Animated.View
  },
  searchInput: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
  },
  countBadge: {
    backgroundColor: theme.backgroundTertiary,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeTxt: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 18,
  },
  searchResultTxt: {
    color: theme.textMuted,
    fontSize: 12,
  },

  // ── Sort
  sortHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  sortHeaderTxt: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sortRow: { paddingHorizontal: 16, gap: 7 },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.backgroundSecondary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sortChipActive: {
    backgroundColor: 'rgba(93,214,44,0.1)',
    borderColor: 'rgba(93,214,44,0.4)',
  },
  sortChipTxt: { color: theme.textMuted, fontSize: 12, fontWeight: '600' },
  sortChipTxtActive: { color: theme.primary },

  // ── Grid
  gridRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },

  // ── Empty
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
    gap: 12,
  },
  emptyTxt: {
    color: theme.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 8,
  },
  emptyBtnTxt: { color: '#0F0F0F', fontSize: 14, fontWeight: '700' },
});

export default AllItemsScreen;
