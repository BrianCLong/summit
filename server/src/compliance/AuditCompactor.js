"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditCompactor = void 0;
const crypto_1 = require("crypto");
const database_js_1 = require("../config/database.js");
const crypto_2 = require("crypto");
class AuditCompactor {
    static instance;
    pool;
    constructor() {
        this.pool = (0, database_js_1.getPostgresPool)();
    }
    static getInstance() {
        if (!AuditCompactor.instance) {
            AuditCompactor.instance = new AuditCompactor();
        }
        return AuditCompactor.instance;
    }
    /**
     * Compacts audit logs older than a certain date into a single summary record (Merkle root).
     * This is a simulation of a long-term compliance storage strategy.
     */
    async compactLogs(olderThan) {
        console.log(`Starting audit compaction for logs older than ${olderThan.toISOString()}`);
        // Fetch logs to compact
        // Assuming 'provenance_ledger_v2' acts as our audit log source for this example
        const logsRes = await this.pool.query(`SELECT id, previous_state_hash, new_state_hash FROM provenance_ledger_v2 WHERE timestamp < $1 ORDER BY timestamp ASC`, [olderThan]);
        if (logsRes.rows.length === 0) {
            console.log('No logs to compact.');
            return;
        }
        // Build Merkle Tree or Chain Hash
        let currentHash = (0, crypto_2.createHash)('sha256').update('GENESIS').digest('hex');
        for (const row of logsRes.rows) {
            const entryHash = (0, crypto_2.createHash)('sha256')
                .update(row.id + (row.previous_state_hash || '') + (row.new_state_hash || ''))
                .digest('hex');
            currentHash = (0, crypto_2.createHash)('sha256').update(currentHash + entryHash).digest('hex');
        }
        const compactionId = (0, crypto_1.randomUUID)();
        const summary = {
            rangeEnd: olderThan,
            recordCount: logsRes.rowCount,
            rootHash: currentHash
        };
        // Store compaction record in governance log
        await this.pool.query(`INSERT INTO governance_tasks_log (id, task_type, status, details, started_at, completed_at)
       VALUES ($1, 'COMPACTION', 'COMPLETED', $2, NOW(), NOW())`, [compactionId, JSON.stringify(summary)]);
        // In a real system, we would now move the raw rows to cold storage (S3 Glacier) and delete them from the hot DB.
        // For this prototype, we'll just log that we did it.
        console.log(`Compacted ${logsRes.rowCount} records. Root Hash: ${currentHash}`);
    }
}
exports.AuditCompactor = AuditCompactor;
