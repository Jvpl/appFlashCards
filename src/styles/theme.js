// ================================================================
// TEMA CENTRAL DO APP
// Todas as cores, tamanhos de fonte, pesos e famílias de fonte
// do app estão definidos aqui.
//
// Uso:
//   import theme from '../styles/theme';
//   color: theme.primary
//   fontSize: theme.fontSize.base
// ================================================================

const theme = {

  // ── CORES DE FUNDO ──────────────────────────────────────────
  background:          '#1A202C',           // fundo principal
  backgroundSecondary: '#2D3748',           // headers, modals, inputs
  backgroundTertiary:  '#4A5568',           // bordas, divisores, botões secundários
  backgroundDark:      '#252E3D',           // toolbar matemática, deck header
  backgroundButton:    '#323E4F',           // botões da toolbar matemática

  // ── COR PRIMÁRIA (teal) ──────────────────────────────────────
  primary:             '#4FD1C5',           // botões, destaques, progresso
  primaryTransparent:  'rgba(79,209,197,0.1)', // hover / selecionado

  // ── TEXTO ────────────────────────────────────────────────────
  textPrimary:         '#FFFFFF',           // texto principal
  textSecondary:       '#E2E8F0',           // texto secundário
  textMuted:           '#A0AEC0',           // placeholders, subtítulos
  textDisabled:        '#718096',           // elementos desabilitados

  // ── SEMÂNTICAS ───────────────────────────────────────────────
  success:             '#22C55E',           // verde — completo, acerto
  danger:              '#EF4444',           // vermelho — deletar, erro
  info:                '#3B82F6',           // azul — ações neutras
  warning:             '#F59E0B',           // âmbar — avisos
  purchased:           '#48BB78',           // compra realizada
  download:            '#10B981',           // download / restaurar

  // ── VARIANTES RGBA (para gradientes e glows) ─────────────────
  dangerGlow:          'rgba(239, 68, 68, 0.5)',    // glow vermelho (swipe esquerda)
  successGlow:         'rgba(34, 197, 94, 0.5)',    // glow verde (swipe direita)
  infoGlow:            'rgba(59, 130, 246, 0.5)',   // glow azul (swipe cima)

  // ── ACCENTS (fórmulas matemáticas) ───────────────────────────
  accentPurple:        '#6B46C1',           // botão "Modo Avançado" no toolbar
  accentPurpleLight:   '#8B5CF6',           // ícone de logaritmo
  accentCyan:          '#06B6D4',           // ícone de valor absoluto

  // ── NÍVEIS SRS (progressão dos flashcards) ───────────────────
  srsLevel0:           '#9CA3AF',           // Marco Zero — cinza
  srsLevel1:           '#EF4444',           // Aprendiz — vermelho
  srsLevel2:           '#F97316',           // Em Progresso — laranja
  srsLevel3:           '#FACC15',           // Consolidando — amarelo
  srsLevel4:           '#3B82F6',           // Confiante — azul
  srsLevel5:           '#22C55E',           // Dominado — verde

  // ── EDITOR DE FÓRMULAS ───────────────────────────────────────
  backgroundEditor:        '#1A2535',              // fundo do sheet do FormulaBuilderModal
  backgroundEditorPreview: '#141D2B',              // fundo da área de preview do editor
  backgroundEditorKey:     '#253045',              // teclas e botões do editor de fórmula
  borderEditor:            '#3D4F6A',              // bordas das teclas e botões do editor
  primaryTransparent15:    'rgba(79,209,197,0.15)', // tab ativa / navHL (opacidade 0.15)
  accentPurpleBg:          'rgba(139,92,246,0.15)', // fundo do botão "limpar"
  accentPurpleBorder:      'rgba(139,92,246,0.50)', // borda do botão "limpar"
  textNav:                 '#CBD5E0',              // texto dos botões de navegação do editor
  dangerKeyBg:             '#3B1F1F',              // fundo da tecla backspace (vermelho escuro)
  dangerKeyBorder:         '#7B2D2D',              // borda da tecla backspace (vermelho escuro)

  // ── TAMANHOS DE FONTE ────────────────────────────────────────
  fontSize: {
    xs:      10,   // labels pequenos, badges
    sm:      12,   // captions, legendas
    caption: 13,   // texto de apoio
    body:    14,   // corpo de texto padrão
    bodyLg:  15,   // corpo levemente maior
    base:    16,   // tamanho base (mais comum)
    md:      18,   // subtítulos
    lg:      20,   // títulos de seção
    xl:      22,   // títulos de tela
    xxl:     24,   // títulos grandes
    title:   28,   // título principal
    h1:      32,   // cabeçalho grande
    display: 48,   // destaque / hero
  },

  // ── PESOS DE FONTE ───────────────────────────────────────────
  fontWeight: {
    light:    '300',
    normal:   '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
  },

  // ── FAMÍLIA DE FONTE ─────────────────────────────────────────
  fontFamily: {
    default: undefined, // fonte padrão do sistema
    serif:   'serif',   // elementos matemáticos (frações, raízes)
  },

};

export default theme;
