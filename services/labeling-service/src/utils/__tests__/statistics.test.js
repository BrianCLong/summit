"use strict";
/**
 * Unit tests for statistics utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
const statistics_js_1 = require("../statistics.js");
describe('statistics utilities', () => {
    describe('Cohen', s, Kappa, ', () => {, it('should calculate perfect agreement', () => {
        const rater1 = ['A', 'B', 'C', 'A', 'B'];
        const rater2 = ['A', 'B', 'C', 'A', 'B'];
        const kappa = (0, statistics_js_1.calculateCohensKappa)(rater1, rater2);
        expect(kappa).toBe(1);
    }));
    it('should calculate partial agreement', () => {
        const rater1 = ['A', 'B', 'C', 'A', 'B'];
        const rater2 = ['A', 'B', 'C', 'B', 'B'];
        const kappa = (0, statistics_js_1.calculateCohensKappa)(rater1, rater2);
        expect(kappa).toBeGreaterThan(0);
        expect(kappa).toBeLessThan(1);
    });
    it('should handle complete disagreement', () => {
        const rater1 = ['A', 'A', 'A', 'A', 'A'];
        const rater2 = ['B', 'B', 'B', 'B', 'B'];
        const kappa = (0, statistics_js_1.calculateCohensKappa)(rater1, rater2);
        expect(kappa).toBeLessThanOrEqual(0);
    });
    it('should return null for mismatched lengths', () => {
        const rater1 = ['A', 'B', 'C'];
        const rater2 = ['A', 'B'];
        const kappa = (0, statistics_js_1.calculateCohensKappa)(rater1, rater2);
        expect(kappa).toBeNull();
    });
    it('should return null for empty arrays', () => {
        const rater1 = [];
        const rater2 = [];
        const kappa = (0, statistics_js_1.calculateCohensKappa)(rater1, rater2);
        expect(kappa).toBeNull();
    });
});
describe('Fleiss', Kappa, ', () => {, it('should calculate perfect agreement for multiple raters', () => {
    const ratings = [
        ['A', 'A', 'A'],
        ['B', 'B', 'B'],
        ['C', 'C', 'C'],
    ];
    const kappa = (0, statistics_js_1.calculateFleissKappa)(ratings);
    expect(kappa).toBe(1);
}));
it('should calculate partial agreement for multiple raters', () => {
    const ratings = [
        ['A', 'A', 'B'],
        ['B', 'B', 'B'],
        ['C', 'C', 'A'],
    ];
    const kappa = (0, statistics_js_1.calculateFleissKappa)(ratings);
    expect(kappa).toBeGreaterThan(0);
    expect(kappa).toBeLessThan(1);
});
it('should return null for less than 2 raters', () => {
    const ratings = [['A'], ['B'], ['C']];
    const kappa = (0, statistics_js_1.calculateFleissKappa)(ratings);
    expect(kappa).toBeNull();
});
it('should return null for empty ratings', () => {
    const ratings = [];
    const kappa = (0, statistics_js_1.calculateFleissKappa)(ratings);
    expect(kappa).toBeNull();
});
;
describe('Percent Agreement', () => {
    it('should calculate 100% agreement', () => {
        const rater1 = ['A', 'B', 'C'];
        const rater2 = ['A', 'B', 'C'];
        const agreement = (0, statistics_js_1.calculatePercentAgreement)(rater1, rater2);
        expect(agreement).toBe(1);
    });
    it('should calculate partial agreement', () => {
        const rater1 = ['A', 'B', 'C', 'D'];
        const rater2 = ['A', 'B', 'X', 'D'];
        const agreement = (0, statistics_js_1.calculatePercentAgreement)(rater1, rater2);
        expect(agreement).toBe(0.75);
    });
    it('should return 0 for complete disagreement', () => {
        const rater1 = ['A', 'A', 'A'];
        const rater2 = ['B', 'B', 'B'];
        const agreement = (0, statistics_js_1.calculatePercentAgreement)(rater1, rater2);
        expect(agreement).toBe(0);
    });
    it('should return 0 for mismatched lengths', () => {
        const rater1 = ['A', 'B'];
        const rater2 = ['A'];
        const agreement = (0, statistics_js_1.calculatePercentAgreement)(rater1, rater2);
        expect(agreement).toBe(0);
    });
});
describe('Confusion Matrix', () => {
    it('should build correct confusion matrix', () => {
        const rater1 = ['A', 'A', 'B', 'B'];
        const rater2 = ['A', 'B', 'A', 'B'];
        const matrix = (0, statistics_js_1.buildConfusionMatrix)(rater1, rater2);
        expect(matrix['A']['A']).toBe(1);
        expect(matrix['A']['B']).toBe(1);
        expect(matrix['B']['A']).toBe(1);
        expect(matrix['B']['B']).toBe(1);
    });
    it('should handle single category', () => {
        const rater1 = ['A', 'A', 'A'];
        const rater2 = ['A', 'A', 'A'];
        const matrix = (0, statistics_js_1.buildConfusionMatrix)(rater1, rater2);
        expect(matrix['A']['A']).toBe(3);
    });
});
describe('Kappa Interpretation', () => {
    it('should interpret kappa scores correctly', () => {
        expect((0, statistics_js_1.interpretKappa)(-0.1)).toBe('Poor (less than chance)');
        expect((0, statistics_js_1.interpretKappa)(0.1)).toBe('Slight');
        expect((0, statistics_js_1.interpretKappa)(0.3)).toBe('Fair');
        expect((0, statistics_js_1.interpretKappa)(0.5)).toBe('Moderate');
        expect((0, statistics_js_1.interpretKappa)(0.7)).toBe('Substantial');
        expect((0, statistics_js_1.interpretKappa)(0.9)).toBe('Almost Perfect');
    });
});
describe('Basic Statistics', () => {
    it('should calculate mean correctly', () => {
        expect((0, statistics_js_1.calculateMean)([1, 2, 3, 4, 5])).toBe(3);
        expect((0, statistics_js_1.calculateMean)([10, 20, 30])).toBe(20);
        expect((0, statistics_js_1.calculateMean)([])).toBe(0);
    });
    it('should calculate median correctly', () => {
        expect((0, statistics_js_1.calculateMedian)([1, 2, 3, 4, 5])).toBe(3);
        expect((0, statistics_js_1.calculateMedian)([1, 2, 3, 4])).toBe(2.5);
        expect((0, statistics_js_1.calculateMedian)([5])).toBe(5);
        expect((0, statistics_js_1.calculateMedian)([])).toBe(0);
    });
    it('should calculate standard deviation correctly', () => {
        const stddev = (0, statistics_js_1.calculateStdDev)([2, 4, 4, 4, 5, 5, 7, 9]);
        expect(stddev).toBeCloseTo(2, 0);
        expect((0, statistics_js_1.calculateStdDev)([])).toBe(0);
        expect((0, statistics_js_1.calculateStdDev)([5])).toBe(0);
    });
});
;
