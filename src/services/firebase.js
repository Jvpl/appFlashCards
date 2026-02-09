import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAnjK1KLUYhJLe2WE4BsnJfNwftCcyoNgI",
  authDomain: "flashcards-concurso.firebaseapp.com",
  projectId: "flashcards-concurso",
  storageBucket: "flashcards-concurso.firebasestorage.app",
  messagingSenderId: "333503732641",
  appId: "1:333503732641:web:6b4b3d1e757bd8a68d49e0"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Busca todos os produtos disponíveis na loja
 * @returns {Promise<Array>} Lista de produtos
 */
export const getProducts = async () => {
  try {
    const productsCol = collection(db, 'products');
    const productSnapshot = await getDocs(productsCol);
    const productList = productSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return productList;
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    throw error;
  }
};

/**
 * Busca um deck específico pelo ID
 * @param {string} deckId - ID do deck
 * @returns {Promise<Object>} Dados do deck
 */
export const getDeck = async (deckId) => {
  try {
    const deckRef = doc(db, 'decks', deckId);
    const deckSnap = await getDoc(deckRef);

    if (deckSnap.exists()) {
      return {
        id: deckSnap.id,
        ...deckSnap.data()
      };
    } else {
      throw new Error(`Deck ${deckId} não encontrado`);
    }
  } catch (error) {
    console.error(`Erro ao buscar deck ${deckId}:`, error);
    throw error;
  }
};

/**
 * Busca múltiplos decks pelos IDs
 * @param {Array<string>} deckIds - Array de IDs dos decks
 * @returns {Promise<Array>} Array de decks
 */
export const getDecks = async (deckIds) => {
  try {
    const decks = await Promise.all(
      deckIds.map(deckId => getDeck(deckId))
    );
    return decks.filter(deck => deck !== null);
  } catch (error) {
    console.error('Erro ao buscar múltiplos decks:', error);
    throw error;
  }
};

export default { getProducts, getDeck, getDecks };
