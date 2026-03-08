"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const loader_js_1 = require("../src/policy/loader.js");
describe('policy signature verification', () => {
    it('rejects unsigned policy', async () => {
        await expect((0, loader_js_1.loadSignedPolicy)('bundle.tgz', 'bad.sig')).rejects.toBeTruthy();
    });
});
