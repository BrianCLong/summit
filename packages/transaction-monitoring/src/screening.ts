/**
 * Real-time Transaction Screening
 */

import { Transaction, Alert, AlertType, RiskLevel, AlertStatus, MonitoringRule } from './types.js';

export class TransactionScreener {
  private rules: MonitoringRule[] = [];

  constructor(rules: MonitoringRule[] = []) {
    this.rules = rules.filter(r => r.enabled);
  }

  /**
   * Screen a transaction in real-time
   */
  async screenTransaction(transaction: Transaction): Promise<Alert[]> {
    const alerts: Alert[] = [];

    for (const rule of this.rules) {
      const match = await this.evaluateRule(transaction, rule);
      if (match) {
        alerts.push(this.createAlert(transaction, rule));
      }
    }

    return alerts;
  }

  /**
   * Batch screen multiple transactions
   */
  async screenBatch(transactions: Transaction[]): Promise<Map<string, Alert[]>> {
    const results = new Map<string, Alert[]>();

    for (const transaction of transactions) {
      const alerts = await this.screenTransaction(transaction);
      if (alerts.length > 0) {
        results.set(transaction.id, alerts);
      }
    }

    return results;
  }

  /**
   * Evaluate a single rule against a transaction
   */
  private async evaluateRule(transaction: Transaction, rule: MonitoringRule): Promise<boolean> {
    for (const condition of rule.conditions) {
      const value = this.extractValue(transaction, condition.field);
      if (!this.evaluateCondition(value, condition)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Extract value from transaction using field path
   */
  private extractValue(transaction: Transaction, field: string): any {
    const parts = field.split('.');
    let value: any = transaction;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(value: any, condition: any): boolean {
    switch (condition.operator) {
      case 'EQUALS':
        return value === condition.value;
      case 'NOT_EQUALS':
        return value !== condition.value;
      case 'GREATER_THAN':
        return value > condition.value;
      case 'LESS_THAN':
        return value < condition.value;
      case 'CONTAINS':
        return String(value).includes(String(condition.value));
      case 'IN':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'NOT_IN':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      default:
        return false;
    }
  }

  /**
   * Create alert from matched rule
   */
  private createAlert(transaction: Transaction, rule: MonitoringRule): Alert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transaction,
      type: this.mapRuleTypeToAlertType(rule.type),
      severity: this.calculateSeverity(transaction, rule),
      reason: rule.description,
      timestamp: new Date(),
      rules: [rule.id],
      score: this.calculateRiskScore(transaction, rule),
      status: AlertStatus.NEW,
    };
  }

  /**
   * Map rule type to alert type
   */
  private mapRuleTypeToAlertType(ruleType: string): AlertType {
    switch (ruleType) {
      case 'THRESHOLD':
        return AlertType.THRESHOLD_BREACH;
      case 'VELOCITY':
        return AlertType.VELOCITY_ANOMALY;
      case 'PATTERN':
        return AlertType.PATTERN_MATCH;
      case 'GEOGRAPHIC':
        return AlertType.GEOGRAPHIC_RISK;
      case 'BEHAVIORAL':
        return AlertType.BEHAVIORAL_ANOMALY;
      default:
        return AlertType.PATTERN_MATCH;
    }
  }

  /**
   * Calculate alert severity
   */
  private calculateSeverity(transaction: Transaction, rule: MonitoringRule): RiskLevel {
    if (rule.priority >= 90) return RiskLevel.CRITICAL;
    if (rule.priority >= 70) return RiskLevel.HIGH;
    if (rule.priority >= 40) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Calculate risk score for transaction
   */
  private calculateRiskScore(transaction: Transaction, rule: MonitoringRule): number {
    let score = rule.priority;

    // Add points for high-value transactions
    if (transaction.amount > 10000) score += 10;
    if (transaction.amount > 50000) score += 20;
    if (transaction.amount > 100000) score += 30;

    // Add points for high-risk parties
    if (transaction.sender.riskLevel === RiskLevel.HIGH) score += 15;
    if (transaction.receiver.riskLevel === RiskLevel.HIGH) score += 15;

    return Math.min(score, 100);
  }

  /**
   * Add a monitoring rule
   */
  addRule(rule: MonitoringRule): void {
    if (rule.enabled) {
      this.rules.push(rule);
    }
  }

  /**
   * Remove a monitoring rule
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  /**
   * Update a monitoring rule
   */
  updateRule(ruleId: string, updates: Partial<MonitoringRule>): void {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
    }
  }
}
