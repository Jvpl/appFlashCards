import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HomeStackNavigator from './HomeStackNavigator';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CustomDrawerContent } from '../components/ui/CustomDrawerContent';
import theme from '../styles/theme';

const Drawer = createDrawerNavigator();

export function DrawerNavigator() {
    // Pega as dimensões da tela para calcular a largura do drawer
    const { width } = Dimensions.get('window');

    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerStyle: { backgroundColor: theme.backgroundSecondary },
                headerTintColor: theme.textPrimary,
                drawerStyle: {
                    backgroundColor: theme.background,
                    width: width * 0.72,
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                },
                drawerPosition: 'right',
                drawerType: 'front',
                swipeEnabled: false,
            }}
        >
          {/* A tela de início ainda faz parte do drawer para a navegação funcionar, mas o item é removido do menu */}
          <Drawer.Screen
            name="HomeDrawer"
            component={HomeStackNavigator}
            options={{
                title: "Início",
                headerShown: false,
                drawerItemStyle: { display: 'none' }, // Oculta este item do menu
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
