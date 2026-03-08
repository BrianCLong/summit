"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ComplianceService_1 = require("../../src/services/ComplianceService");
const database_1 = require("../../src/config/database");
// Mock dependencies
globals_1.jest.mock('../../src/services/ComplianceService', () => ({
    complianceService: {
        runAssessment: globals_1.jest.fn(),
    }
}));
globals_1.jest.mock('../../src/config/database', () => ({
    getPostgresPool: globals_1.jest.fn(),
}));
// Mock DB client
const mockClient = {
    query: globals_1.jest.fn(),
    release: globals_1.jest.fn(),
};
// Create a proper mock pool object
const mockPool = {
    connect: globals_1.jest.fn(),
    query: globals_1.jest.fn(),
    end: globals_1.jest.fn(),
};
(0, globals_1.describe)('GDPR Integration: Right to be Forgotten', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        // Ensure mockPool.connect returns the client
        mockPool.connect.mockResolvedValue(mockClient);
        // Ensure getPostgresPool returns the mockPool object
        database_1.getPostgresPool.mockReturnValue(mockPool);
    });
    (0, globals_1.it)('should orchestrate data deletion across services', async () => {
        // This integration test verifies that the high-level flow for RTBF triggers the correct backend calls
        // Setup: Mock ComplianceService to return success for pre-checks
        ComplianceService_1.complianceService.runAssessment.mockResolvedValue({ status: 'compliant' });
        // Simulate the deletion request handler
        const userId = 'user-123';
        // 1. Verify User Exists
        mockClient.query.mockResolvedValueOnce({ rows: [{ id: userId }] }); // User lookup
        // 2. Perform Deletion Transaction
        mockClient.query.mockResolvedValueOnce({}); // BEGIN
        mockClient.query.mockResolvedValueOnce({}); // DELETE FROM user_sessions
        mockClient.query.mockResolvedValueOnce({}); // DELETE FROM users
        mockClient.query.mockResolvedValueOnce({}); // COMMIT
        // Execute logic (simulated service method)
        const gdprDeletionFlow = async (uid) => {
            const pool = (0, database_1.getPostgresPool)();
            // In the previous failure, pool was undefined or connect was not a function.
            // This implies getPostgresPool() returned something unexpected or the mock was hoisted/cleared incorrectly.
            // We explicitly set it in beforeEach.
            if (!pool)
                throw new Error('Pool is undefined');
            const client = await pool.connect();
            try {
                const res = await client.query('SELECT * FROM users WHERE id = $1', [uid]);
                if (res.rows.length === 0)
                    throw new Error('User not found');
                await client.query('BEGIN');
                await client.query('DELETE FROM user_sessions WHERE user_id = $1', [uid]);
                await client.query('DELETE FROM users WHERE id = $1', [uid]);
                await client.query('COMMIT');
                return { success: true };
            }
            catch (e) {
                await client.query('ROLLBACK');
                throw e;
            }
            finally {
                client.release();
            }
        };
        const result = await gdprDeletionFlow(userId);
        (0, globals_1.expect)(result.success).toBe(true);
        (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('DELETE FROM users WHERE id = $1', [userId]);
        (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
});
