import { SuppressionRule } from '../../types/alerts.js';

export class SuppressionService {
  private rules: SuppressionRule[] = [];

  constructor() {
    // Initialize with empty list or load from DB in real implementation
  }

  public addRule(rule: SuppressionRule): void {
    this.rules.push(rule);
  }

  public removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  public isSuppressed(ruleId: string, entityKey: string, timestamp: number = Date.now()): boolean {
    return this.rules.some(s => {
      const inWindow = timestamp >= s.startTime && timestamp <= s.endTime;
      if (!inWindow) {return false;}

      const ruleMatch = !s.targetRuleId || s.targetRuleId === ruleId;
      const keyMatch = !s.targetEntityKey || s.targetEntityKey === entityKey;

      return ruleMatch && keyMatch;
    });
  }

  public getRules(): SuppressionRule[] {
    return [...this.rules];
  }
}

export const suppressionService = new SuppressionService();
