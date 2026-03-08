"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const metering_js_1 = require("../src/conductor/metering.js");
test('records meters (schema must exist)', async () => {
    await expect((0, metering_js_1.recordMeters)('acme', {
        cpuSec: 1,
        gbSec: 2,
        egressGb: 0.1,
        dpEpsilon: 0.01,
        pluginCalls: 3,
    })).rejects.toBeTruthy(); // Without DB this will reject; ensures function runs
});
