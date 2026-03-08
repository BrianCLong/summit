"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** @jest-environment node */
const patterns_js_1 = require("../src/patterns.js");
const buildContext = (events, random = () => 0.5) => ({
    index: 0,
    events,
    options: Object.freeze({}),
    random,
});
describe('patterns', () => {
    it('amplifies string signals and enforces minimum thresholds', () => {
        const event = {
            id: 'base',
            timestamp: 0,
            payload: { signal: '4' },
        };
        const pattern = (0, patterns_js_1.createAmplifyPattern)({
            name: 'amp',
            intensities: [0.5, 2],
            minimumSignal: 1,
        });
        const derivatives = pattern.boost(event, buildContext([event]));
        expect(derivatives).toHaveLength(2);
        expect(derivatives[0].payload.signal).toBe(2);
        expect(derivatives[1].payload.signal).toBe(8);
        const lowPattern = (0, patterns_js_1.createAmplifyPattern)({
            name: 'amp-low',
            intensities: [0.1],
            minimumSignal: 1,
        });
        expect(lowPattern.boost(event, buildContext([event]))).toHaveLength(0);
    });
    it('clones events across temporal offsets', () => {
        const event = {
            id: 'base',
            timestamp: 1_000,
            payload: { signal: 2 },
        };
        const pattern = (0, patterns_js_1.createTemporalShiftPattern)({
            name: 'shift',
            offsetsMs: [-1_000, 1_000],
            decay: 500,
        });
        const derivatives = pattern.boost(event, buildContext([event]));
        expect(derivatives.map((item) => item.timestamp)).toEqual([0, 2_000]);
        expect(derivatives[0].boostScore).toBeCloseTo(Math.exp(-2));
    });
    it('injects bounded noise into signals', () => {
        const event = {
            id: 'base',
            timestamp: 0,
            payload: { signal: 10 },
        };
        const pattern = (0, patterns_js_1.createNoisePattern)({ name: 'noise', maxNoise: 0.1 });
        const derivatives = pattern.boost(event, buildContext([event], () => 0.75));
        expect(derivatives).toHaveLength(1);
        expect(derivatives[0].payload.noise).toBeCloseTo(0.05, 5);
        expect(derivatives[0].payload.signal).toBeCloseTo(10.5);
    });
});
