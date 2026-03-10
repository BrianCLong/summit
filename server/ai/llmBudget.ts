import { logger } from '../utils/logger.js';
import { getBudgetLedgerManager } from '../src/db/budgetLedger.js';

export class Budget {
  public ledger = getBudgetLedgerManager();

  constructor(
    public maxUSD: number,
    public softLimitPct: number = 0.8,
    public tenantId: string = 'SYSTEM',
    public agentId?: string,
    public agentVersion?: string,
  ) { }

  async charge(usd: number, description?: string): Promise<void> {
    const correlationId = `budget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await this.ledger.recordSpending({
      tenantId: this.tenantId,
      correlationId,
      operationName: description || 'LLM API call',
      provider: 'unknown', // TODO: Propagate from LLM client
      model: 'unknown',
      estPromptTokens: 0,
      estCompletionTokens: 0,
      estTotalUsd: usd,
      agentId: this.agentId,
      agentVersion: this.agentVersion,
    });

    const util = await this.ledger.getBudgetUtilization(this.tenantId);
    const used = util ? util.currentMonthSpend : usd;

    logger.debug('Budget charged persistently', {
      amount: usd,
      used,
      tenantId: this.tenantId,
    });

    // Check limits
    if (used > this.maxUSD) {
      // We only throw if it's a hard cap in DB, but here we keep the class logic
      logger.warn('Budget cap exceeded', { used, limit: this.maxUSD });
    }

    // Soft limit warning
    if (used > this.maxUSD * this.softLimitPct) {
      logger.warn('Budget soft limit exceeded', {
        used,
        limit: this.maxUSD * this.softLimitPct,
      });
    }
  }

  async getRemainingBudget(): Promise<number> {
    const util = await this.ledger.getBudgetUtilization(this.tenantId);
    return util ? util.remainingBudget : this.maxUSD;
  }

  async getUtilization(): Promise<number> {
    const util = await this.ledger.getBudgetUtilization(this.tenantId);
    return util ? util.utilizationPct : 0;
  }

  async getTransactions(): Promise<BudgetTransaction[]> {
    const entries = await this.ledger.getSpendingEntries({ tenantId: this.tenantId });
    return entries.map(e => ({
      amount: e.actualTotalUsd || e.estTotalUsd,
      timestamp: e.createdAt,
      description: e.operationName,
      remainingBudget: 0, // Calculated per request if needed
    }));
  }

  async canAfford(amount: number): Promise<boolean> {
    const used = (await this.ledger.getBudgetUtilization(this.tenantId))?.currentMonthSpend || 0;
    return used + amount <= this.maxUSD;
  }

  async suggestDownshift(): Promise<DownshiftSuggestion | null> {
    const util = await this.getUtilization();
    if (util > 70) {
      return {
        reason: `Budget ${util.toFixed(1)}% utilized`,
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
  await budget.charge(result.costUSD, description);
  return result.output;
}

// Per-PR budget tracker
export class PRBudgetTracker {
  private prBudgets: Map<number, Budget> = new Map();

  getOrCreateBudget(prNumber: number, maxUSD: number = 10, agentId?: string, agentVersion?: string): Budget {
    if (!this.prBudgets.has(prNumber)) {
      this.prBudgets.set(prNumber, new Budget(maxUSD, 0.8, agentId, agentVersion));
      logger.info('Created PR budget', { pr: prNumber, budget: maxUSD, agentId });
    }
    return this.prBudgets.get(prNumber)!;
  }

  async getBudgetSummary(prNumber: number): Promise<BudgetSummary | null> {
    const budget = this.prBudgets.get(prNumber);
    if (!budget) return null;

    return {
      prNumber,
      maxUSD: budget.maxUSD,
      usedUSD: (await budget.ledger.getBudgetUtilization(budget.tenantId))?.currentMonthSpend || 0,
      remainingUSD: await budget.getRemainingBudget(),
      utilization: await budget.getUtilization(),
      transactions: await budget.getTransactions(),
      downshiftSuggestion: await budget.suggestDownshift(),
    };
  }

  async getAllBudgetSummaries(): Promise<BudgetSummary[]> {
    const summaries = await Promise.all(
      Array.from(this.prBudgets.keys()).map((pr) => this.getBudgetSummary(pr))
    );
    return summaries.filter((s): s is BudgetSummary => s !== null);
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
  agentId?: string;
  agentVersion?: string;
}

// Singleton instance for tracking PR budgets
export const prBudgetTracker = new PRBudgetTracker();
