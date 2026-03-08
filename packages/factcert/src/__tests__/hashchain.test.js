"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const hashchain_js_1 = require("../lib/hashchain.js");
(0, vitest_1.describe)('HashChain', () => {
    (0, vitest_1.it)('starts empty', () => {
        const chain = new hashchain_js_1.HashChain();
        (0, vitest_1.expect)(chain.length).toBe(0);
        (0, vitest_1.expect)(chain.lastHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    });
    (0, vitest_1.it)('adds events and links hashes', () => {
        const chain = new hashchain_js_1.HashChain();
        const e1 = chain.addEvent({ foo: 'bar' });
        const e2 = chain.addEvent({ baz: 'qux' });
        (0, vitest_1.expect)(e1.index).toBe(0);
        (0, vitest_1.expect)(e1.prev_hash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
        (0, vitest_1.expect)(e2.index).toBe(1);
        (0, vitest_1.expect)(e2.prev_hash).toBe(e1.hash);
        (0, vitest_1.expect)(chain.verify()).toBe(true);
    });
    (0, vitest_1.it)('detects tampering', () => {
        const chain = new hashchain_js_1.HashChain();
        chain.addEvent({ a: 1 });
        chain.addEvent({ b: 2 });
        const events = chain.allEvents;
        // Tamper with data
        events[0].data.a = 2;
        (0, vitest_1.expect)(chain.verify()).toBe(false);
    });
});
