"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWithGraphQueryCache = exports.recordCacheBypass = exports.invalidateGraphQueryCache = exports.closeDriver = exports.initDriver = exports.runQuery = exports.runCypher = exports.getDriver = exports.mockDriver = exports.mockSession = void 0;
const globals_1 = require("@jest/globals");
// Mock session
exports.mockSession = {
    run: globals_1.jest.fn().mockResolvedValue({ records: [] }),
    close: globals_1.jest.fn().mockResolvedValue(undefined),
    beginTransaction: globals_1.jest.fn().mockReturnValue({
        run: globals_1.jest.fn().mockResolvedValue({ records: [] }),
        commit: globals_1.jest.fn().mockResolvedValue(undefined),
        rollback: globals_1.jest.fn().mockResolvedValue(undefined),
    }),
};
// Mock driver
exports.mockDriver = {
    session: globals_1.jest.fn().mockReturnValue(exports.mockSession),
    close: globals_1.jest.fn().mockResolvedValue(undefined),
    verifyConnectivity: globals_1.jest.fn().mockResolvedValue(undefined),
};
// Exported functions
exports.getDriver = globals_1.jest.fn().mockReturnValue(exports.mockDriver);
exports.runCypher = globals_1.jest.fn().mockResolvedValue([]);
exports.runQuery = globals_1.jest.fn().mockResolvedValue([]);
exports.initDriver = globals_1.jest.fn().mockResolvedValue(exports.mockDriver);
exports.closeDriver = globals_1.jest.fn().mockResolvedValue(undefined);
// Cache related
exports.invalidateGraphQueryCache = globals_1.jest.fn();
exports.recordCacheBypass = globals_1.jest.fn();
exports.runWithGraphQueryCache = globals_1.jest.fn().mockImplementation(async (_key, fn) => fn());
exports.default = {
    getDriver: exports.getDriver,
    runCypher: exports.runCypher,
    runQuery: exports.runQuery,
    initDriver: exports.initDriver,
    closeDriver: exports.closeDriver,
    mockDriver: exports.mockDriver,
    mockSession: exports.mockSession,
    invalidateGraphQueryCache: exports.invalidateGraphQueryCache,
    recordCacheBypass: exports.recordCacheBypass,
    runWithGraphQueryCache: exports.runWithGraphQueryCache,
};
