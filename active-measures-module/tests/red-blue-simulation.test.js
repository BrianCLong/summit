"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const red_blue_simulation_1 = require("../src/ai/red-blue-simulation");
describe('runRedBlueSimulation', () => {
    test('detects attack when control covers tactic', () => {
        const actions = [
            { id: 'a1', tactic: 'initial-access', timestamp: 0, success: true },
            { id: 'a2', tactic: 'execution', timestamp: 10, success: true },
        ];
        const controls = [
            { id: 'c1', name: 'edr', detects: ['execution'], effectiveness: 1 },
        ];
        const result = (0, red_blue_simulation_1.runRedBlueSimulation)(actions, controls);
        expect(result.timeToDetect).toBe(10);
        expect(result.lateralSpread).toBe(1);
        expect(result.containmentTime).toBe(11);
    });
});
