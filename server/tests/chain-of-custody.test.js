"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const chain_of_custody_js_1 = require("../src/cases/chain-of-custody.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('chain of custody', () => {
    (0, globals_1.it)('builds a hash-linked signed chain', async () => {
        const events = [];
        const db = {
            custodyEvent: {
                create: ({ data }) => {
                    events.push(data);
                },
            },
        };
        const { publicKey, privateKey } = (0, crypto_1.generateKeyPairSync)('ed25519');
        let prevHash = 'GENESIS';
        prevHash = await (0, chain_of_custody_js_1.writeCoC)(db, {
            caseId: 'c1',
            actorId: 'u1',
            action: 'CREATE',
            payload: { device: 'a' },
        }, prevHash, privateKey);
        prevHash = await (0, chain_of_custody_js_1.writeCoC)(db, {
            caseId: 'c1',
            actorId: 'u2',
            action: 'TRANSFER',
            payload: { reason: 'review' },
        }, prevHash, privateKey);
        (0, globals_1.expect)(events[1].prevHash).toBe(events[0].eventHash);
        const firstValid = (0, crypto_1.verify)(null, Buffer.from(events[0].eventHash), publicKey, Buffer.from(events[0].signature, 'base64'));
        (0, globals_1.expect)(firstValid).toBe(true);
        (0, globals_1.expect)((0, chain_of_custody_js_1.verifyChain)(events, publicKey)).toBe(true);
    });
});
