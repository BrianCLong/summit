import { SecuriteyesService } from './SecuriteyesService.js';
import { InsiderRiskProfile, NODE_LABELS, SuspiciousEvent } from '../models/types.js';

export class RiskManager {
    private static instance: RiskManager;
    private securiteyes: SecuriteyesService;

    private constructor() {
        this.securiteyes = SecuriteyesService.getInstance();
    }

    private getSecuriteyes() {
        return SecuriteyesService.getInstance();
    }

    public static getInstance(): RiskManager {
        if (!RiskManager.instance) {
            RiskManager.instance = new RiskManager();
        }
        return RiskManager.instance;
    }

    async getRiskProfile(principalId: string, tenantId: string): Promise<InsiderRiskProfile> {
        return this.getSecuriteyes().getOrCreateRiskProfile(principalId, tenantId);
    }

    async updateRiskForEvent(principalId: string, tenantId: string, event: SuspiciousEvent): Promise<void> {
        // The mock in test might need to be awaited or is returning undefined unexpectedly.
        // Let's ensure we are using the service correctly.
        const service = this.getSecuriteyes();
        let profile = await service.getOrCreateRiskProfile(principalId, tenantId);

        if (!profile) {
            // If the service failed to return/create, we can't update risk.
             throw new Error(`Could not retrieve risk profile for ${principalId}`);
        }
        let newScore = profile.riskScore;
        let factor = 'unknown';

        switch (event.severity) {
            case 'critical': newScore += 50; break;
            case 'high': newScore += 20; break;
            case 'medium': newScore += 10; break;
            case 'low': newScore += 2; break;
        }

        // Cap at 100
        newScore = Math.min(newScore, 100);

        const newFactors = {
            ...profile.riskFactors,
            [new Date().toISOString()]: `Risk increased due to ${event.severity} severity event: ${event.eventType}`
        };

        await this.getSecuriteyes().updateRiskScore(principalId, tenantId, newScore, newFactors);
    }

    async getHighRiskProfiles(tenantId: string, threshold: number = 70): Promise<InsiderRiskProfile[]> {
        // Implementation note: This would ideally be a cypher query in the service
        // For MVP, we'll assume the service handles this logic or we fetch and filter (inefficient)
        // Let's rely on adding a method to SecuriteyesService for efficiency

        const profiles = await this.getSecuriteyes().getHighRiskProfiles(tenantId, threshold);
        return profiles || [];
    }
}
