import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet, useWindowDimensions,
} from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, Easing } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { SvgXml } from 'react-native-svg';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppData, getStudyHistory } from '../services/storage';

const FIRST_USE_KEY = '@FlashcardsApp:firstUseDate';
import theme from '../styles/theme';

// ── SVG do card de streak (background shape) ─────────────────────
const CARD_STREAK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 993.13 603.71">
  <rect fill="#2a2a2a" x="521.52" y="0" width="471.61" height="105.12" rx="52.51" ry="52.51"/>
  <path fill="#2a2a2a" d="M930.13,119.29h-358.69c-26.43,0-49.83-17.06-57.93-42.21l-11.16-34.67C494.26,17.25,470.86,.19,444.43,.19H62.13C27.82,.19,0,28.01,0,62.32v479.26c0,34.31,27.82,62.13,62.13,62.13H930.13c34.31,0,62.13-27.82,62.13-62.13V181.42c0-34.31-27.82-62.13-62.13-62.13ZM18.52,60.24c0-22.85,18.52-41.37,41.37-41.37H447.34c22.85,0,41.37,18.52,41.37,41.37v199.23c0,22.85-18.52,41.37-41.37,41.37H59.89c-22.85,0-41.37-18.52-41.37-41.37V60.24Z"/>
  <rect fill="#2a2a2a" x="8" y="8" width="492" height="304" rx="41.37" ry="41.37"/>
  <rect fill="#444" x="9.68" y="358.49" width="972.9" height="1.22"/>
  <rect fill="#5e5e5e" x="25.13" y="241.35" width="456.97" height="1.23"/>
