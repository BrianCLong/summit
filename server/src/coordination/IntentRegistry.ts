
import { Intent, OptimizationDomain } from './types';
import logger from '../utils/logger.js';

export class IntentRegistry {
  private activeIntents: Map<string, Intent> = new Map();

  constructor() {}

  registerIntent(intent: Intent): void {
    if (this.activeIntents.has(intent.id)) {
      logger.debug(`Updating existing intent: ${intent.id}`);
    } else {
      logger.info(`Registering new optimization intent: ${intent.id} [${intent.domain}]`);
    }
    this.activeIntents.set(intent.id, intent);
  }

  deregisterIntent(intentId: string): void {
    if (this.activeIntents.delete(intentId)) {
      logger.info(`Deregistered optimization intent: ${intentId}`);
    }
  }

  getActiveIntents(domain?: OptimizationDomain): Intent[] {
    const intents = Array.from(this.activeIntents.values());
    if (domain) {
      return intents.filter(i => i.domain === domain);
    }
    return intents;
  }

  getIntent(intentId: string): Intent | undefined {
    return this.activeIntents.get(intentId);
  }

  clearAll(): void {
    this.activeIntents.clear();
  }
}
