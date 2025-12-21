export interface BudgetConfig {
  killList?: string[];
  allowList?: string[];
  margin?: number;
}

export function shouldKill(queryCost: number, budget: number, config: BudgetConfig = {}): boolean {
  const effectiveBudget = budget - (config.margin ?? 0);
  return queryCost > effectiveBudget;
}

export function evaluateQueries(
  queries: { id: string; cost: number }[],
  budget: number,
  config: BudgetConfig = {}
): { kill: string[]; allow: string[] } {
  const kill: string[] = [];
  const allow: string[] = [];
  const killSet = new Set(config.killList ?? []);
  const allowSet = new Set(config.allowList ?? []);
  queries.forEach(q => {
    if (allowSet.has(q.id)) {
      allow.push(q.id);
      return;
    }
    if (killSet.has(q.id) || shouldKill(q.cost, budget, config)) {
      kill.push(q.id);
    } else {
      allow.push(q.id);
    }
  });
  return { kill, allow };
}
