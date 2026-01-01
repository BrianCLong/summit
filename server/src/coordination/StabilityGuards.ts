
import { ProposedAction } from './types';
import logger from '../utils/logger.js';
import stringify from 'fast-json-stable-stringify';

interface ActionHistory {
  actionHash: string;
  timestamp: number;
}

export class StabilityGuards {
  private history: Map<string, ActionHistory[]> = new Map();
  private readonly WINDOW_MS = 60000; // 1 minute
  private readonly FLIP_FLOP_THRESHOLD = 3;

  constructor() {}

  checkStability(action: ProposedAction): boolean {
    const key = action.intentId;
    const now = Date.now();

    // Use stable stringify for consistent hashing
    const actionHash = `${action.actionType}:${stringify(action.parameters)}`;

    if (!this.history.has(key)) {
      this.history.set(key, []);
    }

    const intentHistory = this.history.get(key)!;

    // Clean old history
    const recentHistory = intentHistory.filter(h => now - h.timestamp < this.WINDOW_MS);
    this.history.set(key, recentHistory);

    // Count occurrences of this action
    const count = recentHistory.filter(h => h.actionHash === actionHash).length;

    if (count >= this.FLIP_FLOP_THRESHOLD) {
      logger.warn(`Stability Guard: Detected thrashing for intent ${key}. Action ${action.actionType} repeated ${count} times in window.`);
      return false; // Reject action
    }

    return true;
  }

  recordAction(action: ProposedAction): void {
      const key = action.intentId;
      const actionHash = `${action.actionType}:${stringify(action.parameters)}`;

      if (!this.history.has(key)) {
          this.history.set(key, []);
      }
      this.history.get(key)!.push({ actionHash, timestamp: Date.now() });
  }
}
