
export interface IncubationCapability {
  id: string;
  name: string;
  version: string;
  description: string;
  run: (input: string, context: SandboxContext) => Promise<IncubationResult>;
}

export interface SandboxContext {
  tools: ToolRegistry;
  budget: BudgetManager;
  logger: (message: string) => void;
}

export interface IncubationResult {
  success: boolean;
  output: string;
  metrics: {
    steps: number;
    tokens: number;
    durationMs: number;
  };
  violations: string[];
}

export interface ToolRegistry {
  execute: (toolName: string, args: any) => Promise<any>;
  isAllowed: (toolName: string) => boolean;
}

export interface BudgetManager {
  checkBudget: (costType: 'tokens' | 'steps', amount: number) => boolean;
  consume: (costType: 'tokens' | 'steps', amount: number) => void;
  getRemaining: (costType: 'tokens' | 'steps') => number;
}
