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

// ── TOKENS COMPARTILHADOS (iguais em dark e light) ──────────────

const shared = {

  // ── NÍVEIS SRS (progressão dos flashcards) ───────────────────
  srsLevel0:           '#4B5563',           // Marco Zero — cinza azulado
  srsLevel1:           '#7C3AED',           // Aprendiz — roxo
  srsLevel2:           '#4F46E5',           // Em Progresso — índigo
  srsLevel3:           '#2563EB',           // Consolidando — azul
  srsLevel4:           '#0891B2',           // Confiante — ciano
  srsLevel5:           '#5DD62C',           // Dominado — verde lima

  // ── SEMÂNTICAS ───────────────────────────────────────────────
  danger:              '#F85149',
  warning:             '#D29922',
  info:                '#388BFD',
  dangerGlow:          'rgba(248, 81, 73, 0.5)',
  successGlow:         'rgba(63, 185, 80, 0.5)',
  infoGlow:            'rgba(56, 139, 253, 0.5)',

  // ── ACCENTS (fórmulas matemáticas) ───────────────────────────
  accentPurple:        '#6B46C1',
  accentPurpleLight:   '#8B5CF6',
  accentCyan:          '#06B6D4',

  // ── EDITOR DE FÓRMULAS (dark-only, mantido para compatibilidade)
  backgroundEditor:        '#1A2535',
  backgroundEditorPreview: '#141D2B',
  backgroundEditorKey:     '#253045',
  borderEditor:            '#3D4F6A',
  accentPurpleBg:          'rgba(139,92,246,0.15)',
  accentPurpleBorder:      'rgba(139,92,246,0.50)',
  dangerKeyBg:             '#3B1F1F',
  dangerKeyBorder:         '#7B2D2D',
  textNav:                 '#CBD5E0',

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
    default:        undefined,
    serif:          'serif',
    // Títulos, nomes de deck, pontuações
    heading:        'SpaceGrotesk_700Bold',
    headingSemiBold:'SpaceGrotesk_600SemiBold',
    headingMedium:  'SpaceGrotesk_500Medium',
    // Corpo de texto, conteúdo dos flashcards
    body:           'Manrope_400Regular',
    bodyMedium:     'Manrope_500Medium',
    bodySemiBold:   'Manrope_600SemiBold',
    bodyBold:       'Manrope_700Bold',
    // Labels de UI, botões, badges, metadados
    ui:             'PlusJakartaSans_400Regular',
    uiMedium:       'PlusJakartaSans_500Medium',
    uiSemiBold:     'PlusJakartaSans_600SemiBold',
    uiBold:         'PlusJakartaSans_700Bold',
  },
};

// ── TEMA ESCURO (padrão) ─────────────────────────────────────────

export const darkTheme = {
  ...shared,

  // Fundos
  background:          '#0F0F0F',
  backgroundSecondary: '#202020',
  backgroundTertiary:  '#2A2A2A',
  backgroundElevated:  '#2A2A2A',
  // Legacy (mantidos para compatibilidade com editor e toolbar)
  backgroundDark:      '#0F0F0F',
  backgroundButton:    '#2A2A2A',

  // Primária — Verde Lima
  primary:             '#5DD62C',
  primaryDark:         '#337418',
  primaryTransparent:  'rgba(93,214,44,0.12)',
  primaryTransparent15:'rgba(93,214,44,0.15)',
  primaryGlow:         'rgba(93,214,44,0.35)',

  // Texto
  textPrimary:         '#F8F8F8',
  textSecondary:       '#A0A0A0',
  textMuted:           '#606060',
  textDisabled:        '#404040',

  // Semânticas (com sucesso = primary)
  success:             '#5DD62C',
  purchased:           '#5DD62C',
  download:            '#5DD62C',
};

// ── TEMA CLARO ───────────────────────────────────────────────────

export const lightTheme = {
  ...shared,

  // Fundos
  background:          '#F6F8FA',
  backgroundSecondary: '#FFFFFF',
  backgroundTertiary:  '#D0D7DE',
  backgroundElevated:  '#EAEEF2',
  backgroundDark:      '#EAEEF2',
  backgroundButton:    '#D0D7DE',

  // Primária — Verde mais escuro para contraste 4.5:1
  primary:             '#1A7F37',
  primaryTransparent:  'rgba(26,127,55,0.10)',
  primaryTransparent15:'rgba(26,127,55,0.15)',
  primaryGlow:         'rgba(26,127,55,0.25)',

  // Texto
  textPrimary:         '#1F2328',
  textSecondary:       '#656D76',
  textMuted:           '#9198A1',
  textDisabled:        '#D0D7DE',

  // Semânticas
  success:             '#1A7F37',
  purchased:           '#1A7F37',
  download:            '#1A7F37',
};

// ── EXPORT PADRÃO (dark — retrocompatível com todos os imports existentes)
const theme = darkTheme;
export default theme;
