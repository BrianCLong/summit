"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const information_gain_1 = require("../../../benchmarks/interactive/scoring/information_gain");
const budget_efficiency_1 = require("../../../benchmarks/interactive/scoring/budget_efficiency");
const mockTraces = [
    { step: 1, timestamp: '1', action: { type: 'a' }, observation: { state: 's1' }, reward: 1, budget: { steps_remaining: 9, wallclock_remaining_ms: 100 } },
    { step: 2, timestamp: '2', action: { type: 'a' }, observation: { state: 's2' }, reward: 1, budget: { steps_remaining: 8, wallclock_remaining_ms: 90 } },
    { step: 3, timestamp: '3', action: { type: 'b' }, observation: { state: 's3', done: true }, reward: 5, budget: { steps_remaining: 7, wallclock_remaining_ms: 80 } }
];
(0, node_test_1.default)('scoreInformationGain calculates correctly', () => {
    const score = (0, information_gain_1.scoreInformationGain)(mockTraces);
    // 3 unique states over 3 traces -> exploration score = 1.0
    // total reward = 7 over 3 traces -> reward score = 2.333
    // info gain = (1.0 * 0.6) + (2.333 * 0.4) = 0.6 + 0.933 = 1.533
    node_assert_1.default.ok(score > 1.5 && score < 1.6);
});
(0, node_test_1.default)('scoreBudgetEfficiency calculates correctly', () => {
    const maxSteps = 10;
    const score = (0, budget_efficiency_1.scoreBudgetEfficiency)(mockTraces, maxSteps);
    // 3 steps taken out of 10 -> efficiency = 0.7
    // last trace done=true -> multiplier = 1.5
    // score = 0.7 * 1.5 = 1.05
    // using approximately equal due to floating point math
    node_assert_1.default.ok(Math.abs(score - 1.05) < 0.001);
});
