import { Entitlement as ContractEntitlement } from '../../contracts/types.js';

export type Entitlement = ContractEntitlement;

export interface EntitlementCheckRequest {
  tenantId: string;
  artifactKey: string;
  metric?: string;
  quantity?: number;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: string;
  limit?: number;
  usage?: number;
}
