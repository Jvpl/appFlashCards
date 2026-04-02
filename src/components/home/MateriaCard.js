import React, { useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../styles/theme';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 10;
export const MATERIA_CARD_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP) / 2;
export const MATERIA_CARD_HEIGHT = MATERIA_CARD_WIDTH * 1.3;

const MateriaCard = ({
  subject, deck, onPress, onLongPress,
  isSelected, selectMode,
  width: propWidth, height: propHeight,
  onMenuPress,
}) => {
  const cardCount  = subject.flashcards?.length || 0;
  const isReview   = !!subject.reviewMode;
  const cardWidth  = propWidth  || MATERIA_CARD_WIDTH;
  const cardHeight = propHeight || MATERIA_CARD_HEIGHT;
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
      activeOpacity={0.80}
      style={[styles.card, { width: cardWidth, height: cardHeight }, isSelected && styles.cardSelected, isReview && styles.cardReview]}
    >
      {/* Furos decorativos */}
      <View style={styles.holesColumn}>
        <View style={styles.hole} />
        <View style={styles.hole} />
        <View style={styles.hole} />
      </View>

      {/* Conteúdo */}
      <View style={styles.content}>
        <Text style={styles.label} numberOfLines={1}>{(deck?.name || 'Matéria').toUpperCase()}</Text>
        <Text style={styles.name} numberOfLines={3}>{subject.name || 'Matéria'}</Text>
        <View style={{ flex: 1 }} />
        <View style={styles.cardCountRow}>
          <Text style={styles.cardCountNumber}>{cardCount}</Text>
          <Text style={styles.cardCountWord}>{cardCount === 1 ? ' card' : ' cards'}</Text>
          {isReview && (
            <View style={styles.reviewBadge}>
              <Text style={styles.reviewBadgeTxt}>Revisão</Text>
            </View>
          )}
        </View>
      </View>

      {/* Menu 3 pontos */}
      {!selectMode && (
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={onMenuPress}
          hitSlop={{ top: 8, bottom: 8, left: 10, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={17} color={theme.textMuted} />
        </TouchableOpacity>
      )}

      {/* Checkbox de seleção */}
      {selectMode && (
        <View style={styles.checkOverlay}>
          <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
            {isSelected && <Ionicons name="checkmark" size={11} color="#0F0F0F" />}
          </View>
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
  cardReview: {
    borderColor: theme.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(93,214,44,0.04)',
  },

  // Furos
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

  // Conteúdo
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 10,
    paddingRight: 10,
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
  cardCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  cardCountNumber: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 20,
    color: theme.primary,
    lineHeight: 24,
  },
  cardCountWord: {
    fontFamily: theme.fontFamily.ui,
    fontSize: 11,
    color: theme.textMuted,
  },
  reviewBadge: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(93,214,44,0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reviewBadgeTxt: {
    color: theme.primary,
    fontSize: 10,
    fontFamily: theme.fontFamily.uiSemiBold,
  },

  // Menu 3 pontos
  menuBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Checkbox
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
});

export default MateriaCard;
