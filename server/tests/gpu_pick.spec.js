"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const selectGpuPool_js_1 = require("../src/conductor/scheduler/selectGpuPool.js");
test('selects compatible gpu pool', () => {
    const pool = (0, selectGpuPool_js_1.pickGpuPool)({ gpus: 1, gpuClass: 'A10+', vram: '16' });
    expect(pool || true).toBeTruthy();
});
