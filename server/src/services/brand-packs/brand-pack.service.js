"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandPackService = void 0;
const CacheService_js_1 = require("../CacheService.js");
const brand_pack_loader_js_1 = require("./brand-pack.loader.js");
const DEFAULT_PACK_ID = 'summit-default';
const BRAND_PACK_CACHE_TTL_SECONDS = 300;
class BrandPackService {
    static instance;
    assignments = new Map();
    static getInstance() {
        if (!BrandPackService.instance) {
            BrandPackService.instance = new BrandPackService();
        }
        return BrandPackService.instance;
    }
    buildCacheKey(tenantId, partnerId) {
        return `brand-pack:${tenantId}:${partnerId ?? 'default'}`;
    }
    resolveAssignment(tenantId, partnerId) {
        const cacheKey = this.buildCacheKey(tenantId, partnerId);
        const assignment = this.assignments.get(cacheKey) ??
            {
                tenantId,
                partnerId,
                packId: DEFAULT_PACK_ID,
                appliedAt: new Date().toISOString(),
            };
        if (!this.assignments.has(cacheKey)) {
            this.assignments.set(cacheKey, assignment);
        }
        return assignment;
    }
    async getBrandPack(tenantId, partnerId) {
        const cacheKey = this.buildCacheKey(tenantId, partnerId);
        return CacheService_js_1.cacheService.getOrSet(cacheKey, async () => {
            const assignment = this.resolveAssignment(tenantId, partnerId);
            const pack = await (0, brand_pack_loader_js_1.loadBrandPack)(assignment.packId);
            return { pack, assignment };
        }, BRAND_PACK_CACHE_TTL_SECONDS);
    }
    async applyBrandPack(tenantId, packId, partnerId) {
        const appliedAt = new Date().toISOString();
        const assignment = {
            tenantId,
            partnerId,
            packId,
            appliedAt,
        };
        const cacheKey = this.buildCacheKey(tenantId, partnerId);
        this.assignments.set(cacheKey, assignment);
        await CacheService_js_1.cacheService.del(cacheKey);
        const pack = await (0, brand_pack_loader_js_1.loadBrandPack)(packId);
        return { pack, assignment };
    }
    async invalidateTenant(tenantId, partnerId) {
        const cacheKey = this.buildCacheKey(tenantId, partnerId);
        await CacheService_js_1.cacheService.del(cacheKey);
    }
}
exports.BrandPackService = BrandPackService;
