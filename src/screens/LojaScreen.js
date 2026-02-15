import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getProducts, getDeck } from '../services/firebase';
import { getPurchasedDecks, savePurchasedDeck } from '../services/storage';
import { purchaseProduct, restorePurchases } from '../services/revenuecat';
import globalStyles from '../styles/globalStyles';

export const LojaScreen = ({ navigation }) => {
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handlePurchase = async (product) => {
    if (downloading) return;

    setDownloading(product.id);
    try {
      const result = await purchaseProduct(product.playStoreId || product.id);

      if (result.cancelled) {
        return;
      }

      if (result.success) {
        const deckData = await getDeck(product.deckId);
        if (deckData) {
          await savePurchasedDeck(product.deckId, {
            ...deckData,
            name: product.name,
            isPurchased: true,
          });
          setPurchasedIds(prev => [...prev, product.deckId]);
          Alert.alert(
            'Compra Realizada!',
            `O deck "${product.name}" foi comprado e baixado com sucesso! Acesse seus flashcards na tela inicial.`
          );
        }
      } else {
        Alert.alert('Erro', result.error || 'Falha ao processar pagamento. Tente novamente.');
      }
    } catch (e) {
      console.error('Erro na compra:', e);
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
        await savePurchasedDeck(product.deckId, {
          ...deckData,
          name: product.name,
          isPurchased: true,
        });
        setPurchasedIds(prev => [...prev, product.deckId]);
        Alert.alert(
          'Download Concluido',
          `O deck "${product.name}" foi baixado com sucesso! Acesse seus flashcards na tela inicial.`
        );
      } else {
        Alert.alert('Erro', 'Deck nao encontrado no servidor.');
      }
    } catch (e) {
      console.error('Erro ao baixar deck:', e);
      Alert.alert('Erro', 'Falha ao baixar o deck. Tente novamente.');
    } finally {
      setDownloading(null);
    }
  };

  const isPurchased = (product) => {
    return purchasedIds.includes(product.deckId);
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'full': return 'library';
      case 'subject': return 'book';
      default: return 'document-text';
    }
  };

  const renderProduct = ({ item }) => {
    const purchased = isPurchased(item);
    const isDownloading = downloading === item.id;

    return (
      <TouchableOpacity
        style={[lojaStyles.productCard, purchased && lojaStyles.productCardPurchased]}
        onPress={() => {
          if (purchased) {
            Alert.alert('Ja baixado', 'Este deck ja esta disponivel na sua tela inicial.');
          } else {
            Alert.alert(
              item.name,
              `${item.description || 'Deck de flashcards'}\n\n` +
              `Materias: ${item.subjectCount || '?'}\n` +
              `Cards: ${item.cardCount || '?'}\n` +
              `Preco: ${item.price ? `R$ ${item.price.toFixed(2)}` : 'Gratis'}`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: item.price ? 'Comprar' : 'Baixar Gratis',
                  onPress: () => {
                    if (item.price) {
                      handlePurchase(item);
                    } else {
                      handleDownload(item);
                    }
                  }
                },
              ]
            );
          }
        }}
        activeOpacity={0.7}
      >
        <View style={lojaStyles.productIconContainer}>
          <Ionicons
            name={item.icon || getIconForType(item.type)}
            size={32}
            color={purchased ? '#48BB78' : '#4FD1C5'}
          />
        </View>

        <View style={lojaStyles.productInfo}>
          <View style={lojaStyles.productHeader}>
            <Text style={lojaStyles.productName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.type === 'full' && (
              <View style={lojaStyles.badge}>
                <Text style={lojaStyles.badgeText}>COMPLETO</Text>
              </View>
            )}
          </View>

          <Text style={lojaStyles.productDescription} numberOfLines={2}>
            {item.description || 'Deck de flashcards para concurso'}
          </Text>

          <View style={lojaStyles.productMeta}>
            {item.subjectCount > 0 && (
              <View style={lojaStyles.metaItem}>
                <Ionicons name="folder-outline" size={14} color="#A0AEC0" />
                <Text style={lojaStyles.metaText}>{item.subjectCount} materias</Text>
              </View>
            )}
            {item.cardCount > 0 && (
              <View style={lojaStyles.metaItem}>
                <Ionicons name="layers-outline" size={14} color="#A0AEC0" />
                <Text style={lojaStyles.metaText}>{item.cardCount} cards</Text>
              </View>
            )}
          </View>
        </View>

        <View style={lojaStyles.productAction}>
          {isDownloading ? (
            <ActivityIndicator size="small" color="#4FD1C5" />
          ) : purchased ? (
            <Ionicons name="checkmark-circle" size={28} color="#48BB78" />
          ) : (
            <View style={lojaStyles.priceContainer}>
              <Text style={lojaStyles.priceText}>
                {item.price ? `R$${item.price.toFixed(2)}` : 'Gratis'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={globalStyles.centered}>
        <ActivityIndicator size="large" color="#4FD1C5" />
        <Text style={[globalStyles.noCardsText, { marginTop: 16 }]}>
          Carregando loja...
        </Text>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={globalStyles.centered}>
        <Ionicons name="cart-outline" size={64} color="#A0AEC0" />
        <Text style={[globalStyles.noCardsText, { marginTop: 20 }]}>
          Nenhum produto disponivel
        </Text>
        <Text style={globalStyles.itemSubtitle}>
          Novos decks serao adicionados em breve!
        </Text>
        <TouchableOpacity
          style={lojaStyles.refreshButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={20} color="#4FD1C5" />
          <Text style={lojaStyles.refreshButtonText}>Atualizar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={globalStyles.baseContainer}>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={lojaStyles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4FD1C5"
            colors={['#4FD1C5']}
          />
        }
        ListHeaderComponent={
          <View style={lojaStyles.header}>
            <Text style={lojaStyles.headerTitle}>Decks de Concursos</Text>
            <Text style={lojaStyles.headerSubtitle}>
              {products.length} {products.length === 1 ? 'deck disponivel' : 'decks disponiveis'}
            </Text>
            <TouchableOpacity
              style={lojaStyles.restoreButton}
              onPress={async () => {
                const result = await restorePurchases();
                if (result.success) {
                  Alert.alert('Compras Restauradas', 'Suas compras anteriores foram restauradas com sucesso!');
                  loadData();
                } else {
                  Alert.alert('Erro', 'Nao foi possivel restaurar as compras.');
                }
              }}
            >
              <Ionicons name="refresh-circle-outline" size={16} color="#A0AEC0" />
              <Text style={lojaStyles.restoreButtonText}>Restaurar compras</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const lojaStyles = StyleSheet.create({
  listContainer: {
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#A0AEC0',
    marginTop: 4,
  },
  productCard: {
    backgroundColor: '#2D3748',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productCardPurchased: {
    borderWidth: 1,
    borderColor: '#48BB78',
    opacity: 0.8,
  },
  productIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#1A202C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  productInfo: {
    flex: 1,
    marginRight: 10,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  badge: {
    backgroundColor: '#4FD1C5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgeText: {
    color: '#1A202C',
    fontSize: 10,
    fontWeight: 'bold',
  },
  productDescription: {
    fontSize: 13,
    color: '#A0AEC0',
    marginBottom: 6,
  },
  productMeta: {
    flexDirection: 'row',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
  },
  metaText: {
    fontSize: 12,
    color: '#A0AEC0',
    marginLeft: 4,
  },
  productAction: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  priceContainer: {
    backgroundColor: '#4FD1C5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    color: '#1A202C',
    fontWeight: 'bold',
    fontSize: 13,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4FD1C5',
  },
  refreshButtonText: {
    color: '#4FD1C5',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  restoreButtonText: {
    color: '#A0AEC0',
    fontSize: 13,
    marginLeft: 4,
  },
});

export default LojaScreen;
