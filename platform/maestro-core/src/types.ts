import { GovernanceDecision, RiskCategory } from '@intelgraph/governance-kernel';

export type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'BLOCKED_BY_GOVERNANCE';

export interface Task {
  id: string;
  tenantId: string;
  type: string;
  input: Record<string, any>;
  status: TaskStatus;
  riskCategory: RiskCategory;
  result?: any;
  governanceDecision?: GovernanceDecision;
  createdAt: Date;
  updatedAt: Date;
}

export interface Runner {
  canHandle(taskType: string): boolean;
  execute(task: Task): Promise<any>;
}
