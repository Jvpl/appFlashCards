/**
 * CategorySvgCard
 * Renderiza o card de categoria usando o SVG da pasta src/assets/svg-categorias/
 * com dados dinâmicos (nome, decks, matérias) embutidos sobre o SVG.
 *
 * Design: idêntico à imagem de referência —
 *   fundo escuro com aba verde musgo no canto superior direito,
 *   nome no topo esquerdo, números verdes embaixo esquerda, ícone embaixo direita.
 */
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Dimensions } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { SVG_STRINGS } from '../../assets/categorySvgs';
import theme from '../../styles/theme';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 12;
const CARD_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP) / 2;
// aspect ratio do SVG: 218.32 / 153.94 ≈ 1.418
const CARD_HEIGHT = CARD_WIDTH / 1.418;

/**
 * Conta o total de matérias de um conjunto de decks
 */
const countSubjects = (decks = []) =>
  decks.reduce((sum, d) => sum + (d.subjects?.length || 0), 0);

const CategorySvgCard = ({ category, decks = [], onPress }) => {
  const deckCount = decks.length;
  const subjectCount = countSubjects(decks);
  const svgXml = SVG_STRINGS[category.id];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[styles.wrapper, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
    >
      {/* SVG de fundo — ocupa todo o card */}
      {svgXml ? (
        <SvgXml
          xml={svgXml}
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        // Fallback para "Meus estudos" que não tem SVG próprio
        <View style={[StyleSheet.absoluteFill, styles.fallbackBg]} />
      )}

      {/* Overlay com dados dinâmicos — posicionado sobre o SVG */}
      <View style={styles.overlay} pointerEvents="none">

        {/* Nome da categoria — topo esquerdo */}
        <Text style={styles.name} numberOfLines={2}>{category.name}</Text>

        {/* Espaço central vazio (o ícone SVG já está no fundo) */}
        <View style={{ flex: 1 }} />

        {/* Números embaixo à esquerda */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{String(deckCount).padStart(2, '0')}</Text>
            <Text style={styles.statLabel}>Decks</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{String(subjectCount).padStart(2, '0')}</Text>
            <Text style={styles.statLabel}>Matérias</Text>
          </View>
        </View>

      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1f1f1f',
  },
  fallbackBg: {
    backgroundColor: '#1f1f1f',
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.primary + '60',
  },
  overlay: {
    flex: 1,
    padding: 12,
    paddingBottom: 10,
  },
  name: {
    fontFamily: theme.fontFamily.headingSemiBold,
    fontSize: 13,
    color: '#F8F8F8',
    lineHeight: 17,
    maxWidth: '65%', // não sobrepõe a aba do SVG
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statNumber: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 22,
    color: '#6fb630',
    lineHeight: 26,
  },
  statLabel: {
    fontFamily: theme.fontFamily.ui,
    fontSize: 10,
    color: '#A0A0A0',
    marginTop: 1,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: '#404040',
    marginBottom: 6,
  },
});

export default CategorySvgCard;
export { CARD_WIDTH, CARD_HEIGHT };
