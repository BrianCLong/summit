import { Honeytoken, LeakCallback, LeakScoringModel } from './types';

const TYPE_WEIGHTS: Record<Honeytoken['type'], number> = {
  email: 0.8,
  'file-beacon': 0.6,
  'unique-phrase': 0.5,
};

export class DefaultLeakScoringModel implements LeakScoringModel {
  score(token: Honeytoken, callback: LeakCallback): number {
    const base = TYPE_WEIGHTS[token.type] ?? 0.4;
    const recencyBoost = this.computeRecencyBoost(token, callback);
    const repetitionBoost = Math.min(token.callbackHistory.length * 0.05, 0.2);
    const ttlPenalty = this.computeTtlPenalty(token);
    const rawScore = base + recencyBoost + repetitionBoost - ttlPenalty;
    return Math.max(0, Math.min(1, Number(rawScore.toFixed(3))));
  }

  private computeRecencyBoost(token: Honeytoken, callback: LeakCallback): number {
    if (!token.callbackHistory.length) {
      return 0.1;
    }
    const last = token.callbackHistory[token.callbackHistory.length - 1];
    const minutes = (callback.observedAt.getTime() - last.observedAt.getTime()) / 60000;
    if (minutes <= 5) {
      return 0.15;
    }
    if (minutes <= 60) {
      return 0.1;
    }
    return 0.05;
  }

  private computeTtlPenalty(token: Honeytoken): number {
    const millisRemaining = token.expiresAt.getTime() - Date.now();
    if (millisRemaining <= 0) {
      return 0.3;
    }
    const hoursRemaining = millisRemaining / 3600000;
    if (hoursRemaining < 1) {
      return 0.2;
    }
    if (hoursRemaining < 6) {
      return 0.1;
    }
    return 0;
  }
}
