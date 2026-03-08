"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const auth_js_1 = require("../../middleware/auth.js");
const opaClient_js_1 = require("../../policy/opaClient.js");
const TenantService_js_1 = require("../../services/TenantService.js");
const TenantProvisioningService_js_1 = require("../../services/tenants/TenantProvisioningService.js");
const TenantIsolationGuard_js_1 = require("../../tenancy/TenantIsolationGuard.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const router = express_1.default.Router();
const adminProvisionSchema = TenantService_js_1.createTenantSchema.and(zod_1.z.object({
    plan: zod_1.z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']).default('ENTERPRISE'),
    environment: zod_1.z.enum(['prod', 'staging', 'dev']).default('prod'),
    requestedSeats: zod_1.z.number().int().min(1).max(10000).optional(),
    storageEstimateBytes: zod_1.z.number().int().min(0).optional(),
}));
router.post('/tenants', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const authReq = req;
        const actorId = authReq.user?.id;
        const actorRole = authReq.user?.role || 'unknown';
        if (!actorId) {
            return res.status(401).json({ success: false, error: 'Unauthorized: No user ID found' });
        }
        const body = adminProvisionSchema.parse(req.body);
        const decision = await (0, opaClient_js_1.opaAllow)('tenants/provision', {
            action: 'tenant.provision',
            tenant: 'system',
            resource: 'tenant',
            user: {
                id: actorId,
                roles: [actorRole],
            },
            meta: {
                residency: body.residency,
                region: body.region,
                plan: body.plan,
                environment: body.environment,
            },
        });
        if (!decision.allow) {
            return res.status(403).json({
                success: false,
                error: decision.reason || 'Policy denied tenant provisioning',
            });
        }
        const tenant = await TenantService_js_1.tenantService.createTenant(body, actorId);
        const provisioning = await TenantProvisioningService_js_1.tenantProvisioningService.provisionTenant({
            tenant,
            plan: body.plan,
            environment: body.environment,
            requestedSeats: body.requestedSeats,
            storageEstimateBytes: body.storageEstimateBytes,
            actorId,
            actorType: 'user',
            correlationId: req.correlationId,
            requestId: req.id,
        });
        const tenantContext = {
            tenantId: tenant.id,
            environment: body.environment,
            privilegeTier: 'standard',
            userId: actorId,
        };
        const policy = TenantIsolationGuard_js_1.tenantIsolationGuard.evaluatePolicy(tenantContext, {
            action: 'tenant.provision.admin',
            environment: body.environment,
            resourceTenantId: tenant.id,
        });
        if (!policy.allowed) {
            return res.status(policy.status || 403).json({
                success: false,
                error: policy.reason || 'Isolation policy denied provisioning',
            });
        }
        return res.status(201).json({
            success: true,
            data: {
                tenant,
                namespace: provisioning.namespace,
                partitions: provisioning.partitions,
                quota: provisioning.quota,
                isolationDefaults: {
                    environment: tenantContext.environment,
                    privilegeTier: tenantContext.privilegeTier,
                    quotas: provisioning.quota,
                },
            },
            receipts: provisioning.receipts,
            policy: {
                opa: decision,
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
        }
        logger_js_1.default.error('Admin tenant provisioning failed', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});
exports.default = router;
