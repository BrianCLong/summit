import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NarrativeForecastingService } from '../NarrativeForecastingService.js';
import { NarrativeAnalysisService } from '../NarrativeAnalysisService.js';
import * as neo4j from '../../graph/neo4j.js';

vi.mock('../../graph/neo4j.js');

describe('NarrativeForecastingService Integration', () => {
    let forecastingService: NarrativeForecastingService;

    beforeEach(() => {
        forecastingService = new NarrativeForecastingService();
        vi.clearAllMocks();
    });

    it('should forecast different trajectories based on population psychographics', async () => {
        const narrativeId = 'test-narrative';

        // Mock snapshot
        vi.spyOn(NarrativeAnalysisService.prototype, 'takeSnapshot').mockResolvedValue({
            timestamp: new Date(),
            narrativeId,
            metrics: {
                nodeCount: 100,
                edgeCount: 200,
                avgDegree: 4,
                density: 0.1,
                clusteringCoefficient: 0.2
            },
            topTopics: [{ topic: 'test', frequency: 10 }],
            amplificationVelocity: 5
        });

        // Test Scenario 1: Skeptical Population (High Analytical, Low Trust)
        (neo4j.runCypher as any).mockResolvedValueOnce([{
            totalPopulation: 100000,
            anxietyLevel: 0.2,
            angerLevel: 0.1,
            segments: [{
                id: 'skeptics',
                name: 'Skeptical Segment',
                size: 100000,
                psychographics: {
                    cognitiveProfile: { analyticalThinking: 0.9, needForCognition: 0.8 },
                    institutionalTrust: { government: 0.1, media: 0.1 },
                    authorityTrust: 0.1,
                    moralFoundations: { care: 0.5, loyalty: 0.2, authority: 0.2 }
                },
                susceptibilityProfile: { disinformation: 0.1, emotionalAppeals: 0.1, authorityAppeals: 0.1 }
            }]
        }]);

        const skepticalResult = await forecastingService.forecastNarrativeTrajectory(narrativeId);

        // Test Scenario 2: Vulnerable Population (Low Analytical, High Stress)
        (neo4j.runCypher as any).mockResolvedValueOnce([{
            totalPopulation: 100000,
            anxietyLevel: 0.8,
            angerLevel: 0.7,
            segments: [{
                id: 'vulnerable',
                name: 'High Stress Segment',
                size: 100000,
                psychographics: {
                    cognitiveProfile: { analyticalThinking: 0.2, needForCognition: 0.2 },
                    institutionalTrust: { government: 0.2, media: 0.2 },
                    authorityTrust: 0.2,
                    moralFoundations: { care: 0.5, loyalty: 0.8, authority: 0.8 }
                },
                susceptibilityProfile: { disinformation: 0.8, emotionalAppeals: 0.8, authorityAppeals: 0.8 }
            }]
        }]);

        const vulnerableResult = await forecastingService.forecastNarrativeTrajectory(narrativeId);

        console.log(`Skeptical Peak Reach: ${skepticalResult.predictedPeakReach}`);
        console.log(`Vulnerable Peak Reach: ${vulnerableResult.predictedPeakReach}`);

        // Expectations: Vulnerable population should have significantly higher peak reach
        expect(vulnerableResult.predictedPeakReach).toBeGreaterThan(skepticalResult.predictedPeakReach);
        expect(vulnerableResult.cascadeProbability).toBeGreaterThan(skepticalResult.cascadeProbability);
    });
});
