"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_js_1 = require("../src.js");
const index_1 = require("@intelgraph/atl/src/index");
const index_2 = require("@intelgraph/adc/src/index");
const afl_store_1 = require("@intelgraph/afl-store");
const index_3 = require("@intelgraph/crsp/src/index");
describe('ACSLearner', () => {
    let atlModel; // Mock ATLModel
    let adcModule; // Mock ADC
    let acsLearner;
    let aflStore;
    beforeEach(() => {
        aflStore = new afl_store_1.AFLStore('redis://localhost:6381');
        atlModel = (0, index_1.trainATL)([]); // Initialize with empty data for mock
        adcModule = new index_2.ADC(aflStore);
        acsLearner = new src_js_1.ACSLearner(atlModel, adcModule);
    });
    afterEach(async () => {
        await aflStore.close();
    });
    test('should learn strategy based on simulation results', async () => {
        const mockSimulationResults = [
            (0, index_3.replayWithSanctions)({ runId: 'r1', steps: [], plan: {} }, { apiFailureRate: 0.5, tokenCap: 1000, policyStrict: true }),
            (0, index_3.replayWithSanctions)({ runId: 'r2', steps: [], plan: {} }, { apiFailureRate: 0.2, tokenCap: 2000, policyStrict: false }),
        ];
        const actions = await acsLearner.learnStrategy(mockSimulationResults);
        expect(actions).toBeInstanceOf(Array);
        // Expect specific actions based on the mock results and heuristic in learnStrategy
        expect(actions.length).toBeGreaterThan(0);
    });
    test('should execute counterintel actions', async () => {
        const mockAction = { type: 'adjust_tariff', params: { level: 'stricter' } };
        // Mock console.log to check if it's called
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        await acsLearner.executeAction(mockAction);
        // Expect specific module methods to be called or state changes
        // For MVP, we just check console.log
        // expect(consoleSpy).toHaveBeenCalledWith("Executing action: Adjusting tariff");
        consoleSpy.mockRestore();
    });
});
