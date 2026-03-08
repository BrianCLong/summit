"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const auth_js_1 = require("../../middleware/auth.js");
const emit_js_1 = require("../../audit/emit.js");
const brand_pack_receipt_js_1 = require("../../provenance/brand-pack-receipt.js");
const brand_pack_service_js_1 = require("./brand-pack.service.js");
const router = express_1.default.Router();
const service = brand_pack_service_js_1.BrandPackService.getInstance();
const querySchema = zod_1.z.object({
    partnerId: zod_1.z.string().optional(),
});
const applySchema = zod_1.z.object({
    packId: zod_1.z.string().min(1),
    partnerId: zod_1.z.string().optional(),
    actorId: zod_1.z.string().optional(),
    actorName: zod_1.z.string().optional(),
    reason: zod_1.z.string().optional(),
});
router.get('/tenants/:tenantId', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const tenantId = req.params.tenantId;
        const { partnerId } = querySchema.parse(req.query);
        const resolution = await service.getBrandPack(tenantId, partnerId);
        res.json({
            tenantId,
            partnerId,
            assignment: resolution.assignment,
            pack: resolution.pack,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to load brand pack' });
    }
});
router.post('/tenants/:tenantId/apply', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const tenantId = req.params.tenantId;
        const payload = applySchema.parse(req.body);
        const actorId = payload.actorId ?? req.user?.id ?? 'system';
        const actorName = payload.actorName ?? req.user?.name;
        const appliedAt = new Date().toISOString();
        const resolution = await service.applyBrandPack(tenantId, payload.packId, payload.partnerId);
        const receipt = await (0, brand_pack_receipt_js_1.emitBrandPackReceipt)({
            tenantId,
            packId: payload.packId,
            actorId,
            appliedAt,
        });
        const receiptQueryPath = `/api/receipts/${receipt.id}`;
        const auditEventId = await (0, emit_js_1.emitAuditEvent)({
            eventId: (0, crypto_1.randomUUID)(),
            occurredAt: appliedAt,
            actor: {
                type: 'user',
                id: actorId,
                name: actorName,
                ipAddress: req.ip,
            },
            action: {
                type: 'brand-pack.apply',
                name: 'Brand pack applied',
                outcome: 'success',
            },
            target: {
                type: 'brand-pack',
                id: payload.packId,
                name: resolution.pack.name,
                path: `/api/brand-packs/tenants/${tenantId}`,
            },
            tenantId,
            traceId: req.headers['x-request-id'],
            metadata: {
                partnerId: payload.partnerId,
                reason: payload.reason,
                receiptId: receipt.id,
                receiptQueryPath,
                appliedAt,
            },
        }, {
            level: 'info',
            complianceRelevant: true,
            complianceFrameworks: ['SOC2', 'ISO27001'],
            serviceId: 'brand-packs',
        });
        res.json({
            tenantId,
            partnerId: payload.partnerId,
            assignment: resolution.assignment,
            pack: resolution.pack,
            receipt,
            receiptQueryPath,
            auditEventId,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ error: 'Invalid input', details: error.errors });
            return;
        }
        res.status(500).json({ error: 'Failed to apply brand pack' });
    }
});
exports.default = router;
