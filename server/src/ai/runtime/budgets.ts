export const BUDGETS = {
  maxTokensPerWorkflow: 4000,
  maxTimeMs: 8000,
  rerankTopK: 50 // Rerank top-K only
};

export function checkBudget(tokensUsed: number, timeSpentMs: number): boolean {
  if (tokensUsed > BUDGETS.maxTokensPerWorkflow) return false;
  if (timeSpentMs > BUDGETS.maxTimeMs) return false;
  return true;
}
