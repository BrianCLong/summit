
import { Pool } from 'pg';
import { Logger } from 'pino';
import { AdvancedAuditSystem } from './advanced-audit-system.js';
import { MerkleTree } from './merkle-tree.js';
import { putLocked } from './worm.js';
import { randomUUID } from 'crypto';

export class LogCompactor {
  constructor(
    private db: Pool,
    private auditSystem: AdvancedAuditSystem,
    private logger: Logger
  ) {}

  async compactLogs(beforeDate: Date, bucketName: string): Promise<string> {
    try {
      // 1. Fetch logs to compact
      const logs = await this.auditSystem.queryEvents({
        endTime: beforeDate
      });

      if (logs.length === 0) {
        this.logger.info('No logs to compact');
        return '';
      }

      // 2. Build Merkle Tree
      // We use the event hash as the leaf
      const leaves = logs.map(l => l.hash || '');
      const tree = new MerkleTree(leaves);
      const root = tree.getRoot();

      // 3. Archive logs to WORM storage
      const archiveContent = JSON.stringify({
        root,
        events: logs,
        metadata: {
          count: logs.length,
          generatedAt: new Date().toISOString(),
          range: {
            start: logs[logs.length - 1].timestamp,
            end: logs[0].timestamp
          }
        }
      });

      const archiveKey = `audit-archive-${randomUUID()}.json`;
      const archiveUrl = await putLocked(bucketName, archiveKey, Buffer.from(archiveContent));

      // 4. Store Merkle Root in DB
      await this.db.query(
        `INSERT INTO audit_merkle_roots (start_timestamp, end_timestamp, root_hash, event_count, archive_url)
         VALUES ($1, $2, $3, $4, $5)`,
        [logs[logs.length - 1].timestamp, logs[0].timestamp, root, logs.length, archiveUrl]
      );

      // 5. Delete compacted logs from main table
      // NOTE: We usually keep them for some time, but "compaction" implies moving them out of hot storage.
      // Ideally we would use the `purgeOldEvents` logic but scoped to these specific IDs.
      // For safety, let's NOT delete automatically here unless requested, or maybe just rely on purgeOldEvents separately.
      // The user asked for "compaction", which often implies replacement.
      // Let's implement a soft deletion or flag, or just delete.
      // Given `prevent_audit_modification` trigger, we might need to bypass it or user postgres superuser.
      // Actually, the trigger prevents DELETE for non-postgres users.
      // We should assume the app connects as a user that might be restricted.
      // However, for MVP/Demo, we assume we can delete if we are the system.

      // Actually, let's rely on the retention policy to delete. Compaction just creates the proof + archive.

      this.logger.info({ count: logs.length, root, archiveUrl }, 'Audit logs compacted and archived');
      return root;

    } catch (error) {
      this.logger.error({ error: error.message }, 'Failed to compact logs');
      throw error;
    }
  }
}
