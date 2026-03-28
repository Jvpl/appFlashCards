/**
 * MateriaCard
 * Design de caderno com marcador (bookmark) verde fixo no topo direito.
 * 3 furos decorativos no lado esquerdo.
 * Label "MATÉRIA", nome da matéria e quantidade de cards.
 */
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../styles/theme';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 10;
export const MATERIA_CARD_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP) / 2;
export const MATERIA_CARD_HEIGHT = MATERIA_CARD_WIDTH * 1.3;

// Largura da faixa do bookmark
const BOOKMARK_WIDTH = 18;

const MateriaCard = ({ subject, deck, onPress, onLongPress, isSelected, selectMode, width, height }) => {
  const cardCount = subject.flashcards?.length || 0;
  const cardWidth = width || MATERIA_CARD_WIDTH;
  const cardHeight = height || MATERIA_CARD_HEIGHT;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.80}
      style={[styles.card, { width: cardWidth, height: cardHeight }, isSelected && styles.cardSelected]}
    >
      {/* Furos decorativos — lado esquerdo */}
      <View style={styles.holesColumn}>
        <View style={styles.hole} />
        <View style={styles.hole} />
        <View style={styles.hole} />
      </View>

      {/* Conteúdo principal */}
      <View style={styles.content}>
        {/* Label */}
        <Text style={styles.label}>MATÉRIA</Text>

        {/* Nome — com paddingRight para não passar pelo bookmark */}
        <Text
          style={styles.name}
          numberOfLines={3}
        >
          {subject.name || 'Matéria'}
        </Text>

        <View style={{ flex: 1 }} />

        {/* Quantidade de cards */}
        <Text style={styles.cardCount}>
          {cardCount} {cardCount === 1 ? 'card' : 'cards'}
        </Text>
      </View>

      {/* Bookmark — topo direito */}
      <View style={styles.bookmarkWrapper}>
        <View style={styles.bookmarkBody} />
        {/* Ponta V do bookmark */}
        <View style={styles.bookmarkTip} />
      </View>

      {/* Checkbox de seleção */}
      {selectMode && (
        <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
          {isSelected && <Ionicons name="checkmark" size={11} color="#0F0F0F" />}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.backgroundTertiary,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  cardSelected: {
    borderColor: theme.primary,
    borderWidth: 2,
  },
  checkCircle: {
    position: 'absolute',
    bottom: 8,
    left: 26,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.textMuted,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },

  // Coluna dos furos
  holesColumn: {
    width: 20,
    paddingVertical: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: theme.backgroundTertiary,
  },
  hole: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.primary + '80',
    backgroundColor: theme.background,
  },

  // Conteúdo central
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 10,
    paddingRight: BOOKMARK_WIDTH + 6,
  },
  label: {
    fontFamily: theme.fontFamily.uiMedium,
    fontSize: 10,
    color: theme.primary,
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  name: {
    fontFamily: theme.fontFamily.headingSemiBold,
    fontSize: 13,
    color: theme.textPrimary,
    lineHeight: 18,
  },
  cardCount: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12,
    color: theme.textMuted,
  },

  // Bookmark
  bookmarkWrapper: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: BOOKMARK_WIDTH,
    alignItems: 'center',
  },
  bookmarkBody: {
    width: BOOKMARK_WIDTH,
    height: 38,
    backgroundColor: theme.primary,
  },
  bookmarkTip: {
    width: 0,
    height: 0,
    borderLeftWidth: BOOKMARK_WIDTH / 2,
    borderRightWidth: BOOKMARK_WIDTH / 2,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: theme.primary,
  },
});

export default MateriaCard;
