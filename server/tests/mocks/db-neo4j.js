"use strict";
// Mock for server/src/db/neo4j.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.neo = void 0;
exports.initializeNeo4jDriver = initializeNeo4jDriver;
exports.getNeo4jDriver = getNeo4jDriver;
exports.isNeo4jMockMode = isNeo4jMockMode;
exports.closeNeo4jDriver = closeNeo4jDriver;
exports.onNeo4jDriverReady = onNeo4jDriverReady;
exports.instrumentSession = instrumentSession;
exports.transformNeo4jIntegers = transformNeo4jIntegers;
const mockSession = {
    run: async () => ({ records: [] }),
    close: async () => { },
    beginTransaction: () => ({
        run: async () => ({ records: [] }),
        commit: async () => { },
        rollback: async () => { },
    }),
};
const mockDriver = {
    session: () => mockSession,
    close: async () => { },
    verifyConnectivity: async () => { },
};
async function initializeNeo4jDriver() {
    // No-op in tests
}
function getNeo4jDriver() {
    return mockDriver;
}
function isNeo4jMockMode() {
    return true;
}
async function closeNeo4jDriver() {
    // No-op in tests
}
function onNeo4jDriverReady(_callback) {
    // No-op in tests
}
exports.neo = {
    session: () => mockSession,
    run: async (_query, _params) => ({ records: [] }),
};
function instrumentSession(session) {
    return session;
}
function transformNeo4jIntegers(obj) {
    return obj;
}
exports.default = {
    initializeNeo4jDriver,
    getNeo4jDriver,
    isNeo4jMockMode,
    closeNeo4jDriver,
    onNeo4jDriverReady,
    neo: exports.neo,
    instrumentSession,
};
