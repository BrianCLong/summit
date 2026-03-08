"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('pg', () => ({
    Pool: jest.fn(() => ({
        query: jest.fn().mockResolvedValue({
            rows: [{ id: 'plugin-1', name: 'x', version: '1', capabilities: {} }],
        }),
    })),
}));
jest.mock('node:child_process', () => ({
    execFile: (_cmd, _args, cb) => cb(new Error('cosign missing')),
}));
const registry_1 = require("../src/plugins/registry");
test('rejects missing signature', async () => {
    await expect((0, registry_1.registerPlugin)({
        name: 'x',
        version: '1',
        ociUri: 'oci://x',
        digest: 'sha256:abc',
        signature: '',
        capabilities: {},
    }, 'me')).rejects.toBeTruthy();
});
