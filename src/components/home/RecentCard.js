/**
 * RecentCard
 * Card compacto para a seção "Recentes".
 * 3 cards cabem lado a lado sem scroll, sem corte.
 */
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../styles/theme';

const { width } = Dimensions.get('window');
const SECTION_PADDING = 16;
const CARD_GAP = 8;
// 3 cards iguais com gap entre eles, dentro do padding da seção
export const RECENT_CARD_WIDTH = (width - SECTION_PADDING * 2 - CARD_GAP * 2) / 3;

const RecentCard = ({ deck, onPress }) => {
  const subjectCount = deck.subjects?.length || 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={styles.card}
    >
      {/* Ícone */}
      <View style={styles.iconWrap}>
        <Ionicons name="layers" size={16} color={theme.primary} />
      </View>

      {/* Nome */}
      <Text style={styles.name} numberOfLines={2}>{deck.name}</Text>

      {/* Meta */}
      <Text style={styles.meta} numberOfLines={1}>
        {subjectCount} {subjectCount === 1 ? 'matéria' : 'matérias'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: RECENT_CARD_WIDTH,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.backgroundTertiary,
    padding: 10,
    gap: 4,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: theme.primaryTransparent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  name: {
    fontFamily: theme.fontFamily.uiSemiBold,
    fontSize: 12,
    color: theme.textPrimary,
    lineHeight: 16,
  },
  meta: {
    fontFamily: theme.fontFamily.ui,
    fontSize: 10,
    color: theme.textMuted,
  },
});

export default RecentCard;
