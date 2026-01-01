
import { SecurityEvent } from './SecurityIncidentPipeline.js';

export interface TriageRecommendation {
    riskScore: number;
    action: 'ignore' | 'investigate' | 'block';
    reason: string;
}

export class AlertTriageV2Service {
    async analyze(event: SecurityEvent): Promise<TriageRecommendation> {
        // Mock logic
        let riskScore = 0.1;
        if (event.severity === 'critical') riskScore = 0.9;
        else if (event.severity === 'high') riskScore = 0.7;
        else if (event.severity === 'medium') riskScore = 0.4;

        return {
            riskScore,
            action: riskScore > 0.5 ? 'investigate' : 'ignore',
            reason: 'Severity based triage'
        };
    }
}
