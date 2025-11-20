/**
 * Pattern Analysis and Historical Comparison
 */

import { Transaction, Alert, AlertType, RiskLevel, AlertStatus } from './types.js';

export interface Pattern {
  id: string;
  name: string;
  description: string;
  indicators: PatternIndicator[];
  severity: RiskLevel;
  category: PatternCategory;
}

export interface PatternIndicator {
  field: string;
  condition: string;
  value: any;
  weight: number;
}

export enum PatternCategory {
  STRUCTURING = 'STRUCTURING',
  LAYERING = 'LAYERING',
  SMURFING = 'SMURFING',
  ROUND_TRIPPING = 'ROUND_TRIPPING',
  RAPID_MOVEMENT = 'RAPID_MOVEMENT',
  UNUSUAL_ACTIVITY = 'UNUSUAL_ACTIVITY',
}

export class PatternAnalyzer {
  private patterns: Pattern[] = [];

  constructor() {
    this.initializeDefaultPatterns();
  }

  /**
   * Initialize default AML patterns
   */
  private initializeDefaultPatterns(): void {
    this.patterns = [
      {
        id: 'structuring_1',
        name: 'Structuring - Just Below Reporting Threshold',
        description: 'Multiple transactions just below $10,000 CTR threshold',
        indicators: [
          { field: 'amount', condition: 'between', value: [9000, 9999], weight: 40 },
          { field: 'frequency', condition: 'high', value: 'multiple_per_day', weight: 30 },
          { field: 'timing', condition: 'regular', value: 'pattern', weight: 30 },
        ],
        severity: RiskLevel.HIGH,
        category: PatternCategory.STRUCTURING,
      },
      {
        id: 'smurfing_1',
        name: 'Smurfing - Multiple Small Deposits',
        description: 'Many small deposits from different sources to same account',
        indicators: [
          { field: 'amount', condition: 'less_than', value: 5000, weight: 30 },
          { field: 'sender_count', condition: 'greater_than', value: 5, weight: 40 },
          { field: 'timeframe', condition: 'short', value: 24, weight: 30 },
        ],
        severity: RiskLevel.HIGH,
        category: PatternCategory.SMURFING,
      },
      {
        id: 'layering_1',
        name: 'Layering - Rapid Fund Movement',
        description: 'Rapid movement of funds through multiple accounts',
        indicators: [
          { field: 'hop_count', condition: 'greater_than', value: 3, weight: 40 },
          { field: 'timeframe', condition: 'short', value: 24, weight: 35 },
          { field: 'amount_consistency', condition: 'high', value: 0.9, weight: 25 },
        ],
        severity: RiskLevel.HIGH,
        category: PatternCategory.LAYERING,
      },
      {
        id: 'round_trip_1',
        name: 'Round Tripping',
        description: 'Funds returned to original sender through intermediaries',
        indicators: [
          { field: 'circular_flow', condition: 'detected', value: true, weight: 50 },
          { field: 'intermediary_count', condition: 'greater_than', value: 2, weight: 30 },
          { field: 'amount_retention', condition: 'high', value: 0.85, weight: 20 },
        ],
        severity: RiskLevel.CRITICAL,
        category: PatternCategory.ROUND_TRIPPING,
      },
      {
        id: 'rapid_movement_1',
        name: 'Rapid In-and-Out',
        description: 'Large deposits immediately followed by withdrawals',
        indicators: [
          { field: 'deposit_withdrawal_gap', condition: 'less_than', value: 48, weight: 40 },
          { field: 'amount_match', condition: 'high', value: 0.9, weight: 35 },
          { field: 'amount', condition: 'greater_than', value: 50000, weight: 25 },
        ],
        severity: RiskLevel.HIGH,
        category: PatternCategory.RAPID_MOVEMENT,
      },
    ];
  }

  /**
   * Analyze transactions for known patterns
   */
  async analyzePatterns(transactions: Transaction[]): Promise<Alert[]> {
    const alerts: Alert[] = [];

    for (const pattern of this.patterns) {
      const matches = await this.detectPattern(transactions, pattern);
      if (matches.length > 0) {
        alerts.push(...matches);
      }
    }

    return alerts;
  }

