export type MCPBudgetConfig = {
  maxEnabled: number;
  maxTools: number;
};

export const DEFAULT_BUDGET: MCPBudgetConfig = {
  maxEnabled: 10,
  maxTools: 80,
};

export function validateMCPBudget(
  enabledMCPs: any[], // simplified type
  totalTools: number,
  config: MCPBudgetConfig = DEFAULT_BUDGET
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (enabledMCPs.length > config.maxEnabled) {
    errors.push(`Too many MCPs enabled: ${enabledMCPs.length} > ${config.maxEnabled}`);
  }

  if (totalTools > config.maxTools) {
    errors.push(`Too many total tools: ${totalTools} > ${config.maxTools}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
