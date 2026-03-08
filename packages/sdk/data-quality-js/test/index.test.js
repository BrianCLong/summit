"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
test('createRule posts to endpoint', async () => {
    const calls = [];
    // @ts-ignore
    global.fetch = async (url, opts) => {
        calls.push({ url, opts });
        return { ok: true, json: async () => ({ ok: true }) };
    };
    await (0, index_1.createRule)('http://test', { id: '1', field: 'f', type: 'required' });
    expect(calls[0].url).toBe('http://test/dq/rules');
    expect(JSON.parse(calls[0].opts.body).id).toBe('1');
});
