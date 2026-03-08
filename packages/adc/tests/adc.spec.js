"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_js_1 = require("../src.js");
const afl_store_1 = require("@intelgraph/afl-store");
const crypto_1 = require("crypto");
describe('ADC', () => {
    let aflStore;
    let adc;
    beforeEach(() => {
        aflStore = new afl_store_1.AFLStore('redis://localhost:6381'); // Mock or test Redis
        adc = new src_js_1.ADC(aflStore);
    });
    afterEach(async () => {
        await aflStore.close();
    });
    test('should deploy bait drop and detect trigger', async () => {
        const expectedFp = {
            contentHash: (0, crypto_1.randomUUID)(),
            formatSig: 'test',
            timingSig: 'test',
            xformSig: 'test',
            route: 'test',
        };
        const bait = await adc.deployBaitDrop('fake content', expectedFp);
        expect(bait).toBeDefined();
        const triggeredBait = await adc.monitorBaitDrops(expectedFp);
        expect(triggeredBait?.triggered).toBe(true);
    });
    test('should trigger counter-drop', async () => {
        const result = await adc.triggerCounterDrop('adversary.com', {
            type: 'contradiction',
            content: 'This is false.',
        });
        expect(result).toBe(true);
    });
});
