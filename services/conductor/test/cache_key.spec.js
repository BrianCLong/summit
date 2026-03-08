"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const key_1 = require("../src/cache/key");
test('cache key changes with params', () => {
    const k1 = (0, key_1.stepCacheKey)({
        pluginDigest: 'sha256:a',
        inputDigests: ['d1'],
        params: { x: 1 },
    });
    const k2 = (0, key_1.stepCacheKey)({
        pluginDigest: 'sha256:a',
        inputDigests: ['d1'],
        params: { x: 2 },
    });
    expect(k1).not.toBe(k2);
});
