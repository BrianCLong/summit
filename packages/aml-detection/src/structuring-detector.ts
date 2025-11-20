/**
 * Structuring Detection - Transactions designed to avoid reporting thresholds
 */

import { Transaction } from '@intelgraph/transaction-monitoring';
import { AMLAlert, AMLTypology } from './types.js';

export class StructuringDetector {
  private readonly CTR_THRESHOLD = 10000;
  private readonly SUSPICIOUS_RANGE_MIN = 9000;

  async detectStructuring(transactions: Transaction[]): Promise<AMLAlert[]> {
    const alerts: AMLAlert[] = [];
    const groups = this.groupByCustomerAndPeriod(transactions);

    for (const [key, txns] of groups) {
      const structured = txns.filter(t =>
        t.amount >= this.SUSPICIOUS_RANGE_MIN && t.amount < this.CTR_THRESHOLD
      );

      if (structured.length >= 2) {
        const totalAmount = structured.reduce((sum, t) => sum + t.amount, 0);
        const score = this.calculateStructuringScore(structured, totalAmount);

        if (score > 60) {
          alerts.push({
            id: `aml_struct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: AMLTypology.STRUCTURING,
            severity: score > 85 ? 'HIGH' : 'MEDIUM',
            transactions: structured,
            description: `Structuring: ${structured.length} transactions totaling $${totalAmount.toFixed(2)} just below CTR threshold`,
            indicators: [
              `${structured.length} transactions in reporting range`,
              `Total amount: $${totalAmount.toFixed(2)}`,
              'Pattern suggests threshold avoidance',
            ],
            riskScore: score,
            timestamp: new Date(),
            entities: [structured[0].sender.id],
          });
        }
      }
    }

    return alerts;
  }

  private groupByCustomerAndPeriod(transactions: Transaction[]): Map<string, Transaction[]> {
    const groups = new Map<string, Transaction[]>();
    for (const txn of transactions) {
      const date = txn.timestamp.toISOString().split('T')[0];
      const key = `${txn.sender.id}_${date}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(txn);
    }
    return groups;
  }

  private calculateStructuringScore(txns: Transaction[], total: number): number {
    let score = 40; // Base score for multiple transactions near threshold
    if (txns.length >= 3) score += 15;
    if (txns.length >= 5) score += 15;
    if (total > this.CTR_THRESHOLD) score += 20;
    if (this.hasRegularPattern(txns)) score += 10;
    return Math.min(score, 100);
  }

  private hasRegularPattern(txns: Transaction[]): boolean {
    if (txns.length < 3) return false;
    const amounts = txns.map(t => t.amount);
    const stdDev = Math.sqrt(amounts.reduce((sum, amt) => {
      const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
      return sum + Math.pow(amt - mean, 2);
    }, 0) / amounts.length);
    return stdDev < 500; // Low deviation suggests pattern
  }
}
