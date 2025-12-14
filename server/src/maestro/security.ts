
import { MaestroRun, MaestroTask } from './model';

export interface PolicyService {
  canCreateRun(tenantId: string, principalId: string, templateId: string): Promise<boolean>;
  canExecuteTask(tenantId: string, taskKind: string): Promise<boolean>;
}

export interface QuotaService {
  checkRunQuota(tenantId: string): Promise<boolean>;
  consumeQuota(tenantId: string, resource: string, amount: number): Promise<void>;
}

// Mock Implementations for now
export class MockPolicyService implements PolicyService {
  async canCreateRun(tenantId: string, principalId: string, templateId: string): Promise<boolean> {
    // In real implementation: check OPA or internal policy rules
    return true;
  }
  async canExecuteTask(tenantId: string, taskKind: string): Promise<boolean> {
    return true;
  }
}

export class MockQuotaService implements QuotaService {
  async checkRunQuota(tenantId: string): Promise<boolean> {
    // Check if tenant has credits/budget
    return true;
  }
  async consumeQuota(tenantId: string, resource: string, amount: number): Promise<void> {
    // Record usage
  }
}
