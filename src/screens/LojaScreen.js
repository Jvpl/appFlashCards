import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import globalStyles from '../styles/globalStyles';
import theme from '../styles/theme';

export const LojaScreen = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[globalStyles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Ionicons name="storefront-outline" size={72} color={theme.textMuted} />
      <Text style={styles.title}>Loja</Text>
      <Text style={styles.subtitle}>Em desenvolvimento</Text>
      <Text style={styles.description}>
        Em breve você poderá adquirir decks de questões para os principais concursos do Brasil.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.textPrimary,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: theme.primary,
    marginTop: 6,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
});

export default LojaScreen;

/*
 * ===========================================================
 * CÓDIGO DA LOJA — DESATIVADO TEMPORARIAMENTE
 * Reativar quando a loja estiver pronta para produção.
 * ===========================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getProducts, getDeck } from '../services/firebase';
import { getPurchasedDecks, savePurchasedDeck, updateDeckOrder } from '../services/storage';
import { purchaseProduct, restorePurchases } from '../services/revenuecat';
import globalStyles from '../styles/globalStyles';
import theme from '../styles/theme';

export const LojaScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState([]);
  const [purchasedIds, setPurchasedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [productsData, purchased] = await Promise.all([
        getProducts(),
        getPurchasedDecks(),
      ]);
      setProducts(productsData);
      setPurchasedIds(purchased);
    } catch (e) {
      console.error('Erro ao carregar loja:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handlePurchase = async (product) => {
    if (downloading) return;
    setDownloading(product.id);
    try {
      const result = await purchaseProduct(product.playStoreId || product.id);
      if (result.cancelled) return;
      if (result.success) {
        const deckData = await getDeck(product.deckId);
        if (deckData) {
          await savePurchasedDeck(product.deckId, { ...deckData, name: product.name, isPurchased: true });
          await updateDeckOrder(product.deckId);
          setPurchasedIds(prev => [...prev, product.deckId]);
          Alert.alert('Compra Realizada!', `O deck "${product.name}" foi comprado e baixado com sucesso!`);
        }
      } else {
        Alert.alert('Erro', result.error || 'Falha ao processar pagamento. Tente novamente.');
      }
    } catch (e) {
      Alert.alert('Erro', 'Falha ao processar pagamento. Tente novamente.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownload = async (product) => {
    if (downloading) return;
    setDownloading(product.id);
    try {
      const deckData = await getDeck(product.deckId);
      if (deckData) {
        await savePurchasedDeck(product.deckId, { ...deckData, name: product.name, isPurchased: true });
        await updateDeckOrder(product.deckId);
        setPurchasedIds(prev => [...prev, product.deckId]);
        Alert.alert('Download Concluído', `O deck "${product.name}" foi baixado com sucesso!`);
      } else {
        Alert.alert('Erro', 'Deck não encontrado no servidor.');
      }
    } catch (e) {
      Alert.alert('Erro', 'Falha ao baixar o deck. Tente novamente.');
    } finally {
      setDownloading(null);
    }
  };

  const isPurchased = (product) => purchasedIds.includes(product.deckId);

  const getIconForType = (type) => {
    switch (type) {
      case 'full': return 'library';
      case 'subject': return 'book';
      default: return 'document-text';
    }
  };

  // ... resto do código (renderProduct, return com FlatList, lojaStyles)
};
*/
