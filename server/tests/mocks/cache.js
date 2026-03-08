"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCacheClient = void 0;
// Mock for @packages/cache
const createCacheClient = () => ({
    get: async () => null,
    set: async () => { },
    del: async () => { },
    has: async () => false,
    clear: async () => { },
});
exports.createCacheClient = createCacheClient;
exports.default = { createCacheClient: exports.createCacheClient };
