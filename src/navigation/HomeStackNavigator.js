import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { screenOptions } from '../config/navigation';

// Importar todas as screens
import { DeckListScreen } from '../screens/DeckListScreen';
import { SubjectListScreen } from '../screens/SubjectListScreen';
import { FlashcardScreen } from '../screens/FlashcardScreen';
import { AddDeckScreen } from '../screens/AddDeckScreen';
import { EditDeckScreen } from '../screens/EditDeckScreen';
import { AddSubjectScreen } from '../screens/AddSubjectScreen';
import { ManageFlashcardsScreen } from '../screens/ManageFlashcardsScreen';
import { EditFlashcardScreen } from '../screens/EditFlashcardScreen';
import { EditSubjectScreen } from '../screens/EditSubjectScreen';
import { FlashcardHistoryScreen } from '../screens/FlashcardHistoryScreen';

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
    cardStyle: { backgroundColor: '#1A202C' }, // Evita flash branco nas transições
};

export function HomeStackNavigator({navigation}) {
  return (
    <HomeStack.Navigator screenOptions={navScreenOptions}>
      <HomeStack.Screen
        name="DeckList"
        component={DeckListScreen}
        options={{
          title: 'Início',
          headerLeft: () => null, // Remove a seta de voltar
          headerRight: () => (
              <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ marginRight: 15 }}>
                  <Ionicons name="menu" size={28} color="white" />
              </TouchableOpacity>
          ),
      }} />
      <HomeStack.Screen 
        name="SubjectList" 
        component={SubjectListScreen} 
        options={({ route }) => ({ 
            title: route.params.deckName || 'Matérias',
            cardStyleInterpolator: ({ current }) => ({ cardStyle: { opacity: current.progress } }),
        })} 
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
      <HomeStack.Screen name="AddDeck" component={AddDeckScreen} options={{ title: 'Novo Deck' }} />
      <HomeStack.Screen name="EditDeck" component={EditDeckScreen} options={{ title: 'Editar Deck' }} />
      <HomeStack.Screen name="AddSubject" component={AddSubjectScreen} options={{ title: 'Nova Matéria' }} />
      <HomeStack.Screen
        name="ManageFlashcards"
        component={ManageFlashcardsScreen}
        options={{
          title: 'Criar Flashcard',
          headerTintColor: 'white',
          animationEnabled: true,
          gestureEnabled: true,
          // Garante a mesma transição de fade do resto do app
          cardStyleInterpolator: ({ current }) => ({
            cardStyle: { opacity: current.progress },
          }),
          transitionSpec: {
            open: fadeTransitionSpec.open,
            close: fadeTransitionSpec.close,
          },
          cardStyle: { backgroundColor: '#1A202C' },
        }}
      />
      <HomeStack.Screen name="EditFlashcard" component={EditFlashcardScreen} options={{ title: 'Editar Flashcard' }} />
      <HomeStack.Screen name="EditSubject" component={EditSubjectScreen} options={{ title: 'Editar Matéria' }} />
      <HomeStack.Screen name="FlashcardHistory" component={FlashcardHistoryScreen} options={{ title: 'Histórico de Cards' }} />
    </HomeStack.Navigator>
  );
}

export default HomeStackNavigator;
