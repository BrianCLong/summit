export interface ResidencyPolicy {
  tenant_id: string;
  default_region: string;
  overrides: Record<string, string>; // resource_type -> region
}

export class ResidencyService {
  private static instance: ResidencyService;
  private policies: Map<string, ResidencyPolicy> = new Map();

  private constructor() {}

  public static getInstance(): ResidencyService {
    if (!ResidencyService.instance) {
      ResidencyService.instance = new ResidencyService();
    }
    return ResidencyService.instance;
  }

  public setPolicy(policy: ResidencyPolicy): void {
    this.policies.set(policy.tenant_id, policy);
  }

  public resolveRegion(tenantId: string, resourceType: string): string {
    const policy = this.policies.get(tenantId);
    if (!policy) return "us"; // Default
    return policy.overrides[resourceType] || policy.default_region;
  }

  public getStorageSelector(tenantId: string, resourceType: string): string {
    const region = this.resolveRegion(tenantId, resourceType);
    return `db.${region}.companyos.local`;
  }
}
