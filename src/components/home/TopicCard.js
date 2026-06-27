import React, { useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../styles/theme';

// Grade de pontos decorativa clássica e limpa
const DotGrid = ({ size = 36 }) => {
  const dots = [];
  const spacing = 8;
  const cols = 4;
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push(
        <Circle
          key={`${r}-${c}`}
          cx={c * spacing + 6}
          cy={r * spacing + 6}
          r={1.5}
          fill={theme.primary}
          opacity={0.18}
        />
      );
    }
  }
  return (
    <Svg width={size} height={size}>
      {dots}
    </Svg>
  );
};

const TopicCard = ({
  subject, parentName, onPress, onLongPress,
  isSelected, selectMode,
  width: propWidth, height: propHeight,
  onMenuPress,
}) => {
  const totalCards = subject.flashcards?.length || 0;
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
      onLongPress={() => onLongPress?.({ nativeEvent: { pageX: touchStart.current?.x || 0, pageY: touchStart.current?.y || 0 } })}
      activeOpacity={0.85}
      style={[styles.card, { width: propWidth, height: propHeight }, isSelected && styles.cardSelected]}
    >
      {/* Gradiente de Fundo Premium - Suave e com excelente contraste */}
      <LinearGradient
        colors={isSelected ? ['#1D2A18', '#11190E'] : ['#222225', '#131315']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Conteúdo */}
      <View style={styles.content}>
        {/* Tag/Label da Matéria Pai */}
        <View style={styles.labelRow}>
          <View style={[styles.labelDot, isSelected && styles.labelDotSelected]} />
          <Text style={styles.label} numberOfLines={1}>
            {(parentName || 'Assunto').toUpperCase()}
          </Text>
        </View>

        {/* Nome do Assunto */}
        <Text style={styles.name} numberOfLines={3}>
          {subject.name || 'Assunto'}
        </Text>

        <View style={{ flex: 1 }} />

        {/* Rodapé com Alinhamento Perfeito entre o Badge e a Grade de Pontos */}
        <View style={styles.footer}>
          <View style={[styles.pillContainer, isSelected && styles.pillContainerSelected]}>
            <Ionicons name="albums-outline" size={13} color={theme.primary} style={{ marginRight: 5 }} />
            <Text style={styles.cardCountNumber}>{totalCards}</Text>
            <Text style={styles.cardCountWord}>{totalCards === 1 ? ' card' : ' cards'}</Text>
          </View>
          
          {/* Espaçador flexível para empurrar a grade de pontos para a direita */}
          <View style={{ flex: 1 }} />
          
          {/* Grade de pontos alinhada perfeitamente no rodapé */}
          <DotGrid />
        </View>
      </View>

      {/* Menu 3 pontos */}
      {!selectMode && (
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={onMenuPress}
          hitSlop={{ top: 8, bottom: 8, left: 10, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={16} color={theme.textMuted} />
        </TouchableOpacity>
      )}

      {/* Checkbox */}
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  cardSelected: {
    borderColor: theme.primary,
    borderWidth: 2,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  content: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 14,
    paddingLeft: 14,
    paddingRight: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.primary,
    marginRight: 6,
    opacity: 0.6,
  },
  labelDotSelected: {
    opacity: 1,
  },
  label: {
    fontFamily: theme.fontFamily.uiSemiBold,
    fontSize: 9,
    color: theme.textSecondary,
    letterSpacing: 1.0,
  },
  name: {
    fontFamily: theme.fontFamily.headingSemiBold,
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 20,
    paddingRight: 16, // Deixa um espaço para o menu de 3 pontos não cobrir o título
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  pillContainerSelected: {
    backgroundColor: 'rgba(93, 214, 44, 0.12)',
    borderColor: 'rgba(93, 214, 44, 0.25)',
  },
  cardCountNumber: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 14,
    color: theme.primary,
    lineHeight: 18,
  },
  cardCountWord: {
    fontFamily: theme.fontFamily.uiSemiBold,
    fontSize: 12,
    color: theme.textSecondary,
    marginLeft: 3,
  },
  menuBtn: {
    position: 'absolute',
    top: 10,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOverlay: {
    position: 'absolute',
    top: 10,
    right: 8,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: theme.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkCircleActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
});

export default TopicCard;
