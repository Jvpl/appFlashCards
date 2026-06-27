// =============================================================
// ⚠️  TEMPORÁRIO — APENAS PARA SCREENSHOTS DA PLAY STORE
//     Após tirar os prints, delete este arquivo e:
//       - src/utils/playstoreSeeder.js
//       - Remova as 2 linhas marcadas em App.js
//     OU simplesmente: git revert HEAD (o commit de demo)
// =============================================================

const NOW = 1782518400000; // 2026-06-27 00:00 UTC em ms
const DAY = 86400000;

const d = (daysAgo, hourOfDay = 9) =>
  new Date(NOW - daysAgo * DAY + hourOfDay * 3600000).toISOString();

const ts = (daysAgo, hourOfDay = 9) =>
  NOW - daysAgo * DAY + hourOfDay * 3600000;

const nextReview = (lastReviewISO, levelMinutes) => {
  const base = new Date(lastReviewISO).getTime();
  return new Date(base + levelMinutes * 60000).toISOString();
};

// -----------------------------------------------------------------
// DECK 1 — ENEM
// -----------------------------------------------------------------
const deckEnem = {
  id: 'demo_deck_enem',
  name: 'ENEM',
  category: 'ENEM',
  isExample: false,
  isUserCreated: true,
  subjects: [
    // ── Matemática ──────────────────────────────────────────────
    {
      id: 'demo_enem_matematica',
      name: 'Matemática',
      flashcards: [
        {
          id: 'demo_em_001',
          question: '<p>O que é a <strong>Fórmula de Bhaskara</strong> e para que serve?</p>',
          answer: '<p>Usada para encontrar as raízes de uma equação do 2º grau <span class="math-atom" data-latex="ax^2 + bx + c = 0" data-display="false"></span>:</p><p style="text-align:center"><span class="math-atom" data-latex="x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" data-display="true"></span></p><p>O discriminante <span class="math-atom" data-latex="\\Delta = b^2 - 4ac" data-display="false"></span> determina o número de raízes reais.</p>',
          level: 5, points: 42, lastReview: d(7), nextReview: nextReview(d(7), 10080), consecutiveCorrect: 0, reviewStreak: 2,
        },
        {
          id: 'demo_em_002',
          question: '<p>Como calcular a <strong>soma de uma PA</strong> (Progressão Aritmética)?</p>',
          answer: '<p>A soma dos <em>n</em> primeiros termos de uma PA é:</p><p style="text-align:center"><span class="math-atom" data-latex="S_n = \\frac{n(a_1 + a_n)}{2}" data-display="true"></span></p><p>Onde <span class="math-atom" data-latex="a_1" data-display="false"></span> é o primeiro termo e <span class="math-atom" data-latex="a_n" data-display="false"></span> é o último.</p>',
          level: 5, points: 38, lastReview: d(14), nextReview: nextReview(d(14), 20160), consecutiveCorrect: 0, reviewStreak: 3,
        },
        {
          id: 'demo_em_003',
          question: '<p>Qual é o termo geral de uma <strong>Progressão Geométrica</strong>?</p>',
          answer: '<p>O n-ésimo termo de uma PG é dado por:</p><p style="text-align:center"><span class="math-atom" data-latex="a_n = a_1 \\cdot q^{n-1}" data-display="true"></span></p><p>onde <span class="math-atom" data-latex="q" data-display="false"></span> é a razão da PG.</p>',
          level: 4, points: 28, lastReview: d(1, 10), nextReview: nextReview(d(1, 10), 1440), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_em_004',
          question: '<p>Qual é a fórmula da <strong>área de um círculo</strong>?</p>',
          answer: '<p style="text-align:center"><span class="math-atom" data-latex="A = \\pi r^2" data-display="true"></span></p><p>onde <span class="math-atom" data-latex="r" data-display="false"></span> é o raio do círculo. O perímetro (circunferência) é <span class="math-atom" data-latex="C = 2\\pi r" data-display="false"></span>.</p>',
          level: 5, points: 45, lastReview: d(10), nextReview: nextReview(d(10), 14400), consecutiveCorrect: 0, reviewStreak: 2,
        },
        {
          id: 'demo_em_005',
          question: '<p>Enuncie o <strong>Teorema de Pitágoras</strong>.</p>',
          answer: '<p>Em um triângulo retângulo, o quadrado da hipotenusa é igual à soma dos quadrados dos catetos:</p><p style="text-align:center"><span class="math-atom" data-latex="a^2 + b^2 = c^2" data-display="true"></span></p><p>onde <span class="math-atom" data-latex="c" data-display="false"></span> é a hipotenusa.</p>',
          level: 5, points: 50, lastReview: d(20), nextReview: nextReview(d(20), 43200), consecutiveCorrect: 0, reviewStreak: 4,
        },
        {
          id: 'demo_em_006',
          question: '<p>O que é o <strong>logaritmo</strong> de <span class="math-atom" data-latex="b" data-display="false"></span> na base <span class="math-atom" data-latex="a" data-display="false"></span>?</p>',
          answer: '<p>O logaritmo é o expoente ao qual se eleva a base <span class="math-atom" data-latex="a" data-display="false"></span> para obter <span class="math-atom" data-latex="b" data-display="false"></span>:</p><p style="text-align:center"><span class="math-atom" data-latex="\\log_a b = c \\Leftrightarrow a^c = b" data-display="true"></span></p><p>Condições: <span class="math-atom" data-latex="a > 0,\\; a \\neq 1,\\; b > 0" data-display="false"></span></p>',
          level: 3, points: 18, lastReview: d(0, 14), nextReview: nextReview(d(0, 14), 360), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_em_007',
          question: '<p>Como calcular o <strong>juros compostos</strong>?</p>',
          answer: '<p>O montante <span class="math-atom" data-latex="M" data-display="false"></span> em juros compostos é:</p><p style="text-align:center"><span class="math-atom" data-latex="M = C \\cdot (1 + i)^n" data-display="true"></span></p><p>Onde <span class="math-atom" data-latex="C" data-display="false"></span> = capital inicial, <span class="math-atom" data-latex="i" data-display="false"></span> = taxa de juros, <span class="math-atom" data-latex="n" data-display="false"></span> = número de períodos.</p>',
          level: 4, points: 30, lastReview: d(2, 8), nextReview: nextReview(d(2, 8), 1440), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_em_008',
          question: '<p>Quais são as <strong>relações trigonométricas</strong> fundamentais?</p>',
          answer: '<p>No triângulo retângulo:</p><p style="text-align:center"><span class="math-atom" data-latex="\\sin\\theta = \\frac{\\text{oposto}}{\\text{hipotenusa}}" data-display="true"></span></p><p style="text-align:center"><span class="math-atom" data-latex="\\cos\\theta = \\frac{\\text{adjacente}}{\\text{hipotenusa}}" data-display="true"></span></p><p style="text-align:center"><span class="math-atom" data-latex="\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}" data-display="true"></span></p>',
          level: 3, points: 21, lastReview: d(1, 16), nextReview: nextReview(d(1, 16), 360), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_em_009',
          question: '<p>O que é uma <strong>função afim</strong> (linear)?</p>',
          answer: '<p>Uma função afim tem a forma:</p><p style="text-align:center"><span class="math-atom" data-latex="f(x) = ax + b" data-display="true"></span></p><p>onde <span class="math-atom" data-latex="a" data-display="false"></span> é o coeficiente angular (inclinação) e <span class="math-atom" data-latex="b" data-display="false"></span> é o coeficiente linear (ponto onde corta o eixo <em>y</em>).</p>',
          level: 2, points: 12, lastReview: d(0, 9), nextReview: nextReview(d(0, 9), 60), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_em_010',
          question: '<p>Qual é a fórmula do <strong>volume de um cone</strong>?</p>',
          answer: '<p style="text-align:center"><span class="math-atom" data-latex="V = \\frac{\\pi r^2 h}{3}" data-display="true"></span></p><p>onde <span class="math-atom" data-latex="r" data-display="false"></span> é o raio da base e <span class="math-atom" data-latex="h" data-display="false"></span> é a altura do cone.</p>',
          level: 2, points: 9, lastReview: d(0, 11), nextReview: nextReview(d(0, 11), 60), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_em_011',
          question: '<p>O que é a <strong>probabilidade</strong> de um evento?</p>',
          answer: '<p>A probabilidade de um evento <span class="math-atom" data-latex="A" data-display="false"></span> é:</p><p style="text-align:center"><span class="math-atom" data-latex="P(A) = \\frac{\\text{casos favoráveis}}{\\text{casos possíveis}}" data-display="true"></span></p><p>Sempre: <span class="math-atom" data-latex="0 \\leq P(A) \\leq 1" data-display="false"></span></p>',
          level: 1, points: 6, lastReview: d(0, 8), nextReview: nextReview(d(0, 8), 10), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_em_012',
          question: '<p>Como calcular a <strong>média aritmética</strong>?</p>',
          answer: '<p style="text-align:center"><span class="math-atom" data-latex="\\bar{x} = \\frac{x_1 + x_2 + \\cdots + x_n}{n}" data-display="true"></span></p><p>Soma de todos os valores dividida pela quantidade de valores.</p>',
          level: 1, points: 4, lastReview: d(0, 10), nextReview: nextReview(d(0, 10), 10), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_em_013',
          question: '<p>O que é <strong>análise combinatória</strong>? Qual a diferença entre permutação e combinação?</p>',
          answer: '<p><strong>Permutação</strong> (ordem importa): <span class="math-atom" data-latex="P_n^r = \\frac{n!}{(n-r)!}" data-display="false"></span></p><p><strong>Combinação</strong> (ordem não importa): <span class="math-atom" data-latex="C_n^r = \\frac{n!}{r!(n-r)!}" data-display="false"></span></p>',
          level: 0, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_em_014',
          question: '<p>Qual é a fórmula do <strong>produto notável</strong> <span class="math-atom" data-latex="(a+b)^2" data-display="false"></span>?</p>',
          answer: '<p style="text-align:center"><span class="math-atom" data-latex="(a+b)^2 = a^2 + 2ab + b^2" data-display="true"></span></p><p>Analogamente: <span class="math-atom" data-latex="(a-b)^2 = a^2 - 2ab + b^2" data-display="false"></span></p><p>E o produto da soma pela diferença: <span class="math-atom" data-latex="(a+b)(a-b) = a^2 - b^2" data-display="false"></span></p>',
          level: 0, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
        },
      ],
    },

    // ── Língua Portuguesa ───────────────────────────────────────
    {
      id: 'demo_enem_portugues',
      name: 'Língua Portuguesa',
      flashcards: [
        {
          id: 'demo_ep_001',
          question: '<p>O que são <strong>figuras de linguagem</strong>? Cite 3 exemplos.</p>',
          answer: '<p>São recursos estilísticos que enriquecem a linguagem. Exemplos:</p><ul><li><strong>Metáfora</strong>: comparação implícita ("Ele é um leão")</li><li><strong>Ironia</strong>: diz-se o oposto do que se quer expressar</li><li><strong>Hipérbole</strong>: exagero intencional ("Já te disse um milhão de vezes")</li></ul>',
          level: 5, points: 40, lastReview: d(8), nextReview: nextReview(d(8), 10080), consecutiveCorrect: 0, reviewStreak: 2,
        },
        {
          id: 'demo_ep_002',
          question: '<p>Qual é a diferença entre <strong>coesão</strong> e <strong>coerência</strong> textual?</p>',
          answer: '<p><strong>Coesão</strong>: ligação formal entre os elementos do texto (uso de pronomes, conjunções, advérbios).</p><p><strong>Coerência</strong>: unidade de sentido do texto — as ideias devem ser logicamente encadeadas e não se contradizer.</p>',
          level: 4, points: 32, lastReview: d(1, 11), nextReview: nextReview(d(1, 11), 1440), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_ep_003',
          question: '<p>O que é um <strong>texto argumentativo</strong>? Quais são suas partes?</p>',
          answer: '<p>Texto cujo objetivo é convencer o leitor. Estrutura:</p><ol><li><strong>Introdução</strong>: apresenta a tese</li><li><strong>Desenvolvimento</strong>: argumentos que sustentam a tese</li><li><strong>Conclusão</strong>: retoma a tese e propõe solução</li></ol>',
          level: 4, points: 27, lastReview: d(3, 9), nextReview: nextReview(d(3, 9), 1440), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_ep_004',
          question: '<p>O que é <strong>intertextualidade</strong>?</p>',
          answer: '<p>É a relação entre textos, quando um texto referencia, retoma ou dialoga com outro. Pode ser explícita (citação direta) ou implícita (alusão, paródia, pastiche).</p><p><em>Exemplo: uma charge que parodia um poema clássico.</em></p>',
          level: 3, points: 19, lastReview: d(0, 15), nextReview: nextReview(d(0, 15), 360), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_ep_005',
          question: '<p>Quais são os <strong>gêneros textuais</strong> mais cobrados no ENEM?</p>',
          answer: '<p>Os principais gêneros são:</p><ul><li>Artigo de opinião</li><li>Crônica literária e jornalística</li><li>Charge e cartum</li><li>Infográfico</li><li>Letra de música</li><li>Conto e poema</li><li>Notícia e reportagem</li></ul>',
          level: 3, points: 22, lastReview: d(2, 10), nextReview: nextReview(d(2, 10), 360), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_ep_006',
          question: '<p>O que é <strong>variação linguística</strong>?</p>',
          answer: '<p>São as diferentes formas que uma língua pode assumir, dependendo de fatores como região, classe social, faixa etária e situação comunicativa.</p><p>Tipos: <strong>diatópica</strong> (regional), <strong>diastrática</strong> (social), <strong>diafásica</strong> (situacional) e <strong>diacrônica</strong> (temporal).</p>',
          level: 2, points: 11, lastReview: d(0, 8), nextReview: nextReview(d(0, 8), 60), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_ep_007',
          question: '<p>O que é o <strong>Modernismo brasileiro</strong>? Quando começou?</p>',
          answer: '<p>Movimento artístico e literário iniciado com a <strong>Semana de Arte Moderna de 1922</strong> em São Paulo. Características:</p><ul><li>Ruptura com o Parnasianismo e o academicismo</li><li>Valorização da cultura brasileira</li><li>Verso livre (sem rima obrigatória)</li><li>Linguagem coloquial e crítica social</li></ul>',
          level: 1, points: 5, lastReview: d(0, 9), nextReview: nextReview(d(0, 9), 10), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_ep_008',
          question: '<p>Qual é a diferença entre <strong>narrador</strong> em 1ª e 3ª pessoa?</p>',
          answer: '<p><strong>1ª pessoa</strong>: narrador personagem — participa da história, usa "eu". Visão limitada ao que vive e sente.</p><p><strong>3ª pessoa</strong>: narrador observador ou onisciente — está fora da história, usa "ele/ela". Pode conhecer tudo (onisciente) ou só o observável (observador).</p>',
          level: 0, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
        },
      ],
    },

    // ── Ciências da Natureza ────────────────────────────────────
    {
      id: 'demo_enem_ciencias',
      name: 'Ciências da Natureza',
      flashcards: [
        {
          id: 'demo_ec_001',
          question: '<p>Enuncie a <strong>Segunda Lei de Newton</strong>.</p>',
          answer: '<p>A força resultante aplicada a um corpo é igual ao produto de sua massa pela aceleração adquirida:</p><p style="text-align:center"><span class="math-atom" data-latex="\\vec{F} = m \\cdot \\vec{a}" data-display="true"></span></p><p>A força e a aceleração são grandezas vetoriais e têm a mesma direção e sentido.</p>',
          level: 5, points: 44, lastReview: d(12), nextReview: nextReview(d(12), 20160), consecutiveCorrect: 0, reviewStreak: 3,
        },
        {
          id: 'demo_ec_002',
          question: '<p>Qual é a fórmula da <strong>energia cinética</strong>?</p>',
          answer: '<p>A energia cinética de um corpo de massa <span class="math-atom" data-latex="m" data-display="false"></span> com velocidade <span class="math-atom" data-latex="v" data-display="false"></span> é:</p><p style="text-align:center"><span class="math-atom" data-latex="E_c = \\frac{mv^2}{2}" data-display="true"></span></p>',
          level: 4, points: 26, lastReview: d(1, 14), nextReview: nextReview(d(1, 14), 1440), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_ec_003',
          question: '<p>O que é a <strong>Lei de Coulomb</strong>?</p>',
          answer: '<p>Descreve a força entre duas cargas elétricas puntiformes:</p><p style="text-align:center"><span class="math-atom" data-latex="F = k \\cdot \\frac{|q_1 \\cdot q_2|}{d^2}" data-display="true"></span></p><p>onde <span class="math-atom" data-latex="k \\approx 9 \\times 10^9 \\, \\text{N·m}^2/\\text{C}^2" data-display="false"></span> é a constante eletrostática.</p>',
          level: 3, points: 20, lastReview: d(0, 16), nextReview: nextReview(d(0, 16), 360), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_ec_004',
          question: '<p>O que é o <strong>efeito estufa</strong>? É sempre prejudicial?</p>',
          answer: '<p>O efeito estufa é um fenômeno natural em que gases atmosféricos (CO₂, CH₄, vapor d\'água) retêm calor irradiado pela Terra, mantendo a temperatura adequada para a vida.</p><p>O problema é o <strong>efeito estufa intensificado</strong>, causado pela ação humana, que eleva a temperatura global acima do equilíbrio natural.</p>',
          level: 4, points: 29, lastReview: d(2, 9), nextReview: nextReview(d(2, 9), 1440), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_ec_005',
          question: '<p>O que é <strong>pH</strong> e o que indica?</p>',
          answer: '<p>pH (potencial hidrogeniônico) indica a acidez ou basicidade de uma solução:</p><p style="text-align:center"><span class="math-atom" data-latex="\\text{pH} = -\\log[\\text{H}^+]" data-display="true"></span></p><ul><li>pH &lt; 7: ácido</li><li>pH = 7: neutro</li><li>pH &gt; 7: básico (alcalino)</li></ul>',
          level: 3, points: 17, lastReview: d(1, 8), nextReview: nextReview(d(1, 8), 360), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_ec_006',
          question: '<p>Qual é a diferença entre <strong>mitose</strong> e <strong>meiose</strong>?</p>',
          answer: '<p><strong>Mitose</strong>: divisão celular que gera 2 células-filhas com o mesmo número de cromossomos da célula-mãe (diploides). Ocorre no crescimento e regeneração.</p><p><strong>Meiose</strong>: gera 4 células-filhas com metade dos cromossomos (haploides). Ocorre na formação de gametas (óvulos e espermatozoides).</p>',
          level: 2, points: 10, lastReview: d(0, 10), nextReview: nextReview(d(0, 10), 60), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_ec_007',
          question: '<p>O que é a <strong>Lei de Lavoisier</strong>?</p>',
          answer: '<p>"Na natureza nada se cria, nada se perde, tudo se transforma."</p><p>Formalmente: em uma reação química, a <strong>massa total dos reagentes</strong> é igual à <strong>massa total dos produtos</strong>.</p><p style="text-align:center"><span class="math-atom" data-latex="m_{\\text{reagentes}} = m_{\\text{produtos}}" data-display="true"></span></p>',
          level: 1, points: 7, lastReview: d(0, 9), nextReview: nextReview(d(0, 9), 10), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_ec_008',
          question: '<p>O que é <strong>evolução</strong> segundo Darwin?</p>',
          answer: '<p>Charles Darwin propôs a <strong>teoria da evolução por seleção natural</strong>:</p><ol><li>Os seres vivos apresentam variações hereditárias</li><li>Organismos mais adaptados ao ambiente sobrevivem e se reproduzem mais</li><li>Com o tempo, características vantajosas se acumulam na população</li></ol><p>Isso leva ao surgimento de novas espécies ao longo de gerações.</p>',
          level: 0, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
        },
      ],
    },
  ],
};

