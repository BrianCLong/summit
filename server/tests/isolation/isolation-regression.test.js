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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const execution_js_1 = require("../../src/graph/dsl/execution.js");
const hash_js_1 = require("../../src/receipts/hash.js");
(0, globals_1.describe)('Isolation Regression Suite', () => {
    (0, globals_1.it)('scopes graph DSL queries to tenantId', () => {
        const { cypher, params } = (0, execution_js_1.buildCypherFromDSL)({
            start: { type: 'Person' },
            filter: { status: 'active' },
        }, 'tenant-graph-1');
        (0, globals_1.expect)(cypher).toContain('MATCH (n:GraphNode { tenantId: $tenantId })');
        (0, globals_1.expect)(params.tenantId).toBe('tenant-graph-1');
    });
    (0, globals_1.it)('isolates WORM storage keys by tenant namespace', async () => {
        const { putLocked, getLocked } = await Promise.resolve().then(() => __importStar(require('../../src/audit/worm.js')));
        const wormDir = path_1.default.resolve(process.cwd(), 'worm_storage');
        const tenantAKey = `tenant-a/receipts/${Date.now()}-a`;
        const tenantBKey = `tenant-b/receipts/${Date.now()}-b`;
        const tenantAPath = path_1.default.join(wormDir, tenantAKey.replace(/\//g, '_'));
        const tenantBPath = path_1.default.join(wormDir, tenantBKey.replace(/\//g, '_'));
        try {
            await putLocked('local', tenantAKey, 'payload-a');
            await putLocked('local', tenantBKey, 'payload-b');
            const tenantAResult = await getLocked(tenantAKey);
            const tenantBResult = await getLocked(tenantBKey);
            (0, globals_1.expect)(tenantAResult?.toString()).toBe('payload-a');
            (0, globals_1.expect)(tenantBResult?.toString()).toBe('payload-b');
            (0, globals_1.expect)(tenantAPath).not.toBe(tenantBPath);
            (0, globals_1.expect)(fs_1.default.existsSync(tenantAPath)).toBe(true);
            (0, globals_1.expect)(fs_1.default.existsSync(tenantBPath)).toBe(true);
        }
        finally {
            if (fs_1.default.existsSync(tenantAPath)) {
                fs_1.default.chmodSync(tenantAPath, 0o644);
                fs_1.default.unlinkSync(tenantAPath);
            }
            if (fs_1.default.existsSync(tenantBPath)) {
                fs_1.default.chmodSync(tenantBPath, 0o644);
                fs_1.default.unlinkSync(tenantBPath);
            }
        }
    });
    (0, globals_1.it)('isolates receipt hashes across tenants', () => {
        const baseReceipt = {
            receiptId: 'receipt-1',
            issuedAt: '2024-01-01T00:00:00Z',
            payload: { action: 'ingest', count: 1 },
        };
        const hashTenantA = (0, hash_js_1.calculateReceiptHash)({
            ...baseReceipt,
            tenantId: 'tenant-a',
        });
        const hashTenantB = (0, hash_js_1.calculateReceiptHash)({
            ...baseReceipt,
            tenantId: 'tenant-b',
        });
        (0, globals_1.expect)(hashTenantA).not.toBe(hashTenantB);
    });
});
