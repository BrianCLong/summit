import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { CIBDetectionService } from '../CIBDetectionService.js';
import { BehavioralFingerprintService } from '../BehavioralFingerprintService.js';
import { SentimentAnalysisService } from '../SentimentAnalysisService.js';

describe('CIBDetectionService', () => {
    let service: CIBDetectionService;

    beforeEach(() => {
        service = new CIBDetectionService();
    });

    describe('detectCIB', () => {
        it('should detect a coordinated bot cluster based on temporal patterns', async () => {
            const entityIds = ['bot1', 'bot2', 'user1'];

            // Mock telemetry: bot1 and bot2 have identical high-frequency activity
            const telemetryData = new Map([
                ['bot1', [{ clicks: 100, timeInView: 60, editRate: 10 }]],
                ['bot2', [{ clicks: 100, timeInView: 60, editRate: 10 }]],
                ['user1', [{ clicks: 5, timeInView: 300, editRate: 1 }]]
            ]);

            // Mock texts: bot1 and bot2 post the same message
            const texts = new Map([
                ['bot1', ['Breaking news: Buy this token now!', 'Toxic message about the target']],
                ['bot2', ['Breaking news: Buy this token now!', 'Toxic message about the target']],
                ['user1', ['I love the new graph feature', 'Actually, the UX is a bit complex']]
            ]);

            const result = await service.detectCIB(entityIds, telemetryData, texts);

            expect(result.identifiedBotClusters).toHaveLength(1);
            const cluster = result.identifiedBotClusters[0];
            expect(cluster.memberIds).toContain('bot1');
            expect(cluster.memberIds).toContain('bot2');
            expect(cluster.confidence).toBeGreaterThan(0.7);
            expect(cluster.reason).toContain('High temporal coordination');
            expect(cluster.reason).toContain('Highly similar content');
        });

        it('should detect toxicity anomalies', async () => {
            const entityIds = ['troll1', 'troll2'];
            const telemetryData = new Map([
                ['troll1', [{ clicks: 10, timeInView: 60, editRate: 1 }]],
                ['troll2', [{ clicks: 10, timeInView: 60, editRate: 1 }]]
            ]);
            const texts = new Map([
                ['troll1', ['kill', 'hate', 'stupid', 'idiot', 'scam', 'fraud']],
                ['troll2', ['attack', 'destroy', 'lie', 'liar', 'fake news', 'conspiracy']]
            ]);

            const result = await service.detectCIB(entityIds, telemetryData, texts);

            const toxicityAnomaly = result.anomalies.find(a => a.type === 'toxicity');
            expect(toxicityAnomaly).toBeDefined();
            expect(toxicityAnomaly?.severity).toBe('high');
        });

        it('should not flag high-frequency human users as bots (false positive mitigation)', async () => {
            const entityIds = ['power_user1', 'power_user2'];

            // Power users have high clicks but different click-bins (simulated by random)
            const telemetryData = new Map([
                ['power_user1', [{ clicks: 150, timeInView: 120, editRate: 15 }]],
                ['power_user2', [{ clicks: 140, timeInView: 130, editRate: 12 }]]
            ]);

            const texts = new Map([
                ['power_user1', ['I am posting a lot because I love this platform!', 'Community update: check this out']],
                ['power_user2', ['Great features in the new release.', 'Just finished my 10th investigation today']]
            ]);

            const result = await service.detectCIB(entityIds, telemetryData, texts);

            // They might cluster, but confidence should be lower than coordinated bots
            const cluster = result.identifiedBotClusters[0];
            if (cluster) {
                expect(cluster.confidence).toBeLessThan(0.8);
                expect(cluster.reason).not.toContain('Highly similar content');
            }
        });

        it('should identify distinct campaigns/clusters separately', async () => {
            const entityIds = ['camp1_bot1', 'camp1_bot2', 'camp2_bot1', 'camp2_bot2'];

            const telemetryData = new Map([
                ['camp1_bot1', [{ clicks: 100, timeInView: 60, editRate: 10 }]],
                ['camp1_bot2', [{ clicks: 100, timeInView: 60, editRate: 10 }]],
                ['camp2_bot1', [{ clicks: 300, timeInView: 200, editRate: 5 }]],
                ['camp2_bot2', [{ clicks: 300, timeInView: 200, editRate: 5 }]]
            ]);

            const texts = new Map([
                ['camp1_bot1', ['#Election2025 is rigged!', 'Do not trust the media']],
                ['camp1_bot2', ['#Election2025 is rigged!', 'Do not trust the media']],
                ['camp2_bot1', ['Buy $SHIB now!', 'To the moon!']],
                ['camp2_bot2', ['Buy $SHIB now!', 'To the moon!']]
            ]);

            const result = await service.detectCIB(entityIds, telemetryData, texts);

            expect(result.identifiedBotClusters.length).toBeGreaterThanOrEqual(2);
        });
    });
});