// -----------------------------------------------------------------
// DECK 2 — Polícia Federal
// -----------------------------------------------------------------
const deckPF = {
  id: 'demo_deck_pf',
  name: 'Polícia Federal',
  category: 'Segurança Pública',
  isExample: false,
  isUserCreated: true,
  subjects: [
    // ── Direito Constitucional ───────────────────────────────────
    {
      id: 'demo_pf_const',
      name: 'Direito Constitucional',
      flashcards: [
        {
          id: 'demo_pc_001',
          question: '<p>Quais são os <strong>fundamentos da República Federativa do Brasil</strong> segundo a CF/88?</p>',
          answer: '<p>Art. 1º da CF/88 — Os fundamentos são:</p><ol><li>Soberania</li><li>Cidadania</li><li>Dignidade da pessoa humana</li><li>Valores sociais do trabalho e da livre iniciativa</li><li>Pluralismo político</li></ol><p>Mnemônico: <strong>SCDVP</strong></p>',
          level: 5, points: 48, lastReview: d(9), nextReview: nextReview(d(9), 14400), consecutiveCorrect: 0, reviewStreak: 2,
        },
        {
          id: 'demo_pc_002',
          question: '<p>O que são os <strong>direitos e garantias fundamentais</strong> e onde estão na CF/88?</p>',
          answer: '<p>São direitos básicos assegurados pela CF/88 no <strong>Título II (Arts. 5º ao 17)</strong>, divididos em:</p><ul><li>Direitos individuais e coletivos (Art. 5º)</li><li>Direitos sociais (Art. 6º a 11)</li><li>Direitos de nacionalidade (Art. 12 e 13)</li><li>Direitos políticos (Art. 14 a 16)</li><li>Partidos políticos (Art. 17)</li></ul>',
          level: 5, points: 43, lastReview: d(11), nextReview: nextReview(d(11), 14400), consecutiveCorrect: 0, reviewStreak: 2,
        },
        {
          id: 'demo_pc_003',
          question: '<p>O que é o <strong>princípio da legalidade</strong>? Qual é a diferença para o poder público e para o particular?</p>',
          answer: '<p><strong>Para o particular</strong> (Art. 5º, II): "ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei." — pode fazer tudo que não é proibido.</p><p><strong>Para o Poder Público</strong> (Art. 37): só pode fazer o que a lei <em>expressamente</em> autoriza. Princípio da estrita legalidade administrativa.</p>',
          level: 5, points: 46, lastReview: d(6), nextReview: nextReview(d(6), 10080), consecutiveCorrect: 0, reviewStreak: 2,
        },
        {
          id: 'demo_pc_004',
          question: '<p>O que é o <strong>habeas corpus</strong>?</p>',
          answer: '<p>Remédio constitucional (Art. 5º, LXVIII) que protege o direito de ir e vir. É concedido quando alguém sofre ou está ameaçado de sofrer violência ou coação em sua liberdade de locomoção, por ilegalidade ou abuso de poder.</p><p><em>Limitação</em>: não cabe em punições disciplinares militares (Art. 142, §2º).</p>',
          level: 4, points: 31, lastReview: d(1, 13), nextReview: nextReview(d(1, 13), 1440), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_pc_005',
          question: '<p>Quais são os <strong>objetivos fundamentais</strong> da República Federativa do Brasil?</p>',
          answer: '<p>Art. 3º da CF/88:</p><ol><li>Construir uma sociedade livre, justa e solidária</li><li>Garantir o desenvolvimento nacional</li><li>Erradicar a pobreza e a marginalização e reduzir as desigualdades</li><li>Promover o bem de todos, sem preconceitos</li></ol><p>Mnemônico: <strong>CGER</strong> (Construir, Garantir, Erradicar, Promover)</p>',
          level: 4, points: 29, lastReview: d(2, 10), nextReview: nextReview(d(2, 10), 1440), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_pc_006',
          question: '<p>O que é o <strong>mandado de segurança</strong>?</p>',
          answer: '<p>Remédio constitucional (Art. 5º, LXIX) para proteger direito líquido e certo, não amparado por habeas corpus ou habeas data, quando o responsável pela ilegalidade ou abuso é <strong>autoridade pública</strong> ou agente de pessoa jurídica no exercício de atribuições públicas.</p>',
          level: 3, points: 20, lastReview: d(0, 14), nextReview: nextReview(d(0, 14), 360), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_pc_007',
          question: '<p>O que é o <strong>princípio da presunção de inocência</strong>?</p>',
          answer: '<p>Art. 5º, LVII da CF/88: "ninguém será considerado culpado até o trânsito em julgado de sentença penal condenatória."</p><p>Significa que o ônus da prova é do Estado (acusação), e o réu não precisa provar sua inocência.</p>',
          level: 3, points: 18, lastReview: d(1, 9), nextReview: nextReview(d(1, 9), 360), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_pc_008',
          question: '<p>O que é o <strong>controle difuso de constitucionalidade</strong>?</p>',
          answer: '<p>É o controle realizado por <em>qualquer</em> juiz ou tribunal em caso concreto. A lei inconstitucional é afastada apenas para aquele processo (efeitos <em>inter partes</em>).</p><p>Origem: sistema norte-americano. No Brasil, a decisão do STF em controle difuso pode ter efeitos erga omnes após resolução do Senado (Art. 52, X).</p>',
          level: 2, points: 12, lastReview: d(0, 11), nextReview: nextReview(d(0, 11), 60), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_pc_009',
          question: '<p>Quais são os <strong>poderes da União</strong> segundo a CF/88?</p>',
          answer: '<p>Art. 2º da CF/88: São Poderes da União, independentes e harmônicos entre si:</p><ul><li><strong>Legislativo</strong>: fazer leis (Congresso Nacional)</li><li><strong>Executivo</strong>: administrar (Presidente da República)</li><li><strong>Judiciário</strong>: julgar (STF, STJ, etc.)</li></ul>',
          level: 1, points: 5, lastReview: d(0, 8), nextReview: nextReview(d(0, 8), 10), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_pc_010',
          question: '<p>O que é uma <strong>Cláusula Pétrea</strong>?</p>',
          answer: '<p>São limitações materiais ao poder de reforma da Constituição (Art. 60, §4º). Não podem ser abolidas nem por Emenda Constitucional:</p><ul><li>Forma federativa de Estado</li><li>Voto direto, secreto, universal e periódico</li><li>Separação dos Poderes</li><li>Direitos e garantias individuais</li></ul>',
          level: 0, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
        },
      ],
    },

    // ── Informática ─────────────────────────────────────────────
    {
      id: 'demo_pf_info',
      name: 'Informática',
      flashcards: [
        {
          id: 'demo_pi_001',
          question: '<p>O que é <strong>SQL Injection</strong> e como se previne?</p>',
          answer: '<p>Ataque que insere código SQL malicioso em campos de entrada para manipular consultas ao banco de dados.</p><p><strong>Prevenção</strong>:</p><ul><li>Usar <em>prepared statements</em> / consultas parametrizadas</li><li>Validar e sanitizar entradas do usuário</li><li>Aplicar princípio do menor privilégio no banco</li><li>Usar ORM (Object-Relational Mapping)</li></ul>',
          level: 4, points: 33, lastReview: d(2, 15), nextReview: nextReview(d(2, 15), 1440), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_pi_002',
          question: '<p>O que é <strong>criptografia simétrica</strong> vs. <strong>assimétrica</strong>?</p>',
          answer: '<p><strong>Simétrica</strong>: mesma chave para cifrar e decifrar (ex: AES). Mais rápida, mas o problema é a troca segura da chave.</p><p><strong>Assimétrica</strong>: usa par de chaves — chave pública (cifra) e chave privada (decifra) (ex: RSA). Mais lenta, mas resolve o problema da troca de chaves.</p>',
          level: 3, points: 21, lastReview: d(0, 13), nextReview: nextReview(d(0, 13), 360), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_pi_003',
          question: '<p>O que é um <strong>firewall</strong> e quais são seus tipos?</p>',
          answer: '<p>Dispositivo de segurança que monitora e controla o tráfego de rede.</p><p>Tipos principais:</p><ul><li><strong>Packet Filter</strong>: analisa cabeçalhos dos pacotes</li><li><strong>Stateful Inspection</strong>: rastreia o estado das conexões</li><li><strong>Proxy / Application Layer</strong>: age como intermediário na camada de aplicação</li><li><strong>NGFW</strong>: firewall de próxima geração com inspeção profunda</li></ul>',
          level: 2, points: 14, lastReview: d(0, 9), nextReview: nextReview(d(0, 9), 60), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_pi_004',
          question: '<p>O que é o <strong>protocolo HTTPS</strong> e como funciona?</p>',
          answer: '<p>HTTP + TLS/SSL. Garante comunicação segura entre cliente e servidor.</p><p>Funcionamento:</p><ol><li>Servidor apresenta certificado digital</li><li>Cliente verifica o certificado com a CA</li><li>Troca de chaves (handshake TLS)</li><li>Dados trafegam cifrados com chave simétrica</li></ol>',
          level: 1, points: 6, lastReview: d(0, 10), nextReview: nextReview(d(0, 10), 10), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_pi_005',
          question: '<p>O que é <strong>phishing</strong>?</p>',
          answer: '<p>Técnica de ataque em que o criminoso se passa por entidade confiável (banco, empresa, governo) para obter dados pessoais ou credenciais da vítima.</p><p>Canais: e-mail, SMS (smishing), ligação (vishing), site falso.</p><p><strong>Prevenção</strong>: verificar remetente, não clicar em links suspeitos, confirmar URLs, usar autenticação de 2 fatores.</p>',
          level: 0, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
        },
      ],
    },
  ],
};

