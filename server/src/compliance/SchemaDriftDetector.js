"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaDriftDetector = void 0;
const crypto_1 = require("crypto");
const database_js_1 = require("../config/database.js");
const crypto_2 = require("crypto");
class SchemaDriftDetector {
    static instance;
    pool;
    constructor() {
        this.pool = (0, database_js_1.getPostgresPool)();
    }
    static getInstance() {
        if (!SchemaDriftDetector.instance) {
            SchemaDriftDetector.instance = new SchemaDriftDetector();
        }
        return SchemaDriftDetector.instance;
    }
    /**
     * Captures the current schema of an entity and checks for drift against the last snapshot.
     * @returns Diff if drift detected, null otherwise.
     */
    async checkDrift(nodeId, currentSchema) {
        const schemaString = JSON.stringify(currentSchema);
        const schemaHash = (0, crypto_2.createHash)('sha256').update(schemaString).digest('hex');
        // Get last snapshot
        const lastSnapshotRes = await this.pool.query(`SELECT * FROM schema_snapshots WHERE node_id = $1 ORDER BY captured_at DESC LIMIT 1`, [nodeId]);
        const lastSnapshot = lastSnapshotRes.rows[0];
        // Record new snapshot
        await this.pool.query(`INSERT INTO schema_snapshots (id, node_id, schema_definition, schema_hash) VALUES ($1, $2, $3, $4)`, [(0, crypto_1.randomUUID)(), nodeId, currentSchema, schemaHash]);
        if (!lastSnapshot) {
            // First snapshot, no drift
            return null;
        }
        if (lastSnapshot.schema_hash === schemaHash) {
            // No change
            return null;
        }
        // Compare schemas
        return this.calculateDiff(lastSnapshot.schema_definition, currentSchema);
    }
    calculateDiff(oldSchema, newSchema) {
        // Simplified diff for object keys (assuming schema is a flat key-value or similar)
        // For complex JSON schemas, would need a library like 'json-diff'
        const oldKeys = Object.keys(oldSchema);
        const newKeys = Object.keys(newSchema);
        const added = newKeys.filter(k => !oldKeys.includes(k));
        const removed = oldKeys.filter(k => !newKeys.includes(k));
        const changed = oldKeys.filter(k => newKeys.includes(k) && JSON.stringify(oldSchema[k]) !== JSON.stringify(newSchema[k]));
        return { added, removed, changed };
    }
}
exports.SchemaDriftDetector = SchemaDriftDetector;
