"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fraudService = exports.FraudService = void 0;
const database_js_1 = require("../config/database.js");
const crypto_1 = require("crypto");
const ledger_js_1 = require("../provenance/ledger.js");
class FraudService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!FraudService.instance) {
            FraudService.instance = new FraudService();
        }
        return FraudService.instance;
    }
    async reportSignal(input) {
        const pool = (0, database_js_1.getPostgresPool)();
        const id = (0, crypto_1.randomUUID)();
        const result = await pool.write(`INSERT INTO fraud_signals (
        id, tenant_id, signal_type, severity, source, payload
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`, [id, input.tenantId, input.signalType, input.severity, input.source, input.payload]);
        // TODO: Trigger investigation workflow if severity is high
        return this.mapSignalRow(result.rows[0]);
    }
    async createInvestigation(input, actorId) {
        const pool = (0, database_js_1.getPostgresPool)();
        const id = (0, crypto_1.randomUUID)();
        const result = await pool.write(`INSERT INTO investigation_cases (
        id, tenant_id, title, status, severity, assigned_to
      ) VALUES ($1, $2, $3, 'open', $4, $5)
      RETURNING *`, [id, input.tenantId, input.title, input.severity, input.assignedTo]);
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId: input.tenantId || 'system',
            actionType: 'INVESTIGATION_OPENED',
            resourceType: 'investigation',
            resourceId: id,
            actorId: actorId,
            actorType: 'system',
            timestamp: new Date(),
            payload: {
                mutationType: 'CREATE',
                entityId: id,
                entityType: 'investigation',
                title: input.title,
                severity: input.severity
            },
            metadata: { caseId: id }
        });
        return this.mapCaseRow(result.rows[0]);
    }
    async applyHold(input, actorId) {
        const pool = (0, database_js_1.getPostgresPool)();
        const id = (0, crypto_1.randomUUID)();
        const result = await pool.write(`INSERT INTO hold_actions (
        id, target_type, target_id, reason, status, applied_by, investigation_id
      ) VALUES ($1, $2, $3, $4, 'active', $5, $6)
      RETURNING *`, [id, input.targetType, input.targetId, input.reason, actorId, input.investigationId]);
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId: 'system', // HoldAction lacks tenantId, defaulting to system
            actionType: 'HOLD_APPLIED',
            resourceType: 'hold',
            resourceId: id,
            actorId: actorId,
            actorType: 'user', // Mapping admin role to user actorType
            payload: {
                mutationType: 'CREATE',
                entityId: id,
                entityType: 'hold',
                targetType: input.targetType,
                targetId: input.targetId,
                reason: input.reason
            },
            timestamp: new Date(),
            metadata: { holdId: id, investigationId: input.investigationId }
        });
        return this.mapHoldRow(result.rows[0]);
    }
    async isHoldActive(targetType, targetId) {
        const pool = (0, database_js_1.getPostgresPool)();
        const result = await pool.read(`SELECT 1 FROM hold_actions
       WHERE target_type = $1 AND target_id = $2 AND status = 'active'
       LIMIT 1`, [targetType, targetId]);
        return (result.rowCount ?? 0) > 0;
    }
    mapSignalRow(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            signalType: row.signal_type,
            severity: row.severity,
            source: row.source,
            payload: row.payload,
            detectedAt: row.detected_at,
            investigationId: row.investigation_id
        };
    }
    mapCaseRow(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            title: row.title,
            status: row.status,
            severity: row.severity,
            assignedTo: row.assigned_to,
            resolutionNotes: row.resolution_notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    mapHoldRow(row) {
        return {
            id: row.id,
            targetType: row.target_type,
            targetId: row.target_id,
            reason: row.reason,
            status: row.status,
            appliedBy: row.applied_by,
            releasedBy: row.released_by,
            releasedAt: row.released_at,
            investigationId: row.investigation_id,
            createdAt: row.created_at
        };
    }
}
exports.FraudService = FraudService;
exports.fraudService = FraudService.getInstance();
