/**
 * DeckStackCard
 * Card de deck com visual de pilha de cartas (estilo baralho).
 * 3 cartas decorativas atrás + 1 carta principal na frente.
 * Highlight verde gradual conforme o nível de domínio (0/25/50/75/100%).
 */
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Dimensions } from 'react-native';
import theme from '../../styles/theme';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 10;
export const DECK_CARD_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP) / 2;
export const DECK_CARD_HEIGHT = DECK_CARD_WIDTH * 1.35;

/**
 * Calcula porcentagem de domínio arredondada para múltiplos de 25.
 */
const calcDominio = (subjects = []) => {
  let total = 0, sum = 0;
  subjects.forEach(s =>
    (s.flashcards || []).forEach(c => { total++; sum += c.level || 0; })
  );
  if (total === 0) return 0;
  const raw = sum / (total * 5);
  return Math.round(raw / 0.25) * 25;
};

/**
 * Retorna label de status e cor baseado na % de domínio.
 */
const getDominioInfo = (pct) => {
  switch (pct) {
    case 100: return { label: '● Dominado',  color: theme.primary };
    case 75:  return { label: 'Quase lá',    color: theme.primary };
    case 50:  return { label: 'Avançando',   color: theme.primary };
    case 25:  return { label: 'Iniciando',   color: theme.primary };
    default:  return { label: 'Não iniciado', color: theme.textMuted };
  }
};

/**
 * Retorna a opacidade da borda e das cartas de trás conforme o nível.
 */
const getLevelStyle = (pct) => {
  switch (pct) {
    case 100: return { borderOpacity: 1.0,  stackOpacity: 1.0 };
    case 75:  return { borderOpacity: 0.75, stackOpacity: 0.8 };
    case 50:  return { borderOpacity: 0.5,  stackOpacity: 0.6 };
    case 25:  return { borderOpacity: 0.3,  stackOpacity: 0.4 };
    default:  return { borderOpacity: 0,    stackOpacity: 0.2 };
  }
};

const DeckStackCard = ({ deck, onPress, onLongPress, isSelected, multiSelectMode, width, height }) => {
  const subjectCount = deck.subjects?.length || 0;
  const pct = calcDominio(deck.subjects);
  const { label: statusLabel, color: statusColor } = getDominioInfo(pct);
  const { borderOpacity, stackOpacity } = getLevelStyle(pct);

  const cardWidth = width || DECK_CARD_WIDTH;
  const cardHeight = height || DECK_CARD_HEIGHT;

  const borderColor = borderOpacity > 0
    ? `rgba(93,214,44,${borderOpacity})`
    : 'transparent';
  const stackBg = `rgba(32,32,32,${stackOpacity})`;
  const stackBorder = `rgba(93,214,44,${stackOpacity * 0.5})`;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.78}
      style={[styles.container, { width: cardWidth, height: cardHeight }]}
    >
      {/* Cartas decorativas empilhadas atrás */}
      <View style={[
        styles.stackCard, styles.stackCard3,
        { backgroundColor: stackBg, borderColor: stackBorder },
      ]} />
      <View style={[
        styles.stackCard, styles.stackCard2,
        { backgroundColor: stackBg, borderColor: stackBorder },
      ]} />
      <View style={[
        styles.stackCard, styles.stackCard1,
        { backgroundColor: stackBg, borderColor: stackBorder },
      ]} />

      {/* Carta principal */}
      <View style={[
        styles.mainCard,
        {
          borderColor,
          borderWidth: borderOpacity > 0 ? 1.5 : 1,
        },
        isSelected && styles.mainCardSelected,
      ]}>
        {/* Label DECK */}
        <Text style={styles.deckLabel}>DECK</Text>

        {/* Nome */}
        <Text style={styles.deckName} numberOfLines={3}>{deck.name || 'Deck sem nome'}</Text>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.subjectCount}>
            {subjectCount} {subjectCount === 1 ? 'matéria' : 'matérias'}
          </Text>
          <Text style={[styles.statusLabel, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Checkmark (modo multi-select) */}
      {multiSelectMode && (
        <View style={styles.checkOverlay}>
          <View style={[
            styles.checkCircle,
            isSelected && styles.checkCircleActive,
          ]}>
            {isSelected && (
              <Text style={styles.checkMark}>✓</Text>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },

  // Cartas de trás (empilhadas)
  stackCard: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 1,
  },
  stackCard1: {
    top: 6,
    left: 4,
    right: -4,
    bottom: -6,
    transform: [{ rotate: '2deg' }],
  },
  stackCard2: {
    top: 3,
    left: 2,
    right: -2,
    bottom: -3,
    transform: [{ rotate: '1deg' }],
  },
  stackCard3: {
    top: 1,
    left: 1,
    right: -1,
    bottom: -1,
    transform: [{ rotate: '0.5deg' }],
  },

  // Carta principal
  mainCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    flex: 1,
  },
  mainCardSelected: {
    borderColor: theme.primary,
    borderWidth: 2,
  },

  deckLabel: {
    fontFamily: theme.fontFamily.uiMedium,
    fontSize: 10,
    color: theme.textMuted,
    letterSpacing: 1,
    marginBottom: 6,
  },
  deckName: {
    fontFamily: theme.fontFamily.headingSemiBold,
    fontSize: 14,
    color: theme.textPrimary,
    lineHeight: 19,
  },

  footer: {
    gap: 2,
  },
  subjectCount: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.textMuted,
  },
  statusLabel: {
    fontFamily: theme.fontFamily.uiSemiBold,
    fontSize: 12,
  },

  // Multi-select
  checkOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.textMuted,
    backgroundColor: theme.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  checkMark: {
    color: '#0F0F0F',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default DeckStackCard;
