"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Signer_js_1 = require("../products/Signer.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('KmsSigner', () => {
    (0, globals_1.it)('signs and verifies using client', async () => {
        const client = {
            sign: async (id, data) => data,
            verify: async (id, data, sig) => Buffer.compare(data, sig) === 0,
        };
        const signer = new Signer_js_1.KmsSigner('kid1', client);
        const payload = Buffer.from('hello');
        const sig = await signer.sign(payload);
        (0, globals_1.expect)(await signer.verify(payload, sig)).toBe(true);
        (0, globals_1.expect)(signer.kid()).toBe('kid1');
    });
});
