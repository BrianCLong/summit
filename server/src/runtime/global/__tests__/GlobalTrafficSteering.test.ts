import { jest } from '@jest/globals';

const getResidencyConfigMock = jest.fn();
const resolveTargetRegionMock = jest.fn();
const getCurrentRegionMock = jest.fn().mockReturnValue('us-east-1');

jest.unstable_mockModule('../../../data-residency/residency-guard.js', () => ({
    ResidencyGuard: {
        getInstance: () => ({
            getResidencyConfig: getResidencyConfigMock,
        }),
    },
}));

jest.unstable_mockModule('../../../services/RegionalFailoverService.js', () => ({
    RegionalFailoverService: {
        getInstance: () => ({
            resolveTargetRegion: resolveTargetRegionMock,
        }),
    },
}));

jest.unstable_mockModule('../../../config/regional-config.js', () => ({
    getCurrentRegion: getCurrentRegionMock,
    REGIONAL_CONFIG: {
        'us-east-1': { region: 'us-east-1', baseUrl: 'https://us-east.summit.io' },
        'eu-central-1': { region: 'eu-central-1', baseUrl: 'https://eu-central.summit.io' },
    },
}));

// Set default resolveTargetRegion to avoid undefined during module initialization if it were used there
resolveTargetRegionMock.mockReturnValue('us-east-1');

const { GlobalTrafficSteering } = await import('../GlobalTrafficSteering.js');

describe('GlobalTrafficSteering', () => {
    let steering: InstanceType<typeof GlobalTrafficSteering>;

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset singleton if possible, or just use the existing one
        steering = GlobalTrafficSteering.getInstance();
    });

    it('should ALLOW traffic if current region matches primary region', async () => {
        getResidencyConfigMock.mockResolvedValue({
            primaryRegion: 'us-east-1',
            allowedRegions: ['us-east-1'],
            residencyMode: 'strict'
        });

        resolveTargetRegionMock.mockReturnValue('us-east-1');
        getCurrentRegionMock.mockReturnValue('us-east-1');

        const result = await steering.resolveSteeringAction('tenant-1');
        expect(result.action).toBe('ALLOW');
    });

    it('should REDIRECT traffic if current region is not allowed for strict tenant', async () => {
        getResidencyConfigMock.mockResolvedValue({
            primaryRegion: 'eu-central-1',
            allowedRegions: ['eu-central-1'],
            residencyMode: 'strict'
        });

        resolveTargetRegionMock.mockReturnValue('eu-central-1');
        getCurrentRegionMock.mockReturnValue('us-east-1');

        const result = await steering.resolveSteeringAction('tenant-1');
        expect(result.action).toBe('REDIRECT');
        expect(result.targetUrl).toBe('https://eu-central.summit.io');
    });
});
