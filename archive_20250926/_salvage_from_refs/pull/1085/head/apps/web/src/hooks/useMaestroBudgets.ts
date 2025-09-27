// =============================================
// File: apps/web/src/hooks/useMaestroBudgets.ts
// =============================================
import { useQuery } from '@tanstack/react-query';
import { maestroApi, BudgetsResponse } from '../lib/maestroApi';

export function useBudgets() {
  return useQuery<BudgetsResponse>({
    queryKey: ['maestro', 'budgets'],
    queryFn: () => maestroApi.budgets(),
    staleTime: 60_000,
  });
}
