/**
 * OverflowCard
 * Card "+N mais" exibido quando há mais de 8 items num grid.
 * Visual coerente com DeckStackCard: mesmas cartas empilhadas atrás,
 * face frontal mostra contagem e CTA "Ver todos".
 */
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../styles/theme';

const OverflowCard = ({ count, onPress, width, height }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.78}
    style={[styles.container, width && { width }, height && { height }]}
  >
    {/* Cartas de trás — idênticas ao DeckStackCard */}
    <View style={[styles.stackCard, styles.stack1]} />
    <View style={[styles.stackCard, styles.stack2]} />
    <View style={[styles.stackCard, styles.stack3]} />

    {/* Carta principal */}
    <View style={styles.mainCard}>
      {/* Linhas ghost sugerindo conteúdo oculto */}
      <View style={styles.ghostLine} />
      <View style={[styles.ghostLine, styles.ghostLineShort]} />

      <View style={styles.centerBlock}>
        <Text style={styles.plus}>+{count}</Text>
        <Text style={styles.sublabel}>itens ocultos</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTxt}>Ver todos</Text>
        <Ionicons name="arrow-forward" size={12} color={theme.primary} />
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },

  // Cartas de trás — mesmos valores do DeckStackCard
  stackCard: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(93,214,44,0.18)',
    backgroundColor: 'rgba(28,28,28,0.9)',
  },
  stack1: {
    top: 6, left: 4, right: -4, bottom: -6,
    transform: [{ rotate: '2deg' }],
  },
  stack2: {
    top: 3, left: 2, right: -2, bottom: -3,
    transform: [{ rotate: '1deg' }],
  },
  stack3: {
    top: 1, left: 1, right: -1, bottom: -1,
    transform: [{ rotate: '0.5deg' }],
  },

  // Carta principal
  mainCard: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(93,214,44,0.3)',
    padding: 14,
    justifyContent: 'space-between',
  },

  // Linhas ghost (topo)
  ghostLine: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    width: '70%',
    marginBottom: 6,
  },
  ghostLineShort: {
    width: '45%',
  },

  // Contagem central
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 26,
    color: theme.primary,
    lineHeight: 30,
  },
  sublabel: {
    fontFamily: theme.fontFamily.ui,
    fontSize: 10,
    color: theme.textMuted,
    letterSpacing: 0.3,
    marginTop: 2,
  },

  // Rodapé CTA
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(93,214,44,0.2)',
    paddingTop: 8,
    marginHorizontal: -14,
    paddingHorizontal: 14,
  },
  footerTxt: {
    fontFamily: theme.fontFamily.uiSemiBold,
    fontSize: 12,
    color: theme.primary,
  },
});

export default OverflowCard;
