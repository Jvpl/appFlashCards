/**
 * categories.js
 * Definição central das categorias de concurso.
 * Exportado para ser reutilizado em DeckListScreen e CategoryDetailScreen.
 */

export const CONCURSO_CATEGORIES = [
  {
    id: 'justica', name: 'Justiça & Direito', icon: 'scale-outline', color: '#818CF8',
    keywords: ['tribunal', 'tj-', 'tjmg', 'tjsp', 'trf', 'trt', 'tre-', 'tse', 'tst',
      'stj', 'stf', 'judiciário', 'judiciario', 'oficial de justiça', 'oficial de justica',
      'juiz', 'promotor', 'defensor', 'procurador', 'ministério público', 'oab',
      'advogado público', 'delegado federal', 'direito'],
  },
  {
    id: 'seguranca', name: 'Segurança Pública', icon: 'shield-half-outline', color: '#A78BFA',
    keywords: ['policia', 'polícia', 'pm ', 'pmmg', 'pc-', 'pcesp', 'pcsp', 'prf', 'pf ',
      'investigador', 'soldado', 'delegado', 'agente policial', 'polícia penal', 'policia penal',
      'segurança pública', 'seguranca publica'],
  },
  {
    id: 'administrativo', name: 'Administrativo', icon: 'briefcase-outline', color: '#FBBF24',
    keywords: ['inss', 'ibge', 'prefeitura', 'ministério', 'ministerio',
      'agente administrativo', 'assistente administrativo', 'anp', 'anatel', 'anvisa',
      'banco', 'bancario', 'bancário', 'banco central', 'bacen', 'bb ', 'caixa econômica',
      'escriturário', 'escriturario'],
  },
  {
    id: 'operacional', name: 'Operacional & Logística', icon: 'git-network-outline', color: '#34D399',
    keywords: ['operacional', 'logística', 'logistica', 'agente de trânsito', 'agente de transito',
      'técnico', 'tecnico', 'suporte', 'manutenção', 'manutencao', 'agente federal'],
  },
  {
    id: 'fiscal', name: 'Fiscal & Controle', icon: 'reader-outline', color: '#FB923C',
    keywords: ['receita federal', 'sefaz', 'iss ', 'fiscal', 'auditor', 'tributário',
      'tributario', 'fisco', 'tcu', 'cgu', 'controladoria', 'controle interno', 'auditoria', 'tcm', 'tce'],
  },
  {
    id: 'saude', name: 'Saúde', icon: 'fitness-outline', color: '#F472B6',
    keywords: ['saúde', 'saude', 'sus', 'enfermeiro', 'médico', 'medico', 'hospital',
      'técnico em saúde', 'tecnico em saude', 'farmacêutico', 'farmaceutico', 'nutricionista'],
  },
  {
    id: 'educacao', name: 'Educação', icon: 'book-outline', color: '#86EFAC',
    keywords: ['professor', 'educação', 'educacao', 'universidade', 'instituto federal',
      'if ', 'ufmg', 'usp', 'unicamp', 'docente', 'pedagogia', 'escola'],
  },
  {
    id: 'militar', name: 'Militar', icon: 'medal-outline', color: '#F87171',
    keywords: ['bombeiro', 'militar', 'exército', 'exercito', 'marinha',
      'aeronáutica', 'aeronautica', 'cfsd', 'esa', 'efomm', 'afa', 'força'],
  },
  {
    id: 'personalizados', name: 'Meus estudos', icon: 'albums-outline', color: '#60A5FA',
    keywords: [],
  },
];

/**
 * Retorna o catId efetivo de um deck.
 * Aceita categorias padrão e customizadas (prefixo custom_).
 */
export const getDeckCatId = (deck) => {
  const catId = deck.category;
  if (!catId || catId === 'personalizados') return 'personalizados';
  if (CONCURSO_CATEGORIES.find(c => c.id === catId)) return catId;
  if (catId.startsWith('custom_')) return catId; // categoria customizada válida
  return 'personalizados';
};

/**
 * Retorna o label de categoria para exibir no card do deck.
 * Versão síncrona — usa lista de customizadas já carregada.
 */
export const getCatLabel = (deck, customCats = []) => {
  const catId = deck.category;
  if (!catId || catId === 'personalizados') return null;
  const preset = CONCURSO_CATEGORIES.find(c => c.id === catId);
  if (preset) return preset.name;
  const custom = customCats.find(c => c.id === catId);
  return custom ? custom.name : null;
};

/**
 * Salva/carrega categorias customizadas criadas pelo usuário no AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOM_CATS_KEY = '@custom_categories';

export const getCustomCategories = async () => {
  try {
    const json = await AsyncStorage.getItem(CUSTOM_CATS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
};

export const saveCustomCategories = async (cats) => {
  try {
    await AsyncStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(cats));
  } catch (e) {
    console.warn('Failed to save custom categories', e);
  }
};

/**
 * Retorna todas as categorias: pré-definidas + customizadas.
 */
export const getAllCategories = async () => {
  const custom = await getCustomCategories();
  return [...CONCURSO_CATEGORIES, ...custom];
};
