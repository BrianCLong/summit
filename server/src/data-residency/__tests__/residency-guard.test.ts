import { jest } from '@jest/globals';
import { ResidencyGuard } from '../residency-guard';

describe('ResidencyGuard', () => {
    it('should check residency', () => {
        expect(ResidencyGuard).toBeDefined();
    });
});
