"use strict";
/**
 * Tests for scoring utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
const scoring_1 = require("../src/utils/scoring");
const types_1 = require("../src/types");
describe('scoreToRiskLevel', () => {
    it('should return LOW for scores 0-25', () => {
        expect((0, scoring_1.scoreToRiskLevel)(0)).toBe(types_1.RiskLevel.LOW);
        expect((0, scoring_1.scoreToRiskLevel)(25)).toBe(types_1.RiskLevel.LOW);
    });
    it('should return MODERATE for scores 26-50', () => {
        expect((0, scoring_1.scoreToRiskLevel)(26)).toBe(types_1.RiskLevel.MODERATE);
        expect((0, scoring_1.scoreToRiskLevel)(50)).toBe(types_1.RiskLevel.MODERATE);
    });
    it('should return HIGH for scores 51-75', () => {
        expect((0, scoring_1.scoreToRiskLevel)(51)).toBe(types_1.RiskLevel.HIGH);
        expect((0, scoring_1.scoreToRiskLevel)(75)).toBe(types_1.RiskLevel.HIGH);
    });
    it('should return CRITICAL for scores 76-100', () => {
        expect((0, scoring_1.scoreToRiskLevel)(76)).toBe(types_1.RiskLevel.CRITICAL);
        expect((0, scoring_1.scoreToRiskLevel)(100)).toBe(types_1.RiskLevel.CRITICAL);
    });
    it('should throw error for scores out of range', () => {
        expect(() => (0, scoring_1.scoreToRiskLevel)(-1)).toThrow();
        expect(() => (0, scoring_1.scoreToRiskLevel)(101)).toThrow();
    });
});
describe('weightedAverage', () => {
    it('should calculate weighted average correctly', () => {
        const scores = [
            { value: 100, weight: 0.5 },
            { value: 0, weight: 0.5 },
        ];
        expect((0, scoring_1.weightedAverage)(scores)).toBe(50);
    });
    it('should handle unequal weights', () => {
        const scores = [
            { value: 100, weight: 0.75 },
            { value: 0, weight: 0.25 },
        ];
        expect((0, scoring_1.weightedAverage)(scores)).toBe(75);
    });
    it('should throw error for empty array', () => {
        expect(() => (0, scoring_1.weightedAverage)([])).toThrow();
    });
    it('should throw error for zero total weight', () => {
        const scores = [
            { value: 100, weight: 0 },
            { value: 50, weight: 0 },
        ];
        expect(() => (0, scoring_1.weightedAverage)(scores)).toThrow();
    });
});
describe('normalize', () => {
    it('should normalize value to 0-100 scale', () => {
        expect((0, scoring_1.normalize)(50, 0, 100, false)).toBe(50);
        expect((0, scoring_1.normalize)(25, 0, 100, false)).toBe(25);
        expect((0, scoring_1.normalize)(75, 0, 100, false)).toBe(75);
    });
    it('should handle inverse normalization', () => {
        expect((0, scoring_1.normalize)(50, 0, 100, true)).toBe(50);
        expect((0, scoring_1.normalize)(0, 0, 100, true)).toBe(100);
        expect((0, scoring_1.normalize)(100, 0, 100, true)).toBe(0);
    });
    it('should clamp values outside range', () => {
        expect((0, scoring_1.normalize)(-10, 0, 100, false)).toBe(0);
        expect((0, scoring_1.normalize)(110, 0, 100, false)).toBe(100);
    });
    it('should throw error if min >= max', () => {
        expect(() => (0, scoring_1.normalize)(50, 100, 0, false)).toThrow();
        expect(() => (0, scoring_1.normalize)(50, 50, 50, false)).toThrow();
    });
});
describe('calculateConfidence', () => {
    it('should return VERY_HIGH for excellent metrics', () => {
        const confidence = (0, scoring_1.calculateConfidence)({
            dataRecency: 1,
            sourceReliability: 95,
            dataCompleteness: 100,
            expertConsensus: 90,
        });
        expect(confidence).toBe(types_1.ConfidenceLevel.VERY_HIGH);
    });
    it('should return LOW for poor metrics', () => {
        const confidence = (0, scoring_1.calculateConfidence)({
            dataRecency: 365,
            sourceReliability: 30,
            dataCompleteness: 40,
            expertConsensus: 35,
        });
        expect(confidence).toBe(types_1.ConfidenceLevel.LOW);
    });
    it('should penalize old data', () => {
        const recent = (0, scoring_1.calculateConfidence)({
            dataRecency: 1,
            sourceReliability: 70,
            dataCompleteness: 70,
            expertConsensus: 70,
        });
        const old = (0, scoring_1.calculateConfidence)({
            dataRecency: 300,
            sourceReliability: 70,
            dataCompleteness: 70,
            expertConsensus: 70,
        });
        // Recent data should have higher confidence
        expect(recent).not.toBe(old);
    });
});
describe('detectTrend', () => {
    it('should detect rising trend', () => {
        const values = [10, 20, 30, 40, 50];
        expect((0, scoring_1.detectTrend)(values)).toBe('RISING');
    });
    it('should detect declining trend', () => {
        const values = [50, 40, 30, 20, 10];
        expect((0, scoring_1.detectTrend)(values)).toBe('DECLINING');
    });
    it('should detect stable trend', () => {
        const values = [50, 51, 50, 49, 50];
        expect((0, scoring_1.detectTrend)(values)).toBe('STABLE');
    });
    it('should return STABLE for insufficient data', () => {
        expect((0, scoring_1.detectTrend)([50])).toBe('STABLE');
    });
});
describe('calculateCAGR', () => {
    it('should calculate CAGR correctly', () => {
        const cagr = (0, scoring_1.calculateCAGR)(100, 200, 5);
        expect(cagr).toBeCloseTo(14.87, 1);
    });
    it('should throw error for non-positive values', () => {
        expect(() => (0, scoring_1.calculateCAGR)(0, 100, 5)).toThrow();
        expect(() => (0, scoring_1.calculateCAGR)(100, -100, 5)).toThrow();
    });
    it('should throw error for non-positive years', () => {
        expect(() => (0, scoring_1.calculateCAGR)(100, 200, 0)).toThrow();
        expect(() => (0, scoring_1.calculateCAGR)(100, 200, -5)).toThrow();
    });
});
