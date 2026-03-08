"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const loader_js_1 = require("../src/policy/loader.js");
describe('policy unsigned gate', () => {
    const prev = process.env.ALLOW_UNSIGNED_POLICY;
    beforeAll(() => {
        delete process.env.ALLOW_UNSIGNED_POLICY;
    });
    afterAll(() => {
        if (prev !== undefined)
            process.env.ALLOW_UNSIGNED_POLICY = prev;
    });
    it('blocks when signature missing and override not set', async () => {
        await expect((0, loader_js_1.loadSignedPolicy)('bundle.tgz')).rejects.toBeTruthy();
    });
});