// -----------------------------------------------------------------
// DECK 3 — INSS
// -----------------------------------------------------------------
const deckINSS = {
  id: 'demo_deck_inss',
  name: 'INSS',
  category: 'Previdência Social',
  isExample: false,
  isUserCreated: true,
  subjects: [
    {
      id: 'demo_inss_prev',
      name: 'Direito Previdenciário',
      flashcards: [
        {
          id: 'demo_ip_001',
          question: '<p>O que é o <strong>RGPS</strong> (Regime Geral de Previdência Social)?</p>',
          answer: '<p>É o regime previdenciário administrado pelo INSS, de filiação obrigatória para trabalhadores da iniciativa privada. Garante benefícios como aposentadoria, auxílio-doença, salário-maternidade etc.</p><p>Base legal: Lei 8.213/91 e Lei 8.212/91.</p>',
          level: 4, points: 28, lastReview: d(1, 12), nextReview: nextReview(d(1, 12), 1440), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_ip_002',
          question: '<p>Quais são os tipos de <strong>segurado</strong> do RGPS?</p>',
          answer: '<p>O RGPS tem 5 categorias de segurado:</p><ol><li><strong>Empregado</strong>: vínculo de emprego CLT</li><li><strong>Empregado doméstico</strong></li><li><strong>Contribuinte individual</strong>: autônomos, empresários</li><li><strong>Trabalhador avulso</strong>: portuários etc.</li><li><strong>Segurado especial</strong>: agricultores familiares</li></ol>',
          level: 4, points: 30, lastReview: d(3, 9), nextReview: nextReview(d(3, 9), 1440), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_ip_003',
          question: '<p>O que é <strong>período de carência</strong>?</p>',
          answer: '<p>É o número mínimo de contribuições mensais necessárias para que o segurado faça jus a determinados benefícios.</p><p>Exemplos de carência:</p><ul><li>Aposentadoria por idade/tempo: 180 contribuições</li><li>Auxílio por incapacidade: 12 contribuições (regra geral)</li><li>Salário-maternidade: 10 contribuições (contribuinte individual)</li></ul>',
          level: 3, points: 22, lastReview: d(0, 14), nextReview: nextReview(d(0, 14), 360), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_ip_004',
          question: '<p>Quais as características do <strong>auxílio por incapacidade temporária</strong> (antigo auxílio-doença)?</p>',
          answer: '<p>Benefício pago ao segurado incapaz para o trabalho por mais de 15 dias consecutivos.</p><ul><li><strong>Carência</strong>: 12 contribuições (exceto acidente de qualquer natureza)</li><li><strong>Valor</strong>: 91% do salário de benefício</li><li><strong>Período de espera</strong>: empresa paga os primeiros 15 dias</li><li>Exige perícia médica do INSS</li></ul>',
          level: 3, points: 19, lastReview: d(1, 10), nextReview: nextReview(d(1, 10), 360), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_ip_005',
          question: '<p>O que é o <strong>salário de benefício</strong>?</p>',
          answer: '<p>É a base de cálculo usada para determinar o valor da maioria dos benefícios previdenciários.</p><p>Calculado com base na média aritmética dos salários de contribuição desde julho de 1994 (ou desde o início da contribuição, se posterior).</p><p>O valor do benefício = salário de benefício × coeficiente (que varia por tipo de benefício).</p>',
          level: 2, points: 13, lastReview: d(0, 9), nextReview: nextReview(d(0, 9), 60), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_ip_006',
          question: '<p>O que é <strong>aposentadoria por incapacidade permanente</strong>?</p>',
          answer: '<p>Benefício concedido ao segurado que, estando ou não em gozo de auxílio por incapacidade, for considerado incapaz e insusceptível de reabilitação para exercer atividade que lhe garanta a subsistência.</p><p><strong>Valor</strong>: 100% do salário de benefício (podendo chegar a 150% em caso de necessitar de assistência permanente de outra pessoa).</p>',
          level: 2, points: 10, lastReview: d(0, 11), nextReview: nextReview(d(0, 11), 60), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_ip_007',
          question: '<p>O que é a <strong>manutenção e perda da qualidade de segurado</strong>?</p>',
          answer: '<p>A qualidade de segurado é mantida mesmo sem contribuir, por período chamado "período de graça":</p><ul><li><strong>12 meses</strong>: regra geral após a cessação das contribuições</li><li><strong>24 meses</strong>: se já pagou mais de 120 contribuições</li><li><strong>36 meses</strong>: durante desemprego involuntário comprovado</li></ul>',
          level: 1, points: 7, lastReview: d(0, 8), nextReview: nextReview(d(0, 8), 10), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_ip_008',
          question: '<p>O que é o <strong>salário-maternidade</strong>?</p>',
          answer: '<p>Benefício pago à segurada (ou segurado em adoção) durante afastamento em decorrência de parto, adoção ou guarda judicial.</p><ul><li><strong>Duração</strong>: 120 dias (regra geral) ou 180 dias (empresa cidadã)</li><li><strong>Valor</strong>: último salário de contribuição (empregada), ou média dos últimos 12 (contribuinte individual)</li><li><strong>Carência</strong>: 10 contribuições para contribuinte individual</li></ul>',
          level: 0, points: 0, lastReview: null, nextReview: null, consecutiveCorrect: 0, reviewStreak: 0,
        },
      ],
    },
  ],
};

