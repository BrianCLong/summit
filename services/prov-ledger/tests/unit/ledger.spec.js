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
const globals_1 = require("@jest/globals");
const mockQuery = globals_1.jest.fn(async (text, params) => {
    if (text.startsWith('INSERT INTO evidence')) {
        return {
            rows: [
                {
                    id: 'e1',
                    sha256: params[0],
                    contentType: params[1],
                    createdAt: new Date('2024-01-01T00:00:00Z'),
                },
            ],
        };
    }
    if (text.startsWith('INSERT INTO claim')) {
        return {
            rows: [
                {
                    id: `c${mockQuery.mock.calls.length}`,
                    hashRoot: params[1],
                },
            ],
        };
    }
    if (text.startsWith('SELECT * FROM claim')) {
        return {
            rows: [
                { id: 'c1', hash_root: 'root1', transform_chain: ['trim'] },
                { id: 'c2', hash_root: 'root2', transform_chain: ['ocr', 'normalize'] },
            ],
        };
    }
    throw new Error(`unexpected query: ${text}`);
});
globals_1.jest.unstable_mockModule('../../src/db', () => ({
    query: mockQuery,
}));
const { addClaim, exportManifest, addEvidence } = await Promise.resolve().then(() => __importStar(require('../../src/ledger')));
describe('ledger', () => {
    beforeEach(() => {
        mockQuery.mockClear();
    });
    test('claim produces deterministic hashRoot', async () => {
        const c1 = await addClaim(['a', 'b'], ['trim', 'ocr']);
        const c2 = await addClaim(['b', 'a'], ['trim', 'ocr']);
        expect(c1.hashRoot).toBe(c2.hashRoot);
    });
    test('addEvidence persists metadata', async () => {
        const sha = 'a'.repeat(64);
        const ev = await addEvidence(sha, 'text/plain');
        expect(ev).toMatchObject({ sha256: sha, contentType: 'text/plain' });
    });
    test('exportManifest returns base64 manifest', async () => {
        const manifestB64 = await exportManifest('case-123');
        const manifest = JSON.parse(Buffer.from(manifestB64, 'base64').toString());
        expect(manifest.caseId).toBe('case-123');
        expect(manifest.claims).toHaveLength(2);
        expect(manifest.signature).toMatchObject({ alg: 'none', kid: 'dev' });
    });
});
