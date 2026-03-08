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
exports.types = exports.Client = exports.Pool = exports.mockPool = exports.mockClient = void 0;
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const pgReal = __importStar(require("pg"));
const isMockEnabled = process.env.ZERO_FOOTPRINT !== 'false';
const logFile = '/tmp/debug_pg_mock.txt';
try {
    fs_1.default.appendFileSync(logFile, `PG MOCK LOADED at ${new Date().toISOString()} (enabled: ${isMockEnabled})\n`);
}
catch (_) { }
const mockUser = {
    id: 'mock-user-id',
    email: 'guardrails-test@example.com',
    username: 'guardrails-test',
    password_hash: 'hashed',
    first_name: 'Guard',
    last_name: 'Rails',
    role: 'ADMIN',
    is_active: true,
    created_at: new Date(),
    tenant_id: 'public',
};
exports.mockClient = {
    query: globals_1.jest.fn().mockImplementation((text, _params) => {
        try {
            fs_1.default.appendFileSync(logFile, `QUERY: ${text}\n`);
        }
        catch (_) { }
        const normalizedText = text.trim().toUpperCase();
        if (normalizedText.includes('SELECT COUNT(*)')) {
            return Promise.resolve({ rowCount: 1, rows: [{ count: '0' }] });
        }
        if (normalizedText.includes('SELECT VALUE FROM SYSTEM_KV_STORE')) {
            return Promise.resolve({ rowCount: 1, rows: [{ value: { status: 'public', maxUsers: 1000, maxTenants: 100, allowedDomains: ['*'], blockedDomains: [] } }] });
        }
        if (normalizedText.includes('SELECT ID FROM USERS')) {
            return Promise.resolve({ rowCount: 0, rows: [] });
        }
        if (normalizedText.includes('INSERT INTO USERS')) {
            return Promise.resolve({ rowCount: 1, rows: [mockUser] });
        }
        if (normalizedText.includes('INSERT INTO USER_SESSIONS')) {
            return Promise.resolve({ rowCount: 1, rows: [] });
        }
        if (normalizedText.includes('UPDATE USERS')) {
            return Promise.resolve({ rowCount: 1, rows: [mockUser] });
        }
        if (normalizedText.includes('FROM USERS')) {
            return Promise.resolve({ rowCount: 1, rows: [mockUser] });
        }
        if (normalizedText.includes('PROVENANCE_LEDGER_V2')) {
            return Promise.resolve({
                rowCount: 1,
                rows: [{
                        id: 'mock-prov-id',
                        tenant_id: 'public',
                        sequence_number: 1,
                        current_hash: 'mock-hash',
                        timestamp: new Date()
                    }]
            });
        }
        if (normalizedText.includes('INSERT INTO AUDIT_EVENTS')) {
            return Promise.resolve({ rowCount: 1, rows: [] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
    }),
    release: globals_1.jest.fn(),
    on: globals_1.jest.fn(),
    end: globals_1.jest.fn().mockResolvedValue(undefined),
    connect: globals_1.jest.fn().mockResolvedValue(undefined),
};
exports.mockPool = {
    query: globals_1.jest.fn().mockImplementation((text, params) => exports.mockClient.query(text, params)),
    read: globals_1.jest.fn().mockImplementation((text, params) => exports.mockClient.query(text, params)),
    write: globals_1.jest.fn().mockImplementation((text, params) => exports.mockClient.query(text, params)),
    connect: globals_1.jest.fn().mockResolvedValue(exports.mockClient),
    on: globals_1.jest.fn(),
    end: globals_1.jest.fn().mockResolvedValue(undefined),
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
};
// Use real pg classes if mocking is disabled (for integration tests)
exports.Pool = isMockEnabled ? class {
    constructor() { return exports.mockPool; }
} : pgReal.Pool;
exports.Client = isMockEnabled ? class {
    constructor() { return exports.mockClient; }
} : pgReal.Client;
exports.types = isMockEnabled ? {
    setTypeParser: globals_1.jest.fn(),
    getTypeParser: globals_1.jest.fn().mockReturnValue((val) => val),
} : pgReal.types;
exports.default = { Pool: exports.Pool, Client: exports.Client, types: exports.types, mockPool: exports.mockPool, mockClient: exports.mockClient };