// -----------------------------------------------------------------
// DECK 4 — OAB
// -----------------------------------------------------------------
const deckOAB = {
  id: 'demo_deck_oab',
  name: 'OAB — Exame de Ordem',
  category: 'Advocacia',
  isExample: false,
  isUserCreated: true,
  subjects: [
    // ── Direito Civil ────────────────────────────────────────────
    {
      id: 'demo_oab_civil',
      name: 'Direito Civil',
      flashcards: [
        {
          id: 'demo_oc_001',
          question: '<p>O que é a <strong>personalidade jurídica</strong> e quando ela começa?</p>',
          answer: '<p>Personalidade jurídica é a aptidão para ser titular de direitos e obrigações na ordem civil.</p><p>Para a <strong>pessoa natural</strong>: começa com o nascimento com vida (Art. 2º do CC). A lei coloca a salvo os direitos do nascituro desde a concepção.</p><p>Para a <strong>pessoa jurídica</strong>: começa com o registro do ato constitutivo.</p>',
          level: 5, points: 50, lastReview: d(15), nextReview: nextReview(d(15), 43200), consecutiveCorrect: 0, reviewStreak: 4,
        },
        {
          id: 'demo_oc_002',
          question: '<p>O que é um <strong>negócio jurídico</strong>? Quais são seus elementos?</p>',
          answer: '<p>Negócio jurídico é o ato voluntário que visa criar, modificar ou extinguir direitos.</p><p>Elementos:</p><ul><li><strong>Essenciais</strong>: agente capaz, objeto lícito/possível/determinável, forma prescrita ou não vedada em lei</li><li><strong>Naturais</strong>: decorrem implicitamente da natureza do negócio (ex: juros em contrato de mútuo)</li><li><strong>Acidentais</strong>: condição, termo e encargo</li></ul>',
          level: 5, points: 45, lastReview: d(10), nextReview: nextReview(d(10), 14400), consecutiveCorrect: 0, reviewStreak: 2,
        },
        {
          id: 'demo_oc_003',
          question: '<p>Quais são os <strong>vícios do negócio jurídico</strong>?</p>',
          answer: '<p><strong>Vícios de consentimento</strong> (afetam a vontade):</p><ul><li>Erro / Ignorância</li><li>Dolo</li><li>Coação</li><li>Estado de perigo</li><li>Lesão</li></ul><p><strong>Vícios sociais</strong> (aparência de legalidade, mas fraudam terceiros):</p><ul><li>Simulação → nulidade absoluta</li><li>Fraude contra credores → anulabilidade</li></ul>',
          level: 5, points: 47, lastReview: d(7), nextReview: nextReview(d(7), 10080), consecutiveCorrect: 0, reviewStreak: 2,
        },
        {
          id: 'demo_oc_004',
          question: '<p>O que é a <strong>responsabilidade civil</strong>? Quais são seus elementos?</p>',
          answer: '<p>Obrigação de reparar dano causado a outrem.</p><p><strong>Responsabilidade subjetiva</strong> (regra): depende de culpa.</p><p>Elementos: <strong>conduta</strong> + <strong>culpa/dolo</strong> + <strong>nexo causal</strong> + <strong>dano</strong>.</p><p><strong>Responsabilidade objetiva</strong>: independe de culpa (ex: relações de consumo, atividades de risco). Elementos: conduta + nexo causal + dano.</p>',
          level: 4, points: 35, lastReview: d(1, 14), nextReview: nextReview(d(1, 14), 1440), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_oc_005',
          question: '<p>O que é <strong>usucapião</strong>? Quais são os principais tipos?</p>',
          answer: '<p>Modo originário de aquisição de propriedade pela posse prolongada.</p><ul><li><strong>Ordinária</strong>: 10 anos, justo título e boa-fé (5 anos se moradia/produtiva)</li><li><strong>Extraordinária</strong>: 15 anos, sem necessidade de título ou boa-fé (10 anos se moradia/produtiva)</li><li><strong>Especial rural</strong>: 5 anos, 50 hectares, sem outra propriedade</li><li><strong>Especial urbana</strong>: 5 anos, 250m², moradia, sem outra propriedade</li></ul>',
          level: 4, points: 32, lastReview: d(3, 10), nextReview: nextReview(d(3, 10), 1440), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_oc_006',
          question: '<p>O que é <strong>prescrição</strong> e <strong>decadência</strong>? Qual a diferença?</p>',
          answer: '<p><strong>Prescrição</strong>: extinção da <em>pretensão</em> (direito de ação) pelo decurso do tempo. Pode ser suspensa, interrompida ou renunciada.</p><p><strong>Decadência</strong>: extinção do próprio <em>direito</em> pelo decurso do tempo. Em geral não se suspende nem se interrompe (salvo exceções legais).</p><p><em>Regra prática</em>: prescrição recai sobre direitos a uma prestação; decadência sobre direitos potestativos.</p>',
          level: 3, points: 24, lastReview: d(0, 15), nextReview: nextReview(d(0, 15), 360), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_oc_007',
          question: '<p>O que é a <strong>função social do contrato</strong>?</p>',
          answer: '<p>Princípio consagrado no Art. 421 do CC/2002: a liberdade de contratar será exercida em razão e nos limites da função social do contrato.</p><p>Significa que o contrato não pode ser instrumento de lesão a terceiros ou à coletividade. Os contratos devem ser interpretados de modo a preservar os valores sociais em jogo.</p>',
          level: 2, points: 15, lastReview: d(0, 10), nextReview: nextReview(d(0, 10), 60), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_oc_008',
          question: '<p>O que são os <strong>direitos reais</strong>? Liste os principais.</p>',
          answer: '<p>Direitos reais são aqueles que recaem diretamente sobre as coisas (Art. 1.225 do CC):</p><ul><li>Propriedade</li><li>Superfície</li><li>Servidões</li><li>Usufruto</li><li>Uso e Habitação</li><li>Direito do promitente comprador</li><li>Penhor, Hipoteca e Anticrese (garantias reais)</li><li>Laje (desde 2017)</li></ul>',
          level: 1, points: 8, lastReview: d(0, 9), nextReview: nextReview(d(0, 9), 10), consecutiveCorrect: 0, reviewStreak: 0,
        },
      ],
    },

    // ── Ética Profissional ────────────────────────────────────────
    {
      id: 'demo_oab_etica',
      name: 'Ética Profissional',
      flashcards: [
        {
          id: 'demo_oe_001',
          question: '<p>O que é o <strong>sigilo profissional</strong> do advogado?</p>',
          answer: '<p>Dever do advogado de guardar segredo de tudo que souber em razão de sua profissão. Previsto no Art. 7º, II da Lei 8.906/94 (Estatuto da OAB) e no Art. 25 do CED.</p><p>É irrenunciável, tem caráter absoluto e não cessa com o fim do mandato. O advogado pode recusar-se a depor sobre fatos relacionados ao sigilo.</p>',
          level: 5, points: 52, lastReview: d(8), nextReview: nextReview(d(8), 10080), consecutiveCorrect: 0, reviewStreak: 2,
        },
        {
          id: 'demo_oe_002',
          question: '<p>O que é a <strong>advocacia dativa</strong>?</p>',
          answer: '<p>É a nomeação de advogado pelo juiz para defender réu que não constituiu advogado. O profissional nomeado tem obrigação de aceitar, salvo motivo justificado.</p><p>Não se confunde com a defensoria pública (cargo de Estado) nem com a advocacia pro bono (voluntária).</p>',
          level: 5, points: 41, lastReview: d(13), nextReview: nextReview(d(13), 20160), consecutiveCorrect: 0, reviewStreak: 3,
        },
        {
          id: 'demo_oe_003',
          question: '<p>Quais são as <strong>infrações disciplinares</strong> previstas no Estatuto da OAB?</p>',
          answer: '<p>As infrações e sanções disciplinares estão no Art. 34 do EOAB. As sanções são:</p><ol><li>Censura</li><li>Suspensão</li><li>Exclusão</li><li>Multa</li></ol><p>A censura é aplicada em casos de infrações leves. A exclusão é a sanção mais grave, aplicada em casos de crimes infamantes ou descumprimento reiterado.</p>',
          level: 4, points: 36, lastReview: d(2, 11), nextReview: nextReview(d(2, 11), 1440), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_oe_004',
          question: '<p>O que é a <strong>imunidade profissional</strong> do advogado?</p>',
          answer: '<p>Art. 7º, §2º da Lei 8.906/94: o advogado não pode ser processado, preso ou responsabilizado por atos praticados no exercício regular da profissão.</p><p>Abrange: manifestações no exercício da advocacia, mesmo que ofensivas, salvo quando houver <em>excesso</em> (injúria, difamação ou calúnia).</p>',
          level: 4, points: 34, lastReview: d(4, 9), nextReview: nextReview(d(4, 9), 1440), consecutiveCorrect: 1, reviewStreak: 0,
        },
        {
          id: 'demo_oe_005',
          question: '<p>O que é a <strong>incompatibilidade</strong> para o exercício da advocacia?</p>',
          answer: '<p>São situações que impedem absolutamente o exercício da advocacia (Art. 28 do EOAB). Exemplos:</p><ul><li>Chefes do Executivo (Presidente, Governadores, Prefeitos)</li><li>Membros de órgãos do Poder Judiciário</li><li>Membros do Ministério Público</li><li>Militares em serviço ativo</li><li>Delegados e agentes policiais</li></ul>',
          level: 3, points: 25, lastReview: d(0, 16), nextReview: nextReview(d(0, 16), 360), consecutiveCorrect: 0, reviewStreak: 0,
        },
        {
          id: 'demo_oe_006',
          question: '<p>Qual é a diferença entre <strong>impedimento</strong> e <strong>incompatibilidade</strong> na advocacia?</p>',
          answer: '<p><strong>Incompatibilidade</strong> (Art. 28): proibição absoluta — não pode exercer advocacia em nenhum caso.</p><p><strong>Impedimento</strong> (Art. 30): proibição relativa — pode advogar em outros casos, mas não nos relacionados à sua função pública.</p><p><em>Exemplo de impedimento</em>: servidor público pode advogar fora do horário de trabalho, exceto contra a entidade a que pertence.</p>',
          level: 2, points: 16, lastReview: d(0, 12), nextReview: nextReview(d(0, 12), 60), consecutiveCorrect: 1, reviewStreak: 0,
        },
      ],
    },
  ],
};

