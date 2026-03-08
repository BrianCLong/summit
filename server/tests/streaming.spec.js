"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const streamProcess_js_1 = require("../src/conductor/steps/streamProcess.js");
test('freshness gate blocks stale', async () => {
    const ctx = { id: 'r1', setOutputs: jest.fn() };
    await (0, streamProcess_js_1.streamProcess)(ctx, { id: 'ingest', freshness: { freshWithin: '10m' } }, {
        key: 'k',
        value: '{}',
        ts: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    });
    expect(ctx.setOutputs).not.toHaveBeenCalled();
});
