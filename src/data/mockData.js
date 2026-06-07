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
            answer: 'São cartões de estudo com uma pergunta de um lado e a resposta do outro. Você toca no card para revelar a resposta e depois avalia se acertou, errou ou quase acertou deslizando para os lados ou para cima.',
            level: 0, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
          },
          {
            id: 'ex_002',
            question: 'Como avaliar um card após ver a resposta?',
            answer: '→ Direita — Acertei\n← Esquerda — Errei\n↑ Cima — Quase\n\nCards marcados como Errei ou Quase voltam ao fim da pilha e reaparecem até serem acertados. Só o Acertei avança o card.',
            level: 1, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
          },
          {
            id: 'ex_003',
            question: 'O que é o sistema de repetição espaçada (SRS)?',
            answer: 'Um método que mostra os cards com intervalos crescentes conforme você acerta. O que você sabe bem aparece menos, o que precisa revisar aparece mais — maximizando seu tempo de estudo.',
            level: 2, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
          },
          {
            id: 'ex_004',
            question: 'Como funciona o sistema de níveis?',
            answer: 'Cada card vai do Nível 0 (Marco Zero) ao Nível 5 (Dominado). Acertando, o card sobe de nível e aparece com menos frequência. Errando, ele regride. Este card está no Nível 3.',
            level: 3, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
          },
          {
            id: 'ex_005',
            question: 'Como organizar meus estudos no app?',
            answer: 'Crie um Deck para cada concurso ou área. Dentro do deck, crie Matérias por disciplina. Dentro de cada matéria, adicione seus Flashcards. Na aba Início, toque em "Criar deck" para começar.',
            level: 4, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
          },
          {
            id: 'ex_006',
            question: 'O que significa um card no Nível 5?',
            answer: 'Nível 5 é o topo — significa que você dominou este conteúdo. Cards neste nível aparecem raramente, só para reforço de longo prazo. Este card está no Nível 5 (Dominado). Parabéns, você chegou ao fim do tutorial!',
            level: 5, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
          },
        ],
      },
    ],
  },
];
