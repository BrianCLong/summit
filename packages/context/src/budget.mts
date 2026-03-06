export interface BudgetResult {
  totalChars: number;
  limitChars: number;
  status: 'ok' | 'warn' | 'exceeded';
}

export function checkBudget(totalChars: number, limit: number = 200000): BudgetResult {
  return {
    totalChars,
    limitChars: limit,
    status: totalChars > limit ? 'exceeded' : totalChars > (limit * 0.8) ? 'warn' : 'ok'
  };
}
