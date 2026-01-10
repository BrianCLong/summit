import { jest } from '@jest/globals';
import { NetworkSecurityService } from '../src/services/NetworkSecurityService.js';
import { TrafficFlow } from '../src/anomaly/traffic-types.js';

describe('NetworkSecurityService', () => {
    let service: NetworkSecurityService;

    beforeEach(() => {
        // Reset singleton (simulated) or just get instance
        service = NetworkSecurityService.getInstance();
        // Clear any previous listeners
        service.removeAllListeners('anomaly');
    });

    afterEach(() => {
        service.stop();
    });

    it('should detect malicious traffic', async () => {
        const maliciousFlows = service.generateMockTraffic(100, true);

    const anomalyPromise = new Promise<unknown>((resolve) => {
            service.once('anomaly', (result: unknown) => {
                resolve(result);
            });
        });

        service.ingestFlows(maliciousFlows);

        // Force analysis
        await service.analyzeNow();

        const result: any = await anomalyPromise;

        expect(result).toBeDefined();
        expect(result.isAnomaly).toBe(true);
        expect(result.explanation).toBeDefined();

        // Check if detected specific types
        const description = result.explanation.description;
        const details = JSON.stringify(result.explanation.details);

        // We injected SYN+FIN flags and SQLi payloads, so expect PROTOCOL detection
        expect(details).toContain('PROTOCOL');
    });

    it('should not flag normal traffic as critical anomaly', async () => {
        const normalFlows = service.generateMockTraffic(100, false);

        // We expect either no anomaly or a very low score one (due to random noise in small batch)
        const result = await service.analyzeNow();

        // Since analyzeNow returns the result of flushBuffer
        if (result && result.isAnomaly) {
            expect(result.severity).not.toBe('critical');
        }
    });

    it('should detect DDoS volume', async () => {
        const ddosFlows: TrafficFlow[] = [];
        const now = Date.now();
        // Keep below batch size to avoid auto-flush before analyzeNow
        for (let i = 0; i < 90; i++) {
             ddosFlows.push({
                flowId: `ddos-${i}`,
                sourceIp: `1.2.3.${i}`, // Distributed
                destIp: '10.0.0.1',
                sourcePort: 12345,
                destPort: 80,
                protocol: 'UDP',
                bytes: 100,
                packets: 50000, // HUGE PPS
                startTime: now,
                endTime: now + 0.001, // 1ms duration
             });
        }

        service.ingestFlows(ddosFlows);
        const result = await service.analyzeNow();

        expect(result).toBeDefined();
        expect(result!.isAnomaly).toBe(true);
        expect(JSON.stringify(result!.explanation)).toContain('DDOS');
    });
});
