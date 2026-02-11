import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAnjK1KLUYhJLe2WE4BsnJfNwftCcyoNgI",
  authDomain: "flashcards-concurso.firebaseapp.com",
  projectId: "flashcards-concurso",
  storageBucket: "flashcards-concurso.firebasestorage.app",
  messagingSenderId: "333503732641",
  appId: "1:333503732641:web:6b4b3d1e757bd8a68d49e0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Busca todos os produtos disponíveis na loja
 * Coleção: /products
 */
export const getProducts = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });
    return products;
  } catch (e) {
    console.error('Erro ao buscar produtos:', e);
    return [];
  }
};

/**
 * Busca um deck específico pelo ID
 * Coleção: /decks/{deckId}
 */
export const getDeck = async (deckId) => {
  try {
    const docRef = doc(db, 'decks', deckId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    console.warn(`Deck ${deckId} não encontrado`);
    return null;
  } catch (e) {
    console.error(`Erro ao buscar deck ${deckId}:`, e);
    return null;
  }
};

/**
 * Busca detalhes de um produto específico
 * Coleção: /products/{productId}
 */
export const getProduct = async (productId) => {
  try {
    const docRef = doc(db, 'products', productId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (e) {
    console.error(`Erro ao buscar produto ${productId}:`, e);
    return null;
  }
};

export { db };
