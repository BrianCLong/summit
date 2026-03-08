"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engine_1 = require("../src/engine");
test('skips when when:false', async () => {
    const ok = await (0, engine_1.evalRule)({ kind: 'pull_request', payload: {} }, { id: 'x', when: { '==': [1, 2] }, then: [] });
    expect(ok).toBe(false);
});
