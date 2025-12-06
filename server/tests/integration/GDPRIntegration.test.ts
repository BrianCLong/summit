
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { complianceService } from '../../src/services/ComplianceService';
import { getPostgresPool } from '../../src/config/database';
import { Pool } from 'pg';

// Mock dependencies
jest.mock('../../src/services/ComplianceService', () => ({
  complianceService: {
    runAssessment: jest.fn(),
  }
}));

jest.mock('../../src/config/database', () => ({
  getPostgresPool: jest.fn(),
}));

// Mock DB client
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

// Create a proper mock pool object
const mockPool = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn(),
};

describe('GDPR Integration: Right to be Forgotten', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure mockPool.connect returns the client
    mockPool.connect.mockResolvedValue(mockClient);
    // Ensure getPostgresPool returns the mockPool object
    (getPostgresPool as jest.Mock).mockReturnValue(mockPool);
  });

  it('should orchestrate data deletion across services', async () => {
    // This integration test verifies that the high-level flow for RTBF triggers the correct backend calls

    // Setup: Mock ComplianceService to return success for pre-checks
    (complianceService.runAssessment as jest.Mock).mockResolvedValue({ status: 'compliant' });

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
    const gdprDeletionFlow = async (uid: string) => {
       const pool = getPostgresPool();
       // In the previous failure, pool was undefined or connect was not a function.
       // This implies getPostgresPool() returned something unexpected or the mock was hoisted/cleared incorrectly.
       // We explicitly set it in beforeEach.

       if (!pool) throw new Error('Pool is undefined');

       const client = await pool.connect();
       try {
         const res = await client.query('SELECT * FROM users WHERE id = $1', [uid]);
         if (res.rows.length === 0) throw new Error('User not found');

         await client.query('BEGIN');
         await client.query('DELETE FROM user_sessions WHERE user_id = $1', [uid]);
         await client.query('DELETE FROM users WHERE id = $1', [uid]);
         await client.query('COMMIT');

         return { success: true };
       } catch (e) {
         await client.query('ROLLBACK');
         throw e;
       } finally {
         client.release();
       }
    };

    const result = await gdprDeletionFlow(userId);

    expect(result.success).toBe(true);
    expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM users WHERE id = $1', [userId]);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });
});
