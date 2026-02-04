import { describe, it, expect } from 'vitest';
import { DualUseGuard } from '../src/dual_use.js';

describe('DualUseGuard', () => {
    it('should allow benign output', () => {
        const output = {
            summary: "Analysis complete",
            risk_score: 0.5
        };
        expect(DualUseGuard.check(output)).toBe(true);
    });

    it('should block targeting list in keys', () => {
        const output = {
            targeting_list: ["user1", "user2"]
        };
        expect(() => DualUseGuard.check(output)).toThrow(/Detected blocked term: targeting_list/);
    });

    it('should block microtarget recommendation in values', () => {
        const output = {
            recommendation: "microtarget_recommendation for user X"
        };
        expect(() => DualUseGuard.check(output)).toThrow(/Detected blocked term: microtarget_recommendation/);
    });

    it('should block nested targeting output', () => {
        const output = {
            data: {
                strategy: {
                    details: "optimal_message_for_person"
                }
            }
        };
        expect(() => DualUseGuard.check(output)).toThrow(/Detected blocked term: optimal_message_for_person/);
    });
});
