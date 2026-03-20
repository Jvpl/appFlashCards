/**
 * Sistema de Validação Robusto para Inputs de Fórmulas
 *
 * Compartilhado entre ManageFlashcardsScreen e EditFlashcardScreen
 * para garantir comportamento consistente.
 */

/**
 * Valida se um novo caractere pode ser inserido no texto atual
 * @param {string} currentText - Texto atual no input
 * @param {string} newChar - Novo caractere a ser inserido
 * @returns {Object} { valid: boolean, reason?: string }
 */
export const validateInput = (currentText, newChar) => {
  const text = currentText || '';

  // VALIDAÇÃO ESTRITA: Lista branca de caracteres permitidos
  const allowedChars = /^[0-9a-zA-Z+\-×÷^_(),.\sπθ≠≥≤∞]$/;
  if (!allowedChars.test(newChar)) {
    return { valid: false, reason: 'characterNotAllowed' };
  }

  // Contadores
  const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
  const numberCount = (text.match(/[0-9]/g) || []).length;
  const symbolCounts = {
    '+': (text.match(/\+/g) || []).length,
    '-': (text.match(/-/g) || []).length,
    '×': (text.match(/×/g) || []).length,
    '÷': (text.match(/÷/g) || []).length,
    '^': (text.match(/\^/g) || []).length,
    '_': (text.match(/_/g) || []).length,
    '(': (text.match(/\(/g) || []).length,
    ')': (text.match(/\)/g) || []).length,
    ',': (text.match(/,/g) || []).length,
    '.': (text.match(/\./g) || []).length,
  };

  const lastChar = text.slice(-1);
  const isLetter = /[a-zA-Z]/.test(newChar);
  const isNumber = /[0-9]/.test(newChar);
  const isDecimalSep = /[,.]/.test(newChar);
  const isSymbol = /[+\-×÷^_()≠≥≤]/.test(newChar);
  const lastIsNumber = /[0-9]/.test(lastChar);
  const lastIsSymbol = /[+\-×÷^_()≠≥≤]/.test(lastChar);
  const lastIsDecimal = /[,.]/.test(lastChar);

  // Regra 1: Num → Letra BLOQUEADO (precisa de símbolo entre eles)
  if (isLetter && lastIsNumber) {
    return { valid: false, reason: 'needsSymbol' };
  }

  // Regra 2: Símbolos consecutivos — bloqueia, exceto combinações matematicamente válidas
  if (isSymbol && lastIsSymbol) {
    if (newChar === '(') return { valid: true };
    if (lastChar === ')') return { valid: true };
    return { valid: false, reason: 'noConsecutiveSymbols' };
  }

  // Regra 3: Símbolo no início (apenas +, -, ( e ) permitidos)
  if (isSymbol && text.length === 0 && newChar !== '-' && newChar !== '+' && newChar !== '(' && newChar !== ')') {
    return { valid: false, reason: 'invalidStart' };
  }

  // Separadores decimais (vírgula e ponto)
  if (isDecimalSep) {
    if (text.length === 0) {
      return { valid: false, reason: 'decimalAtStart' };
    }
    if (lastIsDecimal) {
      return { valid: false, reason: 'consecutiveDecimals' };
    }
    const totalSeparators = symbolCounts[','] + symbolCounts['.'];
    if (totalSeparators >= 2) {
      return { valid: false, reason: 'maxDecimals' };
    }
  }

  // Regra 4: Limite de letras (máx 6)
  if (isLetter && letterCount >= 6) {
    return { valid: false, reason: 'maxLetters' };
  }

  // Regra 5: Limite dinâmico de números
  const maxNumbers = letterCount > 0 ? 5 : 15;
  if (isNumber && numberCount >= maxNumbers) {
    return { valid: false, reason: 'maxNumbers' };
  }

  // Regra 6: Limite de símbolos (máx 4 de cada tipo)
  if ((isSymbol || isDecimalSep) && symbolCounts[newChar] !== undefined && symbolCounts[newChar] >= 4) {
    return { valid: false, reason: 'maxSymbols' };
  }

  return { valid: true };
};

/**
 * Retorna estados dos botões do teclado customizado
 * @param {string} text - Texto atual no input
 * @returns {Object} Estados dos botões (lettersDisabled, numbersDisabled, etc.)
 */
export const getButtonStates = (text) => {
  const lastChar = (text || '').slice(-1);
  const letterCount = ((text || '').match(/[a-zA-Z]/g) || []).length;
  const numberCount = ((text || '').match(/[0-9]/g) || []).length;
  const lastIsNumber = /[0-9]/.test(lastChar);
  const lastIsSymbol = /[+\-×÷^_()≠≥≤]/.test(lastChar);
  const isEmpty = (text || '').length === 0;

  const maxNumbers = letterCount > 0 ? 5 : 15;

  return {
    lettersDisabled: lastIsNumber || letterCount >= 6,
    numbersDisabled: numberCount >= maxNumbers,
    symbolsDisabled: lastIsSymbol,
    onlyPlusMinusAllowed: isEmpty,
  };
};
