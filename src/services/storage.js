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


export default { STORAGE_KEY, getAppData, saveAppData };
