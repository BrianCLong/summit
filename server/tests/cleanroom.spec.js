"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cleanroomJoin_js_1 = require("../src/conductor/steps/cleanroomJoin.js");
test('applies DP noise to aggregates (placeholder)', async () => {
    const ctx = {
        enclave: { join: async () => ({ total: 100 }) },
        emitArtifact: jest.fn(),
    };
    await (0, cleanroomJoin_js_1.cleanroomJoin)(ctx, {
        inputs: {
            joinKeys: ['k'],
            select: ['x'],
            dp: {
                epsilon: 1,
                mechanism: 'laplace',
                sensitivity: 1,
                columns: ['total'],
            },
        },
    });
    expect(ctx.emitArtifact).toHaveBeenCalled();
});
