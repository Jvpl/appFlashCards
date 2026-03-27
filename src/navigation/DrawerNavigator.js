import React, { useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Dimensions, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import HomeStackNavigator from './HomeStackNavigator';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SrsInfoModal } from '../components/ui/SrsInfoModal';
import theme from '../styles/theme';

const Drawer = createDrawerNavigator();

function CustomDrawerContent({ srsModalOpen, ...props }) {
  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Como funciona"
        icon={({ color, size }) => <Ionicons name="information-circle-outline" size={size} color={color} />}
        inactiveTintColor={theme.textMuted}
        labelStyle={{ fontWeight: theme.fontWeight.bold, fontSize: theme.fontSize.base }}
        onPress={() => {
          props.navigation.closeDrawer();
          setTimeout(() => srsModalOpen(), 300);
        }}
      />
    </DrawerContentScrollView>
  );
}

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
                      width: width * 0.75,
                  },
                  drawerLabelStyle: { fontWeight: theme.fontWeight.bold, fontSize: theme.fontSize.base },
                  drawerActiveTintColor: theme.primary,
                  drawerInactiveTintColor: theme.textMuted,
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
