"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockEsmModule = mockEsmModule;
exports.asDefault = asDefault;
const globals_1 = require("@jest/globals");
// ESM mocking helper for Jest 29+
// Usage: const mod = await mockEsmModule('../path/to/mod.js', () => ({ named: jest.fn(), default: jest.fn() }));
async function mockEsmModule(spec, factory, baseUrl) {
    const resolved = baseUrl ? new URL(spec, baseUrl).pathname : spec;
    // @ts-ignore - unstable API is sufficient for tests
    await globals_1.jest.unstable_mockModule(resolved, async () => factory());
    return await Promise.resolve(`${resolved}`).then(s => __importStar(require(s)));
}
// Convert default-exported objects to a shape friendly to jest ESM mocking
function asDefault(obj) {
    return { __esModule: true, default: obj, ...obj };
}
