export type Budget = { maxMs: number; maxRows: number; maxExpand: number };

export function enforceBudget(ast: any, budget: Budget) {
  if (ast.expands && ast.expands > budget.maxExpand) {
    throw new Error('budget_expansion_exceeded');
  }
  if (ast.rows && ast.rows > budget.maxRows) {
    throw new Error('budget_rows_exceeded');
  }
  return budget;
}
