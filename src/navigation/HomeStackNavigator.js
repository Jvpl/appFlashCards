import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import theme from '../styles/theme';

// Importar todas as screens
import { DeckListScreen } from '../screens/DeckListScreen';
import { SubjectListScreen } from '../screens/SubjectListScreen';
import { FlashcardScreen } from '../screens/FlashcardScreen';
import { AddDeckScreen } from '../screens/AddDeckScreen';
import { AddSubjectScreen } from '../screens/AddSubjectScreen';
import { ManageFlashcardsScreen } from '../screens/ManageFlashcardsScreen';
import { EditFlashcardScreen } from '../screens/EditFlashcardScreen';
import { EditSubjectScreen } from '../screens/EditSubjectScreen';
import { FlashcardHistoryScreen } from '../screens/FlashcardHistoryScreen';
import { AllItemsScreen } from '../screens/AllItemsScreen';
import { CategoryDetailScreen } from '../screens/CategoryDetailScreen';

const HomeStack = createStackNavigator();

// Fade transition spec
const fadeTransitionSpec = {
    open: {
        animation: 'timing',
        config: {
            duration: 300,
        },
    },
    close: {
        animation: 'timing',
        config: {
            duration: 300,
        },
    },
};

const navScreenOptions = {
    headerStyle: { backgroundColor: theme.backgroundElevated },
    headerTintColor: theme.textPrimary,
    headerTitleStyle: { fontWeight: theme.fontWeight.bold },
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
    cardStyle: { backgroundColor: theme.background }, // Evita flash branco nas transições
};

export function HomeStackNavigator({navigation}) {
  return (
    <HomeStack.Navigator screenOptions={navScreenOptions}>
      <HomeStack.Screen
        name="DeckList"
        component={DeckListScreen}
        options={{
          headerShown: false, // Custom header inside DeckListScreen
      }} />
      <HomeStack.Screen
        name="SubjectList"
        component={SubjectListScreen}
        options={{
            headerShown: false,
            cardStyleInterpolator: ({ current }) => ({ cardStyle: { opacity: current.progress } }),
        }}
      />
      <HomeStack.Screen
        name="Flashcard"
        component={FlashcardScreen}
        options={({ route }) => ({
          title: route.params.subjectName || 'Flashcards',
          cardStyle: { overflow: 'visible' },
          cardStyleInterpolator: ({ current }) => ({ cardStyle: { opacity: current.progress } }),
        })}
      />
      <HomeStack.Screen name="AddDeck" component={AddDeckScreen} options={{ headerShown: false }} />
<HomeStack.Screen name="AddSubject" component={AddSubjectScreen} options={{ title: 'Nova Matéria' }} />
      <HomeStack.Screen
        name="ManageFlashcards"
        component={ManageFlashcardsScreen}
        options={{
          title: 'Criar Flashcard',
          headerTintColor: 'white',
          animationEnabled: true,
          gestureEnabled: false,
          // Garante a mesma transição de fade do resto do app
          cardStyleInterpolator: ({ current }) => ({
            cardStyle: { opacity: current.progress },
          }),
          transitionSpec: {
            open: fadeTransitionSpec.open,
            close: fadeTransitionSpec.close,
          },
          cardStyle: { backgroundColor: theme.background },
        }}
      />
      <HomeStack.Screen name="EditFlashcard" component={EditFlashcardScreen} options={{ title: 'Editar Flashcard' }} />
      <HomeStack.Screen name="EditSubject" component={EditSubjectScreen} options={{ title: 'Editar Matéria' }} />
      <HomeStack.Screen name="FlashcardHistory" component={FlashcardHistoryScreen} options={{ title: 'Histórico de Cards' }} />
      <HomeStack.Screen
        name="AllItems"
        component={AllItemsScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="CategoryDetail"
        component={CategoryDetailScreen}
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}

export default HomeStackNavigator;
