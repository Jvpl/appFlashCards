import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import styles from '../styles/globalStyles';
import { getProducts, getDeck } from '../services/firebase';
import { savePurchasedDeck, getPurchasedDecks } from '../services/storage';

export const LojaScreen = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasedIds, setPurchasedIds] = useState([]);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      console.log('📍 LojaScreen focada - iniciando carregamento');
      loadProducts();
      loadPurchasedDecks();
    }
  }, [isFocused]);

  const loadProducts = async () => {
    try {
      console.log('🏪 loadProducts iniciado');
      setLoading(true);
      const productList = await getProducts();
      console.log('🏪 Produtos recebidos da função getProducts:', productList);
      setProducts(productList);
    } catch (error) {
      console.error('🏪 Erro em loadProducts:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos. Verifique sua conexão.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadPurchasedDecks = async () => {
    try {
      const purchased = await getPurchasedDecks();
      setPurchasedIds(purchased);
    } catch (error) {
      console.error('Erro ao carregar decks comprados:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    await loadPurchasedDecks();
    setRefreshing(false);
  };

  const handlePurchase = async (product) => {
    // Verificar se já foi comprado
    if (purchasedIds.includes(product.deckId)) {
      Alert.alert('Já possui', 'Você já possui este deck!');
      return;
    }

    Alert.alert(
      'Comprar Deck',
      `Deseja adquirir "${product.name}" por R$ ${product.price.toFixed(2)}?\n\n⚠️ DEMO: Compra simulada (gratuita)`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Comprar',
          onPress: () => simulatePurchase(product)
        }
      ]
    );
  };

  const simulatePurchase = async (product) => {
    try {
      setLoading(true);

      // Buscar deck do Firebase
      const deck = await getDeck(product.deckId);

      // Salvar no cache local
      await savePurchasedDeck(product.deckId, deck);

      // Atualizar lista de comprados
      setPurchasedIds([...purchasedIds, product.deckId]);

      Alert.alert(
        'Compra realizada! 🎉',
        `Deck "${product.name}" adicionado com sucesso! Acesse em "Meus Decks".`
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível completar a compra. Tente novamente.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderProduct = ({ item }) => {
    const isPurchased = purchasedIds.includes(item.deckId);

    return (
      <TouchableOpacity
        style={[localStyles.productCard, isPurchased && localStyles.purchasedCard]}
        onPress={() => !isPurchased && handlePurchase(item)}
        disabled={isPurchased}
      >
        <View style={localStyles.productHeader}>
          <Ionicons
            name={item.type === 'full' ? 'book' : 'document-text'}
            size={32}
            color={isPurchased ? '#48BB78' : '#4299E1'}
          />
          {isPurchased && (
            <View style={localStyles.purchasedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#48BB78" />
              <Text style={localStyles.purchasedText}>Comprado</Text>
            </View>
          )}
        </View>

        <Text style={localStyles.productName}>{item.name}</Text>

        {item.description && (
          <Text style={localStyles.productDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={localStyles.productFooter}>
          <Text style={localStyles.productPrice}>
            R$ {item.price.toFixed(2)}
          </Text>

          {!isPurchased && (
            <View style={localStyles.buyButton}>
              <Text style={localStyles.buyButtonText}>Comprar</Text>
              <Ionicons name="cart" size={16} color="#FFF" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4299E1" />
        <Text style={[styles.noCardsText, { marginTop: 20 }]}>
          Carregando produtos...
        </Text>
      </View>
    );
  }

  if (!loading && products.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cart-outline" size={64} color="#A0AEC0" />
        <Text style={[styles.noCardsText, { marginTop: 20 }]}>
          Nenhum produto disponível
        </Text>
        <Text style={styles.itemSubtitle}>
          Os produtos aparecerão aqui em breve.
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { marginTop: 20 }]}
          onPress={loadProducts}
        >
          <Text style={styles.fxButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={localStyles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4299E1']}
          />
        }
        ListHeaderComponent={
          <View style={localStyles.header}>
            <Text style={localStyles.headerTitle}>Decks Disponíveis</Text>
            <Text style={localStyles.headerSubtitle}>
              Escolha os decks para seus estudos
            </Text>
          </View>
        }
      />
    </View>
  );
};

const localStyles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#A0AEC0',
  },
  productCard: {
    backgroundColor: '#2D3748',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  purchasedCard: {
    borderColor: '#48BB78',
    opacity: 0.7,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  purchasedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22543D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  purchasedText: {
    color: '#48BB78',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: '#A0AEC0',
    marginBottom: 16,
    lineHeight: 20,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4299E1',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4299E1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  buyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LojaScreen;
