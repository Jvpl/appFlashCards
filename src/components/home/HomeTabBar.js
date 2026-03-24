/**
 * HomeTabBar
 * TabBar interna da aba Início com 3 botões: Categorias | Decks | Matérias
 * Botão "Decks" levemente maior (destaque central).
 * Ativo: fundo verde lima, texto preto.
 * Inativo: transparente, texto muted.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import theme from '../../styles/theme';

const TABS = [
  { id: 'categorias', label: 'Categorias', small: true },
  { id: 'decks',      label: 'Decks',      small: false },
  { id: 'materias',   label: 'Matérias',   small: true },
];

const HomeTabBar = ({ activeTab, onTabChange }) => (
  <View style={styles.container}>
    {TABS.map(tab => {
      const isActive = activeTab === tab.id;
      return (
        <TouchableOpacity
          key={tab.id}
          onPress={() => onTabChange(tab.id)}
          activeOpacity={0.75}
          style={[
            styles.tab,
            isActive && styles.tabActive,
            !tab.small && styles.tabLarge,
          ]}
        >
          <Text style={[
            styles.label,
            tab.small ? styles.labelSmall : styles.labelLarge,
            isActive && styles.labelActive,
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.backgroundSecondary,
    borderRadius: 12,
    padding: 4,
    gap: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
  },
  tabLarge: {
    paddingVertical: 9,
    flex: 1.1,
  },
  tabActive: {
    backgroundColor: theme.primary,
  },
  label: {
    fontFamily: theme.fontFamily.uiMedium,
    color: theme.textMuted,
  },
  labelSmall: {
    fontSize: 13,
  },
  labelLarge: {
    fontSize: 15,
  },
  labelActive: {
    fontFamily: theme.fontFamily.uiSemiBold,
    color: '#0F0F0F',
  },
});

export default HomeTabBar;
