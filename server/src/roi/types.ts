export interface AgentValueCard {
  agentId: string;
  period: string; // e.g. '2023-Q4'
  timeSavedHours: number;
  incidentsAvoided: number;
  infraCostChange: number; // Negative means savings
  netValueScore: number; // 0-100 score
  currency: string;
}

export interface ROIMetrics {
  totalSavings: number;
  totalCost: number;
  roiPercentage: number;
  breakdownByFleet: Record<string, number>;
}
