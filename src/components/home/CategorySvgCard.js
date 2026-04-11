/**
 * CategorySvgCard
 * Card de categoria com dois estados:
 *  - Cheio: categoria tem decks — exibe visual com "pilha de cards"
 *  - Vazio: categoria sem decks — exibe fundo gradiente limpo
 *
 * Layout (212.13 × 212.13 viewBox, card quadrado):
 *  ┌──────────────────────────┐
 *  │  Área verde (gradiente)  │  ← top ~37%  (+3-dot pill)
 *  ├──────────────────────────┤
 *  │  Nome da categoria       │  ← middle (37–65%)
 *  ├────── separator ─────────┤  ← 65.1%
 *  │  17 Decks │ 14 Matérias  │  ← bottom (65–100%)
 *  │                    ⚖ icon│
 *  └──────────────────────────┘
 */
import React, { useMemo } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Dimensions } from 'react-native';
import { SvgXml, Svg, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { CARD_FULL_SVG, CARD_EMPTY_SVG } from '../../assets/svg-cards/categoryCardSvgs';
import {
  administrativoIcon, educacaoIcon, fiscalIcon, justicaIcon,
  militarIcon, operacionalIcon, saudeIcon, segurancaIcon,
} from '../../assets/svgIconPaths';
import theme from '../../styles/theme';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 12;
const CARD_WIDTH = (width - GRID_PADDING * 2 - GRID_GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH; // card quadrado

// Proporções baseadas no viewBox 212.13 × 212.13
const SVG_SZ = 212.13;
const GREEN_END_PCT   = 79   / SVG_SZ; // ~37.3% — fim da área verde
const SEPARATOR_PCT   = 138.19 / SVG_SZ; // ~65.2% — linha separadora
// Pill do 3-dot (posição no SVG do card vazio, reutilizamos para ambos)
const PILL_X_PCT = 160.23 / SVG_SZ;
const PILL_Y_PCT = 45.35  / SVG_SZ;
const PILL_W_PCT = 41.16  / SVG_SZ;
const PILL_H_PCT = 26.84  / SVG_SZ;

// Tamanho do ícone na área inferior
const ICON_SIZE = CARD_WIDTH * 0.22;

const CATEGORY_ICONS = {
  administrativo: administrativoIcon,
  educacao:       educacaoIcon,
  fiscal:         fiscalIcon,
  justica:        justicaIcon,
  militar:        militarIcon,
  operacional:    operacionalIcon,
  saude:          saudeIcon,
  seguranca:      segurancaIcon,
};

/** Filtra strings que são nomes de camada (não são paths d="...") */
const isPath = (s) => typeof s === 'string' && s.startsWith('M');

/** Monta um SVG inline com os paths do ícone da categoria */
const buildIconSvg = (iconData) => {
  if (!iconData) return null;
  const paths = iconData.paths.filter(isPath);
  if (!paths.length) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${iconData.w} ${iconData.h}">${
    paths.map(d => `<path fill="${theme.primary}" d="${d}"/>`).join('')
  }</svg>`;
};

const countSubjects = (decks = []) =>
  decks.reduce((sum, d) => sum + (d.subjects?.length || 0), 0);

// Posições calculadas uma única vez (modulares, independentes da instância)
const pillLeft   = CARD_WIDTH * PILL_X_PCT;
const pillTop    = CARD_HEIGHT * PILL_Y_PCT;
const pillWidth  = CARD_WIDTH * PILL_W_PCT;
const pillHeight = CARD_HEIGHT * PILL_H_PCT;
const pillRadius = pillHeight / 2;

const bodyTop     = CARD_HEIGHT * GREEN_END_PCT;
const separatorY  = CARD_HEIGHT * SEPARATOR_PCT;
const bodyHeight  = separatorY - bodyTop;
const statsTop    = separatorY;
const statsHeight = CARD_HEIGHT - separatorY;

const CategorySvgCard = ({
  category,
  decks = [],
  onPress,
  onLongPress,
  isSelected,
  selectMode,
  onMenuPress,
}) => {
  const deckCount    = decks.length;
  const subjectCount = countSubjects(decks);
  const hasDeck      = deckCount > 0;
  const svgXml       = hasDeck ? CARD_FULL_SVG : CARD_EMPTY_SVG;
  const iconSvg      = useMemo(() => buildIconSvg(CATEGORY_ICONS[category.id]), [category.id]);
  // Para categorias customizadas: icon é uma string Ionicons (ex: 'folder-outline')
  const customIconName = !iconSvg && category.icon && typeof category.icon === 'string' ? category.icon : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.82}
      style={[
        styles.wrapper,
        { width: CARD_WIDTH, height: CARD_HEIGHT },
        isSelected && styles.wrapperSelected,
      ]}
    >
      {/* ── Background SVG ── */}
      <SvgXml
        xml={svgXml}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Pill do 3-dot (dark rounded button) ── */}
      {!selectMode && (
        <TouchableOpacity
          style={[
            styles.pill,
            {
              left:         pillLeft,
              top:          pillTop,
              width:        pillWidth,
              height:       pillHeight,
              borderRadius: pillRadius,
            },
          ]}
          onPress={(e) => onMenuPress?.(e)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="ellipsis-vertical" size={14} color={theme.textSecondary} />
        </TouchableOpacity>
      )}

      {/* ── Nome da categoria ── */}
      <Text
        pointerEvents="none"
        style={[
          styles.name,
          { position: 'absolute', top: pillTop + 4, left: 12, right: pillWidth + 16 },
        ]}
        numberOfLines={2}
      >
        {category.name}
      </Text>

      {/* ── Stats + Ícone (área abaixo do separator) ── */}
      <View
        style={[styles.statsArea, { top: statsTop, height: statsHeight }]}
        pointerEvents="none"
      >
        {/* Decks | Matérias */}
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

        {/* Ícone da categoria — canto inferior direito */}
        {iconSvg ? (
          <SvgXml
            xml={iconSvg}
            width={ICON_SIZE}
            height={ICON_SIZE}
            style={styles.categoryIcon}
          />
        ) : customIconName ? (
          <Ionicons
            name={customIconName}
            size={ICON_SIZE}
            color={theme.primary}
            style={[styles.categoryIcon, { opacity: 0.9 }]}
          />
        ) : null}
      </View>

      {/* ── Checkbox de seleção ── */}
      {selectMode && (
        <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
          {isSelected && <Ionicons name="checkmark" size={11} color="#0F0F0F" />}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: theme.backgroundSecondary,
  },
  wrapperSelected: {
    borderWidth: 2,
    borderColor: theme.primary,
  },

  // 3-dot pill
  pill: {
    position: 'absolute',
    backgroundColor: 'rgba(26,26,26,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Nome — posicionado absolutamente logo abaixo da área verde
  name: {
    fontFamily: theme.fontFamily.headingSemiBold,
    fontSize: 14,
    color: theme.textPrimary,
    lineHeight: 19,
  },

  // Stats (abaixo do separador)
  statsArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statNumber: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 20,
    color: theme.primary,
    lineHeight: 24,
  },
  statLabel: {
    fontFamily: theme.fontFamily.ui,
    fontSize: 9,
    color: theme.textSecondary,
    marginTop: 1,
  },
  divider: {
    width: 1.5,
    height: 30,
    backgroundColor: theme.primary,
    marginHorizontal: 2,
  },

  // Ícone da categoria
  categoryIcon: {
    opacity: 0.9,
  },

  // Checkbox
  checkCircle: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
});

export default CategorySvgCard;
export { CARD_WIDTH, CARD_HEIGHT };
