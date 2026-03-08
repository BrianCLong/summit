"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegalHoldManager = void 0;
const postgres_js_1 = require("../db/postgres.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const evidence_js_1 = require("./evidence.js");
const logger = logger_js_1.default.child({ name: 'legal-hold-manager' });
class LegalHoldManager {
    static instance;
    constructor() { }
    static getInstance() {
        if (!LegalHoldManager.instance) {
            LegalHoldManager.instance = new LegalHoldManager();
        }
        return LegalHoldManager.instance;
    }
    /**
     * Checks if a tenant or user is under active legal hold.
     */
    async isUnderHold(targetId) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        try {
            const query = `
        SELECT 1 FROM legal_holds
        WHERE target_id = $1
        AND status = 'active'
        LIMIT 1
      `;
            const res = await pool.query(query, [targetId]);
            return (res.rowCount || 0) > 0;
        }
        catch (error) {
            // If table doesn't exist, log warning and return false
            if (error.code === '42P01') {
                logger.warn('legal_holds table does not exist. Assuming no holds.');
                return false;
            }
            logger.error({ err: error }, 'Failed to check legal hold status');
            // Fail safe: bias towards preservation in case of error
            return true;
        }
    }
    async createHold(targetId, reason, createdBy) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        // Ensure table exists (idempotent)
        await pool.query(`
      CREATE TABLE IF NOT EXISTS legal_holds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        target_id VARCHAR(255) NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        released_at TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS idx_legal_holds_target ON legal_holds(target_id);
    `);
        await pool.query(`INSERT INTO legal_holds (target_id, reason, created_by) VALUES ($1, $2, $3)`, [targetId, reason, createdBy]);
        logger.info({ targetId, reason }, 'Legal hold created');
        await evidence_js_1.LifecycleEvidence.getInstance().recordEvent('LEGAL_HOLD_APPLIED', targetId, { reason, createdBy });
    }
    async releaseHold(targetId, releasedBy) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        await pool.query(`UPDATE legal_holds SET status = 'released', released_at = NOW() WHERE target_id = $1 AND status = 'active'`, [targetId]);
        logger.info({ targetId }, 'Legal hold released');
        await evidence_js_1.LifecycleEvidence.getInstance().recordEvent('LEGAL_HOLD_RELEASED', targetId, { releasedBy });
    }
}
exports.LegalHoldManager = LegalHoldManager;
