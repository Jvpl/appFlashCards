import AsyncStorage from '@react-native-async-storage/async-storage';
import { initialData } from '../data/mockData';

export const STORAGE_KEY = '@FlashcardsApp:data';
const DATA_VERSION_KEY = '@FlashcardsApp:dataVersion';
const CURRENT_DATA_VERSION = 'v9';

let _memoryCache = null;

export const getAppData = async () => {
  if (_memoryCache) return _memoryCache;
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);

    if (jsonValue !== null) {
      let data = JSON.parse(jsonValue);

      // Migração: remove decks antigos pré-carregados, mantém só user-created + exemplo
      const version = await AsyncStorage.getItem(DATA_VERSION_KEY);
      if (version !== CURRENT_DATA_VERSION) {
        // v7: substitui tudo por decks de demonstração para screenshots
        const screenshotDecks = [
          {
            id: 'seed_concurso',
            name: 'Direito Constitucional',
            category: 'Concursos',
            isUserCreated: true,
            isExample: false,
            subjects: [
              {
                id: 'seed_c_s1',
                name: 'Princípios Fundamentais',
                flashcards: [
                  { id: 'seed_c1', question: 'Quais são os fundamentos da República Federativa do Brasil?', answer: 'I — Soberania\nII — Cidadania\nIII — Dignidade da pessoa humana\nIV — Valores sociais do trabalho e da livre iniciativa\nV — Pluralismo político\n\n(Art. 1º da CF/88)', level: 3, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 2, reviewStreak: 2 },
                  { id: 'seed_c2', question: 'Quais são os objetivos fundamentais da República?', answer: 'I — Construir uma sociedade livre, justa e solidária\nII — Garantir o desenvolvimento nacional\nIII — Erradicar a pobreza e reduzir as desigualdades\nIV — Promover o bem de todos, sem preconceitos\n\n(Art. 3º da CF/88)', level: 2, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 1, reviewStreak: 1 },
                  { id: 'seed_c3', question: 'O que é o princípio da legalidade?', answer: 'Ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei.\n\n(Art. 5º, II da CF/88)\n\nParticulares: podem tudo que a lei não proíbe.\nAdm. Pública: só pode o que a lei autoriza.', level: 4, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 3, reviewStreak: 3 },
                  { id: 'seed_c4', question: 'O que é o princípio da isonomia?', answer: 'Todos são iguais perante a lei, sem distinção de qualquer natureza.\n\n(Art. 5º, caput da CF/88)\n\nIgualdade formal: perante a lei.\nIgualdade material: tratar desiguais desigualmente na medida de sua desigualdade.', level: 1, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0 },
                  { id: 'seed_c5', question: 'O que é o princípio da presunção de inocência?', answer: 'Ninguém será considerado culpado até o trânsito em julgado de sentença penal condenatória.\n\n(Art. 5º, LVII da CF/88)\n\nTambém chamado de princípio da não culpabilidade.', level: 2, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 1, reviewStreak: 1 },
                  { id: 'seed_c6', question: 'O que é a separação dos poderes?', answer: 'O Estado brasileiro é dividido em três poderes independentes e harmônicos entre si:\n\n• Legislativo — cria as leis\n• Executivo — administra o Estado\n• Judiciário — aplica as leis\n\n(Art. 2º da CF/88)', level: 5, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 4, reviewStreak: 4 },
                ],
              },
              {
                id: 'seed_c_s2',
                name: 'Direitos e Garantias Fundamentais',
                flashcards: [
                  { id: 'seed_c7', question: 'O que é habeas corpus?', answer: 'Remédio constitucional que protege a liberdade de locomoção. Concedido sempre que alguém sofrer ou se achar ameaçado de sofrer violência ou coação em sua liberdade de ir e vir.\n\n(Art. 5º, LXVIII da CF/88)', level: 2, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 1, reviewStreak: 1 },
                  { id: 'seed_c8', question: 'O que é mandado de segurança?', answer: 'Protege direito líquido e certo não amparado por habeas corpus ou habeas data, quando o responsável pela ilegalidade for autoridade pública ou agente de pessoa jurídica no exercício de atribuições do Poder Público.\n\n(Art. 5º, LXIX da CF/88)', level: 0, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0 },
                ],
              },
            ],
          },
          {
            id: 'seed_ingles',
            name: 'Inglês — Verbos Irregulares',
            category: 'Idiomas',
            isUserCreated: true,
            isExample: false,
            subjects: [
              {
                id: 'seed_i_s1',
                name: 'Verbos mais usados',
                flashcards: [
                  { id: 'seed_i1', question: 'Go (ir)\nPassado e particípio?', answer: 'Passado: went\nParticípio: gone\n\n"I went to the store yesterday."\n"I have gone there before."', level: 4, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 3, reviewStreak: 3 },
                  { id: 'seed_i2', question: 'Write (escrever)\nPassado e particípio?', answer: 'Passado: wrote\nParticípio: written\n\n"She wrote a letter."\n"The book was written in 1984."', level: 3, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 2, reviewStreak: 2 },
                  { id: 'seed_i3', question: 'Know (saber/conhecer)\nPassado e particípio?', answer: 'Passado: knew\nParticípio: known\n\n"He knew the answer."\n"It is well known."', level: 2, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 1, reviewStreak: 1 },
                  { id: 'seed_i4', question: 'Take (pegar/levar)\nPassado e particípio?', answer: 'Passado: took\nParticípio: taken\n\n"She took the bus."\n"It was taken from me."', level: 5, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 4, reviewStreak: 4 },
                  { id: 'seed_i5', question: 'Break (quebrar)\nPassado e particípio?', answer: 'Passado: broke\nParticípio: broken\n\n"He broke the window."\n"The glass is broken."', level: 1, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0 },
                  { id: 'seed_i6', question: 'Speak (falar)\nPassado e particípio?', answer: 'Passado: spoke\nParticípio: spoken\n\n"She spoke three languages."\n"English is widely spoken."', level: 3, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 2, reviewStreak: 2 },
                ],
              },
            ],
          },
          {
            id: 'seed_enem',
            name: 'ENEM — Ciências Humanas',
            category: 'ENEM',
            isUserCreated: true,
            isExample: false,
            subjects: [
              {
                id: 'seed_e_s1',
                name: 'História do Brasil',
                flashcards: [
                  { id: 'seed_e1', question: 'O que foi a Proclamação da República?', answer: 'Movimento de 15 de novembro de 1889 que encerrou a Monarquia no Brasil e instaurou o regime republicano, liderado pelo Marechal Deodoro da Fonseca.', level: 3, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 2, reviewStreak: 2 },
                  { id: 'seed_e2', question: 'O que foi a Semana de Arte Moderna de 1922?', answer: 'Evento realizado em São Paulo que marcou o início do Modernismo no Brasil, reunindo artistas e intelectuais que buscavam uma arte nacional, libertando-se dos padrões europeus clássicos.', level: 2, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 1, reviewStreak: 1 },
                  { id: 'seed_e3', question: 'Qual foi o período do Estado Novo?', answer: 'De 1937 a 1945, regime ditatorial instaurado por Getúlio Vargas, caracterizado pela centralização do poder, censura à imprensa e supressão dos direitos políticos.', level: 4, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 3, reviewStreak: 3 },
                  { id: 'seed_e4', question: 'Quando foi promulgada a Constituição Cidadã?', answer: 'Em 5 de outubro de 1988, após o período de redemocratização. Ficou conhecida como "Constituição Cidadã" por ampliar significativamente os direitos e garantias fundamentais dos cidadãos brasileiros.', level: 1, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0 },
                  { id: 'seed_e5', question: 'O que foi o Golpe Militar de 1964?', answer: 'Movimento militar de 31 de março de 1964 que depôs o presidente João Goulart e iniciou um regime ditatorial que durou até 1985, marcado pela repressão política e pelo "milagre econômico".', level: 2, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 1, reviewStreak: 1 },
                ],
              },
              {
                id: 'seed_e_s2',
                name: 'Geografia',
                flashcards: [
                  { id: 'seed_e6', question: 'O que é o fenômeno El Niño?', answer: 'Aquecimento anormal das águas do Oceano Pacífico Equatorial que altera os padrões de chuva e temperatura no mundo. No Brasil, causa seca no Nordeste e chuvas excessivas no Sul.', level: 3, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 2, reviewStreak: 2 },
                  { id: 'seed_e7', question: 'Quais são os biomas brasileiros?', answer: '1. Amazônia — maior floresta tropical do mundo\n2. Cerrado — savana com grande biodiversidade\n3. Mata Atlântica — muito desmatada\n4. Caatinga — exclusivamente brasileiro\n5. Pampa — campos do Sul\n6. Pantanal — maior área úmida do mundo', level: 0, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0 },
                ],
              },
            ],
          },
          {
            id: 'seed_formulas',
            name: 'Matemática & Física',
            category: 'Exatas',
            isUserCreated: true,
            isExample: false,
            subjects: [
              {
                id: 'seed_f_s1',
                name: 'Fórmulas Essenciais',
                flashcards: [
                  {
                    id: 'seed_f1',
                    question: '<p>Fórmula de Bhaskara</p><p style="text-align:center"><span class="math-atom" data-latex="ax^2 + bx + c = 0" data-display="true"></span></p>',
                    answer: '<p style="text-align:center"><span class="math-atom" data-latex="x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" data-display="true"></span></p><p>Onde <span class="math-atom" data-latex="\\Delta = b^2 - 4ac"></span> é o discriminante.</p>',
                    level: 4, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 3, reviewStreak: 3,
                  },
                  {
                    id: 'seed_f2',
                    question: '<p>Integral Gaussiana</p><p style="text-align:center"><span class="math-atom" data-latex="\\int_{-\\infty}^{+\\infty} e^{-x^2}\\, dx = \\, ?" data-display="true"></span></p>',
                    answer: '<p style="text-align:center"><span class="math-atom" data-latex="\\int_{-\\infty}^{+\\infty} e^{-x^2}\\, dx = \\sqrt{\\pi}" data-display="true"></span></p><p>Resultado fundamental em probabilidade e estatística — base da distribuição normal.</p>',
                    level: 2, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 1, reviewStreak: 1,
                  },
                  {
                    id: 'seed_f3',
                    question: '<p>Série de Taylor de <span class="math-atom" data-latex="e^x"></span></p>',
                    answer: '<p style="text-align:center"><span class="math-atom" data-latex="e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!} = 1 + x + \\frac{x^2}{2!} + \\frac{x^3}{3!} + \\cdots" data-display="true"></span></p>',
                    level: 3, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 2, reviewStreak: 2,
                  },
                  {
                    id: 'seed_f4',
                    question: '<p>Equação de Schrödinger independente do tempo</p>',
                    answer: '<p style="text-align:center"><span class="math-atom" data-latex="\\hat{H}\\,|\\psi\\rangle = E\\,|\\psi\\rangle" data-display="true"></span></p><p>Expandida:</p><p style="text-align:center"><span class="math-atom" data-latex="-\\frac{\\hbar^2}{2m}\\nabla^2\\psi + V\\psi = E\\psi" data-display="true"></span></p>',
                    level: 1, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
                  },
                  {
                    id: 'seed_f5',
                    question: '<p>Identidade de Euler</p>',
                    answer: '<p style="text-align:center"><span class="math-atom" data-latex="e^{i\\pi} + 1 = 0" data-display="true"></span></p><p>Conecta as cinco constantes matemáticas mais importantes: <span class="math-atom" data-latex="e"></span>, <span class="math-atom" data-latex="i"></span>, <span class="math-atom" data-latex="\\pi"></span>, <span class="math-atom" data-latex="1"></span> e <span class="math-atom" data-latex="0"></span>.</p>',
                    level: 5, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 4, reviewStreak: 4,
                  },
                ],
              },
            ],
          },
        ];
        data = screenshotDecks;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        await AsyncStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);

        // Injeta histórico de estudo falso para screenshot (21 dias de streak)
        const fakeHistory = [];
        const subjects = [
          { deckId: 'seed_concurso', subjectName: 'Princípios Fundamentais' },
          { deckId: 'seed_concurso', subjectName: 'Direitos e Garantias Fundamentais' },
          { deckId: 'seed_ingles', subjectName: 'Verbos mais usados' },
          { deckId: 'seed_enem', subjectName: 'História do Brasil' },
          { deckId: 'seed_enem', subjectName: 'Geografia' },
        ];
        for (let i = 20; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const ts = d.getTime();
          const sub = subjects[i % subjects.length];
          fakeHistory.push({ ...sub, date: dateStr, timestamp: ts, lastSessionAt: ts, acertos: 4 + (i % 3), quases: 1, erros: i % 2, count: 6 + (i % 4) });
        }
        await AsyncStorage.setItem('@FlashcardsApp:studyHistory', JSON.stringify(fakeHistory));
        await AsyncStorage.setItem('@FlashcardsApp:perfVersion', 'v4');
      }

      // Deck exemplo sempre vem do mockData (níveis fixos, nunca persistidos)
      const exampleFromMock = initialData.find(d => d.id === 'deck_exemplo');
      data = data.filter(d => d.id !== 'deck_exemplo');
      if (exampleFromMock) data.unshift({ ...exampleFromMock });

      // Migração de campos dos cards (existente)
      const migrateCards = (cards) => {
        cards.forEach(card => {
          if (card.level === undefined) card.level = 0;
          if (card.points === undefined) card.points = 0;
          if (card.consecutiveCorrect === undefined) card.consecutiveCorrect = 0;
          if (card.reviewStreak === undefined) card.reviewStreak = 0;
        });
      };
      data.forEach(deck => {
        deck.subjects.forEach(subject => {
          migrateCards(subject.flashcards || []);
          (subject.topics || []).forEach(topic => migrateCards(topic.flashcards || []));
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
    // Nunca persiste o deck exemplo — seus níveis são fixos no mockData
    const toSave = value.filter(d => d.id !== 'deck_exemplo');
    const jsonValue = JSON.stringify(toSave);
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
// Ordem dos Decks — ordenação por último acesso
// ============================================

const DECK_ORDER_KEY = '@FlashcardsApp:deckOrder';

export const getDeckOrder = async () => {
  try {
    const json = await AsyncStorage.getItem(DECK_ORDER_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    return [];
  }
};

export const updateDeckOrder = async (deckId) => {
  try {
    const order = await getDeckOrder();
    const updated = [deckId, ...order.filter(id => id !== deckId)];
    await AsyncStorage.setItem(DECK_ORDER_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to update deck order:', e);
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

export const hasStudiedToday = async () => {
  try {
    const history = await getStudyHistory();
    const today = new Date().toISOString().split('T')[0];
    return history.some(s => s.date === today);
  } catch (e) {
    return false;
  }
};

export const saveStudySession = async (session) => {
  try {
    if (!session.count || session.count === 0) return;
    const history = await getStudyHistory();
    const today = new Date().toISOString().split('T')[0];
    // Uma entrada por matéria por dia — acumula se rever a mesma matéria
    const existingIdx = history.findIndex(s => s.date === today && s.deckId === session.deckId && s.subjectName === session.subjectName);
    if (existingIdx >= 0) {
      const prev = history[existingIdx];
      history[existingIdx] = {
        ...prev,
        acertos: (prev.acertos || 0) + (session.acertos || 0),
        quases: (prev.quases || 0) + (session.quases || 0),
        erros: (prev.erros || 0) + (session.erros || 0),
        count: (prev.count || 0) + (session.count || 0),
        lastSessionAt: Date.now(),
      };
    } else {
      history.push({ ...session, date: today, timestamp: Date.now(), lastSessionAt: Date.now() });
    }
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const trimmed = history.filter(s => s.timestamp >= cutoff);
    await AsyncStorage.setItem(STUDY_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save study session', e);
  }
};


// ============================================
// Performance Data — dados do pie chart por matéria (substitui, não acumula)
// ============================================

const PERFORMANCE_KEY = '@FlashcardsApp:performanceData';

export const getPerformanceData = async () => {
  try {
    const json = await AsyncStorage.getItem(PERFORMANCE_KEY);
    return json ? JSON.parse(json) : {};
  } catch (e) {
    return {};
  }
};

export const savePerformanceData = async (subjectId, data) => {
  try {
    const all = await getPerformanceData();
    const existing = all[subjectId];
    all[subjectId] = {
      anterior: existing ? existing.atual : null,
      atual: { ...data, updatedAt: Date.now() },
    };
    await AsyncStorage.setItem(PERFORMANCE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save performance data', e);
  }
};

// ============================================
// Helpers para hierarquia: Deck → Matéria → Assunto → Cards
// ============================================

export const findStudyUnit = (deck, unitId) => {
  for (const s of (deck.subjects || [])) {
    if (s.id === unitId) return s;
    for (const t of (s.topics || [])) {
      if (t.id === unitId) return t;
    }
  }
  return null;
};

export const getAllCards = (unit) => {
  if (unit.topics?.length > 0) return unit.topics.flatMap(t => t.flashcards || []);
  return unit.flashcards || [];
};

export const updateStudyUnit = (allData, deckId, unitId, updateFn) => {
  return allData.map(deck => {
    if (deck.id !== deckId) return deck;
    return {
      ...deck,
      subjects: deck.subjects.map(subject => {
        if (subject.id === unitId) {
          return { ...subject, flashcards: updateFn(subject.flashcards || []) };
        }
        if (subject.topics) {
          const topicIdx = subject.topics.findIndex(t => t.id === unitId);
          if (topicIdx >= 0) {
            return {
              ...subject,
              topics: subject.topics.map((t, i) =>
                i !== topicIdx ? t : { ...t, flashcards: updateFn(t.flashcards || []) }
              ),
            };
          }
        }
        return subject;
      }),
    };
  });
};

// ============================================
// Lixeira — Decks do usuário deletados (14 dias)
// ============================================

const TRASH_KEY = '@FlashcardsApp:trash';
const TRASH_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export const getTrash = async () => {
  try {
    const json = await AsyncStorage.getItem(TRASH_KEY);
    const items = json ? JSON.parse(json) : [];
    const cutoff = Date.now() - TRASH_TTL_MS;
    return items.filter(i => i.deletedAt >= cutoff);
  } catch { return []; }
};

export const moveToTrash = async (deck, categoryMeta = null) => {
  try {
    const items = await getTrash();
    const already = items.findIndex(i => i.deck.id === deck.id);
    const entry = { deck, deletedAt: Date.now(), categoryMeta };
    if (already >= 0) items[already] = entry;
    else items.push(entry);
    await AsyncStorage.setItem(TRASH_KEY, JSON.stringify(items));
  } catch (e) { console.error('Failed to move deck to trash', e); }
};

export const restoreFromTrash = async (deckId) => {
  try {
    const items = await getTrash();
    const entry = items.find(i => i.deck.id === deckId);
    if (!entry) return null;
    const remaining = items.filter(i => i.deck.id !== deckId);
    await AsyncStorage.setItem(TRASH_KEY, JSON.stringify(remaining));
    return entry;
  } catch (e) { console.error('Failed to restore deck from trash', e); return null; }
};

export const purgeFromTrash = async (deckId) => {
  try {
    const items = await getTrash();
    await AsyncStorage.setItem(TRASH_KEY, JSON.stringify(items.filter(i => i.deck.id !== deckId)));
  } catch (e) { console.error('Failed to purge from trash', e); }
};

// ============================================
// Limpeza de progresso ao excluir conteúdo
// ============================================

const _handleStreakOnDelete = async (filterFn) => {
  const today = new Date().toISOString().split('T')[0];
  const history = await getStudyHistory();
  const removedToday = history.filter(s => s.date === today && !filterFn(s));
  const remainingToday = history.filter(s => s.date === today && filterFn(s));
  // If the deleted deck had today's study and no other deck covers today, mark as preserved
  if (removedToday.length > 0 && remainingToday.length === 0) {
    await recordCardsAvailability(false);
  }
  // Keep all past entries (streak history), only remove today's entries for deleted decks
  return history.filter(s => s.date === today ? filterFn(s) : true);
};

export const clearProgressForDecks = async (deckIds) => {
  try {
    const idSet = new Set(deckIds);
    const newHistory = await _handleStreakOnDelete(s => !idSet.has(s.deckId));
    await AsyncStorage.setItem(STUDY_HISTORY_KEY, JSON.stringify(newHistory));

    const continueRaw = await AsyncStorage.getItem(CONTINUE_STUDY_KEY);
    if (continueRaw) {
      const cs = JSON.parse(continueRaw);
      if (cs && idSet.has(cs.deckId)) {
        await AsyncStorage.removeItem(CONTINUE_STUDY_KEY);
      }
    }
  } catch (e) { console.error('Failed to clear progress for decks', e); }
};

export const clearProgressForSubjects = async (deckId, subjectIds) => {
  try {
    const idSet = new Set(subjectIds);
    const newHistory = await _handleStreakOnDelete(
      s => !(s.deckId === deckId && idSet.has(s.subjectId))
    );
    await AsyncStorage.setItem(STUDY_HISTORY_KEY, JSON.stringify(newHistory));

    const perfRaw = await AsyncStorage.getItem(PERFORMANCE_KEY);
    if (perfRaw) {
      const perf = JSON.parse(perfRaw);
      subjectIds.forEach(id => delete perf[id]);
      await AsyncStorage.setItem(PERFORMANCE_KEY, JSON.stringify(perf));
    }

    const continueRaw = await AsyncStorage.getItem(CONTINUE_STUDY_KEY);
    if (continueRaw) {
      const cs = JSON.parse(continueRaw);
      if (cs && cs.deckId === deckId && idSet.has(cs.subjectId)) {
        await AsyncStorage.removeItem(CONTINUE_STUDY_KEY);
      }
    }
  } catch (e) { console.error('Failed to clear progress for subjects', e); }
};

const DAILY_GOAL_KEY = '@FlashcardsApp:dailyGoal';
const CARDS_AVAILABILITY_KEY = '@FlashcardsApp:cardsAvailability';

export const getDailyGoalStatus = async () => {
  try {
    const val = await AsyncStorage.getItem(DAILY_GOAL_KEY);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
};

export const saveDailyGoalReached = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    await AsyncStorage.setItem(DAILY_GOAL_KEY, JSON.stringify({ date: today }));
  } catch (e) { console.error(e); }
};

export const isDailyGoalReachedToday = async () => {
  const status = await getDailyGoalStatus();
  if (!status) return false;
  const today = new Date().toISOString().split('T')[0];
  return status.date === today;
};

// Registra se havia cards disponíveis no dia (threshold: antes das 21:00)
export const recordCardsAvailability = async (hasCards) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const raw = await AsyncStorage.getItem(CARDS_AVAILABILITY_KEY);
    const log = raw ? JSON.parse(raw) : {};
    log[today] = hasCards;
    // Mantém só os últimos 7 dias
    const keys = Object.keys(log).sort();
    if (keys.length > 7) {
      keys.slice(0, keys.length - 7).forEach(k => delete log[k]);
    }
    await AsyncStorage.setItem(CARDS_AVAILABILITY_KEY, JSON.stringify(log));
  } catch (e) { console.error(e); }
};

export const getCardsAvailabilityLog = async () => {
  try {
    const raw = await AsyncStorage.getItem(CARDS_AVAILABILITY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
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
  hasStudiedToday,
  getPerformanceData,
  savePerformanceData,
  getDailyGoalStatus,
  saveDailyGoalReached,
  isDailyGoalReachedToday,
  recordCardsAvailability,
  getCardsAvailabilityLog,
  getTrash,
  moveToTrash,
  restoreFromTrash,
  purgeFromTrash,
  clearProgressForDecks,
  clearProgressForSubjects,
};
