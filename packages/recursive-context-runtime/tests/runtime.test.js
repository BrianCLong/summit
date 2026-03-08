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
const fsRepo_1 = require("../src/env/adapters/fsRepo");
const session_1 = require("../src/runtime/session");
const path = __importStar(require("path"));
describe('RCR Runtime', () => {
    // Use the package directory itself as the repo root for testing
    const testRepoPath = path.resolve(__dirname, '..');
    const adapter = new fsRepo_1.FSRepoAdapter(testRepoPath, 'test-handle');
    const budget = {
        maxDepth: 1,
        maxIterations: 10,
        maxSubcalls: 10,
        maxWallMs: 10000,
        maxCostUsd: 1.0
    };
    it('should list files', async () => {
        const session = new session_1.RCRSession(adapter, budget);
        const files = await session.listFiles();
        expect(files).toContain('package.json');
        expect(session.getTrace().length).toBeGreaterThan(0);
    });
    it('should read a file', async () => {
        const session = new session_1.RCRSession(adapter, budget);
        const result = await session.readFile('package.json');
        expect(result.text).toContain('"name": "@maestro/recursive-context-runtime"');
        expect(result.span.sha256).toBeDefined();
    });
    it('should search text', async () => {
        const session = new session_1.RCRSession(adapter, budget);
        const hits = await session.searchText('"name": "@maestro/recursive-context-runtime"');
        expect(hits.length).toBeGreaterThan(0);
        expect(hits[0].span.path).toContain('package.json');
    });
});
