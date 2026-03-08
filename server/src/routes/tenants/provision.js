"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const zod_1 = require("zod");
const auth_js_1 = require("../../middleware/auth.js");
const TenantService_js_1 = require("../../services/TenantService.js");
const TenantProvisioningService_js_1 = require("../../services/tenants/TenantProvisioningService.js");
const TenantIsolationGuard_js_1 = require("../../tenancy/TenantIsolationGuard.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const router = (0, express_1.Router)();
const provisionSchema = TenantService_js_1.createTenantBaseSchema.extend({
    plan: zod_1.z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']).default('STARTER'),
    environment: zod_1.z.enum(['prod', 'staging', 'dev']).default('prod'),
    requestedSeats: zod_1.z.number().int().min(1).max(10000).optional(),
    storageEstimateBytes: zod_1.z.number().int().min(0).optional(),
});
router.post('/', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const actorId = req.user?.id;
        if (!actorId) {
            return res.status(401).json({ success: false, error: 'Unauthorized: No user ID found' });
        }
        const body = provisionSchema.parse(req.body);
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
        // Run isolation guard to ensure defaults are valid
        const policy = TenantIsolationGuard_js_1.tenantIsolationGuard.evaluatePolicy(tenantContext, {
            action: 'tenant.provision',
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
                isolationDefaults: {
                    environment: tenantContext.environment,
                    privilegeTier: tenantContext.privilegeTier,
                    quotas: provisioning.quota,
                },
                namespace: provisioning.namespace,
                partitions: provisioning.partitions,
                quota: provisioning.quota,
            },
            receipts: provisioning.receipts,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
        }
        logger_js_1.default.error('Tenant provisioning failed', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});
exports.default = router;
