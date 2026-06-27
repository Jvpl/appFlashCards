// =============================================================
// ⚠️  TEMPORÁRIO — APENAS PARA SCREENSHOTS DA PLAY STORE
//     Para reverter: git revert HEAD (commit de demo)
//     ou remova as 2 linhas marcadas em App.js e delete:
//       - src/utils/playstoreSeeder.js
//       - src/data/playstoreSeedData.js
// =============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEMO_DECKS,
  DEMO_STUDY_HISTORY,
  DEMO_PERFORMANCE_DATA,
  DEMO_FIRST_USE_DATE,
  DEMO_CARDS_AVAILABILITY,
} from '../data/playstoreSeedData';

const SEED_FLAG_KEY = '@FlashcardsApp:playstoreSeedActive';
const BACKUP_KEY    = '@FlashcardsApp:playstoreSeedBackup';

export async function runPlaystoreSeed() {
  try {
    const alreadySeeded = await AsyncStorage.getItem(SEED_FLAG_KEY);
    if (alreadySeeded === 'true') return; // já foi semeado, não repete

    // Faz backup dos dados reais antes de substituir
    const backup = await AsyncStorage.multiGet([
      '@FlashcardsApp:data',
      '@FlashcardsApp:studyHistory',
      '@FlashcardsApp:performanceData',
      '@FlashcardsApp:firstUseDate',
      '@FlashcardsApp:cardsAvailability',
    ]);
    await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify(backup));

    // Semeie os dados de demo
    await AsyncStorage.multiSet([
      ['@FlashcardsApp:data',             JSON.stringify(DEMO_DECKS)],
      ['@FlashcardsApp:studyHistory',     JSON.stringify(DEMO_STUDY_HISTORY)],
      ['@FlashcardsApp:performanceData',  JSON.stringify(DEMO_PERFORMANCE_DATA)],
      ['@FlashcardsApp:firstUseDate',     DEMO_FIRST_USE_DATE],
      ['@FlashcardsApp:cardsAvailability',JSON.stringify(DEMO_CARDS_AVAILABILITY)],
      ['@FlashcardsApp:dataVersion',      'v10'],
      ['@FlashcardsApp:perfVersion',      'v4'],
      [SEED_FLAG_KEY,                     'true'],
    ]);

    console.log('[DEMO] Dados de demo da Play Store carregados com sucesso.');
  } catch (e) {
    console.warn('[DEMO] Falha ao semear dados de demo:', e);
  }
}

export async function resetPlaystoreSeed() {
  try {
    const backupRaw = await AsyncStorage.getItem(BACKUP_KEY);
    if (!backupRaw) {
      console.warn('[DEMO] Nenhum backup encontrado.');
      await AsyncStorage.removeItem(SEED_FLAG_KEY);
      return;
    }

    const backup = JSON.parse(backupRaw);
    const pairs = backup.filter(([, v]) => v !== null);
    if (pairs.length > 0) {
      await AsyncStorage.multiSet(pairs);
    }

    // Remove chaves dos demos que não existiam antes
    await AsyncStorage.multiRemove([
      SEED_FLAG_KEY,
      BACKUP_KEY,
    ]);

    console.log('[DEMO] Dados originais restaurados com sucesso.');
  } catch (e) {
    console.warn('[DEMO] Falha ao restaurar dados originais:', e);
  }
}
