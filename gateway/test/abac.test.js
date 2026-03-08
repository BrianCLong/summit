"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const abac_1 = require("../src/plugins/abac");
jest.mock('../src/services/opa', () => ({
    evaluate: jest
        .fn()
        .mockResolvedValue({ allow: false, obligations: ['need-consent'] }),
}));
test('attaches obligations when policy denies', async () => {
    const plugin = (0, abac_1.makeAbacPlugin)();
    const ctx = {};
    await expect(plugin.requestDidStart({
        request: { operationName: 'Op' },
        contextValue: ctx,
    })).rejects.toMatchObject({ obligations: ['need-consent'] });
    expect(ctx.obligations).toEqual(['need-consent']);
});
