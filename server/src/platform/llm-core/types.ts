export interface ModelProfile {
  id: string;
  provider: 'openai' | 'anthropic' | 'google' | 'mock';
  modelName: string;
  maxTokens: number;
  costPer1KTokensInput: number;
  costPer1KTokensOutput: number;
  strengths: string[];
  weaknesses: string[];
  safetyConstraints: string[];
}

export type TaskCategory = 'PLANNING' | 'CODING' | 'ANALYSIS' | 'SUMMARIZATION' | 'GOVERNANCE';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RoutingContext {
  taskCategory: TaskCategory;
  tenantId: string;
  riskLevel: RiskLevel;
  budgetRemaining?: number;
}

export interface RoutingRule {
  id: string;
  taskCategory: TaskCategory;
  preferredModels: string[]; // ModelProfile IDs
  fallbackModels: string[];
  governanceConstraints: string[]; // e.g. "no-data-retention", "eu-only"
  maxBudgetPerCall?: number;
}

export interface CostEvent {
  tenantId: string;
  modelId: string;
  estimatedTokensIn: number;
  estimatedTokensOut: number;
  estimatedCost: number;
  category: TaskCategory;
  taskId?: string;
  timestamp: Date;
}
