/**
 * Velocity Checks for Transaction Monitoring
 */

import { Transaction, VelocityCheck, Alert, AlertType, RiskLevel, AlertStatus } from './types.js';

export class VelocityChecker {
  private checks: VelocityCheck[] = [];

  constructor(checks: VelocityCheck[] = []) {
    this.checks = checks;
  }

  /**
   * Check transaction velocity against configured thresholds
   */
  async checkVelocity(transaction: Transaction, historicalData: Transaction[]): Promise<Alert[]> {
    const alerts: Alert[] = [];

    for (const check of this.checks) {
      const violations = await this.evaluateVelocityCheck(transaction, historicalData, check);
      if (violations.length > 0) {
        alerts.push(...violations);
      }
    }

    return alerts;
  }

  /**
   * Evaluate a single velocity check
   */
  private async evaluateVelocityCheck(
    transaction: Transaction,
    historical: Transaction[],
    check: VelocityCheck
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const windowStart = new Date(transaction.timestamp.getTime() - check.timeWindow * 1000);

    // Filter transactions within time window
    const windowTransactions = historical.filter(t => t.timestamp >= windowStart);

    // Group transactions by specified fields
    const groups = this.groupTransactions(windowTransactions, check.groupBy);

    for (const [groupKey, groupTxns] of groups) {
      // Check count threshold
      if (check.maxCount && groupTxns.length >= check.maxCount) {
        alerts.push(this.createVelocityAlert(
          transaction,
          `Velocity exceeded: ${groupTxns.length} transactions in ${check.timeWindow}s (limit: ${check.maxCount})`,
          groupKey,
          RiskLevel.HIGH
        ));
      }

      // Check amount threshold
      if (check.maxAmount) {
        const totalAmount = groupTxns.reduce((sum, t) => sum + t.amount, 0) + transaction.amount;
        if (totalAmount >= check.maxAmount) {
          alerts.push(this.createVelocityAlert(
            transaction,
            `Amount velocity exceeded: ${totalAmount} in ${check.timeWindow}s (limit: ${check.maxAmount})`,
            groupKey,
            RiskLevel.HIGH
          ));
        }
      }
    }

    return alerts;
  }

  /**
   * Group transactions by specified fields
   */
  private groupTransactions(transactions: Transaction[], groupBy: string[]): Map<string, Transaction[]> {
    const groups = new Map<string, Transaction[]>();

    for (const transaction of transactions) {
      const key = this.buildGroupKey(transaction, groupBy);
      const group = groups.get(key) || [];
      group.push(transaction);
      groups.set(key, group);
    }

    return groups;
  }

  /**
   * Build group key from transaction fields
   */
  private buildGroupKey(transaction: Transaction, fields: string[]): string {
    return fields.map(field => {
      const parts = field.split('.');
      let value: any = transaction;
      for (const part of parts) {
        value = value?.[part];
      }
      return String(value || '');
    }).join('|');
  }

  /**
   * Create velocity alert
   */
  private createVelocityAlert(
    transaction: Transaction,
    reason: string,
    groupKey: string,
    severity: RiskLevel
  ): Alert {
    return {
      id: `velocity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transaction,
      type: AlertType.VELOCITY_ANOMALY,
      severity,
      reason,
      timestamp: new Date(),
      rules: ['velocity_check'],
      score: severity === RiskLevel.HIGH ? 80 : 60,
      status: AlertStatus.NEW,
      notes: [`Group: ${groupKey}`],
    };
  }

  /**
   * Add a velocity check
   */
  addCheck(check: VelocityCheck): void {
    this.checks.push(check);
  }

  /**
   * Get all configured checks
   */
  getChecks(): VelocityCheck[] {
    return [...this.checks];
  }
}

/**
 * Predefined velocity check configurations
 */
export const STANDARD_VELOCITY_CHECKS: VelocityCheck[] = [
  // Daily transaction count per sender
  {
    timeWindow: 86400, // 24 hours
    maxCount: 50,
    groupBy: ['sender.id'],
  },
  // Hourly transaction count per sender
  {
    timeWindow: 3600, // 1 hour
    maxCount: 10,
    groupBy: ['sender.id'],
  },
  // Daily amount per sender
  {
    timeWindow: 86400,
    maxAmount: 100000,
    groupBy: ['sender.id'],
  },
  // Daily transactions to same receiver
  {
    timeWindow: 86400,
    maxCount: 20,
    groupBy: ['sender.id', 'receiver.id'],
  },
  // Cash transaction velocity
  {
    timeWindow: 86400,
    maxCount: 10,
    maxAmount: 50000,
    groupBy: ['sender.id', 'type'],
  },
];
