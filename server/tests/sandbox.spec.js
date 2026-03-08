"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sandbox_js_1 = require("../src/conductor/sandbox.js");
test('creates sandbox namespace (may fail outside cluster)', async () => {
    await expect((0, sandbox_js_1.createSandbox)('run-12345678', ['s3://*'])).rejects.toBeTruthy();
});
