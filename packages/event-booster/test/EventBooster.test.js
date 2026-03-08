"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/** @jest-environment node */
const index_js_1 = __importStar(require("../src/index.js"));
const createClock = (...ticks) => {
    let index = 0;
    const fallback = ticks.length > 0 ? ticks[ticks.length - 1] : 0;
    return () => {
        const value = ticks[index] ?? fallback;
        index += 1;
        return value;
    };
};
describe('EventBooster', () => {
    it('registers patterns and prevents duplicates', () => {
        const booster = new index_js_1.default();
        const pattern = (0, index_js_1.createAmplifyPattern)({
            name: 'amplify',
            intensities: [1.5],
        });
        booster.registerPattern(pattern);
        expect(booster.listPatterns()).toEqual([
            { name: 'amplify', description: expect.stringContaining('Amplifies') },
        ]);
        expect(() => booster.registerPattern(pattern)).toThrow('already registered');
    });
    it('boosts events using an amplify pattern', () => {
        const booster = new index_js_1.default({
            now: createClock(0, 4),
            performanceBudgetMs: 5,
        });
        const pattern = (0, index_js_1.createAmplifyPattern)({ name: 'amp', intensities: [2, 3] });
        booster.registerPattern(pattern);
        const events = [
            { id: 'e1', timestamp: 100, payload: { signal: 2 }, tags: ['raw'] },
            { id: 'e2', timestamp: 200, payload: { signal: 3 } },
        ];
        const result = booster.boost(events, 'amp');
        expect(result.outputCount).toBe(4);
        expect(result.events).toHaveLength(4);
        const derivative = result.events[0];
        expect(derivative.sourceEventId).toBe('e1');
        expect(derivative.payload.signal).toBeCloseTo(4);
        expect(derivative.tags).toContain('amp');
        expect(result.budgetExceeded).toBe(false);
    });
    it('flags performance budget overruns', () => {
        const booster = new index_js_1.default({
            now: createClock(0, 10),
            performanceBudgetMs: 5,
        });
        const pattern = (0, index_js_1.createTemporalShiftPattern)({
            name: 'shift',
            offsetsMs: [0],
        });
        booster.registerPattern(pattern);
        const events = (0, index_js_1.generateUniformEvents)(1, { signal: 5, random: () => 0.5 });
        const result = booster.boost(events, 'shift');
        expect(result.budgetExceeded).toBe(true);
        expect(result.durationMs).toBeGreaterThanOrEqual(10);
    });
    it('throws when boosting without a registered pattern', () => {
        const booster = new index_js_1.default();
        const events = (0, index_js_1.generateUniformEvents)(2, { random: () => 0.3 });
        expect(() => booster.boost(events, 'missing')).toThrow('not registered');
    });
    it('limits history and exposes summaries', () => {
        const booster = new index_js_1.default({
            now: createClock(0, 1, 0, 1, 0, 1),
            maxHistory: 2,
        });
        const pattern = (0, index_js_1.createTemporalShiftPattern)({
            name: 'shift',
            offsetsMs: [0],
        });
        booster.registerPattern(pattern);
        const events = (0, index_js_1.generateUniformEvents)(1, { random: () => 0.5 });
        booster.boost(events, 'shift');
        booster.boost(events, 'shift');
        booster.boost(events, 'shift');
        const history = booster.getHistory();
        expect(history).toHaveLength(2);
        expect(history[0].startedAt).toBe(0);
        expect(booster.getHistory(1)).toHaveLength(1);
        booster.clearHistory();
        expect(booster.getHistory()).toHaveLength(0);
    });
    it('supports generator-based boosting', () => {
        const booster = new index_js_1.default();
        const pattern = (0, index_js_1.createAmplifyPattern)({ name: 'amp', intensities: [1.1] });
        booster.registerPattern(pattern);
        const generator = jest.fn(() => (0, index_js_1.generateUniformEvents)(1, { signal: 2, random: () => 0.5 }));
        const result = booster.boostFromGenerator(generator, 'amp');
        expect(generator).toHaveBeenCalled();
        expect(result.outputCount).toBe(1);
    });
    it('creates boosters with default patterns preloaded', () => {
        const booster = (0, index_js_1.createDefaultEventBooster)();
        expect(booster.listPatterns().length).toBeGreaterThanOrEqual(3);
        const events = (0, index_js_1.generateUniformEvents)(1, { signal: 2, random: () => 0.4 });
        const result = booster.boost(events, booster.listPatterns()[0].name);
        expect(result.outputCount).toBeGreaterThan(0);
    });
});
