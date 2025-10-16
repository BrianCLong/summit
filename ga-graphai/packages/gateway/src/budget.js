import { createBudgetSnapshot } from 'common-types';

export class BudgetGuardian {
  constructor(options) {
    this.baselineMonthlyUSD = Math.max(
      0,
      Number(options?.baselineMonthlyUSD ?? 0),
    );
    this.alertThreshold = options?.alertThreshold ?? 0.8;
    this.savingsUSD = 0;
    this.reset();
  }

  reset() {
    this.consumedUSD = 0;
    this.history = [];
  }

  /**
   * Register cost incurred by a task.
   *
   * @param {number} costUSD
   * @param {Date} [timestamp]
   * @returns {object}
   */
  registerCost(costUSD, timestamp = new Date()) {
    const normalizedCost = Math.max(0, Number(costUSD ?? 0));
    this.consumedUSD += normalizedCost;
    this.history.push({ timestamp, costUSD: normalizedCost });
    return this.status(timestamp);
  }

  /**
   * Apply reclaimed savings to keep the ledger zero-spend.
   *
   * @param {number} savingsUSD
   */
  reclaimSavings(savingsUSD) {
    const normalized = Math.max(0, Number(savingsUSD ?? 0));
    this.savingsUSD += normalized;
    this.consumedUSD = Math.max(0, this.consumedUSD - normalized);
  }

  /**
   * Current budget posture and recommended mitigations.
   *
   * @param {Date} [timestamp]
   * @returns {{ snapshot: object, alert: boolean, actions: string[], headroomPct: number, savingsUSD: number }}
   */
  status(timestamp = new Date()) {
    const snapshot = createBudgetSnapshot({
      baselineMonthlyUSD: this.baselineMonthlyUSD,
      consumedUSD: this.consumedUSD,
      timestamp,
    });
    const burnRatio =
      this.baselineMonthlyUSD > 0
        ? this.consumedUSD / this.baselineMonthlyUSD
        : 0;
    const alert = burnRatio >= this.alertThreshold;
    const actions = [];
    if (alert) {
      actions.push(
        'increaseBatching',
        'shiftToOpenWeights',
        'throttleExperiments',
      );
    } else if (snapshot.headroomPct < 0.25) {
      actions.push('enableQuantization', 'reuseKVCache');
    }
    return {
      snapshot,
      alert,
      actions,
      headroomPct: snapshot.headroomPct,
      savingsUSD: this.savingsUSD,
    };
  }
}
