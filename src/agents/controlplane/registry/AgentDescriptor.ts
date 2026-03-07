export type RiskLevel = 'low' | 'medium' | 'high';

export interface AgentDescriptor {
  id: string;
  name: string;
  capabilities: string[];
  tools: string[];
  datasets: string[];
  riskLevel: RiskLevel;
  determinismScore: number;
  observabilityScore: number;
}