</svg>`;

// ── Rings de nível ───────────────────────────────────────────────
const RING_GRADIENTS = [
  ['#2A2F3A', '#3D4451'],
  ['#0D2B1E', '#2D6A4F'],
  ['#1B4332', '#40916C'],
  ['#2D6A4F', '#52B788'],
  ['#40916C', '#74C69D'],
  ['#2D9E00', '#5DD62C'],
];
const RING_FILL = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

const LevelRing = ({ level, size = 52 }) => {
  const lvl = Math.min(Math.max(level || 0, 0), 5);
  const [gradStart, gradEnd] = RING_GRADIENTS[lvl];
  const fill = RING_FILL[lvl];
  const cx = size / 2;
  const strokeW = size * 0.08;
  const r = cx - strokeW;
  const circ = 2 * Math.PI * r;
  const gradId = `pg${lvl}_${size}`;
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
      <SvgText x={cx} y={cx + size * 0.13} textAnchor="middle" fill="#F8F8F8" fontSize={size * 0.35} fontWeight="700">{lvl}</SvgText>
    </Svg>
  );
};

const LEVEL_NAMES = ['Marco Zero', 'Aprendiz', 'Em Progresso', 'Consolidando', 'Confiante', 'Dominado'];

// ── Dias da semana (Seg → Dom) ───────────────────────────────────
const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Retorna o ISO date (YYYY-MM-DD) de cada dia da semana atual (Seg=0 ... Dom=6)
const getWeekDates = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Dom, 1=Seg, ...
  // Distância da Seg: se hoje é Dom(0) → 6 dias atrás, se Seg(1) → 0, etc.
  const distFromMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return WEEK_DAYS.map((label, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - distFromMon + i);
    return { label, date: d.toISOString().split('T')[0], isFuture: i > distFromMon, isToday: i === distFromMon };
  });
};

// ── Donut Chart (View 2) ─────────────────────────────────────────
const DonutChart = ({ acertos, quase, erros, total, hoje }) => {
  const size = 100;
  const cx = size / 2;
  const strokeW = 14;
  const r = cx - strokeW / 2;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? { a: acertos / total, q: quase / total, e: erros / total } : { a: 0, q: 0, e: 0 };
  const gap = 2;
  const segA = circ * pct.a - (pct.a > 0 ? gap : 0);
  const segQ = circ * pct.q - (pct.q > 0 ? gap : 0);
  const segE = circ * pct.e - (pct.e > 0 ? gap : 0);
  const offE = 0;
  const offA = segE + (pct.e > 0 ? gap : 0);
  const offQ = offA + segA + (pct.a > 0 ? gap : 0);

  return (
    <View style={sc.donutWrap}>
      <View style={sc.donutLeft}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          {/* Track */}
          <Circle cx={cx} cy={cx} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} fill="none" />
          {/* Erros (vermelho) */}
          {pct.e > 0 && <Circle cx={cx} cy={cx} r={r} stroke={theme.danger} strokeWidth={strokeW} fill="none" strokeDasharray={`${segE} ${circ - segE}`} strokeDashoffset={-offE} strokeLinecap="round" />}
          {/* Acertos (verde) */}
          {pct.a > 0 && <Circle cx={cx} cy={cx} r={r} stroke={theme.primary} strokeWidth={strokeW} fill="none" strokeDasharray={`${segA} ${circ - segA}`} strokeDashoffset={-offA} strokeLinecap="round" />}
          {/* Quase (amarelo) */}
          {pct.q > 0 && <Circle cx={cx} cy={cx} r={r} stroke={theme.warning} strokeWidth={strokeW} fill="none" strokeDasharray={`${segQ} ${circ - segQ}`} strokeDashoffset={-offQ} strokeLinecap="round" />}
        </Svg>
        {/* Center label */}
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={sc.donutCenter}>{total > 0 ? `${Math.round(pct.a * 100)}%` : '-'}</Text>
          <Text style={sc.donutCenterSub}>acertos</Text>
        </View>
      </View>
      <View style={sc.donutRight}>
        <Text style={sc.donutHojeNum}>{hoje}</Text>
        <Text style={sc.donutHojeLbl}>cards hoje</Text>
        <View style={sc.donutLegendList}>
          <View style={sc.donutLegendRow}>
            <View style={[sc.donutDot, { backgroundColor: theme.primary }]} />
            <Text style={sc.donutLegendTxt}>Acertos</Text>
            <Text style={sc.donutLegendVal}>{acertos}</Text>
          </View>
          <View style={sc.donutLegendRow}>
            <View style={[sc.donutDot, { backgroundColor: theme.warning }]} />
            <Text style={sc.donutLegendTxt}>Quase</Text>
            <Text style={sc.donutLegendVal}>{quase}</Text>
          </View>
          <View style={sc.donutLegendRow}>
            <View style={[sc.donutDot, { backgroundColor: theme.danger }]} />
            <Text style={sc.donutLegendTxt}>Erros</Text>
            <Text style={sc.donutLegendVal}>{erros}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const StreakCard = ({ streak, bestStreak, studiedDatesSet, firstUseDate, totalDecks, totalSubjects, totalFlashcards, statsData }) => {
  const { width: screenWidth } = useWindowDimensions();
  const W = Math.max(300, screenWidth - 32);
  const H = Math.round(W * 603.71 / 993.13);
  const svgX = (x) => Math.round(W * x / 993.13);
  const svgY = (y) => Math.round(H * y / 603.71);

  // posições diretas do SVG exemplo3
  const TAB_LEFT = svgX(521.52);
  const TAB_H = svgY(105.12);
  const MC_L = svgX(18.52);
  const MC_T = svgY(18.87);
  const MC_R = svgX(488.71);
  const MC_B = svgY(300.84);
  const MC_W = MC_R - MC_L;
  const MC_H = MC_B - MC_T;
  const FIRE_R = svgX(155);          // borda direita do fogo + margem
  const CIR_R = svgX(52);
  const CIR_CY = svgY(453.03);
  const CIR_CX = [81.16, 220.05, 357.49, 495.16, 634.54, 772.34, 911.09].map(svgX);

  const [showStats, setShowStats] = useState(false);
  const flippedRef = useRef(false);

  const weekDates = getWeekDates();

  const flipProgress = useSharedValue(0);

  const doFlip = () => {
    const goTo = flippedRef.current ? 0 : 1;
    flippedRef.current = !flippedRef.current;
    flipProgress.value = withTiming(goTo, { duration: 400, easing: Easing.inOut(Easing.ease) });
  };

  const frontAnimStyle = useAnimatedStyle(() => {
    const rotateX = interpolate(flipProgress.value, [0, 1], [0, 180]);
    return {
      transform: [{ perspective: 800 }, { rotateX: `${rotateX}deg` }],
      opacity: flipProgress.value < 0.5 ? 1 : 0,
    };
  });

  const backAnimStyle = useAnimatedStyle(() => {
    const rotateX = interpolate(flipProgress.value, [0, 1], [-180, 0]);
    return {
      transform: [{ perspective: 800 }, { rotateX: `${rotateX}deg` }],
      opacity: flipProgress.value >= 0.5 ? 1 : 0,
    };
  });

  // divisória interna do mini-card (y=241.35 no SVG)
  const MC_DIV_Y = svgY(241.35);
  // área superior do mini-card (acima da linha interna)
  const MC_TOP_H = MC_DIV_Y - MC_T;


  const FaceContent = ({ label, num, hint, icon }) => (
    <View style={{ flex: 1, flexDirection: 'column' }}>
      {/* área superior: ícone + textos lado a lado, centralizados verticalmente */}
      <View style={{ height: MC_TOP_H, flexDirection: 'row', alignItems: 'center' }}>
        {/* ícone da face */}
        <View style={{ width: FIRE_R - MC_L, alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 4 }}>
          <Text style={{ fontSize: svgY(100) }}>{icon}</Text>
        </View>
        {/* label + número + unidade */}
        <View style={{ flex: 1, paddingRight: 6 }}>
          <Text style={[sc.faceLabel, { textAlign: 'left', marginBottom: -6 }]}>{label}</Text>
          <Text style={[sc.faceNum, { marginTop: 0, marginBottom: -10 }]}>{num}</Text>
          <Text style={sc.faceUnit}>Dias seguidos</Text>
        </View>
      </View>
      {/* linha divisória */}
      <View style={{ height: 1, backgroundColor: '#5e5e5e', marginHorizontal: svgX(6) }} />
      {/* hint abaixo da linha divisória interna */}
      <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 0 }}>
        <Text style={sc.faceHint}>{hint}</Text>
      </View>
    </View>
  );

  return (
    <View style={[sc.root, { height: H }]}>
      <SvgXml xml={CARD_STREAK_SVG} width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none" />

      {/* Orelha */}
      <TouchableOpacity
        style={{ position: 'absolute', top: 0, left: TAB_LEFT, right: 0, height: TAB_H, justifyContent: 'center', alignItems: 'center' }}
        onPress={() => setShowStats(v => !v)} activeOpacity={0.8}
      >
        <Text style={sc.tabBtn}>{showStats ? '← Atividade' : 'Estatísticas →'}</Text>
      </TouchableOpacity>

      {!showStats ? (
        <>
          {/* Mini-card com flip */}
          {/* Fundo fixo atrás do mini-card */}
          <View style={{ position: 'absolute', top: MC_T, left: MC_L, width: MC_W, height: MC_H, backgroundColor: '#2a2a2a', borderRadius: svgX(41) }} />
          <View style={{ position: 'absolute', top: MC_T, left: MC_L, width: MC_W, height: MC_H }}>
            <Reanimated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#444', borderRadius: svgX(41) }, frontAnimStyle]}>
              <FaceContent label="Sequência" num={streak} hint="Ver seu record" icon="🔥" />
            </Reanimated.View>
            <Reanimated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#444', borderRadius: svgX(41) }, backAnimStyle]}>
              <FaceContent label="Record máximo" num={bestStreak} hint="Ver sua sequência" icon="🏆" />
            </Reanimated.View>
          </View>

          {/* Toque invisível sobre o mini-card inteiro */}
          <TouchableOpacity
            style={{ position: 'absolute', top: MC_T, left: MC_L, width: MC_W, height: MC_H, backgroundColor: 'transparent' }}
            onPress={doFlip} activeOpacity={1}
          />

          {/* Stats */}
          <View style={{ position: 'absolute', top: TAB_H + 3, left: TAB_LEFT + 20, right: 6, height: MC_B - TAB_H, justifyContent: 'center', gap: 6, paddingTop: 18 }}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}><Text style={sc.statVal}>{totalDecks}</Text><Text style={sc.statLbl}>Decks</Text></View>
              <View style={{ flex: 1 }}><Text style={sc.statVal}>{'-'}</Text><Text style={sc.statLbl}>Assuntos</Text></View>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}><Text style={sc.statVal}>{totalSubjects}</Text><Text style={sc.statLbl}>Matérias</Text></View>
              <View style={{ flex: 1 }}><Text style={sc.statVal}>{totalFlashcards}</Text><Text style={sc.statLbl}>Flashcards</Text></View>
            </View>
          </View>


          {/* Círculos */}
          {weekDates.map((day, i) => {
            const studied = studiedDatesSet.has(day.date);
            const isPast = !day.isToday;
            const green = studied && isPast;
            const failed = !studied && isPast;
            return (
              <View key={i} style={{ position: 'absolute', top: CIR_CY - CIR_R, left: CIR_CX[i] - CIR_R, width: CIR_R * 2, alignItems: 'center', gap: 3 }}>
                <View style={[sc.circle, { width: CIR_R * 2, height: CIR_R * 2, borderRadius: CIR_R }, green ? sc.circleDone : failed ? sc.circleFailed : sc.circleGray, day.isToday && sc.circleToday]}>
                  {green
                    ? <Ionicons name="checkmark-sharp" size={CIR_R * 1.4} color="#0c0d0d" />
                    : failed
                      ? <Ionicons name="close-sharp" size={CIR_R * 1.4} color="#7a1a1a" />
                      : day.isToday
                        ? <View style={{ width: CIR_R * 0.5, height: CIR_R * 0.5, borderRadius: CIR_R * 0.25, backgroundColor: '#5d5d5d' }} />
                        : <Ionicons name="checkmark-sharp" size={CIR_R * 1.1} color="#5c5c5c" />
                  }
                </View>
                <Text style={[sc.dayLbl, day.isToday && sc.dayLblToday]}>{day.label}</Text>
              </View>
            );
          })}
        </>
      ) : (
        <View style={{ position: 'absolute', top: TAB_H + 4, left: 12, right: 12, bottom: 6, justifyContent: 'center' }}>
          <DonutChart acertos={statsData.acertos} quase={statsData.quase} erros={statsData.erros} total={statsData.total} hoje={statsData.hoje} />
        </View>
      )}
    </View>
  );
};

const sc = StyleSheet.create({
  root: {
    marginHorizontal: 16,
    marginTop: 12,
  },

  // Botão orelha
  tabBtn: {
    color: '#fff',
    fontSize: 13,
    fontFamily: theme.fontFamily.uiBold,
    textAlign: 'center',
  },

  // Mini-card faces
  face: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'column',
  },
  faceTop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: '28%',
    paddingRight: 6,
  },
  faceBottom: {
    paddingBottom: 6,
    alignItems: 'center',
  },
  faceLabel: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: theme.fontFamily.uiMedium,
    textAlign: 'center',
    marginBottom: 6,
  },
  faceRow: {
    fontSize: 14,
    color: '#e0e0e0',
    includeFontPadding: false,
  },
  faceNum: {
    color: theme.primary,
    fontSize: 36,
    includeFontPadding: false,
    fontFamily: theme.fontFamily.heading,
  },
  faceUnit: {
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fontFamily.uiBold,
  },
  faceHint: {
    color: '#8f8f8fff',
    fontSize: 11,
    fontFamily: theme.fontFamily.ui,
    textAlign: 'center',
  },

  statInline: {
    fontSize: 13,
    includeFontPadding: false,
  },
  // Stats células
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statLbl: {
    color: '#fff',
    fontSize: 12,
    fontFamily: theme.fontFamily.uiMedium,
    marginTop: -3,
  },
  statVal: {
    color: theme.primary,
    fontSize: 15,
    fontFamily: theme.fontFamily.uiBold,
    lineHeight: 20,
    includeFontPadding: false,
  },

  // Círculos dos dias
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: {
    backgroundColor: '#6fb637',
  },
  circleGray: {
    backgroundColor: '#444',
  },
  circleFailed: {
    backgroundColor: '#3a1010',
  },
  circleToday: {
    borderWidth: 2,
    borderColor: theme.primary,
  },
  dayLbl: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: theme.fontFamily.uiMedium,
    textAlign: 'center',
  },
  dayLblToday: {
    color: '#fff',
    fontFamily: theme.fontFamily.uiBold,
  },

  donutWrap: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  donutLeft: { width: 100, height: 100 },
  donutRight: { flex: 1 },
  donutCenter: { color: theme.textPrimary, fontSize: 18, fontFamily: theme.fontFamily.heading, lineHeight: 20 },
  donutCenterSub: { color: theme.textMuted, fontSize: 9, fontFamily: theme.fontFamily.uiMedium },
  donutHojeNum: { color: theme.primary, fontSize: 22, fontFamily: theme.fontFamily.heading, lineHeight: 24 },
  donutHojeLbl: { color: theme.textMuted, fontSize: 10, fontFamily: theme.fontFamily.uiMedium, marginBottom: 8 },
  donutLegendList: { gap: 5 },
  donutLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  donutDot: { width: 8, height: 8, borderRadius: 4 },
  donutLegendTxt: { color: theme.textSecondary, fontSize: 11, fontFamily: theme.fontFamily.uiMedium, flex: 1 },
  donutLegendVal: { color: theme.textPrimary, fontSize: 11, fontFamily: theme.fontFamily.uiBold },
});

// ── Tela principal ───────────────────────────────────────────────
export const ProgressScreen = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);

  const [progressData, setProgressData] = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [studiedDatesSet, setStudiedDatesSet] = useState(new Set());
  const [firstUseDate, setFirstUseDate] = useState(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalToday, setTotalToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('hoje');
  const [expandedDecks, setExpandedDecks] = useState({});

  // Totais globais
  const [totalDecks, setTotalDecks] = useState(0);
  const [totalSubjects, setTotalSubjects] = useState(0);
  const [totalFlashcards, setTotalFlashcards] = useState(0);
  const [statsData, setStatsData] = useState({ acertos: 0, quase: 0, erros: 0, total: 0, hoje: 0 });

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

      // Totais globais (exclui deck exemplo)
      const realDecks = data.filter(d => !d.isExample);
      setTotalDecks(realDecks.length);
      setTotalSubjects(realDecks.reduce((sum, d) => sum + d.subjects.length, 0));
      const allCards = realDecks.flatMap(d => d.subjects.flatMap(s => s.flashcards));
      setTotalFlashcards(allCards.length);
      // Desempenho geral por nível
      let acertos = 0, quase = 0, erros = 0;
      allCards.forEach(c => {
        const lvl = c.level || 0;
        if (lvl >= 4) acertos++;
        else if (lvl >= 2) quase++;
        else erros++;
      });
      const today = new Date().toISOString().split('T')[0];
      const todayEntries = history.filter(s => s.date === today);
      setTodaySessions(todayEntries);
      setTotalToday(todayEntries.reduce((sum, s) => sum + s.count, 0));
      setStatsData({ acertos, quase, erros, total: allCards.length, hoje: todayEntries.reduce((sum, s) => sum + s.count, 0) });

      const daysWithStudy = new Set(history.map(s => s.date));
      setStudiedDatesSet(daysWithStudy);

      // Primeiro uso: menor data do histórico, ou hoje se não há histórico
      let fud = await AsyncStorage.getItem(FIRST_USE_KEY);
      if (!fud) {
        const sorted = [...daysWithStudy].sort();
        fud = sorted.length > 0 ? sorted[0] : today;
        await AsyncStorage.setItem(FIRST_USE_KEY, fud);
      }
      setFirstUseDate(fud);

      // Streak atual
      let streakCount = 0;
      const d = new Date();
      if (!daysWithStudy.has(today)) d.setDate(d.getDate() - 1);
      while (true) {
        const dateStr = d.toISOString().split('T')[0];
        if (daysWithStudy.has(dateStr)) { streakCount++; d.setDate(d.getDate() - 1); } else break;
      }
      setStreak(streakCount);

      // Melhor streak
      const sortedDates = [...daysWithStudy].sort();
      let best = 0, cur = 0, prev = null;
      for (const dateStr of sortedDates) {
        if (prev) {
          const diff = (new Date(dateStr) - new Date(prev)) / 86400000;
          cur = diff === 1 ? cur + 1 : 1;
        } else { cur = 1; }
        if (cur > best) best = cur;
        prev = dateStr;
      }
      setBestStreak(best);

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
    todaySessions.forEach(sess => {
      if (!byDeck[sess.deckId]) byDeck[sess.deckId] = { deckName: sess.deckName, subjects: {} };
      const key = sess.subjectId || sess.subjectName;
      if (!byDeck[sess.deckId].subjects[key]) byDeck[sess.deckId].subjects[key] = { subjectName: sess.subjectName, count: 0 };
      byDeck[sess.deckId].subjects[key].count += sess.count;
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
    const realDecks = progressData.filter(deck => !deck.isExample);
    if (realDecks.length === 0) return (
      <View style={s.emptyWrap}>
        <Ionicons name="bar-chart-outline" size={48} color={theme.textMuted} />
        <Text style={[s.emptyTitle, { color: theme.textMuted }]}>Nenhum deck encontrado.</Text>
      </View>
    );

    return (
      <>
        {realDecks.map(deck => {
          const deckTotal = deck.subjects.reduce((sum, sub) => sum + sub.flashcards.length, 0);
          const deckLevelCounts = [0, 0, 0, 0, 0, 0];
          deck.subjects.forEach(sub => sub.levelCounts.forEach((c, i) => { deckLevelCounts[i] += c; }));

          return (
            <View key={deck.id} style={s.card}>
              <View style={s.deckHeader}>
                <Text style={s.deckName} numberOfLines={1}>{deck.name}</Text>
                <Text style={s.deckMeta}>{deck.subjects.length} {deck.subjects.length === 1 ? 'matéria' : 'matérias'} · {deckTotal} cards</Text>
              </View>
              <View style={s.deckRingsRow}>
                {deckLevelCounts.map((count, li) => count === 0 ? null : (
                  <View key={li} style={s.deckRingItem}>
                    <LevelRing level={li} size={52} />
                    <Text style={s.deckRingCount}>{count}</Text>
                    <Text style={s.deckRingLabel}>{LEVEL_NAMES[li]}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </>
    );
  };

  // ── Aba Concluídos ──────────────────────────────────────────────
  const renderConcluidos = () => {
    const completed = progressData
      .filter(d => !d.isExample)
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
        </View>
        <View style={s.headerDivider} />
      </View>

      {/* Streak card */}
      <StreakCard
        streak={streak}
        bestStreak={bestStreak}
        studiedDatesSet={studiedDatesSet}
        firstUseDate={firstUseDate}
        totalDecks={totalDecks}
        totalSubjects={totalSubjects}
        totalFlashcards={totalFlashcards}
        statsData={statsData}
      />

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
  headerTitle: { color: theme.textPrimary, fontSize: 22, fontFamily: theme.fontFamily.heading, letterSpacing: -0.3 },
  headerDivider: { height: 1, backgroundColor: theme.backgroundSecondary },

  // ── Tabs ─────────────────────────────────────────────────────────
  tabsWrap: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.background },
  tabsInner: {
    flexDirection: 'row', backgroundColor: theme.backgroundSecondary,
    borderRadius: 12, padding: 4, gap: 4,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: theme.primary },
  tabText: { color: theme.textMuted, fontSize: 13, fontFamily: theme.fontFamily.uiSemiBold },
  tabTextActive: { color: '#0F0F0F', fontFamily: theme.fontFamily.uiBold },

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
    color: theme.textMuted, fontSize: 10, fontFamily: theme.fontFamily.uiBold,
    letterSpacing: 1, textTransform: 'uppercase',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: theme.backgroundTertiary },
  rowText: { color: theme.textSecondary, fontSize: 14, fontFamily: theme.fontFamily.uiMedium, flex: 1 },

  // ── Hoje ─────────────────────────────────────────────────────────
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  statChip: {
    flex: 1, backgroundColor: theme.backgroundSecondary,
    borderRadius: 14, borderWidth: 1, borderColor: theme.backgroundTertiary,
    paddingVertical: 16, alignItems: 'center',
  },
  statValue: { color: theme.primary, fontSize: 22, fontFamily: theme.fontFamily.heading },
  statLabel: { color: theme.textMuted, fontSize: 10, fontFamily: theme.fontFamily.ui, marginTop: 3 },
  greenChip: {
    backgroundColor: theme.primaryTransparent, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  greenChipText: { color: theme.primary, fontSize: 12, fontFamily: theme.fontFamily.uiBold },

  // ── Níveis — decks ────────────────────────────────────────────────
  deckHeader: {
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },
  deckName: { color: theme.textPrimary, fontSize: 15, fontFamily: theme.fontFamily.headingSemiBold },
  deckMeta: { color: theme.textMuted, fontSize: 11, fontFamily: theme.fontFamily.ui, marginTop: 2 },
  deckRingsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 16,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  deckRingItem: { alignItems: 'center', gap: 4 },
  deckRingCount: { color: theme.textPrimary, fontSize: 13, fontFamily: theme.fontFamily.headingSemiBold },
  deckRingLabel: { color: theme.textMuted, fontSize: 9, fontFamily: theme.fontFamily.uiMedium, textAlign: 'center' },

  // ── Empty ────────────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { color: theme.textPrimary, fontSize: 16, fontFamily: theme.fontFamily.headingSemiBold, textAlign: 'center', paddingHorizontal: 24 },
  emptyDesc: { color: theme.textMuted, fontSize: 14, fontFamily: theme.fontFamily.ui, textAlign: 'center', paddingHorizontal: 32 },
});

export default ProgressScreen;
