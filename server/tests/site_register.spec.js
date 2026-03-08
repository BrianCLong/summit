"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const register_js_1 = require("../src/sites/register.js");
test('registers site and rejects bad signatures', async () => {
    const s = await (0, register_js_1.registerSite)({
        name: 'edge-paris',
        region: 'eu-west-1',
        residency: 'EU',
        pubkey: '-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----\n',
        bandwidth: 'low',
    });
    expect(s.region).toBe('eu-west-1');
    expect((0, register_js_1.verifySignature)('bad', Buffer.from('x'), 'abc=')).toBe(false);
});
