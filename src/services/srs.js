export const LEVEL_CONFIG = {
  0: { name: 'Marco Zero', color: '#9CA3AF', reviewTime: 0 }, // 0 minutes
  1: { name: 'Aprendiz', color: '#EF4444', reviewTime: 10 }, // 10 minutes
  2: { name: 'Em Progresso', color: '#F97316', reviewTime: 60 }, // 1 hour
  3: { name: 'Consolidando', color: '#FACC15', reviewTime: 360 }, // 6 hours
  4: { name: 'Confiante', color: '#3B82F6', reviewTime: 1440 }, // 1 day
  5: { name: 'Dominado', color: '#22C55E', reviewTime: 5760 }, // 4 days
};

export const calculateCardUpdate = (card, swipeDirection) => {
  let { level = 0, points = 0 } = card;
  const now = new Date();

  switch (swipeDirection) {
    case 'right': // Acertei
      points += 3;
      level = Math.min(level + 1, 5);
      if (level === 5 && (card.level || 0) < 5) {
        points += 5;
      }
      break;
    case 'up': // Quase
      points += 1;
      level = Math.min(level + 1, 4);
      break;
    case 'left': // Errei
      points = Math.max(0, points - 2);
      level = Math.max(level - 1, 0);
      break;
  }

  let reviewTimeMinutes = LEVEL_CONFIG[level].reviewTime;
  if (level === 5) {
      const lastReview = card.lastReview ? new Date(card.lastReview) : now;
      const daysSinceLastReview = (now.getTime() - lastReview.getTime()) / (1000 * 3600 * 24);
      if (daysSinceLastReview <= 7) {
        reviewTimeMinutes = 7 * 24 * 60; // Re-schedule for 7 days if reviewed within a week
      }
      // Se revisado após mais de 7 dias, mantém o tempo padrão de revisão do nível 5
  }

  const nextReviewDate = new Date(now.getTime() + reviewTimeMinutes * 60 * 1000);

  return {
    ...card,
    level,
    points,
    lastReview: now.toISOString(),
    nextReview: nextReviewDate.toISOString(),
  };
};

export default { LEVEL_CONFIG, calculateCardUpdate };
