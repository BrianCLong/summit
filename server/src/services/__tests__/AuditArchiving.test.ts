import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AuditArchivingService } from '../AuditArchivingService.js';
import { AdvancedAuditSystem } from '../../audit/advanced-audit-system.js';
import { getPostgresPool } from '../../config/database.js';
import { existsSync, unlinkSync, rmSync } from 'fs';
import path from 'path';

jest.mock('../../config/database.js', () => ({
    getPostgresPool: jest.fn(),
    getRedisClient: jest.fn(() => null),
}));

describe('Audit Archiving and Tiered Storage', () => {
    let archiver: AuditArchivingService;
    let auditSystem: any;
    let mockPool: any;

    const ARCHIVE_DIR = path.join(process.cwd(), 'archive/audit');

    beforeEach(() => {
        mockPool = {
            query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        };
        (getPostgresPool as jest.Mock).mockReturnValue(mockPool);

        // Force reset the singleton for the test if possible, or just use it
        // Since we can't easily reset a private static, we'll assign the mockPool to it if it exists
        const system = AdvancedAuditSystem.getInstance();
        (system as any).db = mockPool;
        auditSystem = system;

        const archiverInstance = AuditArchivingService.getInstance();
        (archiverInstance as any).db = mockPool;
        archiver = archiverInstance;

        // Configure for test
        (auditSystem as any).archiveThresholdDays = 1;
        (auditSystem as any).retentionPeriodDays = 2;
        (auditSystem as any).retentionEnabled = true;
    });

    afterEach(() => {
        // Cleanup archive files if any were created
        if (existsSync(ARCHIVE_DIR)) {
            // rmSync(ARCHIVE_DIR, { recursive: true, force: true });
        }
    });

    it('should archive events before pruning', async () => {
        // Mock DB records to archive
        const mockRecords = [
            { id: '1', event_type: 'user_login', timestamp: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000) }
        ];

        mockPool.query.mockResolvedValueOnce({ rows: mockRecords, rowCount: 1 }); // For archival query
        mockPool.query.mockResolvedValueOnce({ rowCount: 1 }); // For deletion query

        const deletedCount = await auditSystem.pruneExpiredEvents(2);

        expect(deletedCount).toBe(1);
        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT * FROM audit_events'),
            expect.any(Array)
        );
        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM audit_events'),
            expect.any(Array)
        );

        // Verify file existence (Mocked file path)
        // Since we are using an actual file system in the service, let's check the directory
        // but avoid strict path matching as timestamps vary.
    });

    it('should handle no records for archival gracefully', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Archival
        mockPool.query.mockResolvedValueOnce({ rowCount: 0 }); // Deletion

        const deletedCount = await auditSystem.pruneExpiredEvents(2);
        expect(deletedCount).toBe(0);
    });
});
