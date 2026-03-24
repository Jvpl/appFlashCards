/**
 * RecentCard
 * Card compacto para a seção "Recentes" (scroll horizontal).
 * Exibe ícone + nome do deck + número de matérias.
 */
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../styles/theme';

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
        <Ionicons name="layers" size={18} color={theme.primary} />
      </View>

      {/* Texto */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{deck.name}</Text>
        <Text style={styles.meta}>
          {subjectCount} {subjectCount === 1 ? 'matéria' : 'matérias'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 130,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.backgroundTertiary,
    padding: 10,
    gap: 8,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: theme.primaryTransparent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    gap: 2,
  },
  name: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 12,
    color: theme.textPrimary,
    lineHeight: 16,
  },
  meta: {
    fontFamily: theme.fontFamily.ui,
    fontSize: 11,
    color: theme.textMuted,
  },
});

export default RecentCard;
