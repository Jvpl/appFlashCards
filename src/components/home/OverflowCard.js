/**
 * OverflowCard
 * Card "+N mais" exibido quando há mais de 8 items num grid.
 * Ao tocar: chama onPress (expande a lista, sem navegar).
 * Dimensões recebidas via prop para se adaptar ao contexto (deck ou matéria).
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import theme from '../../styles/theme';

const OverflowCard = ({ count, onPress, width, height }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    style={[
      styles.card,
      width  && { width },
      height && { height },
    ]}
  >
    <Text style={styles.plus}>+{count}</Text>
    <Text style={styles.label}>mais</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  plus: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 22,
    color: theme.primary,
  },
  label: {
    fontFamily: theme.fontFamily.ui,
    fontSize: 12,
    color: theme.textMuted,
  },
});

export default OverflowCard;
