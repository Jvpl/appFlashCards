import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAppData, getStudyHistory } from '../services/storage';
import { LEVEL_CONFIG } from '../services/srs';
import theme from '../styles/theme';

// Cores e gradientes dos níveis — iguais ao CardFooter/FlashcardHistoryScreen
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

const LevelRing = ({ level, size = 52 }) => {
  const lvl = Math.min(Math.max(level || 0, 0), 5);
  const [gradStart, gradEnd] = RING_GRADIENTS[lvl];
  const fill = RING_FILL[lvl];
  const cx = size / 2;
  const strokeW = 4;
  const r = (size / 2) - strokeW;
  const circ = 2 * Math.PI * r;
  const gradId = `pg${lvl}`;
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cx} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth={strokeW} fill="none" />
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
          cx={cx} cy={cx} r={r}
          stroke={`url(#${gradId})`} strokeWidth={strokeW} fill="none"
          strokeDasharray={`${circ * fill} ${circ * (1 - fill)}`}
          strokeLinecap="round" rotation="-90" origin={`${cx},${cx}`}
        />
      )}
      <SvgText x={cx} y={cx + 7} textAnchor="middle" fill="#F8F8F8" fontSize={size * 0.35} fontWeight="700">{lvl}</SvgText>
    </Svg>
  );
};

const LEVEL_NAMES = ['Marco Zero', 'Aprendiz', 'Em Progresso', 'Consolidando', 'Confiante', 'Dominado'];

