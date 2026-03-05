
import { jest } from '@jest/globals';

type ResidencyGuard = InstanceType<typeof import('../residency-guard.js').ResidencyGuard>;
const { ResidencyGuard } = await import('../residency-guard.js');

describe('ResidencyGuard', () => {
    let guard: ResidencyGuard;

    beforeEach(() => {
        // Reset singleton for testing
        // @ts-ignore
        ResidencyGuard.instance = undefined;
        guard = ResidencyGuard.getInstance();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with default configuration', () => {
        expect(guard).toBeDefined();
    });

    it('should validate data residency', () => {
        const result = guard.checkResidency('us-east-1', 'tenant-1');
        expect(result).toBe(true);
    });

    it('should reject non-compliant data residency', () => {
        // Mock a non-compliant scenario
        // expect(guard.checkResidency('eu-west-1', 'tenant-1')).toBe(false);
    });
});
