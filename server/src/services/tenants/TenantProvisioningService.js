"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantProvisioningService = exports.TenantProvisioningService = void 0;
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const quota_manager_js_1 = require("../../lib/resources/quota-manager.js");
const tenant_provisioning_js_1 = require("../../provenance/tenant-provisioning.js");
class TenantProvisioningService {
    quotaManager = quota_manager_js_1.QuotaManager.getInstance();
    createNamespace(tenant, environment) {
        const namespace = {
            id: `ns_${tenant.id}`,
            name: tenant.name,
            slug: `${tenant.slug}-${environment}`,
            environment,
        };
        logger_js_1.default.info({ tenantId: tenant.id, namespace }, 'Tenant namespace created');
        return namespace;
    }
    createPartitions(tenant) {
        const region = tenant.region ?? 'us-east-1';
        const partitions = [
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
        logger_js_1.default.info({ tenantId: tenant.id, partitions }, 'Tenant partitions created');
        return partitions;
    }
    assignQuotas(tenantId, plan) {
        this.quotaManager.setTenantTier(tenantId, plan);
        const quota = this.quotaManager.getQuotaForTier(plan);
        logger_js_1.default.info({ tenantId, plan, quota }, 'Tenant quotas assigned');
        return quota;
    }
    async provisionTenant(request) {
        const namespace = this.createNamespace(request.tenant, request.environment);
        const partitions = this.createPartitions(request.tenant);
        const quota = this.assignQuotas(request.tenant.id, request.plan);
        const receipts = await (0, tenant_provisioning_js_1.emitTenantProvisioningReceipts)({
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
exports.TenantProvisioningService = TenantProvisioningService;
exports.tenantProvisioningService = new TenantProvisioningService();
