import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../styles/theme';

const MENU_ITEMS = [
  {
    id: 'settings',
    label: 'Configurações',
    sublabel: 'Preferências do app',
    icon: 'settings-outline',
    iconActive: 'settings',
    screen: 'ConfiguracoesDrawer',
    color: theme.primary,
  },
];

export function CustomDrawerContent({ state, navigation, srsModalOpen }) {
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index]?.name;

  return (
    <View style={[dStyles.root, { paddingTop: insets.top }]}>

      {/* ── HEADER BRANDING ── */}
      <View style={dStyles.header}>
        <View style={dStyles.logoWrap}>
          <View style={dStyles.logoIcon}>
            <Ionicons name="layers" size={18} color={theme.background} />
          </View>
          <View>
            <Text style={dStyles.logoName}>Meus Decks</Text>
            <Text style={dStyles.logoSub}>Gerencie seus estudos</Text>
          </View>
        </View>
        <TouchableOpacity
          style={dStyles.closeBtn}
          onPress={() => navigation.closeDrawer()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── BADGE DE STATUS ── */}
      <View style={dStyles.statusBadge}>
        <View style={dStyles.statusDot} />
        <Text style={dStyles.statusText}>Beta · Versão gratuita</Text>
      </View>

      <View style={dStyles.separator} />

      {/* ── MENU ITEMS ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={dStyles.menuList}
        showsVerticalScrollIndicator={false}
      >
        <Text style={dStyles.menuSection}>MENU</Text>

        {MENU_ITEMS.map(item => {
          const isActive = activeRoute === item.screen;
          return (
            <TouchableOpacity
              key={item.id}
              style={[dStyles.menuItem, isActive && dStyles.menuItemActive]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.75}
            >
              <View style={[dStyles.menuIconBox, isActive && { backgroundColor: item.color + '25' }]}>
                <Ionicons
                  name={isActive ? item.iconActive : item.icon}
                  size={21}
                  color={isActive ? item.color : theme.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[dStyles.menuLabel, isActive && { color: item.color }]}>
                  {item.label}
                </Text>
                <Text style={dStyles.menuSublabel}>{item.sublabel}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={15}
                color={isActive ? item.color + '80' : theme.backgroundTertiary}
              />
            </TouchableOpacity>
          );
        })}

        {srsModalOpen && (
          <TouchableOpacity
            style={dStyles.menuItem}
            onPress={() => { navigation.closeDrawer(); setTimeout(srsModalOpen, 300); }}
            activeOpacity={0.75}
          >
            <View style={dStyles.menuIconBox}>
              <Ionicons name="information-circle-outline" size={21} color={theme.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={dStyles.menuLabel}>Como funciona</Text>
              <Text style={dStyles.menuSublabel}>Sistema de níveis SRS</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={theme.backgroundTertiary} />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── RODAPÉ ── */}
      <View style={[dStyles.footer, { paddingBottom: insets.bottom || 16 }]}>
        <View style={dStyles.separator} />
        <View style={dStyles.footerContent}>
          <Ionicons name="flash-outline" size={13} color={theme.textMuted} />
          <Text style={dStyles.footerText}>AntiGravity · beta</Text>
        </View>
      </View>
    </View>
  );
}

const dStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoName: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  logoSub: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: theme.backgroundSecondary,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.primary,
  },
  statusText: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },

  separator: {
    height: 1,
    backgroundColor: theme.backgroundSecondary,
    marginHorizontal: 0,
  },

  // Menu
  menuList: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 4,
  },
  menuSection: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 14,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: theme.backgroundSecondary,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: theme.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  menuSublabel: {
    color: theme.textMuted,
    fontSize: 11,
    marginTop: 1,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 14,
  },
  footerText: {
    color: theme.textMuted,
    fontSize: 11,
  },
});

export default CustomDrawerContent;
