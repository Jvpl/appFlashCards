export const LEVEL_CONFIG = {
  0: { name: 'Marco Zero',    color: '#9CA3AF', reviewTime: 0    }, // imediato
  1: { name: 'Aprendiz',      color: '#EF4444', reviewTime: 10   }, // 10 min
  2: { name: 'Em Progresso',  color: '#F97316', reviewTime: 60   }, // 1 hora
  3: { name: 'Consolidando',  color: '#FACC15', reviewTime: 360  }, // 6 horas
  4: { name: 'Confiante',     color: '#3B82F6', reviewTime: 1440 }, // 1 dia
  5: { name: 'Dominado',      color: '#22C55E', reviewTime: 0    }, // dinâmico via reviewStreak
};

// Intervalos crescentes para nível 5 (em minutos)
// reviewStreak 1 → 7 dias, 2 → 14 dias, 3+ → 30 dias
const LEVEL_5_INTERVALS = [
  7  * 24 * 60,  // 7 dias
  14 * 24 * 60,  // 14 dias
  30 * 24 * 60,  // 30 dias
];

export const calculateCardUpdate = (card, swipeDirection) => {
  let {
    level             = 0,
    points            = 0,
    consecutiveCorrect = 0,
    reviewStreak      = 0,
  } = card;

  const now = new Date();

  switch (swipeDirection) {
    case 'right': // Memorizado
      points += 3;
      if (level === 5) {
        // Já no máximo: apenas avança o streak para ampliar o intervalo
        reviewStreak += 1;
      } else {
        consecutiveCorrect += 1;
        if (consecutiveCorrect >= 2) {
          level += 1; // sobe 1 nível (level era < 5)
          consecutiveCorrect = 0;
          if (level === 5) {
            points += 5;   // bônus ao chegar no nível 5
            reviewStreak = 1;
          }
        }
      }
      break;

    case 'up': // Quase
      points += 1;
      if (level < 5) {
        consecutiveCorrect += 1;
        if (consecutiveCorrect >= 2) {
          level = Math.min(level + 1, 4); // "Quase" não chega ao nível 5
          consecutiveCorrect = 0;
        }
      }
      // level 5 + "Quase": não altera nada no nível nem no streak
      break;

    case 'left': // Errei
      points = Math.max(0, points - 2);
      consecutiveCorrect = 0;
      reviewStreak = 0;
      level = level >= 3 ? 1 : 0; // regressão agressiva
      break;
  }

  // Calcula próxima data de revisão
  let reviewTimeMinutes;
  if (level === 5) {
    const idx = Math.min(reviewStreak - 1, LEVEL_5_INTERVALS.length - 1);
    reviewTimeMinutes = LEVEL_5_INTERVALS[Math.max(0, idx)];
  } else {
    reviewTimeMinutes = LEVEL_CONFIG[level].reviewTime;
  }

  const nextReviewDate = new Date(now.getTime() + reviewTimeMinutes * 60 * 1000);

  return {
    ...card,
    level,
    points,
    consecutiveCorrect,
    reviewStreak,
    lastReview: now.toISOString(),
    nextReview: nextReviewDate.toISOString(),
  };
};

export default { LEVEL_CONFIG, calculateCardUpdate };
