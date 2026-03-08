"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const hashchain_js_1 = require("../src/lib/hashchain.js");
(0, vitest_1.describe)('HashChain', () => {
    (0, vitest_1.it)('should verify a valid chain', () => {
        const chain = new hashchain_js_1.HashChain();
        chain.addEvent('TEST', { data: 123 });
        chain.addEvent('TEST2', { data: 456 });
        (0, vitest_1.expect)(chain.verify()).toBe(true);
    });
    (0, vitest_1.it)('should fail if chain is tampered', () => {
        const chain = new hashchain_js_1.HashChain();
        chain.addEvent('TEST', { data: 123 });
        const events = chain.getChain();
        // Tamper with payload
        events[1].payload = { data: 999 };
        (0, vitest_1.expect)(chain.verify()).toBe(false);
    });
    (0, vitest_1.it)('should fail if sequence is wrong', () => {
        const chain = new hashchain_js_1.HashChain();
        chain.addEvent('TEST', { data: 123 });
        const events = chain.getChain();
        events[1].seq = 999;
        (0, vitest_1.expect)(chain.verify()).toBe(false);
    });
});
