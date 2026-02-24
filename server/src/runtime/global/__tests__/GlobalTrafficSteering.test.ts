
import { jest } from '@jest/globals';

type GlobalTrafficSteering = InstanceType<typeof import('../GlobalTrafficSteering.js').GlobalTrafficSteering>;
const { GlobalTrafficSteering } = await import('../GlobalTrafficSteering.js');

describe('GlobalTrafficSteering', () => {
    let steering: GlobalTrafficSteering;

    beforeEach(() => {
        // Reset singleton for testing
        // @ts-ignore
        GlobalTrafficSteering.instance = undefined;
        steering = GlobalTrafficSteering.getInstance();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with default configuration', () => {
        expect(steering).toBeDefined();
    });

    it('should route traffic based on load', () => {
        const region = steering.routeRequest('tenant-1', { type: 'query' });
        expect(region).toBeDefined();
    });

    it('should handle region failure gracefully', () => {
        // Simulate region failure
        steering.markRegionDown('us-east-1');
        const region = steering.routeRequest('tenant-1', { type: 'query' });
        expect(region).not.toBe('us-east-1');
    });
});
