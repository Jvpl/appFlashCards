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
