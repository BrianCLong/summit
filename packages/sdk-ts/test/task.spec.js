"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../src/index.js");
test('task validates and executes', async () => {
    const t = (0, index_js_1.defineTask)({
        validate: ({ payload }) => {
            if (payload.n == null) {
                throw new Error('n required');
            }
        },
        execute: async (_ctx, { payload }) => ({
            payload: { doubled: payload.n * 2 },
        }),
    });
    const ctx = (0, index_js_1.createRunContext)({});
    const out = await t.execute(ctx, { payload: { n: 2 } });
    expect(out.payload.doubled).toBe(4);
});
