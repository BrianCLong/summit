/**
 * Simple in-memory per-tenant token budget tracker.
 * Budgets can be provided via constructor or the LLM_BUDGETS env var
 * formatted as "tenant:budget,tenant2:budget".
 */

import { llmTokensUsedTotal, budgetExceededTotal } from "../monitoring/metrics.js";

function parseEnvBudgets() {
  const raw = process.env.LLM_BUDGETS;
  const budgets = {};
  if (!raw) return budgets;
  for (const pair of raw.split(",")) {
    const [tenant, value] = pair.split(":");
    const num = parseInt(value, 10);
    if (tenant && !Number.isNaN(num)) {
      budgets[tenant] = num;
    }
  }
  return budgets;
}

export default class TokenBudgetService {
  constructor(budgets = {}) {
    this.budgets = Object.keys(budgets).length ? budgets : parseEnvBudgets();
    this.usage = new Map(); // tenantId -> { month: 'YYYY-MM', tokens: number }
  }

  currentMonth() {
    return new Date().toISOString().slice(0, 7);
  }

  recordUsage(tenantId, tokens) {
    const month = this.currentMonth();
    let entry = this.usage.get(tenantId);
    if (!entry || entry.month !== month) {
      entry = { month, tokens: 0 };
    }
    entry.tokens += tokens;
    this.usage.set(tenantId, entry);
    llmTokensUsedTotal.labels(tenantId).inc(tokens);
  }

  withinBudget(tenantId) {
    const budget = this.budgets[tenantId];
    if (!budget) return true;
    const month = this.currentMonth();
    const entry = this.usage.get(tenantId);
    const used = entry && entry.month === month ? entry.tokens : 0;
    return used < budget;
  }

  assertWithinBudget(tenantId) {
    if (!this.withinBudget(tenantId)) {
      budgetExceededTotal.labels(tenantId).inc();
      throw new Error("LLM token budget exceeded");
    }
  }
}

