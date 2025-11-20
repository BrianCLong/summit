/**
 * Layering Detection - Complex transaction chains to obscure fund origin
 */

import { Transaction } from '@intelgraph/transaction-monitoring';
import { AMLAlert, AMLTypology } from './types.js';

export class LayeringDetector {
  /**
   * Detect layering schemes in transaction data
   */
  async detectLayering(transactions: Transaction[]): Promise<AMLAlert[]> {
    const alerts: AMLAlert[] = [];

    // Build transaction chains
    const chains = this.buildTransactionChains(transactions);

    for (const chain of chains) {
      if (chain.length >= 3) {
        const score = this.scoreChain(chain);

        if (score > 70) {
          alerts.push({
            id: `aml_layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: AMLTypology.LAYERING,
            severity: score > 90 ? 'CRITICAL' : score > 75 ? 'HIGH' : 'MEDIUM',
            transactions: chain,
            description: `Layering detected: ${chain.length} sequential transfers with ${this.getChainCharacteristics(chain)}`,
            indicators: this.identifyIndicators(chain),
            riskScore: score,
            timestamp: new Date(),
            entities: [...new Set(chain.flatMap(t => [t.sender.id, t.receiver.id]))],
          });
        }
      }
    }

    return alerts;
  }

  private buildTransactionChains(transactions: Transaction[]): Transaction[][] {
    const chains: Transaction[][] = [];
    const sorted = [...transactions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const used = new Set<string>();

    for (const txn of sorted) {
      if (used.has(txn.id)) continue;

      const chain: Transaction[] = [txn];
      used.add(txn.id);

      let currentReceiver = txn.receiver.id;

      for (const next of sorted) {
        if (used.has(next.id)) continue;
        if (next.sender.id === currentReceiver && next.timestamp > chain[chain.length - 1].timestamp) {
          chain.push(next);
          used.add(next.id);
          currentReceiver = next.receiver.id;
        }
      }

      if (chain.length > 1) {
        chains.push(chain);
      }
    }

    return chains;
  }

  private scoreChain(chain: Transaction[]): number {
    let score = 0;

    // Length factor (more hops = higher risk)
    score += Math.min(chain.length * 10, 40);

    // Amount consistency (similar amounts suggest intentional layering)
    const amounts = chain.map(t => t.amount);
    const consistency = this.calculateConsistency(amounts);
    score += consistency * 30;

    // Speed factor (rapid transfers)
    const timespan = chain[chain.length - 1].timestamp.getTime() - chain[0].timestamp.getTime();
    const hoursSpan = timespan / (1000 * 60 * 60);
    if (hoursSpan < 24) score += 20;
    else if (hoursSpan < 48) score += 10;

    // Cross-border complexity
    const countries = new Set(chain.flatMap(t => [t.sender.country, t.receiver.country]));
    if (countries.size >= 3) score += 10;

    return Math.min(score, 100);
  }

  private calculateConsistency(amounts: number[]): number {
    if (amounts.length < 2) return 0;
    const avg = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avg, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / avg; // Coefficient of variation
    return Math.max(0, 1 - cv);
  }

  private getChainCharacteristics(chain: Transaction[]): string {
    const countries = new Set(chain.flatMap(t => [t.sender.country, t.receiver.country])).size;
    const timespan = (chain[chain.length - 1].timestamp.getTime() - chain[0].timestamp.getTime()) / (1000 * 60 * 60);
    return `${countries} countries in ${timespan.toFixed(1)} hours`;
  }

  private identifyIndicators(chain: Transaction[]): string[] {
    const indicators: string[] = [];

    indicators.push(`${chain.length} sequential transactions`);

    const amounts = chain.map(t => t.amount);
    const consistency = this.calculateConsistency(amounts);
    if (consistency > 0.8) indicators.push('High amount consistency');

    const countries = new Set(chain.flatMap(t => [t.sender.country, t.receiver.country]));
    if (countries.size >= 3) indicators.push(`Multiple jurisdictions (${countries.size})`);

    const timespan = chain[chain.length - 1].timestamp.getTime() - chain[0].timestamp.getTime();
    if (timespan < 24 * 60 * 60 * 1000) indicators.push('Rapid movement');

    return indicators;
  }
}
