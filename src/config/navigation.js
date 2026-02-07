export const fadeTransitionSpec = {
  open: {
    animation: 'timing',
    config: {
      duration: 200, // R�pido e sutil
    },
  },
  close: {
    animation: 'timing',
    config: {
      duration: 200,
    },
  },
};

const HomeStack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

export const screenOptions = {
    headerStyle: { backgroundColor: '#2D3748' },
    headerTintColor: '#FFFFFF',
    headerTitleStyle: { fontWeight: 'bold' },
    // Substituindo Slide por Fade simples
    cardStyleInterpolator: ({ current }) => ({
      cardStyle: {
        opacity: current.progress,
      },
    }),
    transitionSpec: {
        open: fadeTransitionSpec.open,
        close: fadeTransitionSpec.close,
    },
    cardStyle: { backgroundColor: '#1A202C' }, // Evita flash branco nas transi��es
};
