import React, { useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HomeStackNavigator from './HomeStackNavigator';
import { SettingsScreen } from '../screens/SettingsScreen';
import { CustomDrawerContent } from '../components/ui/CustomDrawerContent';
import { SrsInfoModal } from '../components/ui/SrsInfoModal';
import theme from '../styles/theme';

const Drawer = createDrawerNavigator();

export function DrawerNavigator() {
    const { width } = Dimensions.get('window');
    const [srsVisible, setSrsVisible] = useState(false);

    return (
        <>
          <Drawer.Navigator
              drawerContent={(props) => (
                <CustomDrawerContent {...props} srsModalOpen={() => setSrsVisible(true)} />
              )}
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
            <Drawer.Screen
              name="HomeDrawer"
              component={HomeStackNavigator}
              options={{
                  title: "Início",
                  headerShown: false,
                  drawerItemStyle: { display: 'none' },
              }}
            />
            <Drawer.Screen
              name="ConfiguracoesDrawer"
              component={SettingsScreen}
              options={{
                title: "Configurações",
                swipeEnabled: false,
                headerRight: () => null,
                headerLeft: undefined,
                drawerIcon: ({ color, size }) => (
                  <Ionicons name="settings-outline" size={size} color={color} />
                )
              }}
            />
          </Drawer.Navigator>
          <SrsInfoModal visible={srsVisible} onClose={() => setSrsVisible(false)} />
        </>
      );
}

export default DrawerNavigator;
