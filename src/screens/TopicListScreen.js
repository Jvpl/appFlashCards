import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions,
  ScrollView, TouchableOpacity,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAppData } from '../services/storage';
import MateriaCard, { MATERIA_CARD_WIDTH, MATERIA_CARD_HEIGHT } from '../components/home/MateriaCard';
import theme from '../styles/theme';

const GRID_PADDING = 16;
const GRID_GAP = 10;
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export const TopicListScreen = ({ route, navigation }) => {
  const { deckId, deckName, subjectId, subjectName, preloadedTopics } = route.params;
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [topics, setTopics] = useState(preloadedTopics || []);

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

  const handleStudy = useCallback((topic) => {
    navigation.navigate('Flashcard', {
      deckId,
      deckName,
      subjectId: topic.id,
      subjectName: topic.name,
      preloadedCards: topic.flashcards || [],
    });
  }, [navigation, deckId, deckName]);

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
          />
          {items[i + 1] ? (
            <MateriaCard
              subject={items[i + 1]}
              deck={{ id: deckId, name: subjectName }}
              width={MATERIA_CARD_WIDTH}
              height={MATERIA_CARD_HEIGHT}
              onPress={() => handleStudy(items[i + 1])}
            />
          ) : (
            <View style={{ width: MATERIA_CARD_WIDTH }} />
          )}
        </View>
      );
    }
    return rows;
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.gridContent, { paddingBottom: 20 + Math.max(insets.bottom, 0) }]}
        showsVerticalScrollIndicator={false}
      >
        {topics.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ color: theme.textMuted, fontSize: 14 }}>Nenhum assunto encontrado.</Text>
          </View>
        ) : renderGrid(topics)}
      </ScrollView>
    </View>
  );
};

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
  empty: { alignItems: 'center', paddingTop: 60 },
});

export default TopicListScreen;
