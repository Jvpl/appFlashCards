import Purchases, { LOG_LEVEL } from 'react-native-purchases';

const API_KEY_ANDROID = 'test_XminOJMcZRQAKBbdDlTOUmXhEiV';

/**
 * Inicializa o SDK do RevenueCat
 * Deve ser chamado no App.js ao iniciar o app
 */
export const initializeRevenueCat = async () => {
  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    await Purchases.configure({ apiKey: API_KEY_ANDROID });
    console.log('✅ RevenueCat inicializado com sucesso');
  } catch (e) {
    console.error('❌ Erro ao inicializar RevenueCat:', e);
  }
};

/**
 * Busca os produtos disponíveis para compra
 * Os IDs devem corresponder aos cadastrados no Google Play Console
 * @param {Array<string>} productIds - Array com IDs dos produtos
 */
export const getProducts = async (productIds) => {
  try {
    const products = await Purchases.getProducts(productIds);
    return products;
  } catch (e) {
    console.error('❌ Erro ao buscar produtos:', e);
    return [];
  }
};

/**
 * Realiza a compra de um produto
 * @param {string} productId - ID do produto no Google Play Console
 * @returns {Object} - Resultado da compra
 */
export const purchaseProduct = async (productId) => {
  try {
    const products = await Purchases.getProducts([productId]);
    if (products.length === 0) {
      throw new Error('Produto não encontrado');
    }
    const { customerInfo } = await Purchases.purchaseStoreProduct(products[0]);
    return { success: true, customerInfo };
  } catch (e) {
    if (e.userCancelled) {
      return { success: false, cancelled: true };
    }
    console.error('❌ Erro na compra:', e);
    return { success: false, error: e.message };
  }
};

/**
 * Verifica se o usuário tem acesso a um produto específico
 * @param {string} entitlementId - ID do entitlement no RevenueCat
 */
export const checkEntitlement = async (entitlementId) => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[entitlementId] !== undefined;
  } catch (e) {
    console.error('❌ Erro ao verificar entitlement:', e);
    return false;
  }
};

/**
 * Restaura compras anteriores do usuário
 */
export const restorePurchases = async () => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { success: true, customerInfo };
  } catch (e) {
    console.error('❌ Erro ao restaurar compras:', e);
    return { success: false, error: e.message };
  }
};

/**
 * Retorna todas as compras ativas do usuário
 */
export const getActiveEntitlements = async () => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active;
  } catch (e) {
    console.error('❌ Erro ao buscar entitlements:', e);
    return {};
  }
};
