"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LifecycleEvidence = void 0;
const postgres_js_1 = require("../db/postgres.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const logger = logger_js_1.default.child({ name: 'lifecycle-evidence' });
class LifecycleEvidence {
    static instance;
    constructor() { }
    static getInstance() {
        if (!LifecycleEvidence.instance) {
            LifecycleEvidence.instance = new LifecycleEvidence();
        }
        return LifecycleEvidence.instance;
    }
    async recordEvent(type, targetId, details, tenantId) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        try {
            await pool.query(`INSERT INTO provenance_records (
          id,
          action_type,
          target_id,
          tenant_id,
          details,
          created_at,
          actor_id
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          NOW(),
          'system:lifecycle'
        )`, [type, targetId, tenantId || 'system', details]);
            logger.info({ type, targetId }, 'Lifecycle evidence recorded');
        }
        catch (error) {
            // If table missing, fallback to logging
            if (error.code === '42P01') {
                logger.warn({ type, targetId, details }, 'provenance_records table missing, evidence logged to stdout only');
            }
            else {
                logger.error({ err: error }, 'Failed to record lifecycle evidence');
            }
        }
    }
}
exports.LifecycleEvidence = LifecycleEvidence;
