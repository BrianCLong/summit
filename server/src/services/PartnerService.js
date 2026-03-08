"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.partnerService = exports.PartnerService = exports.OnboardPartnerSchema = void 0;
// @ts-nocheck
const pg_js_1 = require("../db/pg.js");
const TenantService_js_1 = require("./TenantService.js");
const ApiKeyService_js_1 = require("./ApiKeyService.js");
const zod_1 = require("zod");
const ledger_js_1 = require("../provenance/ledger.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const crypto_1 = __importDefault(require("crypto"));
exports.OnboardPartnerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    slug: zod_1.z.string().min(3).regex(/^[a-z0-9-]+$/),
    region: zod_1.z.string().optional(),
    contactEmail: zod_1.z.string().email(),
    partnerType: zod_1.z.enum(['agency', 'ngo', 'commercial']),
});
class PartnerService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!PartnerService.instance) {
            PartnerService.instance = new PartnerService();
        }
        return PartnerService.instance;
    }
    /**
     * Register a new partner (starts in pending state)
     */
    async registerPartner(input, actorId) {
        // 1. Create Tenant (using TenantService)
        // We force the status to 'pending_approval' via the Partner Profile overlay,
        // although TenantService defaults to 'active'. We might need to update it immediately.
        // Create tenant input from partner input
        const tenantInput = {
            name: input.name,
            slug: input.slug,
            residency: input.region === 'EU' ? 'EU' : 'US', // Simple mapping
        };
        const tenant = await TenantService_js_1.tenantService.createTenant(tenantInput, actorId);
        // 2. Create Partner Profile
        await pg_js_1.pg.none(`INSERT INTO partner_profiles (
        tenant_id, partner_type, region, contact_email
      ) VALUES ($1, $2, $3, $4)`, [tenant.id, input.partnerType, input.region, input.contactEmail]);
        // 3. Set status to pending (override TenantService default)
        await pg_js_1.pg.none(`UPDATE tenants SET status = 'pending_approval' WHERE id = $1`, [tenant.id]);
        // 4. Log event
        await ledger_js_1.provenanceLedger.appendEntry({
            action: 'PARTNER_REGISTERED',
            actor: { id: actorId, role: 'user' },
            metadata: { tenantId: tenant.id, partnerType: input.partnerType },
            artifacts: []
        });
        return {
            ...tenant,
            status: 'pending_approval',
            partnerProfile: {
                type: input.partnerType,
                email: input.contactEmail
            }
        };
    }
    /**
     * Approve a partner
     */
    async approvePartner(tenantId, approverId) {
        // 1. Update status
        await pg_js_1.pg.none(`UPDATE tenants SET status = 'active' WHERE id = $1`, [tenantId]);
        // 2. Generate initial API Key
        const { apiKey, token } = await ApiKeyService_js_1.apiKeyService.createApiKey({
            tenantId,
            name: 'Initial Partner Key',
            scopes: ['read:cases', 'write:evidence', 'exchange:all'],
            createdBy: approverId
        });
        // 3. Log event
        await ledger_js_1.provenanceLedger.appendEntry({
            action: 'PARTNER_APPROVED',
            actor: { id: approverId, role: 'admin' },
            metadata: { tenantId },
            artifacts: []
        });
        return {
            tenantId,
            status: 'active',
            initialApiKey: token
        };
    }
    /**
     * Get Partner Details
     */
    async getPartner(tenantId) {
        const tenant = await TenantService_js_1.tenantService.getTenant(tenantId);
        if (!tenant)
            return null;
        const profile = await pg_js_1.pg.oneOrNone(`SELECT * FROM partner_profiles WHERE tenant_id = $1`, [tenantId]);
        return {
            ...tenant,
            partnerProfile: profile
        };
    }
    /**
     * Execute Data Exchange (Share Case)
     */
    async shareCase(sourceTenantId, targetSlug, caseData) {
        // 1. Resolve target
        const targetTenant = await TenantService_js_1.tenantService.getTenantBySlug(targetSlug);
        if (!targetTenant) {
            throw new Error(`Target partner ${targetSlug} not found`);
        }
        // 2. Check permissions/agreements (mocked)
        const profile = await pg_js_1.pg.oneOrNone(`SELECT * FROM partner_profiles WHERE tenant_id = $1`, [targetTenant.id]);
        // In a real app, check data_sharing_agreement_signed
        // 3. Perform Exchange (Log it)
        logger_js_1.default.info(`Sharing case from ${sourceTenantId} to ${targetTenant.id}`);
        // 4. Record in Ledger
        await ledger_js_1.provenanceLedger.appendEntry({
            action: 'DATA_EXCHANGE_CASE_SHARED',
            actor: { id: 'system', role: 'system' }, // Automated
            metadata: {
                source: sourceTenantId,
                target: targetTenant.id,
                caseId: caseData.id
            },
            artifacts: [] // could store hash of data
        });
        return { success: true, transferId: crypto_1.default.randomUUID() };
    }
}
exports.PartnerService = PartnerService;
exports.partnerService = PartnerService.getInstance();
