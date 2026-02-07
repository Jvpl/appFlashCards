import React, { useState, useEffect } from 'react';
import { View, Keyboard, StatusBar, TouchableOpacity } from 'react-native';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme } from '../config/theme';
import { getAppData } from '../services/storage';
import DrawerNavigator from './DrawerNavigator';
import { ProgressScreen } from '../screens/ProgressScreen';
import { LojaScreen } from '../screens/LojaScreen';
import { FadeInView } from '../components/ui/FadeInView';

const Tab = createBottomTabNavigator();

export function AppContent() {
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <NavigationContainer theme={AppTheme}>
      <StatusBar barStyle="light-content" backgroundColor="#1A202C" />
      <Tab.Navigator
        screenOptions={({ route, navigation }) => ({
          tabBarButton: (props) => (
             <TouchableOpacity
               {...props}
               onPress={(e) => {
                 if (isKeyboardVisible) {
                   // Bloqueia clique se teclado visível
                   return;
                 }
                 if (props.onPress) props.onPress(e);
               }}
             />
          ),
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Início') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'Progresso') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
            else if (route.name === 'Loja') iconName = focused ? 'cart' : 'cart-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#4FD1C5',
          tabBarInactiveTintColor: '#A0AEC0',
          tabBarStyle: {
            backgroundColor: '#2D3748',
            borderTopWidth: 0,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 5, // Lógica ajustada
            paddingTop: 5,
          },
          tabBarLabelStyle: {
             fontWeight: 'bold' // Adicionado
          },
          headerShown: false,
        })}
      >
        <Tab.Screen
          name="Início"
          options={{ unmountOnBlur: true }}
          listeners={({ navigation, route }) => ({
            tabPress: (e) => {
              if (isKeyboardVisible) {
                  e.preventDefault();
                  return;
              }

              // Se já estiver na aba, verificamos profundamente o estado (Tab -> Drawer -> Stack)
              if (navigation.isFocused()) {
                  const drawerState = route.state;
                  
                  // Se não tem state, assume padrão (HomeDrawer -> DeckList) => Está na Raiz
                  if (!drawerState) {
                      e.preventDefault();
                      return;
                  }

                  const activeDrawerRoute = drawerState.routes[drawerState.index];

                  // Se estiver no 'HomeDrawer' (Stack Principal)
                  if (activeDrawerRoute.name === 'HomeDrawer') {
                      const stackState = activeDrawerRoute.state;
                      
                      // Se o stack não tem state ou index é 0, está no 'DeckList' => Está na Raiz
                      if (!stackState || stackState.index === 0) {
                          e.preventDefault();
                          return;
                      }
                  }
                  
                  // Se chegou aqui: ou está em outra rota do Drawer (Configs) ou num sub-nível do Stack.
                  // Deixa o evento prosseguir para o reset manual abaixo.
              }

              // Reset Manual: Intercepta o clique e reinicia a aba 'Início' para o estado original
              e.preventDefault();
              navigation.dispatch(state => {
                  // Mapeia as rotas para encontrar 'Início' e limpar seu estado interno
                  const routes = state.routes.map(r => {
                      if (r.name === 'Início') {
                          // Adiciona um timestamp para forçar a recriação do componente visual (FadeInView)
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
                <View style={{ flex: 1, backgroundColor: '#1A202C' }}>
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

export default AppContent;
