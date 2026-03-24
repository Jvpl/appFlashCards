import "./global.css";
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import AppContent from './src/navigation/AppContent';

import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import * as Ionicons from '@expo/vector-icons/Ionicons';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { initializeRevenueCat, getPurchasedProductIds } from './src/services/revenuecat';
import { getProducts, getDeck } from './src/services/firebase';
import { getPurchasedDecks, savePurchasedDeck } from './src/services/storage';

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
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  // Inicializa RevenueCat e restaura compras automaticamente ao abrir o app
  useEffect(() => {
    const initAndRestore = async () => {
      await initializeRevenueCat();

      try {
        // 1. Busca IDs de produtos comprados no Google Play via RevenueCat
        const purchasedIds = await getPurchasedProductIds();
        if (purchasedIds.length === 0) return;

        // 2. Busca decks já baixados localmente
        const localPurchased = await getPurchasedDecks();

        // 3. Busca catálogo de produtos no Firebase
        const allProducts = await getProducts();

        // 4. Filtra produtos comprados que ainda não estão no dispositivo
        const toDownload = allProducts.filter(p =>
          p.playStoreId &&
          purchasedIds.includes(p.playStoreId) &&
          !localPurchased.includes(p.deckId)
        );

        if (toDownload.length === 0) return;

        // 5. Baixa e salva cada deck faltando silenciosamente
        for (const product of toDownload) {
          const deckData = await getDeck(product.deckId);
          if (deckData) {
            await savePurchasedDeck(product.deckId, {
              ...deckData,
              name: product.name,
              isPurchased: true,
            });
          }
        }

        console.log(`✅ ${toDownload.length} deck(s) restaurado(s) automaticamente`);
      } catch (e) {
        console.error('❌ Erro na restauração automática:', e);
      }
    };

    initAndRestore();
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
