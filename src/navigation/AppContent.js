import React, { useState, useEffect } from 'react';
import { View, Text, Keyboard, StatusBar, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../config/theme';
import { DrawerNavigator } from './DrawerNavigator';
import { ProgressScreen } from '../screens/ProgressScreen';
import { LojaScreen } from '../screens/LojaScreen';
import { FlashcardScreen } from '../screens/FlashcardScreen';
import { ManageFlashcardsScreen } from '../screens/ManageFlashcardsScreen';
import { EditFlashcardScreen } from '../screens/EditFlashcardScreen';
import { FlashcardHistoryScreen } from '../screens/FlashcardHistoryScreen';
import { FadeInView } from '../components/ui/FadeInView';
import theme from '../styles/theme';


const Root = createStackNavigator();

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

function MainTabs() {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  return (
    <Tab.Navigator
      tabBar={(props) => (
        <CustomTabBar {...props} isKeyboardVisible={isKeyboardVisible} />
      )}
      sceneContainerStyle={{ backgroundColor: theme.background }}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Início"
        options={{ unmountOnBlur: false }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            if (isKeyboardVisible) { e.preventDefault(); return; }
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
              const routes = state.routes.map(r =>
                r.name === 'Início'
                  ? { name: 'Início', key: r.key, params: { resetTs: Date.now() } }
                  : r
              );
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
        {() => <FadeInView><ProgressScreen /></FadeInView>}
      </Tab.Screen>

      <Tab.Screen name="Loja">
        {() => <FadeInView><LojaScreen /></FadeInView>}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export function AppContent() {
  return (
    <NavigationContainer theme={AppTheme}>
      <StatusBar barStyle="light-content" backgroundColor={theme.background} />
      <Root.Navigator screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.background },
        animationEnabled: true,
        cardStyleInterpolator: () => ({ cardStyle: {} }),
        transitionSpec: {
          open: { animation: 'timing', config: { duration: 0 } },
          close: { animation: 'timing', config: { duration: 0 } },
        },
      }}>
        <Root.Screen name="MainTabs" component={MainTabs} />
        <Root.Screen
          name="Flashcard"
          component={FlashcardScreen}
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: theme.background, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', elevation: 0 },
            headerTintColor: theme.textPrimary,
            headerTitleAlign: 'center',
            headerTitleStyle: { fontWeight: 'bold' },
            cardStyle: { backgroundColor: theme.background },
          }}
        />
        <Root.Screen
          name="ManageFlashcards"
          component={ManageFlashcardsScreen}
          options={{
            headerShown: true,
            title: 'Criar Flashcard',
            headerStyle: { backgroundColor: theme.background, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', elevation: 0 },
            headerTintColor: theme.textPrimary,
            headerTitleAlign: 'center',
            headerTitleStyle: { fontWeight: 'bold' },
            gestureEnabled: false,
            cardStyle: { backgroundColor: theme.background },
          }}
        />
        <Root.Screen
          name="EditFlashcard"
          component={EditFlashcardScreen}
          options={{
            headerShown: true,
            title: 'Editar Flashcard',
            headerStyle: { backgroundColor: theme.background, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', elevation: 0 },
            headerTintColor: theme.textPrimary,
            headerTitleAlign: 'center',
            headerTitleStyle: { fontWeight: 'bold' },
            cardStyle: { backgroundColor: theme.background },
          }}
        />
        <Root.Screen
          name="FlashcardHistory"
          component={FlashcardHistoryScreen}
          options={{
            headerShown: true,
            title: 'Gerenciar Cards',
            headerStyle: { backgroundColor: theme.background, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', elevation: 0 },
            headerTintColor: theme.textPrimary,
            headerTitleAlign: 'center',
            headerTitleStyle: { fontWeight: 'bold' },
            cardStyle: { backgroundColor: theme.background },
          }}
        />
      </Root.Navigator>
    </NavigationContainer>
  );
}

// ─────────────────────────────────────────────
// Estilos da tab bar
// ─────────────────────────────────────────────

const tbStyles = StyleSheet.create({
  outerWrap: { backgroundColor: theme.background },
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
  container: { flexDirection: 'row', paddingTop: 10, paddingHorizontal: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 4, position: 'relative' },
  indicator: { position: 'absolute', top: 0, width: 32, height: 3, borderRadius: 3, backgroundColor: theme.primary },
  label: { fontSize: 10, fontFamily: theme.fontFamily.uiMedium, color: theme.textPrimary, letterSpacing: 0.2 },
  labelActive: { color: theme.primary, fontFamily: theme.fontFamily.uiSemiBold },
});

export default AppContent;
