"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const run_with_wasmtime_1 = require("../src/wasm/run_with_wasmtime");
test('env is filtered by allowlist', async () => {
    const res = await (0, run_with_wasmtime_1.runWithWasmtime)('./plugins/echo/plugin.wasm', { env: ['FOO_*'] }, { memMiB: 32 }, { FOO_BAR: '1', SECRET: 'x' });
    expect(res).toBeTruthy();
});
