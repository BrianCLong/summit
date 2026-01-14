// Mock for db/repositories/RiskRepository
export class RiskRepository {
  async saveRiskScore(_input: any): Promise<void> {
    // No-op mock
  }

  async getRiskScore(_tenantId: string, _entityId: string): Promise<any | null> {
    return null;
  }

  async getRiskScores(_tenantId: string, _entityIds: string[]): Promise<any[]> {
    return [];
  }
}

export default RiskRepository;
