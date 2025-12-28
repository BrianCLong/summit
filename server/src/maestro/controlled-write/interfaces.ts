import { WriteAction, WriteActionStatus, ApprovalRequest } from './types';

export interface ExecutionPlan {
  files: string[];
  totalBytes: number;
  hash: string; // Hash of the plan/diff for integrity
  diff?: string;
}

export interface PersistenceStore {
  saveAction(action: WriteAction): Promise<void>;
  getAction(id: string): Promise<WriteAction | null>;
  updateStatus(id: string, status: WriteActionStatus): Promise<void>;
  saveApproval(approval: ApprovalRequest): Promise<void>;
  getApproval(actionId: string): Promise<ApprovalRequest | null>;
  appendEvent(actionId: string, event: any): Promise<void>;
  acquireLock(actionId: string): Promise<boolean>;
  releaseLock(actionId: string): Promise<void>;
}

export interface WriteExecutor {
  plan(action: WriteAction): Promise<ExecutionPlan>;
  execute(action: WriteAction): Promise<void>;
  rollback(action: WriteAction): Promise<void>;
}
