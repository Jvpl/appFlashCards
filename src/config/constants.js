import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_DECK_IDS = [
  'deck_pmmg_2024',
  'deck_pcsp_2025',
  'deck_prf_2025',
  'deck_bb_2025',
  'deck_inss_2025',
  'deck_tjmg_2025'
];

export const isDefaultDeck = (deckId) => {
  return DEFAULT_DECK_IDS.includes(deckId);
};

export const canEditDefaultDecks = async () => {
  try {
    const value = await AsyncStorage.getItem('allowDefaultDeckEditing');
    return value === 'true';
  } catch (error) {
    console.error('Error reading allowDefaultDeckEditing:', error);
    return false;
  }
};

export default { DEFAULT_DECK_IDS, isDefaultDeck, canEditDefaultDecks };
