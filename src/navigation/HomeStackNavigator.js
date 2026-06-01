import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import theme from '../styles/theme';

import { DeckListScreen } from '../screens/DeckListScreen';
import { SubjectListScreen } from '../screens/SubjectListScreen';
import { TopicListScreen } from '../screens/TopicListScreen';
import { AddDeckScreen } from '../screens/AddDeckScreen';
import { AddSubjectScreen } from '../screens/AddSubjectScreen';
import { EditSubjectScreen } from '../screens/EditSubjectScreen';
import { AllItemsScreen } from '../screens/AllItemsScreen';
import { CategoryDetailScreen } from '../screens/CategoryDetailScreen';

const HomeStack = createStackNavigator();

const fadeTransitionSpec = {
    open:  { animation: 'timing', config: { duration: 300 } },
    close: { animation: 'timing', config: { duration: 300 } },
};

const navScreenOptions = {
    headerStyle: { backgroundColor: theme.background, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', elevation: 0 },
    headerTintColor: theme.textPrimary,
    headerTitleAlign: 'center',
    headerTitleStyle: { fontWeight: theme.fontWeight.bold },
    cardStyleInterpolator: ({ current }) => ({ cardStyle: { opacity: current.progress } }),
    transitionSpec: { open: fadeTransitionSpec.open, close: fadeTransitionSpec.close },
    cardStyle: { backgroundColor: theme.background },
};

export function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={navScreenOptions}>
      <HomeStack.Screen name="DeckList" component={DeckListScreen} options={{ headerShown: false, keyboardHandlingEnabled: false }} />
      <HomeStack.Screen name="SubjectList" component={SubjectListScreen} options={{ headerShown: false, cardStyleInterpolator: ({ current }) => ({ cardStyle: { opacity: current.progress } }) }} />
      <HomeStack.Screen name="TopicList" component={TopicListScreen} options={{ headerShown: false, cardStyleInterpolator: ({ current }) => ({ cardStyle: { opacity: current.progress } }) }} />
      <HomeStack.Screen name="AddDeck" component={AddDeckScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="AddSubject" component={AddSubjectScreen} options={{ title: 'Nova Matéria' }} />
      <HomeStack.Screen name="EditSubject" component={EditSubjectScreen} options={{ title: 'Editar Matéria' }} />
      <HomeStack.Screen name="AllItems" component={AllItemsScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="CategoryDetail" component={CategoryDetailScreen} options={{ headerShown: false }} />
    </HomeStack.Navigator>
  );
}

export default HomeStackNavigator;
