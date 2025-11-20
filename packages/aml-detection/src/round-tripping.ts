/**
 * Round-Tripping Detection
 */

import { Transaction } from '@intelgraph/transaction-monitoring';
import { AMLAlert, AMLTypology } from './types.js';

export class RoundTrippingDetector {
  async detectRoundTripping(transactions: Transaction[]): Promise<AMLAlert[]> {
    const alerts: AMLAlert[] = [];
    const cycles = this.findCycles(transactions);

    for (const cycle of cycles) {
      if (cycle.length >= 3) {
        const retention = cycle[cycle.length - 1].amount / cycle[0].amount;
        if (retention > 0.85) {
          alerts.push({
            id: `aml_round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: AMLTypology.ROUND_TRIPPING,
            severity: 'HIGH',
            transactions: cycle,
            description: `Round-tripping through ${cycle.length} intermediaries with ${(retention * 100).toFixed(0)}% retention`,
            indicators: [`${cycle.length} hops`, 'Returns to origin'],
            riskScore: 90,
            timestamp: new Date(),
            entities: cycle.map(t => t.sender.id),
          });
        }
      }
    }

    return alerts;
  }

  private findCycles(transactions: Transaction[]): Transaction[][] {
    const cycles: Transaction[][] = [];
    const sorted = [...transactions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let i = 0; i < sorted.length; i++) {
      const path = [sorted[i]];
      const origin = sorted[i].sender.id;
      let current = sorted[i].receiver.id;

      for (let j = i + 1; j < sorted.length && path.length < 10; j++) {
        if (sorted[j].sender.id === current) {
          path.push(sorted[j]);
          current = sorted[j].receiver.id;
          if (current === origin) {
            cycles.push([...path]);
            break;
          }
        }
      }
    }

    return cycles;
  }
}
