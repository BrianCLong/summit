import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { FunnelService } from '../FunnelService.ts';
import { Funnel } from '../types.ts';

const TEST_LOG_DIR = path.join(__dirname, 'test_logs_funnels_' + Date.now());

describe('FunnelService', () => {
    let service: FunnelService;

    beforeEach(() => {
        if (fs.existsSync(TEST_LOG_DIR)) {
            fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(TEST_LOG_DIR, { recursive: true });
        service = new FunnelService(TEST_LOG_DIR);
    });

    afterEach(() => {
        if (fs.existsSync(TEST_LOG_DIR)) {
             try { fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true }); } catch (e: any) {}
        }
    });

    it('should compute funnel steps correctly', () => {
        const events = [
            // User 1: Full conversion A -> B -> C
            { eventType: 'page_view', scopeHash: 'u1', ts: '2023-01-01T10:00:00Z', props: { path: '/start' } },
            { eventType: 'click', scopeHash: 'u1', ts: '2023-01-01T10:01:00Z', props: { id: 'btn' } },
            { eventType: 'purchase', scopeHash: 'u1', ts: '2023-01-01T10:02:00Z', props: {} },

            // User 2: Drop off after A
            { eventType: 'page_view', scopeHash: 'u2', ts: '2023-01-01T11:00:00Z', props: { path: '/start' } },

            // User 3: A -> B but no C
            { eventType: 'page_view', scopeHash: 'u3', ts: '2023-01-01T12:00:00Z', props: { path: '/start' } },
            { eventType: 'click', scopeHash: 'u3', ts: '2023-01-01T12:05:00Z', props: { id: 'btn' } },
        ];

        fs.writeFileSync(path.join(TEST_LOG_DIR, 'telemetry.tsonl'), events.map(e => JSON.stringify(e)).join('\n'));

        const funnel: Funnel = {
            id: 'checkout',
            name: 'Checkout Funnel',
            windowSeconds: 3600,
            steps: [
                { name: 'Start', eventType: 'page_view', props: { path: '/start' } },
                { name: 'Click', eventType: 'click', props: { id: 'btn' } },
                { name: 'Buy', eventType: 'purchase' }
            ]
        };

        service.createFunnel(funnel);
        const report = service.generateReport('checkout');

        expect(report.totalStarted).toBe(3); // u1, u2, u3
        expect(report.stepCounts[0]).toBe(3);
        expect(report.stepCounts[1]).toBe(2); // u1, u3
        expect(report.stepCounts[2]).toBe(1); // u1
        expect(report.completed).toBe(1);

        expect(report.dropOffRates[1]).toBeCloseTo(33.33); // 3 -> 2 is 33% drop
        expect(report.dropOffRates[2]).toBeCloseTo(50.0); // 2 -> 1 is 50% drop
    });
});