// -----------------------------------------------------------------
// DECKS ARRAY
// -----------------------------------------------------------------
export const DEMO_DECKS = [deckEnem, deckPF, deckINSS, deckOAB];

// -----------------------------------------------------------------
// STUDY HISTORY — 15 dias de histórico realista
// -----------------------------------------------------------------

const session = (daysAgo, hourOfDay, deckId, deckName, subjectId, subjectName, acertos, quases, erros) => ({
  date: new Date(NOW - daysAgo * DAY).toISOString().slice(0, 10),
  deckId,
  deckName,
  subjectId,
  subjectName,
  acertos,
  quases,
  erros,
  count: acertos + quases + erros,
  timestamp: ts(daysAgo, hourOfDay),
  lastSessionAt: ts(daysAgo, hourOfDay),
});

export const DEMO_STUDY_HISTORY = [
  // Jun 13 — início leve
  session(14, 9,  'demo_deck_enem',  'ENEM',             'demo_enem_matematica', 'Matemática',               4, 2, 1),
  session(14, 10, 'demo_deck_oab',   'OAB — Exame de Ordem', 'demo_oab_civil',   'Direito Civil',            3, 1, 2),

  // Jun 14 — médio
  session(13, 8,  'demo_deck_enem',  'ENEM',             'demo_enem_matematica', 'Matemática',               6, 3, 2),
  session(13, 19, 'demo_deck_pf',    'Polícia Federal',  'demo_pf_const',        'Direito Constitucional',   5, 2, 1),

  // Jun 15 — GAP (não estudou)

  // Jun 16 — retorno
  session(11, 9,  'demo_deck_enem',  'ENEM',             'demo_enem_portugues',  'Língua Portuguesa',        4, 1, 1),
  session(11, 20, 'demo_deck_inss',  'INSS',             'demo_inss_prev',       'Direito Previdenciário',   3, 2, 2),

  // Jun 17 — médio
  session(10, 8,  'demo_deck_oab',   'OAB — Exame de Ordem', 'demo_oab_civil',   'Direito Civil',            7, 2, 1),
  session(10, 18, 'demo_deck_pf',    'Polícia Federal',  'demo_pf_const',        'Direito Constitucional',   6, 3, 2),

  // Jun 18 — pesado
  session(9,  8,  'demo_deck_enem',  'ENEM',             'demo_enem_matematica', 'Matemática',               9, 2, 1),
  session(9,  10, 'demo_deck_enem',  'ENEM',             'demo_enem_ciencias',   'Ciências da Natureza',     6, 2, 2),
  session(9,  20, 'demo_deck_oab',   'OAB — Exame de Ordem', 'demo_oab_etica',   'Ética Profissional',       5, 1, 0),

  // Jun 19 — médio
  session(8,  9,  'demo_deck_pf',    'Polícia Federal',  'demo_pf_info',         'Informática',              4, 1, 1),
  session(8,  19, 'demo_deck_inss',  'INSS',             'demo_inss_prev',       'Direito Previdenciário',   5, 2, 1),

  // Jun 20 — pesado
  session(7,  8,  'demo_deck_enem',  'ENEM',             'demo_enem_matematica', 'Matemática',               8, 3, 1),
  session(7,  10, 'demo_deck_enem',  'ENEM',             'demo_enem_portugues',  'Língua Portuguesa',        6, 2, 1),
  session(7,  19, 'demo_deck_pf',    'Polícia Federal',  'demo_pf_const',        'Direito Constitucional',   7, 1, 2),

  // Jun 21 — médio
  session(6,  9,  'demo_deck_oab',   'OAB — Exame de Ordem', 'demo_oab_civil',   'Direito Civil',            6, 2, 1),
  session(6,  20, 'demo_deck_inss',  'INSS',             'demo_inss_prev',       'Direito Previdenciário',   4, 2, 2),

  // Jun 22 — pesado (domingo)
  session(5,  9,  'demo_deck_enem',  'ENEM',             'demo_enem_matematica', 'Matemática',               10,2, 1),
  session(5,  11, 'demo_deck_enem',  'ENEM',             'demo_enem_ciencias',   'Ciências da Natureza',     7, 2, 1),
  session(5,  14, 'demo_deck_oab',   'OAB — Exame de Ordem', 'demo_oab_etica',   'Ética Profissional',       6, 0, 0),
  session(5,  16, 'demo_deck_pf',    'Polícia Federal',  'demo_pf_const',        'Direito Constitucional',   8, 2, 1),

  // Jun 23
  session(4,  8,  'demo_deck_pf',    'Polícia Federal',  'demo_pf_info',         'Informática',              5, 1, 1),
  session(4,  19, 'demo_deck_inss',  'INSS',             'demo_inss_prev',       'Direito Previdenciário',   6, 2, 0),

  // Jun 24
  session(3,  9,  'demo_deck_enem',  'ENEM',             'demo_enem_portugues',  'Língua Portuguesa',        5, 2, 1),
  session(3,  20, 'demo_deck_oab',   'OAB — Exame de Ordem', 'demo_oab_civil',   'Direito Civil',            7, 1, 1),

  // Jun 25
  session(2,  8,  'demo_deck_enem',  'ENEM',             'demo_enem_matematica', 'Matemática',               11,2, 0),
  session(2,  10, 'demo_deck_pf',    'Polícia Federal',  'demo_pf_const',        'Direito Constitucional',   8, 2, 1),
  session(2,  20, 'demo_deck_oab',   'OAB — Exame de Ordem', 'demo_oab_etica',   'Ética Profissional',       5, 1, 0),

  // Jun 26
  session(1,  8,  'demo_deck_enem',  'ENEM',             'demo_enem_ciencias',   'Ciências da Natureza',     6, 2, 2),
  session(1,  19, 'demo_deck_inss',  'INSS',             'demo_inss_prev',       'Direito Previdenciário',   5, 2, 1),

  // Jun 27 — hoje
  session(0,  8,  'demo_deck_enem',  'ENEM',             'demo_enem_matematica', 'Matemática',               7, 2, 1),
  session(0,  10, 'demo_deck_pf',    'Polícia Federal',  'demo_pf_const',        'Direito Constitucional',   6, 2, 1),
  session(0,  12, 'demo_deck_oab',   'OAB — Exame de Ordem', 'demo_oab_civil',   'Direito Civil',            5, 1, 0),
];

