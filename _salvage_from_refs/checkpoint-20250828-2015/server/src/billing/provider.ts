/**
 * Defines the interface for a billing provider.
 * This allows for multiple billing implementations (e.g., Stripe for SaaS, Chargeback for Gov).
 */
export interface BillingProvider {
  /**
   * Creates or updates a tenant in the billing system.
   * This is typically called when a new tenant is provisioned.
   */
  createOrUpdateTenant(tenantId: string, metadata: Record<string, any>): Promise<void>;

  /**
   * Generates an invoice for a given tenant and time period.
   * @returns A URL to a hosted invoice (like Stripe) or the raw invoice bytes (like a CSV for chargeback).
   */
  invoice(tenantId: string, periodStart: Date, periodEnd: Date): Promise<{ url?: string; bytes?: Buffer }>;
}
