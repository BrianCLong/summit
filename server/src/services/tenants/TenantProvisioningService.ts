import logger from '../../utils/logger.js';
import { QuotaManager, type Quota } from '../../lib/resources/quota-manager.js';
import type { Tenant } from '../TenantService.js';
import {
  emitTenantProvisioningReceipts,
  type TenantProvisioningReceipts,
} from '../../provenance/tenant-provisioning.js';

export type TenantEnvironment = 'prod' | 'staging' | 'dev';
export type TenantPlan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

export type TenantNamespace = {
  id: string;
  name: string;
  slug: string;
  environment: TenantEnvironment;
};

export type TenantPartition = {
  id: string;
  name: string;
  type: 'primary' | 'analytics' | 'audit';
  isolation: 'shared' | 'dedicated';
  region: string;
};

export type TenantProvisioningRequest = {
  tenant: Tenant;
  plan: TenantPlan;
  environment: TenantEnvironment;
  requestedSeats?: number;
  storageEstimateBytes?: number;
  actorId: string;
  actorType?: 'user' | 'system' | 'api' | 'job';
  correlationId?: string;
  requestId?: string;
};

export type TenantProvisioningResult = {
  namespace: TenantNamespace;
  partitions: TenantPartition[];
  quota: Quota;
  receipts: TenantProvisioningReceipts;
};

export class TenantProvisioningService {
  private quotaManager = QuotaManager.getInstance();

  createNamespace(tenant: Tenant, environment: TenantEnvironment): TenantNamespace {
    const namespace = {
      id: `ns_${tenant.id}`,
      name: tenant.name,
      slug: `${tenant.slug}-${environment}`,
      environment,
    };
    logger.info(
      { tenantId: tenant.id, namespace },
      'Tenant namespace created',
    );
    return namespace;
  }

  createPartitions(tenant: Tenant): TenantPartition[] {
    const region = tenant.region ?? 'us-east-1';
    const partitions: TenantPartition[] = [
      {
        id: `part_${tenant.id}_primary`,
        name: 'primary',
        type: 'primary',
        isolation: 'shared',
        region,
      },
      {
        id: `part_${tenant.id}_analytics`,
        name: 'analytics',
        type: 'analytics',
        isolation: 'shared',
        region,
      },
      {
        id: `part_${tenant.id}_audit`,
        name: 'audit',
        type: 'audit',
        isolation: 'shared',
        region,
      },
    ];
    logger.info(
      { tenantId: tenant.id, partitions },
      'Tenant partitions created',
    );
    return partitions;
  }

  assignQuotas(tenantId: string, plan: TenantPlan): Quota {
    this.quotaManager.setTenantTier(tenantId, plan);
    const quota = this.quotaManager.getQuotaForTier(plan);
    logger.info({ tenantId, plan, quota }, 'Tenant quotas assigned');
    return quota;
  }

  async provisionTenant(request: TenantProvisioningRequest): Promise<TenantProvisioningResult> {
    const namespace = this.createNamespace(request.tenant, request.environment);
    const partitions = this.createPartitions(request.tenant);
    const quota = this.assignQuotas(request.tenant.id, request.plan);

    const receipts = await emitTenantProvisioningReceipts({
      tenantId: request.tenant.id,
      actorId: request.actorId,
      actorType: request.actorType ?? 'user',
      namespace,
      partitions,
      plan: request.plan,
      environment: request.environment,
      quota,
      requestedSeats: request.requestedSeats,
      storageEstimateBytes: request.storageEstimateBytes,
      correlationId: request.correlationId,
      requestId: request.requestId,
    });

    return {
      namespace,
      partitions,
      quota,
      receipts,
    };
  }
}

export const tenantProvisioningService = new TenantProvisioningService();
