/**
 * Componente: Contador Segmentado (Num | Let | Sim)
 *
 * Compartilhado entre ManageFlashcardsScreen e EditFlashcardScreen
 * Exibe contadores coloridos para números, letras e símbolos
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../../styles/theme';

export const SegmentedCounter = ({ text }) => {
  const letterCount = ((text || '').match(/[a-zA-Z]/g) || []).length;
  const numberCount = ((text || '').match(/[0-9]/g) || []).length;
  const symbolCount = ((text || '').match(/[+\-×÷^_()]/g) || []).length;
  const maxNumbers = letterCount > 0 ? 5 : 15;

  const getColor = (current, max) => {
    const pct = (current / max) * 100;
    if (pct >= 100) return theme.danger;
    if (pct >= 70) return theme.warning;
    return theme.textMuted;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: getColor(numberCount, maxNumbers) }]}>
        Num: {numberCount}/{maxNumbers}
      </Text>
      <Text style={styles.divider}>|</Text>
      <Text style={[styles.text, { color: getColor(letterCount, 6) }]}>
        Let: {letterCount}/6
      </Text>
      <Text style={styles.divider}>|</Text>
      <Text style={[styles.text, { color: getColor(symbolCount, 6) }]}>
        Sim: {symbolCount}/6
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  text: {
    fontSize: theme.fontSize.xs + 1,
    fontWeight: theme.fontWeight.semibold,
  },
  divider: {
    fontSize: theme.fontSize.xs + 1,
    color: theme.backgroundTertiary,
    marginHorizontal: 6,
  },
});
