import { IntelGraphTemplate } from '../template/template-registry';

export type ScopeInput = {
  tenantId: string;
  workspaceId: string;
};

export type ExecutionPlan = {
  templateId: string;
  compiledCypher: string;
  parameters: Record<string, unknown>;
  budgets: {
    maxDbHits: number;
    maxRows: number;
  };
};

export function assertScope(scope: ScopeInput) {
  if (!scope.tenantId || !scope.workspaceId) {
    throw new Error('Tenant scope is required to plan template execution.');
  }
}
