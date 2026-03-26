import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAppData, getStudyHistory } from '../services/storage';
import { LEVEL_CONFIG } from '../services/srs';
import styles from '../styles/globalStyles';
import theme from '../styles/theme';

const LEVEL_COLORS = ['#EF4444', '#F59E0B', '#EAB308', '#3B82F6', '#8B5CF6', '#22C55E'];

export const ProgressScreen = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);
  const deckRefs = useRef({});
  const contentRef = useRef(null);

  const [progressData, setProgressData] = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [streak, setStreak] = useState(0);
  const [totalToday, setTotalToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('hoje'); // 'hoje' | 'niveis' | 'concluidos'

  const [expandedDeck, setExpandedDeck] = useState(null);

  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isFocused) return;
    const load = async () => {
      setLoading(true);
      const [data, history] = await Promise.all([getAppData(), getStudyHistory()]);

      // --- Progresso por deck/matéria com distribuição de níveis ---
      const structured = data.map(deck => {
        const subjectsWithLevels = deck.subjects.map(subject => {
          const levelCounts = [0, 0, 0, 0, 0, 0];
          subject.flashcards.forEach(c => { levelCounts[c.level || 0]++; });
          const totalLevels = subject.flashcards.length * 5;
          const currentLevels = subject.flashcards.reduce((sum, c) => sum + (c.level || 0), 0);
          return {
            ...subject,
            levelCounts,
            progress: totalLevels > 0 ? Math.round((currentLevels / totalLevels) * 100) : 0,
          };
        });
        return { ...deck, subjects: subjectsWithLevels };
      });
      setProgressData(structured);

      // --- Histórico de hoje ---
      const today = new Date().toISOString().split('T')[0];
      const todayEntries = history.filter(s => s.date === today);
      setTodaySessions(todayEntries);
      setTotalToday(todayEntries.reduce((sum, s) => sum + s.count, 0));

      // --- Streak: dias consecutivos com pelo menos 1 sessão ---
      const daysWithStudy = new Set(history.map(s => s.date));
      let streakCount = 0;
      const d = new Date();
      // se não estudou hoje ainda, começa verificando ontem
      if (!daysWithStudy.has(today)) d.setDate(d.getDate() - 1);
      while (true) {
        const dateStr = d.toISOString().split('T')[0];
        if (daysWithStudy.has(dateStr)) {
          streakCount++;
          d.setDate(d.getDate() - 1);
        } else break;
      }
      setStreak(streakCount);

      setLoading(false);
    };
    load();
  }, [isFocused]);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>;

  // --- Aba Hoje ---
  const renderHoje = () => {
    if (totalToday === 0) {
      return (
        <View style={{ alignItems: 'center', padding: 40 }}>
          <Ionicons name="book-outline" size={48} color={theme.textMuted} />
          <Text style={{ color: theme.textMuted, marginTop: 12, fontSize: 15, textAlign: 'center' }}>
            Nenhum card revisado hoje ainda.{'\n'}Abra um deck e comece a estudar!
          </Text>
        </View>
      );
    }

    // Agrupar sessões de hoje por deck e matéria, somando os counts
    const byDeck = {};
    todaySessions.forEach(s => {
      if (!byDeck[s.deckId]) byDeck[s.deckId] = { deckName: s.deckName, subjects: {} };
      const key = s.subjectId || s.subjectName;
      if (!byDeck[s.deckId].subjects[key]) byDeck[s.deckId].subjects[key] = { subjectName: s.subjectName, count: 0 };
      byDeck[s.deckId].subjects[key].count += s.count;
    });

    return Object.entries(byDeck).map(([deckId, deck]) => (
      <View key={deckId} style={[styles.deckGroup, { marginBottom: 12 }]}>
        <Text style={[styles.deckGroupTitle, { padding: 12 }]}>{deck.deckName}</Text>
        {Object.values(deck.subjects).map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{s.subjectName}</Text>
            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 14 }}>{s.count} cards</Text>
          </View>
        ))}
      </View>
    ));
  };

  // --- Aba Níveis ---
  const renderNiveis = () => {
    if (progressData.length === 0) {
      return <Text style={styles.noItemsText}>Nenhum deck encontrado.</Text>;
    }

    return progressData.map(deck => (
      <View key={deck.id} style={[styles.deckGroup, { marginBottom: 12 }]} ref={el => deckRefs.current[deck.id] = el}>
        <TouchableOpacity
          style={styles.deckHeader}
          onPress={() => setExpandedDeck(prev => prev === deck.id ? null : deck.id)}
        >
          <Text style={styles.deckGroupTitle}>{deck.name}</Text>
          <Ionicons name={expandedDeck === deck.id ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textMuted} />
        </TouchableOpacity>

        {expandedDeck === deck.id && deck.subjects.map((subject, idx) => (
          <View key={subject.id} style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Início', {
                screen: 'HomeDrawer',
                params: { screen: 'Flashcard', params: { deckId: deck.id, deckName: deck.name, subjectId: subject.id, subjectName: subject.name } }
              })}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 }}>
                <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600' }}>{subject.name}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>{subject.progress}%</Text>
              </View>

              {/* Níveis */}
              {Object.values(LEVEL_CONFIG).map((lvl, levelIdx) => {
                const count = subject.levelCounts[levelIdx] || 0;
                return (
                  <View key={levelIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: LEVEL_COLORS[levelIdx] }} />
                      <Text style={{ color: theme.textMuted, fontSize: 12 }}>{lvl.name}</Text>
                    </View>
                    <Text style={{ color: count > 0 ? LEVEL_COLORS[levelIdx] : theme.textMuted, fontSize: 12, fontWeight: count > 0 ? 'bold' : 'normal' }}>{count} cards</Text>
                  </View>
                );
              })}
            </TouchableOpacity>
            {idx < deck.subjects.length - 1 && <View style={[styles.divider, { marginTop: 8 }]} />}
          </View>
        ))}
      </View>
    ));
  };

  // --- Aba Concluídos ---
  const renderConcluidos = () => {
    const completed = progressData
      .map(deck => ({
        ...deck,
        subjects: deck.subjects.filter(s => s.progress === 100),
      }))
      .filter(deck => deck.subjects.length > 0);

    if (completed.length === 0) {
      return (
        <View style={{ alignItems: 'center', padding: 40 }}>
          <Ionicons name="trophy-outline" size={48} color={theme.textMuted} />
          <Text style={{ color: theme.textMuted, marginTop: 12, fontSize: 15, textAlign: 'center' }}>
            Nenhuma matéria concluída ainda.{'\n'}Continue estudando!
          </Text>
        </View>
      );
    }

    return completed.map(deck => (
      <View key={deck.id} style={[styles.deckGroup, { marginBottom: 12 }]}>
        <Text style={[styles.deckGroupTitle, { padding: 12 }]}>{deck.name}</Text>
        {deck.subjects.map(s => (
          <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ color: theme.textSecondary, fontSize: 14 }}>{s.name}</Text>
            <Ionicons name="checkmark-circle" size={18} color={theme.success} />
          </View>
        ))}
      </View>
    ));
  };

  return (
    <ScrollView
      style={styles.baseContainer}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      ref={scrollViewRef}
    >
      <View ref={contentRef}>
        {/* Header com streak */}
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: theme.backgroundSecondary }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: theme.textPrimary, fontSize: 22, fontWeight: 'bold' }}>Progresso</Text>
              <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>
                {totalToday > 0 ? `${totalToday} cards revisados hoje` : 'Nenhum card revisado hoje'}
              </Text>
            </View>
            <View style={{ alignItems: 'center', backgroundColor: theme.background, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 22 }}>🔥</Text>
              <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 18 }}>{streak}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 10 }}>{streak === 1 ? 'dia' : 'dias'}</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.toggleContainer, { marginTop: 0 }]}>
          {[
            { key: 'hoje', label: 'Hoje' },
            { key: 'niveis', label: 'Níveis' },
            { key: 'concluidos', label: 'Concluídos' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.toggleButton, viewMode === tab.key && styles.toggleButtonActive]}
              onPress={() => setViewMode(tab.key)}
            >
              <Text style={[styles.toggleButtonText, viewMode === tab.key && styles.toggleButtonTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ padding: 12 }}>
          {viewMode === 'hoje' && renderHoje()}
          {viewMode === 'niveis' && renderNiveis()}
          {viewMode === 'concluidos' && renderConcluidos()}
        </View>
      </View>
    </ScrollView>
  );
};

export default ProgressScreen;
