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
const queryMock = globals_1.jest.fn().mockImplementation((query) => {
    const queryText = String(query);
    if (queryText.includes('INSERT INTO lineage_nodes')) {
        return { rowCount: 1 };
    }
    if (queryText.includes('SELECT id FROM lineage_nodes')) {
        return { rows: [] };
    }
    if (queryText.includes('SELECT * FROM retention_policies')) {
        return {
            rows: [
                {
                    id: '1',
                    target_type: 'provenance_ledger_v2',
                    retention_days: 30,
                    action: 'DELETE',
                    is_active: true,
                },
                {
                    id: '2',
                    target_type: 'audit_events',
                    retention_days: 90,
                    action: 'DELETE',
                    is_active: true,
                },
            ],
        };
    }
    if (queryText.includes('DELETE FROM provenance_ledger_v2')) {
        return { rowCount: 10 };
    }
    if (queryText.includes('DELETE FROM audit_events')) {
        return { rowCount: 4 };
    }
    if (queryText.includes('SELECT * FROM schema_snapshots')) {
        return {
            rows: [{ schema_hash: 'oldhash', schema_definition: { field1: 'string' } }],
        };
    }
    return { rows: [], rowCount: 0 };
});
const poolMock = {
    query: queryMock,
    connect: globals_1.jest.fn(),
    on: globals_1.jest.fn(),
    end: globals_1.jest.fn(),
};
globals_1.jest.unstable_mockModule('../../config/database.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => poolMock),
}));
let DataLineageSystem;
let RetentionPolicyEngine;
let SchemaDriftDetector;
(0, globals_1.beforeAll)(async () => {
    ({ DataLineageSystem } = await Promise.resolve().then(() => __importStar(require('../DataLineageSystem.js'))));
    ({ RetentionPolicyEngine } = await Promise.resolve().then(() => __importStar(require('../RetentionPolicyEngine.js'))));
    ({ SchemaDriftDetector } = await Promise.resolve().then(() => __importStar(require('../SchemaDriftDetector.js'))));
});
(0, globals_1.beforeEach)(() => {
    DataLineageSystem.getInstance().pool = poolMock;
    RetentionPolicyEngine.getInstance().pool = poolMock;
    SchemaDriftDetector.getInstance().pool = poolMock;
    queryMock.mockClear();
});
(0, globals_1.describe)('Governance Authority', () => {
    (0, globals_1.describe)('DataLineageSystem', () => {
        (0, globals_1.it)('should upsert a node', async () => {
            const system = DataLineageSystem.getInstance();
            const id = await system.upsertNode('test_node', 'DATASET');
            (0, globals_1.expect)(id).toBeDefined();
        });
    });
    (0, globals_1.describe)('RetentionPolicyEngine', () => {
        (0, globals_1.it)('should enforce policies', async () => {
            const engine = RetentionPolicyEngine.getInstance();
            await (0, globals_1.expect)(engine.enforcePolicies()).resolves.not.toThrow();
            (0, globals_1.expect)(queryMock).toHaveBeenCalledWith(globals_1.expect.stringContaining('DELETE FROM audit_events'), globals_1.expect.any(Array));
        });
    });
    (0, globals_1.describe)('SchemaDriftDetector', () => {
        (0, globals_1.it)('should detect drift', async () => {
            const detector = SchemaDriftDetector.getInstance();
            const drift = await detector.checkDrift('test_node', {
                field1: 'string',
                field2: 'number',
            });
            (0, globals_1.expect)(drift).toBeDefined();
            (0, globals_1.expect)(drift?.added).toContain('field2');
        });
    });
});
