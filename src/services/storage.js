import AsyncStorage from '@react-native-async-storage/async-storage';
import { initialData } from '../data/mockData';

export const STORAGE_KEY = '@FlashcardsApp:data';

export const getAppData = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    
    if (jsonValue !== null) {
      const data = JSON.parse(jsonValue);

      // Migração de dados: garante que todos os cards tenham level e points
      data.forEach(deck => {
        deck.subjects.forEach(subject => {
          subject.flashcards.forEach(card => {
            if (card.level === undefined) card.level = 0;
            if (card.points === undefined) card.points = 0;
          });
        });
      });
      return data;
    }
    await saveAppData(initialData); // Salva dados iniciais se não houver
    return initialData;
  } catch (e) { console.error("Failed to fetch data", e); return initialData; }
};



export const saveAppData = async (value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
  } catch (e) { console.error("Failed to save data", e); }
};

// ============================================
// Funções para Decks Comprados (Firebase)
// ============================================

const PURCHASED_DECKS_KEY = '@purchased_decks';

/**
 * Retorna a lista de IDs dos decks comprados
 * @returns {Promise<Array<string>>}
 */
export const getPurchasedDecks = async () => {
  try {
    const json = await AsyncStorage.getItem(PURCHASED_DECKS_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error("Failed to fetch purchased decks", e);
    return [];
  }
};

/**
 * Salva um deck comprado no cache local
 * @param {string} deckId - ID do deck
 * @param {Object} deckData - Dados do deck
 */
export const savePurchasedDeck = async (deckId, deckData) => {
  try {
    // Salvar deck no cache
    await AsyncStorage.setItem(`@deck_cache_${deckId}`, JSON.stringify(deckData));

    // Adicionar ID à lista de decks comprados
    const purchased = await getPurchasedDecks();
    if (!purchased.includes(deckId)) {
      purchased.push(deckId);
      await AsyncStorage.setItem(PURCHASED_DECKS_KEY, JSON.stringify(purchased));
    }
  } catch (e) {
    console.error("Failed to save purchased deck", e);
  }
};

/**
 * Busca um deck do cache local
 * @param {string} deckId - ID do deck
 * @returns {Promise<Object|null>}
 */
export const getDeckCache = async (deckId) => {
  try {
    const json = await AsyncStorage.getItem(`@deck_cache_${deckId}`);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    console.error(`Failed to fetch deck cache ${deckId}`, e);
    return null;
  }
};

/**
 * Remove um deck do cache e da lista de comprados
 * @param {string} deckId - ID do deck
 */
export const removePurchasedDeck = async (deckId) => {
  try {
    // Remover cache
    await AsyncStorage.removeItem(`@deck_cache_${deckId}`);

    // Remover da lista
    const purchased = await getPurchasedDecks();
    const filtered = purchased.filter(id => id !== deckId);
    await AsyncStorage.setItem(PURCHASED_DECKS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to remove purchased deck", e);
  }
};


export default {
  STORAGE_KEY,
  getAppData,
  saveAppData,
  getPurchasedDecks,
  savePurchasedDeck,
  getDeckCache,
  removePurchasedDeck
};