// -----------------------------------------------------------------
// PERFORMANCE DATA (por matéria)
// -----------------------------------------------------------------
export const DEMO_PERFORMANCE_DATA = {
  demo_enem_matematica: {
    anterior: { acertos: 28, quases: 9, erros: 6, levelUps: 3, updatedAt: ts(7) },
    atual:    { acertos: 39, quases: 11, erros: 3, levelUps: 5, updatedAt: ts(0, 10) },
  },
  demo_enem_portugues: {
    anterior: { acertos: 15, quases: 5, erros: 4, levelUps: 2, updatedAt: ts(10) },
    atual:    { acertos: 21, quases: 7, erros: 3, levelUps: 3, updatedAt: ts(2, 9) },
  },
  demo_enem_ciencias: {
    anterior: { acertos: 19, quases: 6, erros: 5, levelUps: 2, updatedAt: ts(9) },
    atual:    { acertos: 26, quases: 7, erros: 5, levelUps: 3, updatedAt: ts(1, 8) },
  },
  demo_pf_const: {
    anterior: { acertos: 26, quases: 8, erros: 7, levelUps: 4, updatedAt: ts(10) },
    atual:    { acertos: 35, quases: 9, erros: 5, levelUps: 5, updatedAt: ts(0, 10) },
  },
  demo_pf_info: {
    anterior: { acertos: 9, quases: 3, erros: 3, levelUps: 1, updatedAt: ts(8) },
    atual:    { acertos: 14, quases: 4, erros: 3, levelUps: 2, updatedAt: ts(4, 8) },
  },
  demo_inss_prev: {
    anterior: { acertos: 18, quases: 7, erros: 5, levelUps: 2, updatedAt: ts(9) },
    atual:    { acertos: 25, quases: 9, erros: 4, levelUps: 3, updatedAt: ts(1, 19) },
  },
  demo_oab_civil: {
    anterior: { acertos: 22, quases: 6, erros: 4, levelUps: 3, updatedAt: ts(10) },
    atual:    { acertos: 30, quases: 7, erros: 3, levelUps: 4, updatedAt: ts(0, 12) },
  },
  demo_oab_etica: {
    anterior: { acertos: 16, quases: 2, erros: 2, levelUps: 3, updatedAt: ts(13) },
    atual:    { acertos: 22, quases: 3, erros: 1, levelUps: 4, updatedAt: ts(2, 20) },
  },
};

// Primeira data de uso: Jun 13
export const DEMO_FIRST_USE_DATE = new Date(NOW - 14 * DAY).toISOString();

// Cards disponíveis nos últimos 7 dias: todos com cards
export const DEMO_CARDS_AVAILABILITY = {
  [new Date(NOW - 6 * DAY).toISOString().slice(0, 10)]: true,
  [new Date(NOW - 5 * DAY).toISOString().slice(0, 10)]: true,
  [new Date(NOW - 4 * DAY).toISOString().slice(0, 10)]: true,
  [new Date(NOW - 3 * DAY).toISOString().slice(0, 10)]: true,
  [new Date(NOW - 2 * DAY).toISOString().slice(0, 10)]: true,
  [new Date(NOW - 1 * DAY).toISOString().slice(0, 10)]: true,
  [new Date(NOW).toISOString().slice(0, 10)]: true,
};
