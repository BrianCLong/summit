import { logger } from '../utils/logger';

export class Budget {
  public usedUSD: number = 0;
  private transactions: BudgetTransaction[] = [];

  constructor(
    public maxUSD: number,
    public softLimitPct: number = 0.8,
  ) {}

  charge(usd: number, description?: string): void {
    this.usedUSD += usd;

    const transaction: BudgetTransaction = {
      amount: usd,
      timestamp: new Date(),
      description: description || 'LLM API call',
      remainingBudget: this.maxUSD - this.usedUSD,
    };

    this.transactions.push(transaction);

    logger.debug('Budget charged', {
      amount: usd,
      used: this.usedUSD,
      remaining: this.maxUSD - this.usedUSD,
      utilization: (this.usedUSD / this.maxUSD) * 100,
    });

    // Check limits
    if (this.usedUSD > this.maxUSD) {
      throw new BudgetExceededError(
        `Budget cap exceeded: $${this.usedUSD.toFixed(3)} > $${this.maxUSD.toFixed(3)}`,
        this.usedUSD,
        this.maxUSD,
      );
    }

    // Soft limit warning
    if (this.usedUSD > this.maxUSD * this.softLimitPct) {
      logger.warn('Budget soft limit exceeded', {
        used: this.usedUSD,
        limit: this.maxUSD * this.softLimitPct,
        remaining: this.maxUSD - this.usedUSD,
      });
    }
  }

  getRemainingBudget(): number {
    return Math.max(0, this.maxUSD - this.usedUSD);
  }

  getUtilization(): number {
    return (this.usedUSD / this.maxUSD) * 100;
  }

  getTransactions(): BudgetTransaction[] {
    return [...this.transactions];
  }

  canAfford(amount: number): boolean {
    return this.usedUSD + amount <= this.maxUSD;
  }

  suggestDownshift(): DownshiftSuggestion | null {
    if (this.getUtilization() > 70) {
      return {
        reason: `Budget ${this.getUtilization().toFixed(1)}% utilized`,
        suggestions: [
          'Switch to smaller model (e.g. gpt-3.5-turbo instead of gpt-4)',
          'Use cached responses where possible',
          'Reduce prompt size',
          'Batch similar requests',
        ],
      };
    }
    return null;
  }
}

export class BudgetExceededError extends Error {
  constructor(
    message: string,
    public used: number,
    public limit: number,
  ) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

interface BudgetTransaction {
  amount: number;
  timestamp: Date;
  description: string;
  remainingBudget: number;
}

interface DownshiftSuggestion {
  reason: string;
  suggestions: string[];
}

// Budget guard wrapper for LLM calls
export async function callModel(
  budget: Budget,
  call: () => Promise<{ output: string; costUSD: number }>,
  description?: string,
): Promise<string> {
  const result = await call();
  budget.charge(result.costUSD, description);
  return result.output;
}

// Per-PR budget tracker
export class PRBudgetTracker {
  private prBudgets: Map<number, Budget> = new Map();

  getOrCreateBudget(prNumber: number, maxUSD: number = 10): Budget {
    if (!this.prBudgets.has(prNumber)) {
      this.prBudgets.set(prNumber, new Budget(maxUSD));
      logger.info('Created PR budget', { pr: prNumber, budget: maxUSD });
    }
    return this.prBudgets.get(prNumber)!;
  }

  getBudgetSummary(prNumber: number): BudgetSummary | null {
    const budget = this.prBudgets.get(prNumber);
    if (!budget) return null;

    return {
      prNumber,
      maxUSD: budget.maxUSD,
      usedUSD: budget.usedUSD,
      remainingUSD: budget.getRemainingBudget(),
      utilization: budget.getUtilization(),
      transactions: budget.getTransactions(),
      downshiftSuggestion: budget.suggestDownshift(),
    };
  }

  getAllBudgetSummaries(): BudgetSummary[] {
    return Array.from(this.prBudgets.keys())
      .map((pr) => this.getBudgetSummary(pr))
      .filter(Boolean) as BudgetSummary[];
  }

  clearPRBudget(prNumber: number): void {
    if (this.prBudgets.delete(prNumber)) {
      logger.info('Cleared PR budget', { pr: prNumber });
    }
  }
}

interface BudgetSummary {
  prNumber: number;
  maxUSD: number;
  usedUSD: number;
  remainingUSD: number;
  utilization: number;
  transactions: BudgetTransaction[];
  downshiftSuggestion: DownshiftSuggestion | null;
}

// Singleton instance for tracking PR budgets
export const prBudgetTracker = new PRBudgetTracker();
