const card = (id, question, answer) => ({
  id, question, answer,
  level: 0, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
});

export const initialData = [
  {
    id: 'deck_policia_civil',
    name: 'Polícia Civil - Agente 2025',
    category: 'seguranca',
    isDefaultDeck: true,
    isUserCreated: false,
    subjects: [
      {
        id: 'subj_pc_port',
        name: 'Português',
        flashcards: [
          card('pc_pt_1', 'O que é sujeito simples?', 'Sujeito com apenas um núcleo. Ex: "O aluno estudou."'),
          card('pc_pt_2', 'O que é sujeito composto?', 'Sujeito com dois ou mais núcleos. Ex: "João e Maria viajaram."'),
          card('pc_pt_3', 'O que é predicado verbal?', 'Predicado cujo núcleo é um verbo de ação. Ex: "O policial correu."'),
          card('pc_pt_4', 'O que é regência verbal?', 'Relação de dependência entre o verbo e seus complementos, com ou sem preposição.'),
          card('pc_pt_5', 'Verbo "assistir" no sentido de ver exige qual preposição?', '"A". Ex: "Assisti ao filme." — verbo transitivo indireto.'),
          card('pc_pt_6', 'O que é crase?', 'Fusão da preposição "a" com o artigo "a" feminino, indicada pelo acento grave (à).'),
        ],
      },
      {
        id: 'subj_pc_mat',
        name: 'Matemática',
        flashcards: [
          card('pc_mt_1', 'O que é MMC?', 'Mínimo Múltiplo Comum: o menor múltiplo comum entre dois ou mais números.'),
          card('pc_mt_2', 'O que é MDC?', 'Máximo Divisor Comum: o maior divisor comum entre dois ou mais números.'),
          card('pc_mt_3', 'Como calcular porcentagem?', 'Multiplique o valor pela porcentagem e divida por 100. Ex: 20% de 150 = (20×150)/100 = 30.'),
          card('pc_mt_4', 'O que é razão?', 'Comparação entre dois valores por divisão. Ex: a razão entre 6 e 2 é 6/2 = 3.'),
          card('pc_mt_5', 'O que é proporção?', 'Igualdade entre duas razões. Ex: 2/4 = 3/6.'),
          card('pc_mt_6', 'Qual a fórmula da regra de três simples?', 'a/b = c/x → x = (b×c)/a. Usada quando as grandezas são diretamente proporcionais.'),
        ],
      },
      {
        id: 'subj_pc_leg',
        name: 'Legislação Penal',
        flashcards: [
          card('pc_lg_1', 'O que é crime doloso?', 'Crime praticado com intenção (dolo). O agente quer o resultado ou assume o risco de produzi-lo.'),
          card('pc_lg_2', 'O que é crime culposo?', 'Crime praticado sem intenção, por negligência, imprudência ou imperícia.'),
          card('pc_lg_3', 'O que é legítima defesa?', 'Usar moderadamente os meios necessários para repelir injusta agressão atual ou iminente.'),
          card('pc_lg_4', 'O que é estado de necessidade?', 'Sacrificar bem jurídico alheio para salvar direito próprio ou de terceiro de perigo atual não provocado.'),
          card('pc_lg_5', 'O que é tentativa de crime?', 'Quando o agente inicia a execução do crime, mas não o consuma por circunstâncias alheias à sua vontade.'),
          card('pc_lg_6', 'O que é concurso de pessoas?', 'Quando duas ou mais pessoas contribuem para a prática de uma infração penal.'),
        ],
      },
    ],
  },
  {
    id: 'deck_inss',
    name: 'INSS - Técnico do Seguro Social 2025',
    category: 'administrativo',
    isDefaultDeck: true,
    isUserCreated: false,
    subjects: [
      {
        id: 'subj_inss_port',
        name: 'Português',
        flashcards: [
          card('inss_pt_1', 'O que é coesão textual?', 'Ligação e harmonia entre palavras e frases do texto, usando conectivos, pronomes e outros recursos.'),
          card('inss_pt_2', 'O que é coerência textual?', 'Lógica e sentido do texto como um todo. Um texto coerente não tem contradições.'),
          card('inss_pt_3', 'O que são conjunções adversativas?', 'Conectam orações com ideias opostas. Principais: mas, porém, contudo, entretanto, todavia.'),
          card('inss_pt_4', 'O que são conjunções conclusivas?', 'Indicam conclusão. Principais: portanto, logo, assim, então, pois (posposto ao verbo).'),
          card('inss_pt_5', 'O que é voz passiva analítica?', 'Construída com verbo ser + particípio. Ex: "O processo foi analisado pelo técnico."'),
          card('inss_pt_6', 'O que é voz passiva sintética?', 'Construída com verbo + se (partícula apassivadora). Ex: "Analisa-se o processo."'),
        ],
      },
      {
        id: 'subj_inss_prev',
        name: 'Previdência Social',
        flashcards: [
          card('inss_pv_1', 'O que é benefício de aposentadoria por idade?', 'Benefício pago ao segurado que atinge a idade mínima: 65 anos (homem) e 62 anos (mulher), com carência de 180 meses.'),
          card('inss_pv_2', 'O que é auxílio-doença?', 'Benefício pago ao segurado incapacitado para o trabalho por mais de 15 dias consecutivos, com carência de 12 meses.'),
          card('inss_pv_3', 'O que é salário-maternidade?', 'Benefício de 120 dias pago à segurada por nascimento, adoção ou guarda judicial de criança.'),
          card('inss_pv_4', 'O que é pensão por morte?', 'Benefício pago aos dependentes do segurado que falecer, sem carência, desde que o segurado tenha qualidade de segurado.'),
          card('inss_pv_5', 'O que é carência?', 'Número mínimo de contribuições mensais para ter direito ao benefício.'),
          card('inss_pv_6', 'Quem são os segurados obrigatórios do INSS?', 'Empregados, empregados domésticos, contribuintes individuais, trabalhadores avulsos e segurados especiais.'),
        ],
      },
      {
        id: 'subj_inss_info',
        name: 'Informática',
        flashcards: [
          card('inss_if_1', 'O que é um sistema operacional?', 'Software que gerencia os recursos do computador e serve de interface entre hardware e usuário. Ex: Windows, Linux.'),
          card('inss_if_2', 'O que é um arquivo .PDF?', 'Formato de documento portátil (Portable Document Format) criado pela Adobe, mantém formatação em qualquer dispositivo.'),
          card('inss_if_3', 'O que é phishing?', 'Golpe virtual onde criminosos se passam por entidades confiáveis para roubar dados pessoais e senhas.'),
          card('inss_if_4', 'O que é backup?', 'Cópia de segurança de dados para proteção contra perda por falha, acidente ou ataque.'),
          card('inss_if_5', 'Qual a diferença entre HTTP e HTTPS?', 'HTTPS é a versão segura do HTTP, usa criptografia SSL/TLS para proteger dados transmitidos.'),
          card('inss_if_6', 'O que é planilha eletrônica?', 'Programa para organizar dados em linhas e colunas com cálculos automáticos. Ex: Excel, Calc.'),
        ],
      },
    ],
  },
  {
    id: 'deck_tjmg',
    name: 'TJ-MG - Oficial de Justiça 2025',
    category: 'justica',
    isDefaultDeck: true,
    isUserCreated: false,
    subjects: [
      {
        id: 'subj_tjmg_dir',
        name: 'Direito Civil',
        flashcards: [
          card('tj_dc_1', 'O que é pessoa natural?', 'Todo ser humano com capacidade de ter direitos e deveres. A personalidade começa com o nascimento com vida.'),
          card('tj_dc_2', 'O que é pessoa jurídica?', 'Entidade abstrata com personalidade jurídica própria. Ex: empresas, associações, fundações.'),
          card('tj_dc_3', 'O que é capacidade civil plena?', 'Aptidão para exercer pessoalmente todos os atos da vida civil. Adquire-se aos 18 anos.'),
          card('tj_dc_4', 'O que é domicílio civil?', 'Local onde a pessoa estabelece sua residência com ânimo definitivo, ou onde exerce sua atividade profissional.'),
          card('tj_dc_5', 'O que é prescrição?', 'Perda da pretensão (direito de ação) pelo decurso do tempo sem exercê-la.'),
          card('tj_dc_6', 'O que é decadência?', 'Extinção do próprio direito pelo não exercício no prazo legal. Não se suspende nem se interrompe.'),
        ],
      },
      {
        id: 'subj_tjmg_proc',
        name: 'Direito Processual Civil',
        flashcards: [
          card('tj_pc_1', 'O que é competência jurisdicional?', 'Medida da jurisdição, ou seja, a delimitação do poder de cada juiz ou tribunal de julgar determinadas causas.'),
          card('tj_pc_2', 'O que é citação?', 'Ato pelo qual o réu é chamado a integrar a relação processual e tomar conhecimento da ação proposta contra ele.'),
          card('tj_pc_3', 'O que é intimação?', 'Ato pelo qual se dá ciência a alguém sobre atos e termos do processo para que faça ou deixe de fazer alguma coisa.'),
          card('tj_pc_4', 'O que é sentença?', 'Pronunciamento do juiz que encerra a fase de conhecimento do processo, decidindo ou não o mérito.'),
          card('tj_pc_5', 'O que é recurso de apelação?', 'Recurso cabível contra sentença, dirigido ao tribunal de segundo grau para reexame da decisão.'),
          card('tj_pc_6', 'O que é coisa julgada?', 'Imutabilidade da decisão judicial após esgotamento dos recursos ou decurso do prazo sem interposição.'),
        ],
      },
      {
        id: 'subj_tjmg_port',
        name: 'Português',
        flashcards: [
          card('tj_pt_1', 'O que é período simples?', 'Oração com apenas um verbo (ou locução verbal). Ex: "O oficial cumpriu o mandado."'),
          card('tj_pt_2', 'O que é período composto por coordenação?', 'Orações independentes ligadas por conjunções coordenativas ou justapostas.'),
          card('tj_pt_3', 'O que é período composto por subordinação?', 'Uma oração principal e pelo menos uma subordinada, que dela depende sintaticamente.'),
          card('tj_pt_4', 'O que é oração subordinada adverbial causal?', 'Indica causa do fato principal. Introduzida por: porque, pois, visto que, já que, como.'),
          card('tj_pt_5', 'O que é oração subordinada adverbial concessiva?', 'Indica concessão/contraste. Introduzida por: embora, ainda que, mesmo que, apesar de que.'),
          card('tj_pt_6', 'O que é pontuação de vocativo?', 'Vocativo é sempre separado por vírgulas. Ex: "João, venha aqui." / "Venha aqui, João."'),
        ],
      },
    ],
  },
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
