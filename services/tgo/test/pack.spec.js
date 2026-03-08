"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pack_1 = require("../src/pack");
test('pack balances ETAs', () => {
    const shards = (0, pack_1.pack)(['a.test.ts', 'b.test.ts', 'c.test.ts', 'd.test.ts'], 3);
    const etas = shards.map((s) => s.t);
    expect(Math.max(...etas) - Math.min(...etas)).toBeLessThan(20);
});
