import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, BackHandler, Dimensions,
  InteractionManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  getAppData, saveAppData, getPurchasedDecks, getDeckCache,
  removePurchasedDeck, saveRecentDeck, getRecentDeckIds, getContinueStudy,
} from '../services/storage';
import { getProducts } from '../services/firebase';
import { isDefaultDeck, canEditDefaultDecks } from '../config/constants';
import { CustomBottomModal } from '../components/ui/CustomBottomModal';
import { CustomAlert } from '../components/ui/CustomAlert';
import theme from '../styles/theme';
import CategorySvgCard from '../components/home/CategorySvgCard';
import DeckStackCard from '../components/home/DeckStackCard';
import MateriaCard from '../components/home/MateriaCard';
import HomeTabBar from '../components/home/HomeTabBar';
import OverflowCard from '../components/home/OverflowCard';
import RecentCard from '../components/home/RecentCard';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 10;
const CARD_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP) / 2;
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.25);
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

// ─────────────────────────────────────────────
// Categorias
// ─────────────────────────────────────────────

const CONCURSO_CATEGORIES = [
  {
    id: 'justica', name: 'Justiça & Direito', icon: 'scale-outline', color: '#818CF8',
    keywords: ['tribunal', 'tj-', 'tjmg', 'tjsp', 'trf', 'trt', 'tre-', 'tse', 'tst',
      'stj', 'stf', 'judiciário', 'judiciario', 'oficial de justiça', 'oficial de justica',
      'juiz', 'promotor', 'defensor', 'procurador', 'ministério público', 'oab',
      'advogado público', 'delegado federal', 'direito'],
  },
  {
    id: 'seguranca', name: 'Segurança Pública', icon: 'shield-half-outline', color: '#A78BFA',
    keywords: ['policia', 'polícia', 'pm ', 'pmmg', 'pc-', 'pcesp', 'pcsp', 'prf', 'pf ',
      'investigador', 'soldado', 'delegado', 'agente policial', 'polícia penal', 'policia penal',
      'segurança pública', 'seguranca publica'],
  },
  {
    id: 'administrativo', name: 'Administrativo', icon: 'briefcase-outline', color: '#FBBF24',
    keywords: ['inss', 'ibge', 'prefeitura', 'ministério', 'ministerio',
      'agente administrativo', 'assistente administrativo', 'anp', 'anatel', 'anvisa',
      'banco', 'bancario', 'bancário', 'banco central', 'bacen', 'bb ', 'caixa econômica',
      'escriturário', 'escriturario'],
  },
  {
    id: 'operacional', name: 'Operacional & Log.', icon: 'git-network-outline', color: '#34D399',
    keywords: ['operacional', 'logística', 'logistica', 'agente de trânsito', 'agente de transito',
      'técnico', 'tecnico', 'suporte', 'manutenção', 'manutencao', 'agente federal'],
  },
  {
    id: 'fiscal', name: 'Fiscal & Controle', icon: 'reader-outline', color: '#FB923C',
    keywords: ['receita federal', 'sefaz', 'iss ', 'fiscal', 'auditor', 'tributário',
      'tributario', 'fisco', 'tcu', 'cgu', 'controladoria', 'controle interno', 'auditoria', 'tcm', 'tce'],
  },
  {
    id: 'saude', name: 'Saúde', icon: 'fitness-outline', color: '#F472B6',
    keywords: ['saúde', 'saude', 'sus', 'enfermeiro', 'médico', 'medico', 'hospital',
      'técnico em saúde', 'tecnico em saude', 'farmacêutico', 'farmaceutico', 'nutricionista'],
  },
  {
    id: 'educacao', name: 'Educação', icon: 'book-outline', color: '#86EFAC',
    keywords: ['professor', 'educação', 'educacao', 'universidade', 'instituto federal',
      'if ', 'ufmg', 'usp', 'unicamp', 'docente', 'pedagogia', 'escola'],
  },
  {
    id: 'militar', name: 'Militar', icon: 'medal-outline', color: '#F87171',
    keywords: ['bombeiro', 'militar', 'exército', 'exercito', 'marinha',
      'aeronáutica', 'aeronautica', 'cfsd', 'esa', 'efomm', 'afa', 'força'],
  },
  {
    id: 'personalizados', name: 'Meus estudos', icon: 'albums-outline', color: '#60A5FA',
    keywords: [],
  },
];

const leftCats  = CONCURSO_CATEGORIES.filter((_, i) => i % 2 === 0);
const rightCats = CONCURSO_CATEGORIES.filter((_, i) => i % 2 !== 0);

const matchConcursoCategory = (deck) => {
  if (deck.isUserCreated || deck.isExample) return 'personalizados';
  const text = `${deck.name || ''} ${deck.category || ''}`.toLowerCase();
  for (const cat of CONCURSO_CATEGORIES) {
    if (cat.id === 'personalizados') continue;
    if (cat.keywords.some(kw => text.includes(kw))) return cat.id;
  }
  return 'personalizados'; // fallback em "Meus estudos"
};

// ─────────────────────────────────────────────
// Utilitários SRS
// ─────────────────────────────────────────────

const getProgressColor = (subjects) => {
  let total = 0, sum = 0;
  (subjects || []).forEach(s => (s.flashcards || []).forEach(c => { total++; sum += c.level || 0; }));
  if (total === 0) return theme.srsLevel0;
  return theme[`srsLevel${Math.min(5, Math.round(sum / total))}`];
};

const getProgressPercent = (subjects) => {
  let total = 0, sum = 0;
  (subjects || []).forEach(s => (s.flashcards || []).forEach(c => { total++; sum += c.level || 0; }));
  return total > 0 ? Math.round((sum / (total * 5)) * 100) : 0;
};

const getTotalCards = (subjects) =>
  (subjects || []).reduce((sum, s) => sum + (s.flashcards?.length || 0), 0);

// ─────────────────────────────────────────────
// Header — "Início"
// ─────────────────────────────────────────────

const HomeHeader = ({ onMenuPress, multiSelectMode, selectedCount, onBack, insetTop }) => (
  <View style={[hhStyles.wrapper, { paddingTop: insetTop }]}>
    <View style={hhStyles.container}>
      {multiSelectMode ? (
        <>
          <TouchableOpacity onPress={onBack} style={hhStyles.iconBtn} hitSlop={HIT_SLOP}>
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={hhStyles.multiTitle}>{selectedCount} selecionado(s)</Text>
          <View style={hhStyles.iconBtn} />
        </>
      ) : (
        <>
          <View style={hhStyles.logoRow}>
            <View style={hhStyles.logoMark}>
              <Ionicons name="flash" size={13} color={theme.background} />
            </View>
            <Text style={hhStyles.logoText}>Início</Text>
          </View>
          <TouchableOpacity onPress={onMenuPress} style={hhStyles.iconBtn} hitSlop={HIT_SLOP}>
            <Ionicons name="menu-outline" size={26} color={theme.textPrimary} />
          </TouchableOpacity>
        </>
      )}
    </View>
    <View style={hhStyles.divider} />
  </View>
);