  /**
   * Detect a specific pattern in transactions
   */
  private async detectPattern(transactions: Transaction[], pattern: Pattern): Promise<Alert[]> {
    const alerts: Alert[] = [];

    switch (pattern.category) {
      case PatternCategory.STRUCTURING:
        alerts.push(...this.detectStructuring(transactions, pattern));
        break;
      case PatternCategory.SMURFING:
        alerts.push(...this.detectSmurfing(transactions, pattern));
        break;
      case PatternCategory.LAYERING:
        alerts.push(...this.detectLayering(transactions, pattern));
        break;
      case PatternCategory.ROUND_TRIPPING:
        alerts.push(...this.detectRoundTripping(transactions, pattern));
        break;
      case PatternCategory.RAPID_MOVEMENT:
        alerts.push(...this.detectRapidMovement(transactions, pattern));
        break;
    }

    return alerts;
  }

  /**
   * Detect structuring patterns
   */
  private detectStructuring(transactions: Transaction[], pattern: Pattern): Alert[] {
    const alerts: Alert[] = [];
    const threshold = 10000;

    // Group by sender and day
    const groups = this.groupByCustomerAndDay(transactions);

    for (const [key, txns] of groups) {
      // Check if multiple transactions just below threshold
      const belowThreshold = txns.filter(t => t.amount >= 9000 && t.amount < threshold);

      if (belowThreshold.length >= 2) {
        const totalAmount = belowThreshold.reduce((sum, t) => sum + t.amount, 0);

        alerts.push({
          id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          transaction: belowThreshold[0],
          type: AlertType.PATTERN_MATCH,
          severity: pattern.severity,
          reason: `${pattern.name}: ${belowThreshold.length} transactions totaling $${totalAmount.toFixed(2)} just below reporting threshold`,
          timestamp: new Date(),
          rules: [pattern.id],
          score: 85,
          status: AlertStatus.NEW,
          notes: [`Group: ${key}`, `Transaction count: ${belowThreshold.length}`],
        });
      }
    }

    return alerts;
  }

  /**
   * Detect smurfing patterns
   */
  private detectSmurfing(transactions: Transaction[], pattern: Pattern): Alert[] {
    const alerts: Alert[] = [];

    // Group by receiver and timeframe
    const receiverGroups = new Map<string, Transaction[]>();

    for (const txn of transactions) {
      const key = txn.receiver.id;
      if (!receiverGroups.has(key)) {
        receiverGroups.set(key, []);
      }
      receiverGroups.get(key)!.push(txn);
    }

    for (const [receiverId, txns] of receiverGroups) {
      // Check for many small deposits from different senders
      const uniqueSenders = new Set(txns.map(t => t.sender.id));
      const smallDeposits = txns.filter(t => t.amount < 5000);

      if (uniqueSenders.size >= 5 && smallDeposits.length >= 5) {
        const totalAmount = smallDeposits.reduce((sum, t) => sum + t.amount, 0);

        alerts.push({
          id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          transaction: smallDeposits[0],
          type: AlertType.PATTERN_MATCH,
          severity: pattern.severity,
          reason: `${pattern.name}: ${smallDeposits.length} small deposits from ${uniqueSenders.size} different senders totaling $${totalAmount.toFixed(2)}`,
          timestamp: new Date(),
          rules: [pattern.id],
          score: 80,
          status: AlertStatus.NEW,
          notes: [`Receiver: ${receiverId}`, `Unique senders: ${uniqueSenders.size}`],
        });
      }
    }

    return alerts;
  }

