import theme from '../styles/theme';

export const LEVEL_CONFIG = {
  0: { name: 'Marco Zero',    color: theme.srsLevel0, reviewTime: 1    }, // 1 min
  1: { name: 'Aprendiz',      color: theme.srsLevel1, reviewTime: 10   }, // 10 min
  2: { name: 'Em Progresso',  color: theme.srsLevel2, reviewTime: 60   }, // 1 hora
  3: { name: 'Consolidando',  color: theme.srsLevel3, reviewTime: 360  }, // 6 horas
  4: { name: 'Confiante',     color: theme.srsLevel4, reviewTime: 1440 }, // 1 dia
  5: { name: 'Dominado',      color: theme.srsLevel5, reviewTime: 0    }, // dinâmico via reviewStreak
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
    level              = 0,
    points             = 0,
    consecutiveCorrect = 0,
    reviewStreak       = 0,
  } = card;

  const now = new Date();

  switch (swipeDirection) {
    case 'right': // Memorizado
      points += 3;
      if (level === 5) {
        reviewStreak += 1;
      } else {
        consecutiveCorrect += 1;
        if (consecutiveCorrect >= 2) {
          level += 1;
          consecutiveCorrect = 0;
          if (level === 5) {
            points += 5;
            reviewStreak = 1;
          }
        }
      }
      break;

    case 'up': // Quase — não sobe nível, interrompe streak
      points += 1;
      consecutiveCorrect = 0;
      break;

    case 'left': // Errei — regressão agressiva, volta imediato
      points = Math.max(0, points - 2);
      consecutiveCorrect = 0;
      reviewStreak = 0;
      level = level >= 3 ? 1 : 0;
      break;
  }

  // Intervalo definido pelo nível — nível 0 com 1 acerto usa o intervalo do nível 1
  // para não voltar imediatamente após o primeiro acerto
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
