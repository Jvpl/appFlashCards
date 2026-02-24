/**
 * Componente: Contador Segmentado (Num | Let | Sim)
 *
 * Compartilhado entre ManageFlashcardsScreen e EditFlashcardScreen
 * Exibe contadores coloridos para números, letras e símbolos
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const SegmentedCounter = ({ text }) => {
  const letterCount = ((text || '').match(/[a-zA-Z]/g) || []).length;
  const numberCount = ((text || '').match(/[0-9]/g) || []).length;
  const symbolCount = ((text || '').match(/[+\-×÷^_()]/g) || []).length;
  const maxNumbers = letterCount > 0 ? 5 : 15;

  const getColor = (current, max) => {
    const pct = (current / max) * 100;
    if (pct >= 100) return '#EF4444'; // Vermelho
    if (pct >= 70) return '#F59E0B';  // Amarelo
    return '#A0AEC0'; // Cinza padrão
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
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    fontSize: 11,
    color: '#4A5568',
    marginHorizontal: 6,
  },
});
