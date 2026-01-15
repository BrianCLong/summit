import type { Quota } from '../lib/resources/quota-manager.js';
import type {
  TenantNamespace,
  TenantPartition,
  TenantPlan,
  TenantEnvironment,
} from '../services/tenants/TenantProvisioningService.js';
import { provenanceLedger } from './ledger.js';

export type TenantProvisioningReceiptSummary = {
  id: string;
  actionType: string;
  timestamp: string;
};

export type TenantProvisioningReceipts = {
  provisioning: TenantProvisioningReceiptSummary;
  quotaAssignment: TenantProvisioningReceiptSummary;
};

export type TenantProvisioningReceiptInput = {
  tenantId: string;
  actorId: string;
  actorType: 'user' | 'system' | 'api' | 'job';
  namespace: TenantNamespace;
  partitions: TenantPartition[];
  plan: TenantPlan;
  environment: TenantEnvironment;
  quota: Quota;
  requestedSeats?: number;
  storageEstimateBytes?: number;
  correlationId?: string;
  requestId?: string;
};

function summarizeReceipt(entry: {
  id: string;
  actionType: string;
  timestamp: Date;
}): TenantProvisioningReceiptSummary {
  return {
    id: entry.id,
    actionType: entry.actionType,
    timestamp: entry.timestamp.toISOString(),
  };
}

export async function emitTenantProvisioningReceipts(
  input: TenantProvisioningReceiptInput,
): Promise<TenantProvisioningReceipts> {
  const provisioningEntry = await provenanceLedger.appendEntry({
    tenantId: input.tenantId,
    timestamp: new Date(),
    actionType: 'TENANT_PROVISIONED',
    resourceType: 'tenant',
    resourceId: input.tenantId,
    actorId: input.actorId,
    actorType: input.actorType,
    payload: {
      mutationType: 'CREATE' as const,
      entityId: input.tenantId,
      entityType: 'Tenant',
      namespace: input.namespace,
      partitions: input.partitions,
      plan: input.plan,
      environment: input.environment,
      requestedSeats: input.requestedSeats,
      storageEstimateBytes: input.storageEstimateBytes,
    },
    metadata: {
      correlationId: input.correlationId,
      requestId: input.requestId,
    },
  });

  const quotaEntry = await provenanceLedger.appendEntry({
    tenantId: input.tenantId,
    timestamp: new Date(),
    actionType: 'TENANT_QUOTA_ASSIGNED',
    resourceType: 'quota',
    resourceId: input.tenantId,
    actorId: input.actorId,
    actorType: input.actorType,
    payload: {
      mutationType: 'CREATE' as const,
      entityId: input.tenantId,
      entityType: 'Quota',
      quota: input.quota,
      plan: input.plan,
      environment: input.environment,
    },
    metadata: {
      correlationId: input.correlationId,
      requestId: input.requestId,
    },
  });

  return {
    provisioning: summarizeReceipt(provisioningEntry),
    quotaAssignment: summarizeReceipt(quotaEntry),
  };
}
