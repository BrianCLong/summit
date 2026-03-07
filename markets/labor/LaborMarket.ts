export type MarketAction =
  | { kind: "POST_JOB"; employerId: string; budget: number }
  | { kind: "BID_TASK"; agentId: string; taskId: string; price: number }
  | { kind: "ALLOCATE_CAPITAL"; fundId: string; targetId: string; amount: number };

export class LaborMarket {
  postJob(action: MarketAction) {}
}
