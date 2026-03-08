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
globals_1.jest.mock('../../config/logger', () => ({
    __esModule: true,
    default: {
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
        child: () => ({
            info: globals_1.jest.fn(),
            warn: globals_1.jest.fn(),
            error: globals_1.jest.fn(),
            debug: globals_1.jest.fn(),
        }),
    },
}));
const tenantRouter_js_1 = require("../tenantRouter.js");
(0, globals_1.describe)('pg router integration', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.resetModules();
        process.env.TENANT_ROUTING_V1 = '1';
        tenantRouter_js_1.tenantRouter.resetForTests();
    });
    (0, globals_1.it)('applies tenant search_path when routing to partitioned schema', async () => {
        try {
            const mockPools = [];
            const mockClients = [];
            globals_1.jest.doMock('pg', () => {
                const Pool = globals_1.jest.fn(() => {
                    const client = {
                        query: globals_1.jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
                        release: globals_1.jest.fn(),
                    };
                    mockClients.push(client);
                    const pool = {
                        connect: globals_1.jest.fn(async () => client),
                        query: globals_1.jest.fn(),
                        end: globals_1.jest.fn(),
                    };
                    mockPools.push(pool);
                    return pool;
                });
                return { Pool };
            });
            const { pg } = await Promise.resolve().then(() => __importStar(require('../pg.js')));
            (0, globals_1.expect)(mockPools.length).toBeGreaterThan(0);
            (0, globals_1.expect)(mockClients.length).toBeGreaterThan(0);
            tenantRouter_js_1.tenantRouter.configure({
                writePool: mockPools[0],
                readPool: mockPools[1],
            });
            tenantRouter_js_1.tenantRouter.seedForTests([
                {
                    partition_key: 'primary',
                    strategy: 'shared',
                    schema_name: null,
                    write_connection_url: null,
                    read_connection_url: null,
                    is_default: true,
                    status: 'active',
                },
                {
                    partition_key: 'blue',
                    strategy: 'schema',
                    schema_name: 'tenant_blue',
                    write_connection_url: null,
                    read_connection_url: null,
                    is_default: false,
                    status: 'active',
                },
            ], [{ tenant_id: 'tenant-blue', partition_key: 'blue' }]);
            const route = await tenantRouter_js_1.tenantRouter.resolve('tenant-blue');
            (0, globals_1.expect)(route?.schema).toBe('tenant_blue');
            const executed = [];
            mockClients.forEach((client) => {
                client.query.mockImplementation(async (sql) => {
                    if (typeof sql === 'string') {
                        executed.push(sql);
                    }
                    else if (sql?.text) {
                        executed.push(sql.text);
                    }
                    return { rows: [{ ok: true }], rowCount: 1 };
                });
            });
            const result = await pg.read('SELECT 1', [], { tenantId: 'tenant-blue' });
            (0, globals_1.expect)(route?.partitionKey).toBe('blue');
            (0, globals_1.expect)(mockPools[1]?.connect).toHaveBeenCalled();
            (0, globals_1.expect)(executed).toContain('SELECT 1');
            (0, globals_1.expect)(result).toEqual({ ok: true });
        }
        catch (error) {
            throw new Error(`integration test failed: ${String(error)}`);
        }
    });
});
