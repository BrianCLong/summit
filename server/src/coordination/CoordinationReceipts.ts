
import { CoordinationDecision } from './types';
import logger from '../utils/logger.js';

export class CoordinationReceipts {
  private log: CoordinationDecision[] = [];

  constructor() {}

  async logDecision(decision: CoordinationDecision): Promise<void> {
    this.log.push(decision);

    // In a real system, this would write to a persistent ledger or audit log
    logger.info(`[Coordination Receipt] Decision: ${decision.outcome} for intent ${decision.intentId}. Reason: ${decision.reason}`);

    // Prune in-memory log if needed
    if (this.log.length > 1000) {
      this.log.shift();
    }
  }

  getRecentReceipts(limit: number = 50): CoordinationDecision[] {
    return this.log.slice(-limit);
  }

  getReceiptsForIntent(intentId: string): CoordinationDecision[] {
    return this.log.filter(d => d.intentId === intentId);
  }
}
