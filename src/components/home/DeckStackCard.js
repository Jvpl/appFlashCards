/**
 * DeckStackCard
 * Card de deck com visual de pilha de cartas (estilo baralho).
 * 3 cartas decorativas atrás + 1 carta principal na frente.
 * Highlight verde gradual conforme o nível de domínio (0/25/50/75/100%).
 */
import React, { useRef, useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../styles/theme';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 10;
export const DECK_CARD_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP) / 2;
export const DECK_CARD_HEIGHT = DECK_CARD_WIDTH * 1.35;

/**
 * Calcula matérias estudadas (≥1 card com level>0) e total.
 */
const calcSubjectProgress = (subjects = []) => {
  const total = subjects.length;
  const studied = subjects.filter(s => (s.flashcards || []).some(c => (c.level || 0) > 0)).length;
  return { studied, total };
};

/**
 * Para cada nível 1..5, retorna a fração de cards que atingiram aquele nível ou mais.
 */
const calcLevelFractions = (subjects = []) => {
  const cards = (subjects || []).flatMap(s => s.flashcards || []);
  const total = cards.length;
  if (total === 0) return [0, 0, 0, 0, 0];
  return [1, 2, 3, 4, 5].map(lvl =>
    cards.filter(c => (c.level || 0) >= lvl).length / total
  );
};

const DeckStackCard = ({ deck, onPress, onLongPress, onMenuPress, isSelected, multiSelectMode, width, height, categoryLabel }) => {
  const { studied, total: subjectCount } = calcSubjectProgress(deck.subjects);
  const hasStudied = studied > 0;

  // fracs[i] = fração de cards com level >= (i+1)
  const fracs = calcLevelFractions(deck.subjects);

  // stackCard3: acende conforme maioria chega no level 1+
  // stackCard2: acende conforme maioria chega no level 2+
  // stackCard1: acende conforme maioria chega no level 3+
  // borda:      acende conforme maioria chega no level 4+ e 5
  const s3op = Math.min(1, fracs[0] * 2);
  const s2op = Math.min(1, fracs[1] * 2);
  const s1op = Math.min(1, fracs[2] * 2);
  const borderOpacity = Math.min(0.55, fracs[3] * 2 * 0.3 + fracs[4] * 2 * 0.25);

  const stackBg = (op) => op > 0 ? `rgba(93,214,44,${(op * 0.10).toFixed(2)})` : 'rgba(32,32,32,0.4)';
  const stackBd = (op) => op > 0 ? `rgba(93,214,44,${(op * 0.40).toFixed(2)})` : 'rgba(93,214,44,0.05)';

  const cardWidth = width || DECK_CARD_WIDTH;
  const cardHeight = height || DECK_CARD_HEIGHT;

  const [tooltip, setTooltip] = useState(null); // { x, y, label }
  const [isTruncated, setIsTruncated] = useState(false);
  const labelRef = useRef(null);
  const touchStart = useRef(null);
  const fullLabel = (categoryLabel || 'DECK').toUpperCase();

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
      <View style={[styles.stackCard, styles.stackCard3, { backgroundColor: stackBg(s3op), borderColor: stackBd(s3op) }]} />
      <View style={[styles.stackCard, styles.stackCard2, { backgroundColor: stackBg(s2op), borderColor: stackBd(s2op) }]} />
      <View style={[styles.stackCard, styles.stackCard1, { backgroundColor: stackBg(s1op), borderColor: stackBd(s1op) }]} />

      {/* Carta principal */}
      <View style={[
        styles.mainCard,
        borderOpacity > 0 && { borderColor: `rgba(93,214,44,${borderOpacity})`, borderWidth: 1.5 },
        isSelected && styles.mainCardSelected,
      ]}>
        {/* Label categoria / DECK */}
        <TouchableOpacity
          ref={labelRef}
          activeOpacity={0.6}
          disabled={!isTruncated}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          onPress={() => {
            labelRef.current?.measure((fx, fy, w, h, px, py) => {
              setTooltip({ x: px, y: py - 32, label: fullLabel });
            });
          }}
        >
          <Text
            style={styles.deckLabel}
            numberOfLines={1}
            ellipsizeMode="tail"
            onTextLayout={(e) => {
              const lines = e.nativeEvent.lines;
              if (lines.length > 0) {
                setIsTruncated(lines[0].text.trimEnd().length < fullLabel.length);
              }
            }}
          >
            {fullLabel}
          </Text>
        </TouchableOpacity>

        {/* Tooltip para label truncado */}
        {tooltip && (
          <Modal transparent animationType="none" onRequestClose={() => setTooltip(null)}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setTooltip(null)}>
              <View style={[styles.tooltip, { top: tooltip.y, left: tooltip.x }]}>
                <Text style={styles.tooltipText}>{tooltip.label}</Text>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Nome */}
        <Text style={styles.deckName} numberOfLines={3}>{deck.name || 'Deck sem nome'}</Text>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Footer */}
        <View style={styles.footer}>
          {hasStudied ? (
            <>
              <View style={styles.subjectRow}>
                <Text style={styles.subjectNumber}>{studied}</Text>
                <Text style={styles.subjectWord}>/{subjectCount}</Text>
              </View>
              <Text style={styles.subjectLabel}>
                {studied === 1 ? 'matéria estudada' : 'matérias estudadas'}
              </Text>
            </>
          ) : (
            <>
              <View style={styles.subjectRow}>
                <Text style={styles.subjectNumber}>{subjectCount}</Text>
                <Text style={styles.subjectWord}>{subjectCount === 1 ? ' matéria' : ' matérias'}</Text>
              </View>
              <Text style={styles.subjectLabel}>Não iniciado</Text>
            </>
          )}
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
    borderWidth: 1,
    borderColor: theme.backgroundTertiary,
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
    paddingRight: 26, // espaço para o botão ···
  },
  deckName: {
    fontFamily: theme.fontFamily.headingSemiBold,
    fontSize: 15,
    color: theme.textPrimary,
    lineHeight: 21,
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
    fontFamily: theme.fontFamily.uiMedium,
    fontSize: 15,
    color: theme.textMuted,
  },
  subjectLabel: {
    fontFamily: theme.fontFamily.ui,
    fontSize: 11,
    color: theme.textMuted,
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

  // Tooltip
  tooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(30,30,30,0.96)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 200,
    borderWidth: 1,
    borderColor: 'rgba(93,214,44,0.25)',
  },
  tooltipText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: theme.fontFamily.uiMedium,
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
