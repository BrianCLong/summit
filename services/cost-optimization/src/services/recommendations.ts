export class RecommendationService {
  async getIdleResources(options: { provider?: string; resourceType?: string }) {
    return [];
  }

  async getSavingsOpportunities(options: { provider?: string }) {
    return {
      spotInstances: 0,
      reservedInstances: 0,
      savingsPlans: 0,
      total: 0
    };
  }
}
