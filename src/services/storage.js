import AsyncStorage from '@react-native-async-storage/async-storage';
import { initialData } from '../data/mockData';

export const STORAGE_KEY = '@FlashcardsApp:data';
const DATA_VERSION_KEY = '@FlashcardsApp:dataVersion';
const CURRENT_DATA_VERSION = 'v3';

let _memoryCache = null;

export const getAppData = async () => {
  if (_memoryCache) return _memoryCache;
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);

    if (jsonValue !== null) {
      let data = JSON.parse(jsonValue);

      // Migração v2: remover decks de teste pré-carregados, manter apenas user-created + exemplo
      const version = await AsyncStorage.getItem(DATA_VERSION_KEY);
      if (version !== CURRENT_DATA_VERSION) {
        data = data.filter(deck =>
          deck.isUserCreated === true || deck.id === 'deck_exemplo'
        );
        // Adiciona decks padrão do initialData que ainda não existem
        for (const defaultDeck of initialData) {
          if (!data.some(d => d.id === defaultDeck.id)) {
            data.unshift({ ...defaultDeck });
          }
        }
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        await AsyncStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
      }

      // Migração de campos dos cards (existente)
      data.forEach(deck => {
        deck.subjects.forEach(subject => {
          subject.flashcards.forEach(card => {
            if (card.level === undefined) card.level = 0;
            if (card.points === undefined) card.points = 0;
            if (card.consecutiveCorrect === undefined) card.consecutiveCorrect = 0;
            if (card.reviewStreak === undefined) card.reviewStreak = 0;
          });
        });
      });
      _memoryCache = data;
      return data;
    }

    await saveAppData(initialData);
    await AsyncStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
    _memoryCache = initialData;
    return initialData;
  } catch (e) { console.error("Failed to fetch data", e); return initialData; }
};



export const saveAppData = async (value) => {
  try {
    _memoryCache = value;
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
    console.log('📚 Buscando decks comprados...');
    const json = await AsyncStorage.getItem(PURCHASED_DECKS_KEY);
    const purchased = json ? JSON.parse(json) : [];
    console.log('✅ Decks comprados carregados:', purchased);
    return purchased;
  } catch (e) {
    console.warn("Failed to fetch purchased decks (non-blocking):", e);
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


// ============================================
// Recentes — Decks acessados recentemente
// ============================================

const RECENT_DECKS_KEY = '@recent_decks';

export const saveRecentDeck = async (deckId) => {
  try {
    const json = await AsyncStorage.getItem(RECENT_DECKS_KEY);
    let recents = json ? JSON.parse(json) : [];
    recents = [deckId, ...recents.filter(id => id !== deckId)].slice(0, 7);
    await AsyncStorage.setItem(RECENT_DECKS_KEY, JSON.stringify(recents));
  } catch (e) {
    console.warn('Failed to save recent deck:', e);
  }
};

export const getRecentDeckIds = async () => {
  try {
    const json = await AsyncStorage.getItem(RECENT_DECKS_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    return [];
  }
};

// ============================================
// Continuar Estudo — última matéria estudada
// ============================================

const CONTINUE_STUDY_KEY = '@continue_study';

export const saveContinueStudy = async (data) => {
  try {
    await AsyncStorage.setItem(CONTINUE_STUDY_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save continue study:', e);
  }
};

export const getContinueStudy = async () => {
  try {
    const json = await AsyncStorage.getItem(CONTINUE_STUDY_KEY);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    return null;
  }
};

export const clearContinueStudy = async () => {
  try {
    await AsyncStorage.removeItem(CONTINUE_STUDY_KEY);
  } catch (e) {
    console.warn('Failed to clear continue study:', e);
  }
};

// ============================================
// Used Categories — categorias que já tiveram decks
// ============================================

const USED_CATEGORIES_KEY = '@used_category_ids';

export const getUsedCategoryIds = async () => {
  try {
    const json = await AsyncStorage.getItem(USED_CATEGORIES_KEY);
    return json ? new Set(JSON.parse(json)) : new Set();
  } catch {
    return new Set();
  }
};

export const saveUsedCategoryIds = async (ids) => {
  try {
    await AsyncStorage.setItem(USED_CATEGORIES_KEY, JSON.stringify([...ids]));
  } catch (e) {
    console.warn('Failed to save used category ids:', e);
  }
};

export const replaceUsedCategoryId = async (oldId, newId) => {
  try {
    const json = await AsyncStorage.getItem(USED_CATEGORIES_KEY);
    const arr = json ? JSON.parse(json) : [];
    const idx = arr.indexOf(oldId);
    if (idx !== -1) {
      arr[idx] = newId;
    } else if (!arr.includes(newId)) {
      arr.push(newId);
    }
    await AsyncStorage.setItem(USED_CATEGORIES_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn('Failed to replace used category id:', e);
  }
};

// ============================================
// Histórico de Estudo
// ============================================

const STUDY_HISTORY_KEY = '@FlashcardsApp:studyHistory';

export const getStudyHistory = async () => {
  try {
    const json = await AsyncStorage.getItem(STUDY_HISTORY_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error('Failed to fetch study history', e);
    return [];
  }
};

export const saveStudySession = async (session) => {
  try {
    if (!session.count || session.count === 0) return;
    const history = await getStudyHistory();
    const today = new Date().toISOString().split('T')[0];
    history.push({
      ...session,
      date: today,
      timestamp: Date.now(),
    });
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const trimmed = history.filter(s => s.timestamp >= cutoff);
    await AsyncStorage.setItem(STUDY_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save study session', e);
  }
};


export default {
  STORAGE_KEY,
  getAppData,
  saveAppData,
  getPurchasedDecks,
  savePurchasedDeck,
  getDeckCache,
  removePurchasedDeck,
  saveRecentDeck,
  getRecentDeckIds,
  saveContinueStudy,
  getContinueStudy,
  clearContinueStudy,
  getStudyHistory,
  saveStudySession,
};