export const ProgressScreen = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);

  const [progressData, setProgressData] = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [studiedDatesSet, setStudiedDatesSet] = useState(new Set());
  const [streak, setStreak] = useState(0);
  const [totalToday, setTotalToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('hoje');
  const [expandedDecks, setExpandedDecks] = useState({});

  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isFocused) return;
    const load = async () => {
      setLoading(true);
      const [data, history] = await Promise.all([getAppData(), getStudyHistory()]);

      const structured = data.map(deck => ({
        ...deck,
        subjects: deck.subjects.map(subject => {
          const levelCounts = [0, 0, 0, 0, 0, 0];
          subject.flashcards.forEach(c => { levelCounts[c.level || 0]++; });
          const totalLevels = subject.flashcards.length * 5;
          const currentLevels = subject.flashcards.reduce((sum, c) => sum + (c.level || 0), 0);
          return { ...subject, levelCounts, progress: totalLevels > 0 ? Math.round((currentLevels / totalLevels) * 100) : 0 };
        }),
      }));
      setProgressData(structured);

      const today = new Date().toISOString().split('T')[0];
      const todayEntries = history.filter(s => s.date === today);
      setTodaySessions(todayEntries);
      setTotalToday(todayEntries.reduce((sum, s) => sum + s.count, 0));

      const daysWithStudy = new Set(history.map(s => s.date));
      setStudiedDatesSet(daysWithStudy);
      let streakCount = 0;
      const d = new Date();
      if (!daysWithStudy.has(today)) d.setDate(d.getDate() - 1);
      while (true) {
        const dateStr = d.toISOString().split('T')[0];
        if (daysWithStudy.has(dateStr)) { streakCount++; d.setDate(d.getDate() - 1); } else break;
      }
      setStreak(streakCount);
      setLoading(false);
    };
    load();
  }, [isFocused]);

  if (loading) return (
    <View style={s.loadingWrap}><ActivityIndicator size="large" color={theme.primary} /></View>
  );

  // ── Aba Hoje ────────────────────────────────────────────────────
  const renderHoje = () => {
    if (totalToday === 0) {
      const now = new Date();
      let pendingCount = 0;
      for (const deck of progressData)
        for (const subject of deck.subjects)
          pendingCount += subject.flashcards.filter(c =>
            (c.level || 0) < 5 && (!c.nextReview || new Date(c.nextReview) <= now)
          ).length;

      if (pendingCount === 0) return (
        <View style={s.emptyWrap}>
          <Ionicons name="checkmark-circle-outline" size={48} color={theme.primary} />
          <Text style={s.emptyTitle}>Tudo em dia!</Text>
          <Text style={s.emptyDesc}>Nenhum card pendente para revisar agora.</Text>
        </View>
      );

      return (
        <View style={s.emptyWrap}>
          <Ionicons name="flame-outline" size={48} color={theme.primary} />
          <Text style={s.emptyTitle}>
            Você tem {pendingCount} {pendingCount === 1 ? 'card' : 'cards'} para revisar hoje
          </Text>
          <Text style={s.emptyDesc}>Comece uma sessão e mantenha sua sequência!</Text>
        </View>
      );
    }

    const byDeck = {};
    todaySessions.forEach(s => {
      if (!byDeck[s.deckId]) byDeck[s.deckId] = { deckName: s.deckName, subjects: {} };
      const key = s.subjectId || s.subjectName;
      if (!byDeck[s.deckId].subjects[key]) byDeck[s.deckId].subjects[key] = { subjectName: s.subjectName, count: 0 };
      byDeck[s.deckId].subjects[key].count += s.count;
    });

    return (
      <>
        <View style={s.statRow}>
          {[
            { value: totalToday, label: 'cards revisados' },
            { value: Object.keys(byDeck).length, label: Object.keys(byDeck).length === 1 ? 'deck' : 'decks' },
            { value: todaySessions.length, label: todaySessions.length === 1 ? 'sessão' : 'sessões' },
          ].map((stat, i) => (
            <View key={i} style={s.statChip}>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {Object.entries(byDeck).map(([deckId, deck]) => (
          <View key={deckId} style={s.card}>
            <Text style={s.cardLabel}>{deck.deckName}</Text>
            {Object.values(deck.subjects).map((sub, i, arr) => (
              <View key={i} style={[s.row, i < arr.length - 1 && s.rowDivider]}>
                <Text style={s.rowText}>{sub.subjectName}</Text>
                <View style={s.greenChip}>
                  <Text style={s.greenChipText}>{sub.count} cards</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </>
    );
  };

  // ── Aba Níveis ──────────────────────────────────────────────────
  const renderNiveis = () => {
    if (progressData.length === 0) return (
      <View style={s.emptyWrap}>
        <Ionicons name="bar-chart-outline" size={48} color={theme.textMuted} />
        <Text style={[s.emptyTitle, { color: theme.textMuted }]}>Nenhum deck encontrado.</Text>
      </View>
    );

    // Agrega total de cards por nível (0–5)
    const globalLevelCounts = [0, 0, 0, 0, 0, 0];
    progressData.forEach(deck =>
      deck.subjects.forEach(sub =>
        sub.levelCounts.forEach((c, i) => { globalLevelCounts[i] += c; })
      )
    );

    const totalCards = globalLevelCounts.reduce((a, b) => a + b, 0);

    return (
      <>
        {/* ── Resumo: rings só dos níveis com cards, linha horizontal ── */}
        <View style={s.card}>
          <View style={s.summaryHeader}>
            <Text style={s.cardLabel}>Distribuição</Text>
            <Text style={s.summaryTotal}>{totalCards} cards no total</Text>
          </View>
          <View style={s.summaryRingRow}>
            {globalLevelCounts.map((count, li) => count === 0 ? null : (
              <View key={li} style={s.summaryRingItem}>
                <LevelRing level={li} size={44} />
                <Text style={s.summaryRingCount}>{count}</Text>
                <Text style={s.summaryRingLabel}>{LEVEL_NAMES[li]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Decks — fechados por padrão ── */}
        {progressData.map(deck => {
          const isOpen = expandedDecks[deck.id] === true;
          const deckTotal = deck.subjects.reduce((sum, sub) => sum + sub.flashcards.length, 0);
          const deckLevelCounts = [0, 0, 0, 0, 0, 0];
          deck.subjects.forEach(sub => sub.levelCounts.forEach((c, i) => { deckLevelCounts[i] += c; }));

          return (
            <View key={deck.id} style={s.card}>
              <TouchableOpacity
                style={s.deckHeader}
                onPress={() => setExpandedDecks(p => ({ ...p, [deck.id]: !isOpen }))}
                activeOpacity={0.75}
              >
                <View style={s.deckHeaderLeft}>
                  <Text style={s.deckName} numberOfLines={1}>{deck.name}</Text>
                  <Text style={s.deckMeta}>{deck.subjects.length} {deck.subjects.length === 1 ? 'matéria' : 'matérias'} · {deckTotal} cards</Text>
                </View>
                <View style={s.deckHeaderRight}>
                  {!isOpen && deckLevelCounts.map((count, li) => count === 0 ? null : (
                    <View key={li} style={s.deckMiniRing}>
                      <LevelRing level={li} size={22} />
                      <Text style={s.deckMiniCount}>{count}</Text>
                    </View>
                  ))}
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textMuted} style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>

              {isOpen && deck.subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  style={[s.subjectRow, s.rowDivider]}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('Início', {
                    screen: 'HomeDrawer',
                    params: { screen: 'Flashcard', params: { deckId: deck.id, deckName: deck.name, subjectId: subject.id, subjectName: subject.name } }
                  })}
                >
                  <Text style={s.subjectName} numberOfLines={1}>{subject.name}</Text>
                  <View style={s.subjectRings}>
                    {subject.levelCounts.map((count, li) => count > 0 ? (
                      <View key={li} style={s.subjectRingItem}>
                        <LevelRing level={li} size={28} />
                        <Text style={s.subjectRingCount}>{count}</Text>
                      </View>
                    ) : null)}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
      </>
    );
  };

  // ── Aba Concluídos ──────────────────────────────────────────────
  const renderConcluidos = () => {
    const completed = progressData
      .map(deck => ({ ...deck, subjects: deck.subjects.filter(s => s.progress === 100) }))
      .filter(deck => deck.subjects.length > 0);

    if (completed.length === 0) return (
      <View style={s.emptyWrap}>
        <Ionicons name="trophy-outline" size={48} color={theme.textMuted} />
        <Text style={[s.emptyTitle, { color: theme.textMuted }]}>Nenhuma matéria concluída ainda.</Text>
        <Text style={s.emptyDesc}>Continue estudando!</Text>
      </View>
    );

    return completed.map(deck => (
      <View key={deck.id} style={s.card}>
        <Text style={s.cardLabel}>{deck.name}</Text>
        {deck.subjects.map((sub, i, arr) => (
          <View key={sub.id} style={[s.row, i < arr.length - 1 && s.rowDivider]}>
            <Text style={s.rowText}>{sub.name}</Text>
            <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
          </View>
        ))}
      </View>
    ));
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top }]}>
        <View style={s.headerInner}>
          <Text style={s.headerTitle}>Progresso</Text>
          <Text style={s.headerSub}>
            {totalToday > 0 ? `${totalToday} cards revisados hoje` : 'Nenhum card revisado hoje'}
          </Text>
        </View>
        <View style={s.headerDivider} />
      </View>

      {/* Streak card */}
      {(() => {
        const today = new Date();
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const last7 = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() - (6 - i));
          return { label: dayNames[d.getDay()], date: d.toISOString().split('T')[0] };
        });
        const motivMsg = streak === 0
          ? 'Revise pelo menos 1 card hoje para começar!'
          : streak < 7 ? 'Não quebre a sequência, continue revisando!'
          : 'Incrível! Mais de uma semana de dedicação 🏆';
        return (
          <View style={s.streakCard}>
            <View style={s.streakTop}>
              <Text style={s.streakFireEmoji}>🔥</Text>
              <View>
                <Text style={[s.streakBigNum, streak === 0 && { color: theme.textMuted }]}>{streak}</Text>
                <Text style={s.streakSub}>
                  {streak === 0
                    ? 'Nenhum dia seguido ainda'
                    : streak === 1 ? 'dia de revisão seguido' : 'dias de revisão seguidos'}
                </Text>
              </View>
            </View>
            <View style={s.streakWeek}>
              {last7.map((day, i) => {
                const done = studiedDatesSet.has(day.date);
                const isToday = i === 6;
                return (
                  <View key={i} style={s.streakDayCol}>
                    <View style={[
                      s.streakDayCircle,
                      done && s.streakDayDone,
                      isToday && !done && s.streakDayToday,
                    ]}>
                      {done
                        ? <Ionicons name="checkmark" size={13} color="#0F0F0F" />
                        : <View style={[s.streakDayInner, isToday && { backgroundColor: theme.backgroundTertiary }]} />}
                    </View>
                    <Text style={[s.streakDayLabel, isToday && { color: theme.textSecondary }]}>{day.label}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={s.streakMotivation}>{motivMsg}</Text>
          </View>
        );
      })()}

      {/* Tabs */}
      <View style={s.tabsWrap}>
        <View style={s.tabsInner}>
          {[
            { key: 'hoje', label: 'Hoje' },
            { key: 'niveis', label: 'Níveis' },
            { key: 'concluidos', label: 'Concluídos' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, viewMode === tab.key && s.tabActive]}
              onPress={() => setViewMode(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabText, viewMode === tab.key && s.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {viewMode === 'hoje' && renderHoje()}
        {viewMode === 'niveis' && renderNiveis()}
        {viewMode === 'concluidos' && renderConcluidos()}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },

  header: { backgroundColor: theme.background },
  headerInner: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  headerTitle: { color: theme.textPrimary, fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  headerSub: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  headerDivider: { height: 1, backgroundColor: theme.backgroundSecondary },

  // ── Streak ───────────────────────────────────────────────────────
  streakCard: {
    marginHorizontal: 16, marginTop: 14, marginBottom: 6,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 14, borderWidth: 1, borderColor: theme.backgroundTertiary,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, gap: 14,
  },
  streakTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakFireEmoji: { fontSize: 44 },
  streakBigNum: { color: theme.primary, fontSize: 36, fontWeight: '700', letterSpacing: -1, lineHeight: 40 },
  streakSub: { color: theme.textMuted, fontSize: 12, fontWeight: '500', marginTop: 2 },
  streakWeek: { flexDirection: 'row', justifyContent: 'space-between' },
  streakDayCol: { alignItems: 'center', gap: 5 },
  streakDayCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.backgroundTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  streakDayDone: { backgroundColor: theme.primary },
  streakDayToday: { borderWidth: 2, borderColor: theme.primary, backgroundColor: 'transparent' },
  streakDayInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.backgroundElevated },
  streakDayLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '600' },
  streakMotivation: { color: theme.textMuted, fontSize: 12, textAlign: 'center' },

  // ── Tabs ─────────────────────────────────────────────────────────
  tabsWrap: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.background },
  tabsInner: {
    flexDirection: 'row', backgroundColor: theme.backgroundSecondary,
    borderRadius: 12, padding: 4, gap: 4,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: theme.primary },
  tabText: { color: theme.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#0F0F0F', fontWeight: '700' },

  // ── Scroll ───────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },

  // ── Card base ────────────────────────────────────────────────────
  card: {
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 14, borderWidth: 1, borderColor: theme.backgroundTertiary,
    overflow: 'hidden',
  },
  cardLabel: {
    color: theme.textMuted, fontSize: 10, fontWeight: '600',
    letterSpacing: 1, textTransform: 'uppercase',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: theme.backgroundTertiary },
  rowText: { color: theme.textSecondary, fontSize: 14, fontWeight: '500', flex: 1 },

  // ── Hoje ─────────────────────────────────────────────────────────
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  statChip: {
    flex: 1, backgroundColor: theme.backgroundSecondary,
    borderRadius: 14, borderWidth: 1, borderColor: theme.backgroundTertiary,
    paddingVertical: 16, alignItems: 'center',
  },
  statValue: { color: theme.primary, fontSize: 22, fontWeight: '700' },
  statLabel: { color: theme.textMuted, fontSize: 10, marginTop: 3 },
  greenChip: {
    backgroundColor: theme.primaryTransparent, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  greenChipText: { color: theme.primary, fontSize: 12, fontWeight: '700' },

  // ── Níveis — resumo ──────────────────────────────────────────────
  summaryHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 0,
  },
  summaryTotal: { color: theme.textMuted, fontSize: 11 },
  summaryRingRow: {
    flexDirection: 'row', paddingHorizontal: 16,
    paddingVertical: 14, gap: 20, flexWrap: 'wrap',
  },
  summaryRingItem: { alignItems: 'center', gap: 4 },
  summaryRingCount: { color: theme.textPrimary, fontSize: 13, fontWeight: '700' },
  summaryRingLabel: { color: theme.textMuted, fontSize: 9, fontWeight: '500' },

  // ── Níveis — decks ────────────────────────────────────────────────
  deckHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  deckHeaderLeft: { flex: 1, gap: 2 },
  deckHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deckName: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  deckMeta: { color: theme.textMuted, fontSize: 11 },
  deckMiniRing: { alignItems: 'center', gap: 1 },
  deckMiniCount: { color: theme.textMuted, fontSize: 9, fontWeight: '700' },

  subjectRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  subjectName: { color: theme.textSecondary, fontSize: 13, fontWeight: '600', flex: 1 },
  subjectRings: { flexDirection: 'row', gap: 8 },
  subjectRingItem: { alignItems: 'center', gap: 3 },
  subjectRingCount: { color: theme.textMuted, fontSize: 10, fontWeight: '600' },

  // ── Empty ────────────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: '700', textAlign: 'center', paddingHorizontal: 24 },
  emptyDesc: { color: theme.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});

export default ProgressScreen;
