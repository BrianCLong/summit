// @ts-nocheck
// server/src/lib/resources/budget-tracker.ts

import { EventEmitter } from 'events';
import { CostDomain, BudgetConfig, BudgetStatus, CostAttribution } from './types.js';

/**
 * @file Tracks costs and budgets for tenants with strict enforcement.
 * @author Jules
 * @version 2.2.0
 *
 * @warning This implementation uses a non-persistent in-memory store.
 * All budget and cost data will be lost on application restart.
 */

interface CostRecord {
  tenantId: string;
  domain: CostDomain;
  amount: number;
  timestamp: Date;
  details?: Record<string, any>;
  attribution?: CostAttribution;
}

// In-memory stores
const costStore: { [tenantId: string]: CostRecord[] } = {};
const budgetStore: { [tenantId: string]: { [domain in CostDomain]?: BudgetStatus } } = {};

export class BudgetTracker extends EventEmitter {
  private static instance: BudgetTracker;

  private constructor() {
    super();
  }

  public static getInstance(): BudgetTracker {
    if (!BudgetTracker.instance) {
      BudgetTracker.instance = new BudgetTracker();
    }
    return BudgetTracker.instance;
  }

  /**
   * Defines a budget for a specific domain for a tenant.
   */
  public setBudget(tenantId: string, config: BudgetConfig): void {
    if (!budgetStore[tenantId]) {
      budgetStore[tenantId] = {};
    }
    const current = budgetStore[tenantId][config.domain];

    // Preserve current spending if updating budget
    const currentSpending = current ? current.currentSpending : 0;
    const periodStart = current ? current.periodStart : new Date(); // In real app, calculate based on period logic

    // Simple period end calculation (30 days for monthly, 1 day for daily)
    const periodEnd = new Date(periodStart);
    if (config.period === 'monthly') {
      periodEnd.setDate(periodEnd.getDate() + 30);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 1);
    }

    budgetStore[tenantId][config.domain] = {
      ...config,
      currentSpending,
      forecastedSpending: 0, // Recalculate later
      periodStart,
      periodEnd,
      triggeredThresholds: current ? current.triggeredThresholds : [],
    };

    // Recalculate forecast immediately
    this.updateForecast(tenantId, config.domain);
  }

  /**
   * Checks if an operation is allowed within the budget.
   * Returns false if the budget would be exceeded (Hard Stop).
   */
  public checkBudget(tenantId: string, domain: CostDomain, estimatedCost: number = 0): boolean {
    const budget = budgetStore[tenantId]?.[domain];
    if (!budget) {
      return true; // No budget = unlimited (soft enforcement)
    }

    if (budget.currentSpending + estimatedCost > budget.limit) {
      this.emit('budget_exceeded', {
        tenantId,
        domain,
        limit: budget.limit,
        currentSpending: budget.currentSpending,
        attemptedCost: estimatedCost,
        timestamp: new Date(),
      });

      if (budget.hardStop) {
          return false; // HARD STOP
      }
    }
    return true;
  }

  /**
   * Tracks a realized cost.
   */
  public trackCost(tenantId: string, domain: CostDomain, amount: number, details?: Record<string, any>, attribution?: CostAttribution): void {
    if (!costStore[tenantId]) {
      costStore[tenantId] = [];
    }

    const costRecord: CostRecord = {
      tenantId,
      domain,
      amount,
      timestamp: new Date(),
      details,
      attribution
    };

    costStore[tenantId].push(costRecord);

    // Update Budget Status
    const budget = budgetStore[tenantId]?.[domain];
    if (budget) {
      budget.currentSpending += amount;
      this.updateForecast(tenantId, domain);
      this.checkThresholds(tenantId, domain, budget);
    }
  }

  /**
   * Updates the spending forecast based on historical data.
   * Epic 3: Forecasting & Cost Signals
   */
  private updateForecast(tenantId: string, domain: CostDomain): void {
    const budget = budgetStore[tenantId]?.[domain];
    if (!budget) return;

    const costs = costStore[tenantId] || [];
    const domainCosts = costs.filter(c => c.domain === domain && c.timestamp >= budget.periodStart);

    if (domainCosts.length === 0) {
      budget.forecastedSpending = budget.currentSpending;
      return;
    }

    // Simple Linear Extrapolation
    const now = new Date();
    const startTime = budget.periodStart.getTime();
    const elapsedTime = now.getTime() - startTime;
    const totalPeriodTime = budget.periodEnd.getTime() - startTime;

    if (elapsedTime <= 0) return;

    const burnRate = budget.currentSpending / elapsedTime; // Cost per millisecond
    const projectedTotal = burnRate * totalPeriodTime;

    budget.forecastedSpending = projectedTotal;
  }

  /**
   * Checks alert thresholds and emits alerts.
   * Epic 4: Alerts
   */
  private checkThresholds(tenantId: string, domain: CostDomain, budget: BudgetStatus): void {
    const ratio = budget.currentSpending / budget.limit;

    // Check if we just crossed a threshold
    for (const threshold of budget.alertThresholds) {
       // Only alert if we haven't alerted for this threshold yet
       if (ratio >= threshold && !budget.triggeredThresholds.includes(threshold)) {
         this.emit('threshold_reached', {
           tenantId,
           domain,
           threshold,
           usage: ratio,
           limit: budget.limit,
           timestamp: new Date()
         });

         // Mark threshold as triggered
         budget.triggeredThresholds.push(threshold);
       }
    }
  }

  /**
   * Returns a report for a tenant.
   * Epic 4: Reports
   */
  public getTenantReport(tenantId: string): Record<CostDomain, BudgetStatus | undefined> {
    return budgetStore[tenantId] || {};
  }

  public getDomainBudget(tenantId: string, domain: CostDomain): BudgetStatus | undefined {
      return budgetStore[tenantId]?.[domain];
  }

  /**
   * Get detailed costs with attribution
   */
  public getAttributedCosts(tenantId: string): CostRecord[] {
      return costStore[tenantId] || [];
  }

  /**
   * Generates optimization suggestions based on usage patterns.
   * Epic 4: Optimization Loops
   */
  public getOptimizationSuggestions(tenantId: string): string[] {
    const suggestions: string[] = [];
    const report = this.getTenantReport(tenantId);

    // Check for high spending domains
    for (const [domainKey, budget] of Object.entries(report)) {
        const domain = domainKey as CostDomain;
        if (!budget) continue;

        const ratio = budget.currentSpending / budget.limit;

        if (ratio > 0.8) {
            suggestions.push(`High spend in ${domain} (${(ratio * 100).toFixed(1)}%). Consider reviewing usage or increasing budget.`);
        }

        if (domain === CostDomain.AGENT_RUNS && budget.currentSpending > 100) {
             suggestions.push(`Consider using smaller models for simpler Agent tasks to reduce ${domain} costs.`);
        }
    }

    if (suggestions.length === 0) {
        suggestions.push('No immediate optimizations found. Spending is within healthy limits.');
    }

    return suggestions;
  }
}

export const budgetTracker = BudgetTracker.getInstance();
