"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTenantQuotas = exports.isQuotaEnforcementEnabled = exports.getTenantQuota = exports.resetTenantQuotaCache = exports.loadTenantQuotas = void 0;
const zod_1 = require("zod");
const TenantQuotaSchema = zod_1.z.record(zod_1.z.object({
    storageBytes: zod_1.z.number().optional(),
    evidenceCount: zod_1.z.number().optional(),
    exportCount: zod_1.z.number().optional(),
    jobConcurrency: zod_1.z.number().optional(),
    apiRatePerMinute: zod_1.z.number().optional(),
}));
const UNLIMITED_QUOTA = {
    storageBytes: Infinity,
    evidenceCount: Infinity,
    exportCount: Infinity,
    jobConcurrency: Infinity,
    apiRatePerMinute: Infinity,
};
let cachedQuotas = null;
const parseTenantQuotas = () => {
    const raw = process.env.TENANT_QUOTAS;
    if (!raw || raw.trim().length === 0) {
        return {};
    }
    const parsed = TenantQuotaSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
        throw new Error(`Invalid TENANT_QUOTAS configuration: ${parsed.error.message}`);
    }
    return parsed.data;
};
const loadTenantQuotas = (force = false) => {
    if (!cachedQuotas || force) {
        cachedQuotas = parseTenantQuotas();
    }
    return cachedQuotas;
};
exports.loadTenantQuotas = loadTenantQuotas;
const resetTenantQuotaCache = () => {
    cachedQuotas = null;
};
exports.resetTenantQuotaCache = resetTenantQuotaCache;
const getTenantQuota = (tenantId) => {
    const quotas = (0, exports.loadTenantQuotas)();
    const configured = quotas[tenantId];
    if (!configured) {
        return UNLIMITED_QUOTA;
    }
    return {
        ...UNLIMITED_QUOTA,
        ...configured,
    };
};
exports.getTenantQuota = getTenantQuota;
const isQuotaEnforcementEnabled = () => {
    const raw = process.env.TENANT_QUOTAS;
    return Boolean(raw && raw.trim().length > 0);
};
exports.isQuotaEnforcementEnabled = isQuotaEnforcementEnabled;
const getAllTenantQuotas = () => (0, exports.loadTenantQuotas)();
exports.getAllTenantQuotas = getAllTenantQuotas;
