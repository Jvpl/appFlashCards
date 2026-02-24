/**
 * Componente: Teclado Colapsável (Abc | Símbolos)
 *
 * Compartilhado entre ManageFlashcardsScreen e EditFlashcardScreen
 * Fornece painéis colapsáveis para inserção de letras e símbolos matemáticos
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { getButtonStates } from '../../utils/inputValidation';

/**
 * @param {Object} props
 * @param {number} props.inputNumber - Número do input focado (1 ou 2)
 * @param {string} props.currentValue - Valor atual do input
 * @param {Function} props.onInsert - Callback ao inserir caractere (char) => void
 * @param {boolean} props.showLettersPanel - Estado do painel de letras
 * @param {Function} props.setShowLettersPanel - Setter para painel de letras
 * @param {boolean} props.showSymbolsPanel - Estado do painel de símbolos
 * @param {Function} props.setShowSymbolsPanel - Setter para painel de símbolos
 */
export const CollapsibleKeypad = ({
  inputNumber,
  currentValue,
  onInsert,
  showLettersPanel,
  setShowLettersPanel,
  showSymbolsPanel,
  setShowSymbolsPanel,
}) => {
  const letters = ['x', 'y', 'z', 'a', 'b', 'c', 'n', 'm', 'k', 't'];
  const symbols = ['(', ')', '+', '-', '×', '÷', '^', '_', ',', '.', 'π', 'θ', '∞', '≠', '≥', '≤'];

  const buttonStates = getButtonStates(currentValue);

  const tap = () => {
    try {
      Vibration.vibrate(12);
    } catch (_) {}
  };

  const handleInsert = (char) => {
    onInsert(char);
  };

  const isSymbolAllowed = (symbol) => {
    // Constantes matemáticas (π, θ, ∞) sempre permitidas — não são operadores
    if (['π', 'θ', '∞'].includes(symbol)) return true;
    if (buttonStates.symbolsDisabled) return false;
    // Permitir ( e ) no início junto com + e -
    if (buttonStates.onlyPlusMinusAllowed && symbol !== '+' && symbol !== '-' && symbol !== '(' && symbol !== ')') return false;
    return true;
  };

  return (
    <View style={styles.container}>
      {/* Botões de Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggle, showLettersPanel && styles.toggleActive]}
          onPress={() => {
            tap();
            setShowLettersPanel(!showLettersPanel);
            if (showSymbolsPanel) setShowSymbolsPanel(false);
          }}
        >
          <Text style={styles.toggleText}>Abc</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggle, showSymbolsPanel && styles.toggleActive]}
          onPress={() => {
            tap();
            setShowSymbolsPanel(!showSymbolsPanel);
            if (showLettersPanel) setShowLettersPanel(false);
          }}
        >
          <Text style={styles.toggleText}>+-×</Text>
        </TouchableOpacity>
      </View>

      {/* Painel de Letras */}
      {showLettersPanel && (
        <View style={styles.panel}>
          {letters.map((letter) => (
            <TouchableOpacity
              key={letter}
              style={[styles.button, buttonStates.lettersDisabled && styles.buttonDisabled]}
              onPress={() => {
                if (!buttonStates.lettersDisabled) {
                  tap();
                  handleInsert(letter);
                }
              }}
              disabled={buttonStates.lettersDisabled}
            >
              <Text style={[styles.buttonText, buttonStates.lettersDisabled && styles.buttonTextDisabled]}>
                {letter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Painel de Símbolos */}
      {showSymbolsPanel && (
        <View style={styles.panel}>
          {symbols.map((symbol) => {
            const allowed = isSymbolAllowed(symbol);
            return (
              <TouchableOpacity
                key={symbol}
                style={[styles.button, !allowed && styles.buttonDisabled]}
                onPress={() => {
                  if (allowed) {
                    tap();
                    handleInsert(symbol);
                  }
                }}
                disabled={!allowed}
              >
                <Text style={[styles.buttonText, !allowed && styles.buttonTextDisabled]}>{symbol}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  toggle: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#2D3748',
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  toggleActive: {
    backgroundColor: 'rgba(79, 209, 197, 0.12)',
    borderColor: '#4FD1C5',
  },
  toggleText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  panel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  button: {
    width: 45,
    height: 40,
    backgroundColor: '#2D3748',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  buttonDisabled: {
    backgroundColor: '#1A202C',
    borderColor: '#2D3748',
    opacity: 0.5,
  },
  buttonText: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#4A5568',
  },
});
