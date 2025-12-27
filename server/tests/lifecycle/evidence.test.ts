
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Define mocks before imports
const mockQuery = jest.fn<any>();
const mockPool = {
    query: mockQuery,
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    withTransaction: jest.fn((cb: any) => cb({ query: mockQuery })),
};

jest.mock('../../src/db/postgres', () => ({
    getPostgresPool: jest.fn(() => mockPool),
}));

// Mock logger
jest.mock('../../src/config/logger', () => ({
    child: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    }),
    default: {
         child: () => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
        }),
    }
}));

import { LifecycleEvidence } from '../../src/lifecycle/evidence';
import { getPostgresPool } from '../../src/db/postgres';

describe('LifecycleEvidence', () => {
    beforeEach(() => {
        mockQuery.mockReset();
        mockQuery.mockResolvedValue({ rowCount: 1 });
        (getPostgresPool as jest.Mock).mockReturnValue(mockPool);
    });

    it('should record evidence to provenance_records', async () => {
        const evidence = LifecycleEvidence.getInstance();
        await evidence.recordEvent('DELETION_COMPLETED', 'tenant-123', { success: true });

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO provenance_records'),
            expect.arrayContaining(['DELETION_COMPLETED', 'tenant-123'])
        );
    });
});
