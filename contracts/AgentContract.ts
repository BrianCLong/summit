export interface AgentContract {
  id: string;
  principalId: string;
  counterpartyId: string;
  deliverable: string;
  amount: number;
  dueTick: number;
  policyTags: string[];
}
