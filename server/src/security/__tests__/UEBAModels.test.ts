import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Use dynamic imports
const { UEBAModels } = await import('../UEBAModels.js');

describe('UEBAModels', () => {
    let ueba: any;
    let redisMock: any;

    beforeEach(() => {
        redisMock = {
            get: jest.fn(),
            set: jest.fn().mockResolvedValue('OK')
        };
        ueba = new UEBAModels(redisMock);
    });

    it('should create and update a user profile', async () => {
        redisMock.get.mockResolvedValue(null); // No existing profile

        const event = {
            entityId: 'user-123',
            entityType: 'user',
            action: 'LOGIN',
            region: 'US-EAST',
            timestamp: new Date().toISOString()
        } as any;

        const profile = await ueba.updateProfile(event);

        expect(profile.entityId).toBe('user-123');
        expect(profile.actionCounts['LOGIN']).toBe(1);
        expect(profile.geographicRegions).toContain('US-EAST');
        expect(redisMock.set).toHaveBeenCalled();
    });

    it('should detect geographic anomaly', async () => {
        const existingProfile = {
            entityId: 'user-123',
            entityType: 'user',
            geographicRegions: ['US-EAST'],
            actionCounts: {},
            hourlyDistribution: new Array(24).fill(0),
            typicalResources: [],
            riskScore: 0
        };
        redisMock.get.mockResolvedValue(JSON.stringify(existingProfile));

        const event = {
            entityId: 'user-123',
            entityType: 'user',
            action: 'LOGIN',
            region: 'KP-PYONGYANG', // Significant geographic shift
            timestamp: new Date().toISOString()
        } as any;

        const result = await ueba.analyzeAnomaly(event);

        expect(result.isAnomaly).toBe(false); // Only 40 points for region imbalance alone if threshold is 60
        expect(result.score).toBeGreaterThanOrEqual(40);
        expect(result.reasons).toContain('Atypical geographic region: KP-PYONGYANG');
    });

    it('should detect composite anomaly (hour + resource)', async () => {
        const existingProfile = {
            entityId: 'user-123',
            entityType: 'user',
            geographicRegions: ['US-EAST'],
            actionCounts: {},
            hourlyDistribution: new Array(24).fill(100), // Established baseline
            typicalResources: ['dashboard'],
            riskScore: 0
        };
        // Mock established baseline (9-5 activity)
        existingProfile.hourlyDistribution = new Array(24).fill(0);
        for (let i = 9; i <= 17; i++) existingProfile.hourlyDistribution[i] = 10;

        redisMock.get.mockResolvedValue(JSON.stringify(existingProfile));

        const event = {
            entityId: 'user-123',
            entityType: 'user',
            action: 'SENSITIVE_EXPORT',
            resource: 'classified-secrets',
            region: 'US-EAST',
            timestamp: new Date('2026-02-02T03:00:00Z').toISOString() // 3 AM
        } as any;

        const result = await ueba.analyzeAnomaly(event);

        expect(result.isAnomaly).toBe(false); // score 30 (hour) + 20 (resource) = 50 < 60
        expect(result.score).toBe(50);
        expect(result.reasons.length).toBe(2);
    });
});
