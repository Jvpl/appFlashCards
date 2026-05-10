export const initialData = [
  {
    id: 'deck_exemplo',
    name: 'Deck Exemplo',
    category: 'Exemplo',
    isExample: true,
    isUserCreated: false,
    subjects: [
      {
        id: 'subj_exemplo_01',
        name: 'Como usar o app',
        flashcards: [
          {
            id: 'ex_001',
            question: 'O que são flashcards?',
            answer: 'São cartões de estudo com uma pergunta de um lado e a resposta do outro. Ótimos para memorização por repetição ativa.',
            level: 0, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
          },
          {
            id: 'ex_002',
            question: 'O que é o sistema de repetição espaçada (SRS)?',
            answer: 'Um método que mostra os flashcards com intervalos crescentes conforme você acerta — o que você sabe bem aparece menos, o que precisa revisar aparece mais.',
            level: 0, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
          },
          {
            id: 'ex_003',
            question: 'Como funciona o sistema de níveis dos cards?',
            answer: 'Cada card vai de Nível 0 (Marco Zero) até Nível 5 (Dominado). Acertando, o card sobe de nível e aparece com menos frequência. Errando, ele volta.',
            level: 0, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
          },
          {
            id: 'ex_004',
            question: 'O que é "Revisão" no contexto do app?',
            answer: 'A revisão permite estudar todos os cards de uma matéria, independente do nível SRS. Útil quando você quer revisar tudo antes de uma prova.',
            level: 0, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
          },
          {
            id: 'ex_005',
            question: 'Como criar meu próprio deck?',
            answer: 'Na aba Início, toque em "Criar deck" no final da lista. Depois adicione matérias ao deck e, dentro de cada matéria, crie seus flashcards.',
            level: 0, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
          },
        ],
      },
    ],
  },
];
