export type PlanReq = { predicate: string; hints?: Record<string, any> };

export function plan(req: PlanReq) {
  return { remoteFilters: [req.predicate], expectedCost: 10 };
}
