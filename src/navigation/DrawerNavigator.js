import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HomeStackNavigator from './HomeStackNavigator';
import { SettingsScreen } from '../screens/SettingsScreen';

const Drawer = createDrawerNavigator();

export function DrawerNavigator() {
    // Pega as dimensões da tela para calcular a largura do drawer
    const { width } = Dimensions.get('window');

    return (
        <Drawer.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#2D3748' },
                headerTintColor: 'white',
                drawerStyle: {
                    backgroundColor: '#1A202C',
                    width: width * 0.75,
                },
                drawerLabelStyle: { fontWeight: 'bold', fontSize: 16 },
                drawerActiveTintColor: '#4FD1C5',
                drawerInactiveTintColor: '#A0AEC0',
                drawerPosition: 'right',
                drawerType: 'front',
            }}
        >
          {/* A tela de início ainda faz parte do drawer para a navegação funcionar, mas o item é removido do menu */}
          <Drawer.Screen
            name="HomeDrawer"
            component={HomeStackNavigator}
            options={({ route }) => {
                const routeName = getFocusedRouteNameFromRoute(route) ?? 'DeckList';
                // Só permite swipe na tela inicial (DeckList)
                const isSwipeEnabled = routeName === 'DeckList';
                return {
                    title: "Início",
                    headerShown: false,
                    drawerItemStyle: { display: 'none' }, // Oculta este item do menu
                    swipeEnabled: isSwipeEnabled,
                };
            }}
          />
          <Drawer.Screen
            name="ConfiguracoesDrawer"
            component={SettingsScreen}
            options={{
              title: "Configurações",
              swipeEnabled: false,
              headerRight: () => null, // Remove o menu burger (que está na direita)
              headerLeft: undefined,   // Garante que a esquerda use o padrão (se houver voltar) ou nada
              drawerIcon: ({ color, size }) => (
                <Ionicons name="settings-outline" size={size} color={color} />
              )
            }}
          />
        </Drawer.Navigator>
      );
}

export default DrawerNavigator;
