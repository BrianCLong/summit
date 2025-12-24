export interface EntitlementsInterface {
  /**
   * Checks if a tenant has access to a specific feature.
   * @param feature The feature key (e.g., 'sso', 'advanced_reporting').
   * @param tenantId The ID of the tenant.
   * @returns Promise<boolean> True if the tenant can use the feature.
   */
  canUse(feature: string, tenantId: string): Promise<boolean>;

  /**
   * Checks the remaining quota for a metered feature.
   * @param feature The feature key (e.g., 'api_requests', 'storage_gb').
   * @param tenantId The ID of the tenant.
   * @returns Promise<number> The remaining amount, or Infinity if unlimited/not metered.
   */
  quotaRemaining(feature: string, tenantId: string): Promise<number>;
}

export class EntitlementsService implements EntitlementsInterface {
  private static instance: EntitlementsService;

  private constructor() {}

  public static getInstance(): EntitlementsService {
    if (!EntitlementsService.instance) {
      EntitlementsService.instance = new EntitlementsService();
    }
    return EntitlementsService.instance;
  }

  /**
   * Default no-op implementation.
   * In a real implementation, this would query a database or cache to check the tenant's plan.
   * Currently defaults to allowing everything for development/MVP.
   */
  async canUse(feature: string, tenantId: string): Promise<boolean> {
    // TODO: Implement actual plan checking logic.
    // For now, return true to not block development.
    return Promise.resolve(true);
  }

  /**
   * Default no-op implementation.
   * In a real implementation, this would check usage metering against plan limits.
   * Currently defaults to Infinity (unlimited).
   */
  async quotaRemaining(feature: string, tenantId: string): Promise<number> {
    // TODO: Implement actual quota checking logic.
    // For now, return Infinity.
    return Promise.resolve(Infinity);
  }
}