  /**
   * Detect layering patterns
   */
  private detectLayering(transactions: Transaction[], pattern: Pattern): Alert[] {
    const alerts: Alert[] = [];

    // Build transaction chains
    const chains = this.buildTransactionChains(transactions);

    for (const chain of chains) {
      if (chain.length >= 4) {
        // Check if amounts are consistent (indicating intentional layering)
        const amounts = chain.map(t => t.amount);
        const consistency = this.calculateConsistency(amounts);

        if (consistency > 0.85) {
          alerts.push({
            id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            transaction: chain[0],
            type: AlertType.PATTERN_MATCH,
            severity: pattern.severity,
            reason: `${pattern.name}: Funds moved through ${chain.length} hops with ${(consistency * 100).toFixed(0)}% amount consistency`,
            timestamp: new Date(),
            rules: [pattern.id],
            score: 85,
            status: AlertStatus.NEW,
            notes: [`Chain length: ${chain.length}`, `Consistency: ${(consistency * 100).toFixed(0)}%`],
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Detect round-tripping patterns
   */
  private detectRoundTripping(transactions: Transaction[], pattern: Pattern): Alert[] {
    const alerts: Alert[] = [];

    // Build transaction graph and detect cycles
    const cycles = this.detectCycles(transactions);

    for (const cycle of cycles) {
      if (cycle.length >= 3) {
        const firstAmount = cycle[0].amount;
        const lastAmount = cycle[cycle.length - 1].amount;
        const retention = lastAmount / firstAmount;

        if (retention > 0.85) {
          alerts.push({
            id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            transaction: cycle[0],
            type: AlertType.PATTERN_MATCH,
            severity: pattern.severity,
            reason: `${pattern.name}: Funds returned to origin through ${cycle.length} intermediaries with ${(retention * 100).toFixed(0)}% retention`,
            timestamp: new Date(),
            rules: [pattern.id],
            score: 95,
            status: AlertStatus.NEW,
            notes: [`Cycle length: ${cycle.length}`, `Amount retention: ${(retention * 100).toFixed(0)}%`],
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Detect rapid movement patterns
   */
  private detectRapidMovement(transactions: Transaction[], pattern: Pattern): Alert[] {
    const alerts: Alert[] = [];

    // Group by account and look for rapid in-out
    const accountGroups = new Map<string, Transaction[]>();

    for (const txn of transactions) {
      // Group by receiver (deposits)
      const key = txn.receiver.id;
      if (!accountGroups.has(key)) {
        accountGroups.set(key, []);
      }
      accountGroups.get(key)!.push(txn);
    }

    for (const [accountId, txns] of accountGroups) {
      // Sort by time
      const sorted = [...txns].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      for (let i = 0; i < sorted.length - 1; i++) {
        const deposit = sorted[i];
        const withdrawal = sorted[i + 1];

        // Check if it's a deposit followed by withdrawal
        if (deposit.receiver.id === accountId && withdrawal.sender.id === accountId) {
          const timeDiff = (withdrawal.timestamp.getTime() - deposit.timestamp.getTime()) / (1000 * 60 * 60);
          const amountMatch = withdrawal.amount / deposit.amount;

          if (timeDiff < 48 && amountMatch > 0.9 && deposit.amount > 50000) {
            alerts.push({
              id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              transaction: deposit,
              type: AlertType.PATTERN_MATCH,
              severity: pattern.severity,
              reason: `${pattern.name}: $${deposit.amount.toFixed(2)} deposited and ${(amountMatch * 100).toFixed(0)}% withdrawn within ${timeDiff.toFixed(1)} hours`,
              timestamp: new Date(),
              rules: [pattern.id],
              score: 75,
              status: AlertStatus.NEW,
              notes: [`Account: ${accountId}`, `Time gap: ${timeDiff.toFixed(1)}h`],
            });
          }
        }
      }
    }

    return alerts;
  }

  /**
   * Group transactions by customer and day
   */
  private groupByCustomerAndDay(transactions: Transaction[]): Map<string, Transaction[]> {
    const groups = new Map<string, Transaction[]>();

    for (const txn of transactions) {
      const date = txn.timestamp.toISOString().split('T')[0];
      const key = `${txn.sender.id}_${date}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(txn);
    }

    return groups;
  }

  /**
   * Build transaction chains
   */
  private buildTransactionChains(transactions: Transaction[]): Transaction[][] {
    const chains: Transaction[][] = [];
    const sorted = [...transactions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (const txn of sorted) {
      // Find chains where this txn continues the chain
      let added = false;
      for (const chain of chains) {
        const last = chain[chain.length - 1];
        if (last.receiver.id === txn.sender.id) {
          chain.push(txn);
          added = true;
          break;
        }
      }

      if (!added) {
        chains.push([txn]);
      }
    }

    return chains.filter(chain => chain.length > 1);
  }

  /**
   * Detect cycles in transaction graph
   */
  private detectCycles(transactions: Transaction[]): Transaction[][] {
    const cycles: Transaction[][] = [];
    const sorted = [...transactions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Simple cycle detection - find transactions where sender appears earlier as receiver
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const path: Transaction[] = [current];

      let nextSenderId = current.receiver.id;
      for (let j = i + 1; j < sorted.length; j++) {
        const next = sorted[j];
        if (next.sender.id === nextSenderId) {
          path.push(next);
          nextSenderId = next.receiver.id;

          // Check if we've completed a cycle
          if (nextSenderId === current.sender.id && path.length >= 3) {
            cycles.push([...path]);
            break;
          }
        }
      }
    }

    return cycles;
  }

  /**
   * Calculate consistency of amounts in a sequence
   */
  private calculateConsistency(amounts: number[]): number {
    if (amounts.length < 2) return 1;

    const first = amounts[0];
    const ratios = amounts.slice(1).map(amt => Math.min(amt, first) / Math.max(amt, first));
    return ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  }

  /**
   * Add a custom pattern
   */
  addPattern(pattern: Pattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Get all patterns
   */
  getPatterns(): Pattern[] {
    return [...this.patterns];
  }
}
