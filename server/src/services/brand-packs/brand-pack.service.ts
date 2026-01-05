import { cacheService } from '../CacheService.js';
import { loadBrandPack } from './brand-pack.loader.js';
import type { BrandPack } from './brand-pack.schema.js';

export interface BrandPackAssignment {
  tenantId: string;
  partnerId?: string;
  packId: string;
  appliedAt: string;
}

export interface BrandPackResolution {
  pack: BrandPack;
  assignment: BrandPackAssignment;
}

const DEFAULT_PACK_ID = 'summit-default';
const BRAND_PACK_CACHE_TTL_SECONDS = 300;

export class BrandPackService {
  private static instance: BrandPackService;
  private assignments = new Map<string, BrandPackAssignment>();

  static getInstance(): BrandPackService {
    if (!BrandPackService.instance) {
      BrandPackService.instance = new BrandPackService();
    }
    return BrandPackService.instance;
  }

  private buildCacheKey(tenantId: string, partnerId?: string): string {
    return `brand-pack:${tenantId}:${partnerId ?? 'default'}`;
  }

  private resolveAssignment(
    tenantId: string,
    partnerId?: string,
  ): BrandPackAssignment {
    const cacheKey = this.buildCacheKey(tenantId, partnerId);
    const assignment =
      this.assignments.get(cacheKey) ??
      ({
        tenantId,
        partnerId,
        packId: DEFAULT_PACK_ID,
        appliedAt: new Date().toISOString(),
      } as BrandPackAssignment);

    if (!this.assignments.has(cacheKey)) {
      this.assignments.set(cacheKey, assignment);
    }

    return assignment;
  }

  async getBrandPack(
    tenantId: string,
    partnerId?: string,
  ): Promise<BrandPackResolution> {
    const cacheKey = this.buildCacheKey(tenantId, partnerId);
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const assignment = this.resolveAssignment(tenantId, partnerId);
        const pack = await loadBrandPack(assignment.packId);
        return { pack, assignment };
      },
      BRAND_PACK_CACHE_TTL_SECONDS,
    );
  }

  async applyBrandPack(
    tenantId: string,
    packId: string,
    partnerId?: string,
  ): Promise<BrandPackResolution> {
    const appliedAt = new Date().toISOString();
    const assignment: BrandPackAssignment = {
      tenantId,
      partnerId,
      packId,
      appliedAt,
    };
    const cacheKey = this.buildCacheKey(tenantId, partnerId);
    this.assignments.set(cacheKey, assignment);
    await cacheService.del(cacheKey);
    const pack = await loadBrandPack(packId);
    return { pack, assignment };
  }

  async invalidateTenant(tenantId: string, partnerId?: string): Promise<void> {
    const cacheKey = this.buildCacheKey(tenantId, partnerId);
    await cacheService.del(cacheKey);
  }
}
