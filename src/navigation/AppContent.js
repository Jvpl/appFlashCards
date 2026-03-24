import React, { useState, useEffect } from 'react';
import { View, Text, Keyboard, StatusBar, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../config/theme';
import { DrawerNavigator } from './DrawerNavigator';
import { ProgressScreen } from '../screens/ProgressScreen';
import { LojaScreen } from '../screens/LojaScreen';
import { FadeInView } from '../components/ui/FadeInView';
import theme from '../styles/theme';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = [
  { name: 'Início',    active: 'compass',      inactive: 'compass-outline' },
  { name: 'Progresso', active: 'pulse',        inactive: 'pulse-outline' },
  { name: 'Loja',      active: 'storefront',   inactive: 'storefront-outline' },
];

// ─────────────────────────────────────────────
// Tab bar customizada premium
// ─────────────────────────────────────────────

function CustomTabBar({ state, descriptors, navigation, isKeyboardVisible }) {
  const insets = useSafeAreaInsets();

  if (isKeyboardVisible) return null;

  return (
    <View style={tbStyles.outerWrap}>
      <View style={[tbStyles.wrapper, { paddingBottom: insets.bottom || 16 }]}>
      <View style={tbStyles.container}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const cfg = TAB_CONFIG[index];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={[tbStyles.tab, !isFocused && { opacity: 0.5 }]}
              onPress={onPress}
              activeOpacity={0.7}
            >
              {isFocused && <View style={tbStyles.indicator} />}
              <Ionicons
                name={isFocused ? cfg.active : cfg.inactive}
                size={23}
                color={isFocused ? theme.primary : theme.textPrimary}
              />
              <Text style={[tbStyles.label, isFocused && tbStyles.labelActive]}>
                {cfg.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// App
// ─────────────────────────────────────────────

export function AppContent() {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  return (
    <NavigationContainer theme={AppTheme}>
      <StatusBar barStyle="light-content" backgroundColor={theme.background} />
      <Tab.Navigator
        tabBar={(props) => (
          <CustomTabBar {...props} isKeyboardVisible={isKeyboardVisible} />
        )}
        sceneContainerStyle={{ backgroundColor: theme.background }}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Início"
          options={{ unmountOnBlur: false }}
          listeners={({ navigation, route }) => ({
            tabPress: (e) => {
              if (isKeyboardVisible) {
                e.preventDefault();
                return;
              }

              // Só intercepta quando já está no tab Início (para resetar a stack)
              if (!navigation.isFocused()) return;

              const drawerState = route.state;
              const drawerIndex = drawerState?.index ?? 0;

              if (drawerIndex === 0) {
                const homeDrawerRoute = drawerState?.routes?.[0];
                const stackState = homeDrawerRoute?.state;

                if (!stackState || stackState.index === 0) {
                  e.preventDefault();
                  return;
                }
              }

              e.preventDefault();
              navigation.dispatch(state => {
                const routes = state.routes.map(r => {
                  if (r.name === 'Início') {
                    return {
                      name: 'Início',
                      key: r.key,
                      params: { resetTs: Date.now() }
                    };
                  }
                  return r;
                });

                return CommonActions.reset({
                  ...state,
                  routes,
                  index: state.routes.findIndex(r => r.name === 'Início'),
                });
              });
            },
          })}
        >
          {(props) => (
            <View style={{ flex: 1, backgroundColor: theme.background }}>
              <FadeInView key={props.route.params?.resetTs || 'init'}>
                <DrawerNavigator />
              </FadeInView>
            </View>
          )}
        </Tab.Screen>

        <Tab.Screen name="Progresso">
          {() => (
            <FadeInView>
              <ProgressScreen />
            </FadeInView>
          )}
        </Tab.Screen>

        <Tab.Screen name="Loja">
          {() => (
            <FadeInView>
              <LojaScreen />
            </FadeInView>
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ─────────────────────────────────────────────
// Estilos da tab bar
// ─────────────────────────────────────────────

const tbStyles = StyleSheet.create({
  outerWrap: {
    backgroundColor: theme.background,
  },
  wrapper: {
    backgroundColor: theme.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  container: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 3,
    borderRadius: 3,
    backgroundColor: theme.primary,
  },
  label: {
    fontSize: 10,
    fontFamily: theme.fontFamily.uiMedium,
    color: theme.textPrimary,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: theme.primary,
    fontFamily: theme.fontFamily.uiSemiBold,
  },
});

export default AppContent;
