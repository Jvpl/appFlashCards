import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import AppContent from './src/navigation/AppContent';

import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import * as Ionicons from '@expo/vector-icons/Ionicons';
import { initializeRevenueCat } from './src/services/revenuecat';

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
});

export default function App() {
  // Initialize global cache
  if (!global.screenCache) {
    global.screenCache = {
      flashcards: new Set(),
      manageFlashcards: new Set()
    };
  }
  if (!global.screenCache.flashcards) {
    global.screenCache.flashcards = new Set();
  }
  if (!global.screenCache.manageFlashcards) {
    global.screenCache.manageFlashcards = new Set();
  }

  // Carrega fontes e captura erro
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  // Inicializa RevenueCat ao abrir o app
  useEffect(() => {
    initializeRevenueCat();
  }, []);

  // Hook useEffect para gerenciar a tela de splash
  useEffect(() => {
    async function prepare() {
      try {
        // Mantém splash visível
        // await SplashScreen.preventAutoHideAsync();
        // (Pré-carregamento adicional pode ir aqui)
      } catch (e) {
        console.warn("Erro ao preparar App:", e); // Loga erros
      } finally {
        // Esconde splash screen QUANDO fontes carregarem OU der erro
        if (fontsLoaded || fontError) {
          // await SplashScreen.hideAsync();
        }
      }
    }
    prepare(); // Executa a função prepare
  }, [fontsLoaded, fontError]); // Dependências corretas

  // Se fontes não carregaram E não há erro, splash está visível
  if (!fontsLoaded && !fontError) {
    return null;
  }
  
  // Loga erro de fonte (opcionalmente mostra tela de erro)
  if (fontError) {
      console.error("Erro ao carregar fontes:", fontError);
      // Pode-se retornar uma tela de erro aqui
  }


  return (
    <GestureHandlerRootView style={styles.flexOne}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
