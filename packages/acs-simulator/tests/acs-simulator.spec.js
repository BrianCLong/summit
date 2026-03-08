"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_js_1 = require("../src.js");
const index_1 = require("@intelgraph/atl/src/index");
const index_2 = require("@intelgraph/adc/src/index");
const afl_store_1 = require("@intelgraph/afl-store");
describe('ACSSimulator', () => {
    let atlModel; // Mock ATLModel
    let adcModule; // Mock ADC
    let acsSimulator;
    let aflStore;
    beforeEach(() => {
        aflStore = new afl_store_1.AFLStore('redis://localhost:6381');
        atlModel = (0, index_1.trainATL)([]); // Initialize with empty data for mock
        adcModule = new index_2.ADC(aflStore);
        acsSimulator = new src_js_1.ACSSimulator(atlModel, adcModule);
    });
    afterEach(async () => {
        await aflStore.close();
    });
    test('should run a simulation and return replay results', async () => {
        const initialState = {
            currentTariff: { minProofLevel: 'standard', rateLimit: 10, throttleMs: 0 },
            adversaryFingerprints: [],
        };
        const adversaryStrategy = [
            { type: 'attack', params: { target: 'system' } },
            { type: 'evade', params: { method: 'obfuscation' } },
        ];
        const results = await acsSimulator.runSimulation(initialState, adversaryStrategy);
        expect(results).toBeInstanceOf(Array);
        expect(results.length).toBe(adversaryStrategy.length);
    });
});
