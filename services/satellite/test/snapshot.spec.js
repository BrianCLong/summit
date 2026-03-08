"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const verify_1 = require("../src/snapshots/verify");
test('fails on digest mismatch', async () => {
    await expect(async () => (0, verify_1.verifySnapshot)(Buffer.from('x'), 'sha256:dead', 'pub', 'sig')).rejects.toBeTruthy?.();
});
