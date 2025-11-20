/**
 * Smurfing Detection - Multiple people making small deposits to avoid detection
 */

import { Transaction } from '@intelgraph/transaction-monitoring';
import { AMLAlert, AMLTypology } from './types.js';

export class SmurfingDetector {
  async detectSmurfing(transactions: Transaction[]): Promise<AMLAlert[]> {
    const alerts: AMLAlert[] = [];
    const receiverGroups = this.groupByReceiver(transactions);

    for (const [receiverId, txns] of receiverGroups) {
      const uniqueSenders = new Set(txns.map(t => t.sender.id));
      const smallDeposits = txns.filter(t => t.amount < 5000);

      if (uniqueSenders.size >= 5 && smallDeposits.length >= 5) {
        const score = this.calculateSmurfingScore(smallDeposits, uniqueSenders.size);

        if (score > 65) {
          alerts.push({
            id: `aml_smurf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: AMLTypology.SMURFING,
            severity: score > 85 ? 'HIGH' : 'MEDIUM',
            transactions: smallDeposits,
            description: `Smurfing: ${smallDeposits.length} deposits from ${uniqueSenders.size} senders`,
            indicators: [
              `${uniqueSenders.size} unique senders`,
              `${smallDeposits.length} small deposits`,
              `Total: $${smallDeposits.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}`,
            ],
            riskScore: score,
            timestamp: new Date(),
            entities: [receiverId, ...Array.from(uniqueSenders)],
          });
        }
      }
    }

    return alerts;
  }

  private groupByReceiver(transactions: Transaction[]): Map<string, Transaction[]> {
    const groups = new Map<string, Transaction[]>();
    for (const txn of transactions) {
      if (!groups.has(txn.receiver.id)) groups.set(txn.receiver.id, []);
      groups.get(txn.receiver.id)!.push(txn);
    }
    return groups;
  }

  private calculateSmurfingScore(txns: Transaction[], senderCount: number): number {
    let score = 50;
    if (senderCount >= 10) score += 20;
    if (txns.length >= 10) score += 15;
    if (this.areAmountsSimilar(txns)) score += 15;
    return Math.min(score, 100);
  }

  private areAmountsSimilar(txns: Transaction[]): boolean {
    const amounts = txns.map(t => t.amount);
    const avg = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const within20Percent = amounts.filter(amt => Math.abs(amt - avg) < avg * 0.2).length;
    return within20Percent / amounts.length > 0.7;
  }
}
