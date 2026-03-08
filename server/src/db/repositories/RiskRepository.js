"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskRepository = void 0;
const pg_js_1 = require("../../db/pg.js");
/**
 * Repository for managing Risk Scores and Signals in PostgreSQL.
 * Follows the Epic 2 Data Model schema.
 */
class RiskRepository {
    /**
     * Persists a risk score and its associated signals.
     * This is transactional.
     */
    async saveRiskScore(input) {
        return await pg_js_1.pg.transaction(async (tx) => {
            // 1. Insert Risk Score
            const scoreRows = await tx.query(`INSERT INTO risk_scores (
          tenant_id, entity_id, entity_type, score, level, window, model_version, rationale
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`, [
                input.tenantId,
                input.entityId,
                input.entityType,
                input.score,
                input.level,
                input.window,
                input.modelVersion,
                input.rationale,
            ]);
            const savedScore = scoreRows[0];
            const savedSignals = [];
            // 2. Insert Risk Signals
            // BOLT OPTIMIZATION: Use batched inserts with chunking to reduce database round-trips.
            // This reduces latency from O(N) to O(N/chunkSize), typically O(1) for normal signal counts.
            if (input.signals && input.signals.length > 0) {
                const chunkSize = 100;
                for (let i = 0; i < input.signals.length; i += chunkSize) {
                    const chunk = input.signals.slice(i, i + chunkSize);
                    const values = [];
                    const placeholders = [];
                    let paramIndex = 1;
                    for (const sig of chunk) {
                        values.push(savedScore.id, sig.type, sig.source || null, sig.value, sig.weight, sig.contributionScore, sig.description || null, sig.detectedAt || new Date());
                        placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`);
                        paramIndex += 8;
                    }
                    const sql = `
            INSERT INTO risk_signals (
              risk_score_id, type, source, value, weight, contribution_score, description, detected_at
            ) VALUES ${placeholders.join(', ')}
            RETURNING *`;
                    const sigRows = await tx.query(sql, values);
                    for (const row of sigRows) {
                        savedSignals.push(this.mapSignal(row));
                    }
                }
            }
            return {
                ...this.mapScore(savedScore),
                // Note: signals are not part of RiskScore interface but usually returned in a full object
                // For strict typing we return the RiskScore entity
            };
        });
    }
    /**
     * Retrieves the latest risk score for an entity within a specific window.
     */
    async getLatestScore(tenantId, entityId, window) {
        const row = await pg_js_1.pg.oneOrNone(`SELECT * FROM risk_scores
       WHERE tenant_id = $1 AND entity_id = $2 AND window = $3
       ORDER BY created_at DESC LIMIT 1`, [tenantId, entityId, window], { tenantId } // For RLS if applicable or logging
        );
        return row ? this.mapScore(row) : null;
    }
    /**
     * Retrieves signals associated with a specific risk score ID.
     */
    async getSignalsForScore(riskScoreId) {
        const rows = await pg_js_1.pg.readMany(`SELECT * FROM risk_signals WHERE risk_score_id = $1`, [riskScoreId]);
        return rows.map(this.mapSignal);
    }
    mapScore(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            entityId: row.entity_id,
            entityType: row.entity_type,
            score: parseFloat(row.score),
            level: row.level,
            window: row.window,
            modelVersion: row.model_version,
            rationale: row.rationale,
            createdAt: row.created_at,
            validUntil: row.valid_until,
        };
    }
    mapSignal(row) {
        return {
            id: row.id,
            riskScoreId: row.risk_score_id,
            type: row.type,
            source: row.source,
            value: parseFloat(row.value),
            weight: parseFloat(row.weight),
            contributionScore: parseFloat(row.contribution_score),
            description: row.description,
            detectedAt: row.detected_at,
        };
    }
}
exports.RiskRepository = RiskRepository;