// ─────────────────────────────────────────────
// Mini card: deck exemplo (dismissível)
// ─────────────────────────────────────────────

const MiniExampleCard = ({ onPress, onDismiss }) => (
  <View style={miniStyles.card}>
    <View style={[miniStyles.iconWrap, { backgroundColor: '#6366F120' }]}>
      <Ionicons name="albums-outline" size={22} color="#6366F1" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={miniStyles.title}>Deck de Exemplo</Text>
      <Text style={miniStyles.sub}>Explore como o app funciona</Text>
    </View>
    <TouchableOpacity style={miniStyles.actionBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={miniStyles.actionText}>Explorar</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={onDismiss} hitSlop={HIT_SLOP} style={miniStyles.dismissBtn}>
      <Ionicons name="close" size={16} color={theme.textMuted} />
    </TouchableOpacity>
  </View>
);

// ─────────────────────────────────────────────
// Mini card: continuar estudando
// ─────────────────────────────────────────────

const MiniContinueCard = ({ continueStudy, onPress }) => (
  <TouchableOpacity style={[miniStyles.card, miniStyles.continueCard]} onPress={onPress} activeOpacity={0.85}>
    <View style={[miniStyles.iconWrap, { backgroundColor: theme.primaryTransparent }]}>
      <Ionicons name="play-circle" size={26} color={theme.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={miniStyles.continueLabel}>CONTINUAR</Text>
      <Text style={miniStyles.title} numberOfLines={1}>{continueStudy.subjectName}</Text>
      <Text style={miniStyles.sub} numberOfLines={1}>{continueStudy.deckName}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={theme.primary} />
  </TouchableOpacity>
);

// ─────────────────────────────────────────────
// Card de destaque/continuar — LEGADO (não usado, mantido para referência)
// ─────────────────────────────────────────────

const FeaturedCard = ({ label, title, subtitle, accentColor, onPress }) => {
  const color = accentColor || theme.primary;
  return (
    <TouchableOpacity
      style={[fStyles.card, { borderColor: color + '50' }]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Borda lateral colorida forte */}
      <View style={[fStyles.leftBorder, { backgroundColor: color }]} />

      {/* Fundo tintado visível */}
      <View style={[fStyles.tint, { backgroundColor: color + '20' }]} />

      <View style={fStyles.body}>
        <View style={{ flex: 1 }}>
          <View style={[fStyles.labelWrap, { backgroundColor: color + '30' }]}>
            <Text style={[fStyles.label, { color }]}>{label}</Text>
          </View>
          <Text style={fStyles.title} numberOfLines={2}>{title}</Text>
          {!!subtitle && <Text style={fStyles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
        <View style={[fStyles.playBtn, { backgroundColor: color }]}>
          <Ionicons name="play" size={20} color={theme.background} />
        </View>
      </View>

      <View style={[fStyles.bottomAccent, { backgroundColor: color + '60' }]} />
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────
// Card de deck recente — compacto com ícone + stats
// ─────────────────────────────────────────────

const RecentDeckCard = ({ deck, onPress }) => {
  const srsColor = getProgressColor(deck.subjects);
  const progressPct = getProgressPercent(deck.subjects);
  const totalCards = getTotalCards(deck.subjects);
  // Decks sem progresso teriam cinza -- usar cor da categoria ou azul como fallback
  const catId = matchConcursoCategory(deck);
  const catColor = CONCURSO_CATEGORIES.find(c => c.id === catId)?.color;
  const iconColor = progressPct > 0 ? srsColor : (catColor || '#6366F1');

  return (
    <TouchableOpacity style={rcStyles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Zona colorida de ícone */}
      <View style={[rcStyles.iconZone, { backgroundColor: iconColor + '35' }]}>
        <View style={[rcStyles.iconCircle, { backgroundColor: iconColor + '50', borderColor: iconColor + '80' }]}>
          <Ionicons name="layers" size={20} color={iconColor} />
        </View>
        {progressPct > 0 && (
          <Text style={[rcStyles.pctBadge, { color: iconColor }]}>{progressPct}%</Text>
        )}
      </View>
      <View style={rcStyles.info}>
        <Text style={rcStyles.name} numberOfLines={2}>{deck.name}</Text>
        <Text style={rcStyles.stats}>
          {totalCards} card{totalCards !== 1 ? 's' : ''}
        </Text>
      </View>
      {/* Barra de progresso */}
      <View style={rcStyles.progressBar}>
        <View style={[rcStyles.progressFill, { width: progressPct > 0 ? `${progressPct}%` : '0%', backgroundColor: iconColor }]} />
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────
// Pill de categoria — scroll horizontal compacto
// ─────────────────────────────────────────────

const CategoryCard = ({ category, deckCount, onPress, isActive }) => {
  const color = category.color;
  return (
    <TouchableOpacity
      style={[cpStyles.card, isActive && { borderColor: color + 'CC', borderWidth: 2 }]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      {/* Header colorido estilo pasta */}
      <View style={[cpStyles.header, { backgroundColor: color + '22' }]}>
        {/* Blobs decorativos */}
        <View style={[cpStyles.blob1, { backgroundColor: color + '40' }]} />
        <View style={[cpStyles.blob2, { backgroundColor: color + '28' }]} />
        {/* Ícone principal */}
        <Ionicons name={category.icon} size={34} color={color} style={{ zIndex: 2 }} />
        {/* Badge de quantidade */}
        {deckCount > 0 && (
          <View style={[cpStyles.badge, { backgroundColor: color }]}>
            <Text style={cpStyles.badgeText}>{deckCount}</Text>
          </View>
        )}
      </View>
      {/* Linha colorida separadora */}
      <View style={[cpStyles.divider, { backgroundColor: color + (isActive ? 'FF' : 'AA') }]} />
      {/* Footer com nome */}
      <View style={cpStyles.footer}>
        <Text style={[cpStyles.name, isActive && { color }]} numberOfLines={2}>
          {category.name}
        </Text>
        <Text style={[cpStyles.count, { color: color + 'CC' }]}>
          {deckCount > 0 ? `${deckCount} deck${deckCount > 1 ? 's' : ''}` : 'Explorar'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ─────────────────────────────────────────────
// Category folder card — 2-column stacked
// ─────────────────────────────────────────────

// CategoryFolderCard removido — substituído por CategorySvgCard em home/

// ─────────────────────────────────────────────
// DeckCard — grid (expandido)
// ─────────────────────────────────────────────

const DeckCard = ({ deck, onPress, onLongPress, isSelected, multiSelectMode }) => {
  const progressColor = getProgressColor(deck.subjects);
  const progressPercent = getProgressPercent(deck.subjects);
  const subjectCount = deck.subjects?.length || 0;

  return (
    <TouchableOpacity
      style={[cardStyles.card, isSelected && cardStyles.cardSelected]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={[cardStyles.leftAccent, { backgroundColor: isSelected ? theme.primary : progressColor }]} />

      {multiSelectMode && (
        <View style={cardStyles.checkmark}>
          <Ionicons
            name={isSelected ? 'checkbox' : 'square-outline'}
            size={20} color={isSelected ? theme.primary : theme.textMuted}
          />
        </View>
      )}

      {deck.isExample && (
        <View style={cardStyles.exampleBadge}>
          <Text style={cardStyles.exampleBadgeText}>Exemplo</Text>
        </View>
      )}

      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <Text style={cardStyles.name} numberOfLines={3}>{deck.name || 'Deck sem nome'}</Text>
        <View>
          {deck.category ? (
            <Text style={cardStyles.category} numberOfLines={1}>{deck.category}</Text>
          ) : null}
          <Text style={cardStyles.subjectCount}>
            {subjectCount} {subjectCount === 1 ? 'matéria' : 'matérias'}
          </Text>
        </View>
      </View>

      <View style={cardStyles.progressBarBg}>
        <View style={[cardStyles.progressBarFill, {
          width: progressPercent > 0 ? `${progressPercent}%` : 4,
          backgroundColor: progressColor,
        }]} />
      </View>
    </TouchableOpacity>
  );
};

const CreateDeckCard = ({ onPress }) => (
  <TouchableOpacity style={cardStyles.createCard} onPress={onPress} activeOpacity={0.7}>
    <View style={cardStyles.createIconWrap}>
      <Ionicons name="add" size={24} color={theme.primary} />
    </View>
    <Text style={cardStyles.createCardText}>Criar deck</Text>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────
// Helpers de grid
// ─────────────────────────────────────────────

const renderGridRows = (items, renderCard) => {
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
  return rows;
};

// ─────────────────────────────────────────────
// Tela principal
// ─────────────────────────────────────────────

export const DeckListScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(!global.screenCache?.decks);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentDeckIds, setRecentDeckIds] = useState([]);
  const [continueStudy, setContinueStudy] = useState(null);
  const [allowDefaultDeckEditing, setAllowDefaultDeckEditing] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedDecks, setSelectedDecks] = useState(new Set());
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [exampleDismissed, setExampleDismissed] = useState(false);
  // Novos estados para o redesign
  const [activeTab, setActiveTab] = useState('decks');          // 'categorias' | 'decks' | 'materias'
  const [invertedOrder, setInvertedOrder] = useState(false);    // inverter meus/comprados
  const [expandedSections, setExpandedSections] = useState({}); // { 'decks-meus': true, ... }
  const isFocused = useIsFocused();
  const searchRef = useRef(null);

  // ── Carregamento ──────────────────────────

  const loadData = useCallback(async () => {
    const shouldShowSkeleton = decks.length === 0 && !global.screenCache?.decks;
    if (shouldShowSkeleton) setLoading(true);
    const minDelay = shouldShowSkeleton ? new Promise(r => setTimeout(r, 400)) : Promise.resolve();
    try {
      const userDecks = await getAppData();
      const purchasedIds = await getPurchasedDecks();
      let validProductIds = null;
      try {
        const products = await getProducts();
        validProductIds = new Set(products.map(p => p.deckId || p.id));
      } catch (_) {}
      const purchasedDecks = await Promise.all(
        purchasedIds.map(async (deckId) => {
          if (validProductIds && !validProductIds.has(deckId)) {
            await removePurchasedDeck(deckId);
            return null;
          }
          const deck = await getDeckCache(deckId);
          return deck ? { ...deck, isPurchased: true, name: deck.name || deckId } : null;
        })
      );
      await minDelay;
      setDecks([...userDecks, ...purchasedDecks.filter(Boolean)]);
      const allowEditing = await canEditDefaultDecks();
      setAllowDefaultDeckEditing(allowEditing);
      if (global.screenCache) global.screenCache.decks = true;
    } catch (error) {
      console.error('Error loading decks:', error);
    } finally {
      if (shouldShowSkeleton) setLoading(false);
    }
  }, [decks.length]);

  const loadSecondaryData = useCallback(async () => {
    const [ids, continueData, dismissed] = await Promise.all([
      getRecentDeckIds(),
      getContinueStudy(),
      AsyncStorage.getItem('dismissedExampleDeck').catch(() => null),
    ]);
    setRecentDeckIds(ids);
    setContinueStudy(continueData);
    setExampleDismissed(dismissed === 'true');
  }, []);

  const handleDismissExample = useCallback(async () => {
    setExampleDismissed(true);
    await AsyncStorage.setItem('dismissedExampleDeck', 'true').catch(() => {});
  }, []);

  useEffect(() => {
    if (isFocused) {
      const task = InteractionManager.runAfterInteractions(() => {
        loadData();
        loadSecondaryData();
      });
      return () => task.cancel();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  // ── Drawer / swipe ────────────────────────

  useEffect(() => {
    const drawerNav = navigation.getParent();
    if (!drawerNav) return;
    const unsubFocus = navigation.addListener('focus', () => drawerNav.setOptions({ swipeEnabled: true }));
    const unsubBlur = navigation.addListener('blur', () => drawerNav.setOptions({ swipeEnabled: false }));
    return () => { unsubFocus(); unsubBlur(); };
  }, [navigation]);

  useEffect(() => {
    const drawerNav = navigation.getParent();
    if (drawerNav && isFocused) drawerNav.setOptions({ swipeEnabled: !multiSelectMode });
  }, [multiSelectMode, navigation, isFocused]);

  // ── Back handler ──────────────────────────

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFocused && multiSelectMode) {
        setMultiSelectMode(false); setSelectedDecks(new Set()); return true;
      }
      if (isFocused && activeCategoryId) { setActiveCategoryId(null); return true; }
      if (isFocused && searchTerm) { setSearchTerm(''); return true; }
      return false;
    });
    return () => handler.remove();
  }, [isFocused, multiSelectMode, activeCategoryId, searchTerm]);

  // ── Dados derivados ───────────────────────

  const userDecks = useMemo(() =>
    decks.filter(d => d.isUserCreated === true || d.isExample === true),
  [decks]);

  const purchasedDecks = useMemo(() =>
    decks.filter(d => d.isPurchased === true),
  [decks]);

  const categoryCounts = useMemo(() => {
    const counts = { personalizados: userDecks.length };
    purchasedDecks.forEach(deck => {
      const catId = matchConcursoCategory(deck);
      if (catId) counts[catId] = (counts[catId] || 0) + 1;
    });
    return counts;
  }, [purchasedDecks, userDecks]);

  const expandedDecks = useMemo(() => {
    if (!activeCategoryId) return [];
    if (activeCategoryId === 'personalizados') return userDecks;
    return purchasedDecks.filter(d => matchConcursoCategory(d) === activeCategoryId);
  }, [activeCategoryId, userDecks, purchasedDecks]);

  const recentDecks = useMemo(() =>
    recentDeckIds.map(id => decks.find(d => d.id === id)).filter(Boolean).slice(0, 3),
  [recentDeckIds, decks]);

  const exampleDeck = useMemo(() => decks.find(d => d.isExample), [decks]);

  const continueStudyPct = useMemo(() => {
    if (!continueStudy) return 0;
    const deck = decks.find(d => d.id === continueStudy.deckId);
    return deck ? getProgressPercent(deck.subjects) : 0;
  }, [continueStudy, decks]);

  // ── Dados derivados novos ─────────────────

  // Primeiro acesso: sem decks do usuário E sem comprados E exemplo não dispensado
  const isFirstAccess = useMemo(() =>
    userDecks.filter(d => !d.isExample).length === 0 &&
    purchasedDecks.length === 0 &&
    !exampleDismissed,
  [userDecks, purchasedDecks, exampleDismissed]);

  // Categorias que têm pelo menos 1 deck
  const activeCategories = useMemo(() => {
    const result = [];
    // Categorias de concurso com decks comprados
    CONCURSO_CATEGORIES.filter(c => c.id !== 'personalizados').forEach(cat => {
      const catDecks = purchasedDecks.filter(d => matchConcursoCategory(d) === cat.id);
      if (catDecks.length > 0) result.push({ category: cat, decks: catDecks });
    });
    // "Meus estudos" — decks do usuário (exceto exemplo)
    const myDecks = userDecks.filter(d => !d.isExample);
    if (myDecks.length > 0) {
      const meusEstudos = CONCURSO_CATEGORIES.find(c => c.id === 'personalizados');
      result.push({ category: meusEstudos, decks: myDecks });
    }
    return result;
  }, [purchasedDecks, userDecks]);

  // Flat list de matérias dos decks comprados
  const allSubjects = useMemo(() => {
    const result = [];
    purchasedDecks.forEach(deck => {
      (deck.subjects || []).forEach(subject => {
        result.push({ subject, deck, isPurchased: true });
      });
    });
    return result;
  }, [purchasedDecks]);

  // Recentes (max 4)
  const recentDecksLimited = useMemo(() =>
    recentDeckIds.map(id => decks.find(d => d.id === id)).filter(Boolean).slice(0, 4),
  [recentDeckIds, decks]);

  // ── Search ────────────────────────────────

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase().trim();
    const results = [];
    const addedDecks = new Set();
    const addedSubjects = new Set();
    decks.forEach(deck => {
      if (deck.name?.toLowerCase().includes(term) && !addedDecks.has(deck.id)) {
        results.push({ type: 'deck', label: deck.name, sublabel: deck.category || 'Deck', deck });
        addedDecks.add(deck.id);
      }
      deck.subjects?.forEach(subj => {
        const key = `${deck.id}:${subj.id}`;
        if (subj.name?.toLowerCase().includes(term) && !addedSubjects.has(key)) {
          results.push({ type: 'subject', label: subj.name, sublabel: deck.name, deck, subjectId: subj.id });
          addedSubjects.add(key);
        }
      });
    });
    CONCURSO_CATEGORIES.forEach(cat => {
      if (cat.name.toLowerCase().includes(term))
        results.push({ type: 'category', label: cat.name, sublabel: 'Categoria', category: cat });
    });
    return results.slice(0, 15);
  }, [decks, searchTerm]);

  // ── Handlers ─────────────────────────────

  const handleDeckPress = useCallback(async (deck) => {
    if (multiSelectMode) { toggleDeckSelection(deck.id); return; }
    await saveRecentDeck(deck.id);
    navigation.navigate('SubjectList', {
      deckId: deck.id, deckName: deck.name, preloadedSubjects: deck.subjects,
    });
  }, [multiSelectMode, navigation]);

  const handleDeckLongPress = (deck) => {
    if (!multiSelectMode && (allowDefaultDeckEditing || !isDefaultDeck(deck.id))) {
      setMultiSelectMode(true);
      setSelectedDecks(new Set([deck.id]));
    }
  };

  const handleContinuePress = () => {
    if (!continueStudy) return;
    const deck = decks.find(d => d.id === continueStudy.deckId);
    if (!deck) return;
    navigation.navigate('SubjectList', { deckId: deck.id, deckName: deck.name, preloadedSubjects: deck.subjects });
  };

  const handleCategoryPress = (category) => {
    if (activeCategoryId === category.id) { setActiveCategoryId(null); return; }
    const count = categoryCounts[category.id] || 0;
    if (count === 0 && category.id !== 'personalizados') { navigation.navigate('Loja'); return; }
    setActiveCategoryId(category.id);
    setMultiSelectMode(false);
    setSelectedDecks(new Set());
  };

  const toggleDeckSelection = (deckId) => {
    const next = new Set(selectedDecks);
    next.has(deckId) ? next.delete(deckId) : next.add(deckId);
    setSelectedDecks(next);
  };

  const deleteSelectedDecks = async () => {
    if (selectedDecks.size === 0) return;
    setAlertConfig({
      visible: true, title: 'Apagar Decks',
      message: `Apagar ${selectedDecks.size} deck(s)? Essa ação não pode ser desfeita.`,
      buttons: [
        { text: 'Cancelar', style: 'cancel', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) },
        { text: 'Apagar', style: 'destructive', onPress: async () => {
          const allData = await getAppData();
          await saveAppData(allData.filter(d => !selectedDecks.has(d.id)));
          await Promise.all(Array.from(selectedDecks).map(id => removePurchasedDeck(id)));
          setMultiSelectMode(false); setSelectedDecks(new Set());
          loadData(); setAlertConfig(p => ({ ...p, visible: false }));
        }},
      ],
    });
  };

  const performDelete = async () => {
    if (!selectedDeck) return;
    if (isDefaultDeck(selectedDeck.id)) {
      const canEdit = await canEditDefaultDecks();
      if (!canEdit) {
        setModalVisible(false);
        setAlertConfig({ visible: true, title: 'Deck Protegido', message: 'Ative "Permitir edição de decks padrão" nas Configurações para apagar.', buttons: [{ text: 'OK', onPress: () => setAlertConfig(p => ({ ...p, visible: false })) }] });
        return;
      }
    }
    setModalVisible(false);
    setAlertConfig({
      visible: true, title: 'Apagar Deck',
      message: `Apagar "${selectedDeck.name}" e todos os seus dados?`,
      buttons: [
        { text: 'Cancelar', style: 'cancel', onPress: () => { setSelectedDeck(null); setAlertConfig(p => ({ ...p, visible: false })); } },
        { text: 'Apagar', style: 'destructive', onPress: async () => {
          const allData = await getAppData();
          await saveAppData(allData.filter(d => d.id !== selectedDeck.id));
          loadData(); setSelectedDeck(null); setAlertConfig(p => ({ ...p, visible: false }));
        }},
      ],
    });
  };

  const openDrawer = () => navigation.getParent()?.openDrawer();
  const exitMultiSelect = () => { setMultiSelectMode(false); setSelectedDecks(new Set()); };

  // ── Skeleton ──────────────────────────────

  if (loading) {
    return (
      <View style={s.container}>
        <HomeHeader onMenuPress={openDrawer} multiSelectMode={false} selectedCount={0} onBack={exitMultiSelect} insetTop={insets.top} />
        <View style={s.searchBarWrapper}>
          <View style={s.searchBarSkeleton} />
        </View>
        <View style={{ paddingHorizontal: GRID_PADDING, paddingTop: 12, gap: 12 }}>
          <View style={s.featuredSkeleton} />
          <View style={s.gridRow}>
            <View style={[s.cardSkeleton, { opacity: 0.8 }]} />
            <View style={[s.cardSkeleton, { opacity: 0.6 }]} />
          </View>
          <View style={s.gridRow}>
            <View style={[s.cardSkeleton, { opacity: 0.4 }]} />
            <View style={[s.cardSkeleton, { opacity: 0.25 }]} />
          </View>
        </View>
      </View>
    );
  }

  const isSearching = searchTerm.trim().length > 0;

  // ── Helpers de grid com overflow ──────────
  const MAX_VISIBLE = 8;

  const renderGridWithOverflow = (items, renderCard, sectionKey) => {
    const isExpanded = expandedSections[sectionKey];
    const visible = isExpanded ? items : items.slice(0, MAX_VISIBLE);
    const overflowCount = items.length - (MAX_VISIBLE - 1);
    const showOverflow = !isExpanded && items.length > MAX_VISIBLE;

    const displayItems = showOverflow ? items.slice(0, MAX_VISIBLE - 1) : visible;
    const rows = [];
    for (let i = 0; i < displayItems.length; i += 2) {
      rows.push(
        <View key={i} style={s.gridRow}>
          {renderCard(displayItems[i], i)}
          {displayItems[i + 1]
            ? renderCard(displayItems[i + 1], i + 1)
            : <View style={{ width: CARD_WIDTH }} />}
        </View>
      );
    }
    if (showOverflow) {
      rows.push(
        <View key="overflow-row" style={s.gridRow}>
          {displayItems.length % 2 === 0
            ? <View style={{ width: CARD_WIDTH }} />
            : null}
          <OverflowCard
            count={overflowCount}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            onPress={() => setExpandedSections(prev => ({ ...prev, [sectionKey]: true }))}
          />
        </View>
      );
    }
    return rows;
  };

  // ── Render ────────────────────────────────

  return (
    <View style={s.container}>
      <HomeHeader
        onMenuPress={openDrawer}
        multiSelectMode={multiSelectMode}
        selectedCount={selectedDecks.size}
        onBack={exitMultiSelect}
        insetTop={insets.top}
      />

      <View style={s.searchBarWrapper}>
        <View style={[s.searchBar, searchFocused && s.searchBarFocused]}>
          <Ionicons name="search" size={17} color={isSearching ? theme.primary : theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            ref={searchRef}
            style={s.searchInput}
            placeholder="Buscar decks, matérias ou categorias..."
            placeholderTextColor={theme.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {isSearching && (
            <TouchableOpacity onPress={() => setSearchTerm('')} hitSlop={HIT_SLOP}>
              <Ionicons name="close-circle" size={17} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        /* ── Busca ── */
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.searchContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {searchResults.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="search-outline" size={36} color={theme.backgroundTertiary} />
              <Text style={s.emptyStateText}>Nenhum resultado para "{searchTerm}"</Text>
            </View>
          ) : searchResults.map((item, index) => (
            <TouchableOpacity
              key={`${item.type}-${index}`}
              style={s.searchResultItem}
              onPress={() => { setSearchTerm(''); if (item.type === 'deck' || item.type === 'subject') handleDeckPress(item.deck); }}
              activeOpacity={0.7}
            >
              <View style={s.searchResultIcon}>
                <Ionicons
                  name={item.type === 'subject' ? 'book-outline' : item.type === 'category' ? item.category.icon : 'layers-outline'}
                  size={17}
                  color={theme.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.searchResultLabel} numberOfLines={1}>{item.label}</Text>
                <Text style={s.searchResultSub} numberOfLines={1}>{item.sublabel}</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color={theme.textMuted} />
            </TouchableOpacity>
          ))}
        </ScrollView>

      ) : isFirstAccess ? (
        /* ── Primeiro acesso ── */
        <ScrollView style={s.firstAccessScroll} contentContainerStyle={s.firstAccessScrollContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
          <View style={s.firstAccessContent}>
            {/* Card deck de exemplo */}
            <TouchableOpacity
              style={s.exampleCard}
              onPress={() => exampleDeck && handleDeckPress(exampleDeck)}
              activeOpacity={0.85}
            >
              <View style={s.exampleCardLabel}>
                <Text style={s.exampleCardLabelText}>DECK DE EXEMPLO</Text>
              </View>
              <Text style={s.exampleCardTitle}>Como funciona o app?</Text>
              <Text style={s.exampleCardSub}>Toque para ver seus primeiros flashcards e entender o sistema de revisão espaçada</Text>
              <View style={s.exampleCardBtn}>
                <Text style={s.exampleCardBtnText}>Explorar exemplo →</Text>
              </View>
            </TouchableOpacity>

            {/* Botão criar primeiro deck */}
            <TouchableOpacity
              style={s.createFirstBtn}
              onPress={() => navigation.navigate('AddDeck')}
              activeOpacity={0.8}
            >
              <View style={s.createFirstBtnIcon}>
                <Ionicons name="add" size={20} color={theme.background} />
              </View>
              <Text style={s.createFirstBtnText}>Criar meu primeiro deck</Text>
            </TouchableOpacity>

            {/* Botão loja */}
            <TouchableOpacity
              style={s.lojaBtn}
              onPress={() => navigation.navigate('Loja')}
              activeOpacity={0.8}
            >
              <Ionicons name="storefront-outline" size={18} color={theme.textPrimary} />
              <Text style={s.lojaBtnText}>Explorar a loja</Text>
            </TouchableOpacity>

            {/* Por onde começar — somem quando criar o primeiro deck */}
            <View style={s.stepsSection}>
              <View style={s.stepsSectionLabelRow}>
                <Text style={s.stepsSectionLabel}>POR ONDE COMEÇAR?</Text>
                <View style={s.stepsSectionDivider} />
              </View>
              <View style={s.stepsList}>
                <View style={s.stepItem}>
                  <View style={s.stepNumber}>
                    <Text style={s.stepNumberText}>1</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.stepTitle}>Crie ou compre um deck</Text>
                    <Text style={s.stepSub}>Use os botões acima para começar</Text>
                  </View>
                </View>
                <View style={s.stepItem}>
                  <View style={s.stepNumber}>
                    <Text style={s.stepNumberText}>2</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.stepTitle}>Adicione matérias e flashcards</Text>
                    <Text style={s.stepSub}>Organize seu conteúdo de estudo</Text>
                  </View>
                </View>
                <View style={[s.stepItem, { borderBottomWidth: 0 }]}>
                  <View style={s.stepNumber}>
                    <Text style={s.stepNumberText}>3</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.stepTitle}>Estude e evolua</Text>
                    <Text style={s.stepSub}>Acompanhe seu progresso</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

      ) : (
        /* ── Com conteúdo ── */
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.mainContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* 1. RECENTES */}
          {recentDecksLimited.length > 0 && (
            <View style={s.recentSection}>
              <Text style={s.sectionLabel}>RECENTES</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.recentScroll}
              >
                {recentDecksLimited.map(deck => (
                  <RecentCard
                    key={deck.id}
                    deck={deck}
                    onPress={() => handleDeckPress(deck)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* 2. BOTÃO CRIAR DECK */}
          <View style={s.createDeckWrapper}>
            <TouchableOpacity
              style={s.createDeckBtn}
              onPress={() => navigation.navigate('AddDeck')}
              activeOpacity={0.8}
            >
              <View style={s.createDeckIcon}>
                <Ionicons name="add" size={18} color={theme.primary} />
              </View>
              <Text style={s.createDeckBtnText}>Criar deck</Text>
            </TouchableOpacity>
          </View>

          {/* 3. TAB BAR */}
          <View style={s.tabBarWrapper}>
            <HomeTabBar activeTab={activeTab} onTabChange={setActiveTab} />
          </View>

          {/* 4. CONTEÚDO DA ABA */}
          <View style={s.tabContent}>

            {/* ── ABA CATEGORIAS ── */}
            {activeTab === 'categorias' && (
              activeCategories.length === 0 ? (
                <View style={s.emptyTab}>
                  <Ionicons name="folder-open-outline" size={36} color={theme.backgroundTertiary} />
                  <Text style={s.emptyTabText}>Nenhuma categoria ainda.</Text>
                  <Text style={s.emptyTabSub}>Crie um deck ou explore a loja para ver categorias aqui.</Text>
                </View>
              ) : (
                <>
                  <View style={s.tabSectionHeader}>
                    <Text style={s.sectionLabel}>
                      {invertedOrder ? 'COMPRADOS PRIMEIRO' : 'SEUS PRIMEIRO'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setInvertedOrder(v => !v)}
                      hitSlop={HIT_SLOP}
                      style={s.invertBtn}
                    >
                      <Text style={s.invertBtnText}>Inverter ⇅</Text>
                    </TouchableOpacity>
                  </View>
                  {renderGridWithOverflow(
                    invertedOrder
                      ? [...activeCategories].reverse()
                      : activeCategories,
                    (item, idx) => (
                      <CategorySvgCard
                        key={item.category.id}
                        category={item.category}
                        decks={item.decks}
                        width={CARD_WIDTH}
                        onPress={() => handleCategoryPress(item.category)}
                      />
                    ),
                    'categorias',
                  )}
                </>
              )
            )}

            {/* ── ABA DECKS ── */}
            {activeTab === 'decks' && (() => {
              const meusDecks = userDecks.filter(d => !d.isExample);
              const compradosDecks = purchasedDecks;
              const hasMeus = meusDecks.length > 0;
              const hasComprados = compradosDecks.length > 0;

              if (!hasMeus && !hasComprados) {
                return (
                  <View style={s.emptyTab}>
                    <Ionicons name="layers-outline" size={36} color={theme.backgroundTertiary} />
                    <Text style={s.emptyTabText}>Nenhum deck ainda.</Text>
                    <TouchableOpacity style={s.emptyTabAction} onPress={() => navigation.navigate('Loja')}>
                      <Text style={s.emptyTabActionText}>Ver na loja</Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              const sections = invertedOrder
                ? [
                    hasComprados && { key: 'comprados', label: 'COMPRADOS', items: compradosDecks },
                    hasMeus && { key: 'meus', label: 'MEUS', items: meusDecks },
                  ]
                : [
                    hasMeus && { key: 'meus', label: 'MEUS', items: meusDecks },
                    hasComprados && { key: 'comprados', label: 'COMPRADOS', items: compradosDecks },
                  ];

              return (
                <>
                  <View style={s.tabSectionHeader}>
                    <Text style={s.sectionLabel}>
                      {invertedOrder ? 'COMPRADOS PRIMEIRO' : 'SEUS PRIMEIRO'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setInvertedOrder(v => !v)}
                      hitSlop={HIT_SLOP}
                      style={s.invertBtn}
                    >
                      <Text style={s.invertBtnText}>Inverter ⇅</Text>
                    </TouchableOpacity>
                  </View>
                  {sections.filter(Boolean).map(section => (
                    <View key={section.key} style={s.subSection}>
                      <Text style={s.subSectionLabel}>{section.label}</Text>
                      {renderGridWithOverflow(
                        section.items,
                        (deck, idx) => (
                          <DeckStackCard
                            key={deck.id}
                            deck={deck}
                            width={CARD_WIDTH}
                            height={CARD_HEIGHT}
                            onPress={() => handleDeckPress(deck)}
                            onLongPress={() => handleDeckLongPress(deck)}
                            isSelected={selectedDecks.has(deck.id)}
                            multiSelectMode={multiSelectMode}
                          />
                        ),
                        `decks-${section.key}`,
                      )}
                      {multiSelectMode && selectedDecks.size > 0 && (
                        <TouchableOpacity onPress={deleteSelectedDecks} style={s.deleteSelBtn}>
                          <Ionicons name="trash-outline" size={14} color={theme.danger} />
                          <Text style={s.deleteSelBtnText}>Apagar ({selectedDecks.size})</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </>
              );
            })()}

            {/* ── ABA MATÉRIAS ── */}
            {activeTab === 'materias' && (
              allSubjects.length === 0 ? (
                <View style={s.emptyTab}>
                  <Ionicons name="book-outline" size={36} color={theme.backgroundTertiary} />
                  <Text style={s.emptyTabText}>Nenhuma matéria comprada ainda.</Text>
                  <TouchableOpacity style={s.emptyTabAction} onPress={() => navigation.navigate('Loja')}>
                    <Text style={s.emptyTabActionText}>Ver na loja</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={s.subSection}>
                    <Text style={s.subSectionLabel}>COMPRADOS</Text>
                    {renderGridWithOverflow(
                      allSubjects,
                      (item, idx) => (
                        <MateriaCard
                          key={`${item.deck.id}-${item.subject.id}`}
                          subject={item.subject}
                          deck={item.deck}
                          width={CARD_WIDTH}
                          height={CARD_HEIGHT}
                          onPress={() => handleDeckPress(item.deck)}
                        />
                      ),
                      'materias-comprados',
                    )}
                  </View>
                </>
              )
            )}

          </View>
        </ScrollView>
      )}

      <CustomBottomModal visible={isModalVisible} onClose={() => setModalVisible(false)} title="Opções do Deck">
        <TouchableOpacity style={modalOpt.row} onPress={() => {
          setModalVisible(false);
          if (selectedDeck) navigation.navigate('EditDeck', { deckId: selectedDeck.id, deckName: selectedDeck.name });
        }}>
          <Ionicons name="create-outline" size={22} color={theme.textPrimary} />
          <Text style={modalOpt.text}>Editar Nome</Text>
        </TouchableOpacity>
        <TouchableOpacity style={modalOpt.row} onPress={() => {
          setModalVisible(false);
          if (selectedDeck) navigation.navigate('ManageSubjects', { deckId: selectedDeck.id, deckName: selectedDeck.name });
        }}>
          <Ionicons name="list-outline" size={22} color={theme.textPrimary} />
          <Text style={modalOpt.text}>Gerenciar Matérias</Text>
        </TouchableOpacity>
        <TouchableOpacity style={modalOpt.row} onPress={performDelete}>
          <Ionicons name="trash-outline" size={22} color={theme.danger} />
          <Text style={[modalOpt.text, { color: theme.danger }]}>Apagar Deck</Text>
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

// =================================================================
// Estilos
// =================================================================

const hhStyles = StyleSheet.create({
  wrapper: { backgroundColor: theme.background },
  container: {
    height: 54, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: theme.textPrimary, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  multiTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center' },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: theme.backgroundSecondary },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  searchBarWrapper: {
    paddingHorizontal: GRID_PADDING, paddingTop: 10, paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.backgroundSecondary,
    borderWidth: 1, borderColor: theme.backgroundTertiary,
    borderRadius: 14, paddingHorizontal: 12, height: 46,
  },
  searchBarFocused: { borderColor: theme.primary },
  searchInput: { flex: 1, color: theme.textPrimary, fontSize: theme.fontSize.body, paddingVertical: 0 },

  // Skeleton
  searchBarSkeleton: { height: 46, borderRadius: 14, backgroundColor: theme.backgroundSecondary },
  featuredSkeleton: { height: 120, borderRadius: 16, backgroundColor: theme.backgroundSecondary },
  gridRow: { flexDirection: 'row', gap: GRID_GAP, marginBottom: GRID_GAP },
  cardSkeleton: { flex: 1, height: 110, borderRadius: 14, backgroundColor: theme.backgroundSecondary },

  mainContent: { paddingBottom: 120, flexGrow: 1 },
  firstAccessScroll: { flex: 1 },
  firstAccessScrollContent: { paddingBottom: 32 },
  searchContent: { paddingHorizontal: GRID_PADDING, paddingTop: 4, paddingBottom: 120 },

  gridRow: { flexDirection: 'row', gap: GRID_GAP, marginBottom: GRID_GAP },

  sectionLabel: {
    color: theme.textMuted,
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
  },

  // Primeiro acesso
  firstAccessContent: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 20,
    gap: 12,
  },
  exampleCard: {
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.primary + '40',
    padding: 20,
    gap: 6,
  },
  exampleCardLabel: {
    alignSelf: 'flex-start',
    backgroundColor: theme.primaryTransparent,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  exampleCardLabelText: {
    color: theme.primary,
    fontFamily: theme.fontFamily.uiSemiBold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  exampleCardTitle: {
    color: theme.textPrimary,
    fontFamily: theme.fontFamily.heading,
    fontSize: 20,
    lineHeight: 26,
  },
  exampleCardSub: {
    color: theme.textSecondary,
    fontFamily: theme.fontFamily.body,
    fontSize: 13,
    lineHeight: 18,
  },
  exampleCardBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  exampleCardBtnText: {
    color: theme.background,
    fontFamily: theme.fontFamily.uiSemiBold,
    fontSize: 13,
  },
  createFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.primary + '70',
    backgroundColor: theme.primaryTransparent,
  },
  createFirstBtnIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createFirstBtnText: {
    color: theme.primary,
    fontFamily: theme.fontFamily.uiSemiBold,
    fontSize: 14,
  },
  lojaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.backgroundTertiary,
    backgroundColor: theme.backgroundSecondary,
  },
  lojaBtnText: {
    color: theme.textPrimary,
    fontFamily: theme.fontFamily.uiMedium,
    fontSize: 14,
  },

  // Por onde começar (primeiro acesso)
  stepsSection: {
    marginTop: 4,
  },
  stepsSectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  stepsSectionLabel: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 16,
  },
  stepsSectionDivider: {
    flex: 1,
    height: 2,
    backgroundColor: theme.backgroundTertiary,
  },
  stepsList: {
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.backgroundTertiary,
    overflow: 'hidden',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.backgroundTertiary,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    color: theme.background,
    fontFamily: theme.fontFamily.uiSemiBold,
    fontSize: 13,
  },
  stepTitle: {
    color: theme.textPrimary,
    fontFamily: theme.fontFamily.uiSemiBold,
    fontSize: 13,
    marginBottom: 2,
  },
  stepSub: {
    color: theme.textMuted,
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
  },

  // Recentes
  recentSection: {
    paddingTop: 20,
    paddingHorizontal: GRID_PADDING,
    gap: 10,
  },
  recentScroll: {
    paddingTop: 4,
    gap: 10,
  },

  // Criar deck
  createDeckWrapper: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 16,
  },
  createDeckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.primary + '60',
    backgroundColor: 'rgba(93,214,44,0.08)',
  },
  createDeckIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.primaryTransparent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createDeckBtnText: {
    color: theme.primary,
    fontFamily: theme.fontFamily.uiSemiBold,
    fontSize: 14,
  },

  // TabBar
  tabBarWrapper: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 16,
  },

  // Conteúdo das abas
  tabContent: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 16,
  },
  tabSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  invertBtn: { paddingLeft: 8 },
  invertBtnText: {
    color: theme.primary,
    fontFamily: theme.fontFamily.uiMedium,
    fontSize: 12,
  },
  subSection: { marginBottom: 20 },
  subSectionLabel: {
    color: theme.textMuted,
    fontFamily: theme.fontFamily.uiSemiBold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  // Multi-select delete
  deleteSelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-end',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.danger + '40',
  },
  deleteSelBtnText: {
    color: theme.danger,
    fontFamily: theme.fontFamily.uiMedium,
    fontSize: 12,
  },

  // Empty states
  emptyTab: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyTabText: {
    color: theme.textMuted,
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyTabSub: {
    color: theme.textMuted,
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  emptyTabAction: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.primaryTransparent,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.primary + '40',
  },
  emptyTabActionText: {
    color: theme.primary,
    fontFamily: theme.fontFamily.uiSemiBold,
    fontSize: 13,
  },

  emptyState: { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyStateText: { color: theme.textMuted, fontSize: theme.fontSize.body, textAlign: 'center' },

  searchResultItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, gap: 12,
    borderBottomWidth: 1, borderBottomColor: theme.backgroundTertiary,
  },
  searchResultIcon: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: theme.primaryTransparent,
    alignItems: 'center', justifyContent: 'center',
  },
  searchResultLabel: { color: theme.textPrimary, fontSize: theme.fontSize.body, fontWeight: '500' },
  searchResultSub: { color: theme.textMuted, fontSize: theme.fontSize.sm, marginTop: 1 },
});

// ── Featured card
const fStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: theme.backgroundSecondary,
    borderWidth: 1.5,
    borderColor: theme.backgroundTertiary,
    overflow: 'hidden',
    minHeight: 128,
  },
  leftBorder: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 5,
    zIndex: 1,
  },
  tint: { ...StyleSheet.absoluteFillObject },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 14,
    paddingLeft: 22,
    paddingRight: 18,
    gap: 14,
    flex: 1,
  },
  labelWrap: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 26,
    marginBottom: 5,
  },
  subtitle: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  playBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bottomAccent: {
    height: 4,
    width: '100%',
  },
});

// ── Recent deck card
const rcStyles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.backgroundTertiary,
    overflow: 'hidden',
    marginBottom: GRID_GAP,
    position: 'relative',
  },
  iconZone: {
    height: 72,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    padding: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pctBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 10,
    fontWeight: '800',
  },
  info: {
    padding: 10,
    paddingTop: 8,
    gap: 3,
  },
  name: {
    color: theme.textPrimary,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    lineHeight: 17,
  },
  stats: {
    color: theme.textMuted,
    fontSize: theme.fontSize.xs,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.backgroundTertiary,
  },
  progressFill: {
    height: 4,
  },
});

// ── Category pill (horizontal scroll)
const cpStyles = StyleSheet.create({
  card: {
    width: 128,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: theme.backgroundTertiary,
    overflow: 'hidden',
  },
  header: {
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    bottom: -30,
    right: -25,
  },
  blob2: {
    position: 'absolute',
    width: 65,
    height: 65,
    borderRadius: 33,
    top: -20,
    left: -15,
  },
  divider: {
    height: 3,
    width: '100%',
  },
  footer: {
    padding: 12,
    paddingTop: 10,
    gap: 3,
  },
  name: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  count: {
    fontSize: 10,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    zIndex: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
});

// ── Mini cards (exemplo + continuar)
const miniStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 14, borderWidth: 1,
    borderColor: theme.backgroundTertiary,
    padding: 12, gap: 12,
  },
  continueCard: {
    borderColor: theme.primary + '50',
    backgroundColor: theme.primaryTransparent,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  continueLabel: {
    color: theme.primary, fontSize: 9,
    fontWeight: '800', letterSpacing: 1.5, marginBottom: 2,
  },
  title: { color: theme.textPrimary, fontSize: 14, fontWeight: '700' },
  sub: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  actionBtn: {
    backgroundColor: '#6366F1', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  dismissBtn: { padding: 4 },
});

// ── CategoryFolderCard — webP card
const folderStyles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  textOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 14,
    right: 14,
  },
  overlayTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '300',
    lineHeight: 16,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  overlayCount: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
});

