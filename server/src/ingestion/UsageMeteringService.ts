export class UsageMeteringService {
  async trackIngestion(tenantId: string, type: 'record' | 'token', count: number) {
    // Stub implementation
    // In production, this would write to a timeseries DB or billing service
    // console.log(`[Usage] Tenant ${tenantId}: +${count} ${type}s`);
  }
}
