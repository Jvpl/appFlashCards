/**
 * DeckStackCard
 * Card de deck com visual de pilha de cartas (estilo baralho).
 * 3 cartas decorativas atrás + 1 carta principal na frente.
 * Highlight verde gradual conforme o nível de domínio (0/25/50/75/100%).
 */
import React, { useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

const DeckStackCard = ({ deck, onPress, onLongPress, onMenuPress, isSelected, multiSelectMode, width, height, categoryLabel }) => {
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

  const touchStart = useRef(null);

  const handlePressIn = (e) => {
    touchStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  };

  const handlePress = (e) => {
    const start = touchStart.current;
    if (start) {
      const dx = Math.abs(e.nativeEvent.pageX - start.x);
      const dy = Math.abs(e.nativeEvent.pageY - start.y);
      if (dx > 8 || dy > 8) return;
    }
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={280}
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
        {/* Label categoria / DECK */}
        <Text style={styles.deckLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {(categoryLabel || 'DECK').toUpperCase()}
        </Text>

        {/* Nome */}
        <Text style={styles.deckName} numberOfLines={3}>{deck.name || 'Deck sem nome'}</Text>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.subjectRow}>
            <Text style={styles.subjectNumber}>{subjectCount}</Text>
            <Text style={styles.subjectWord}>{subjectCount === 1 ? ' matéria' : ' matérias'}</Text>
          </View>
          {pct > 0 && (
            <Text style={styles.pctLabel}>{pct}%</Text>
          )}
          <Text style={[styles.statusLabel, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Checkmark (seleção) ou botão de menu (···) */}
      {multiSelectMode ? (
        <View style={styles.checkOverlay}>
          <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
            {isSelected && <Text style={styles.checkMark}>✓</Text>}
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={onMenuPress}
          hitSlop={{ top: 10, bottom: 10, left: 14, right: 10 }}
        >
          <Ionicons name="ellipsis-vertical" size={17} color="rgba(255,255,255,0.35)" />
        </TouchableOpacity>
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
    color: theme.primary,
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingRight: 28, // espaço para o botão ···
  },
  deckName: {
    fontFamily: theme.fontFamily.headingSemiBold,
    fontSize: 17,
    color: theme.textPrimary,
    lineHeight: 22,
  },

  footer: {
    gap: 1,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  subjectNumber: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 20,
    color: theme.primary,
    lineHeight: 24,
  },
  subjectWord: {
    fontFamily: theme.fontFamily.ui,
    fontSize: 11,
    color: theme.textMuted,
  },
  pctLabel: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 13,
    color: theme.primary,
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

  // Botão ···
  menuBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DeckStackCard;