// ── Category grid (legado — não usado)
const catGridStyles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 12 },
  column: { width: CARD_WIDTH, gap: 12 },
  overlap: {},
});

// ── DeckCard (expandido)
const cardStyles = StyleSheet.create({
  card: {
    width: CARD_WIDTH, minHeight: 120,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 14, borderWidth: 1, borderColor: theme.backgroundTertiary,
    padding: 12, paddingLeft: 18, paddingBottom: 15,
    overflow: 'hidden', position: 'relative',
  },
  cardSelected: { borderColor: theme.primary, backgroundColor: theme.primaryTransparent },
  leftAccent: { position: 'absolute', left: 0, top: 0, bottom: 3, width: 4, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  checkmark: { position: 'absolute', top: 8, right: 8 },
  exampleBadge: { alignSelf: 'flex-start', backgroundColor: theme.primaryTransparent, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 6 },
  exampleBadgeText: { color: theme.primary, fontSize: theme.fontSize.xs, fontWeight: '600' },
  name: { color: theme.textPrimary, fontSize: theme.fontSize.sm, fontWeight: '700', marginBottom: 8, flex: 1 },
  category: { color: theme.primary, fontSize: theme.fontSize.xs, fontWeight: '500', marginBottom: 2 },
  subjectCount: { color: theme.textMuted, fontSize: theme.fontSize.xs },
  progressBarBg: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: theme.backgroundTertiary },
  progressBarFill: { height: 3, borderTopRightRadius: 2 },
  createCard: {
    width: CARD_WIDTH, minHeight: 120,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 14, borderWidth: 1, borderColor: theme.backgroundTertiary,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  createIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primaryTransparent, alignItems: 'center', justifyContent: 'center' },
  createCardText: { color: theme.textMuted, fontSize: theme.fontSize.sm, fontWeight: '500' },
});

const modalOpt = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 16 },
  text: { color: theme.textPrimary, fontSize: theme.fontSize.base, fontWeight: '500' },
});

export default DeckListScreen;
