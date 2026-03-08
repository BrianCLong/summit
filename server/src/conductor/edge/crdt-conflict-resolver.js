"use strict";
// server/src/conductor/edge/crdt-conflict-resolver.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRDTConflictResolver = void 0;
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const prometheus_js_1 = require("../observability/prometheus.js");
class CRDTConflictResolver {
    pool;
    redis;
    constructor() {
        this.pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        this.redis = new ioredis_1.default(process.env.REDIS_URL);
    }
    async connect() {
        await this.redis.connect();
    }
    /**
     * Detect and analyze conflicts between CRDT operations
     */
    async detectConflicts(entityId, tenantId, operations) {
        try {
            const conflicts = [];
            const fieldGroups = this.groupOperationsByField(operations);
            for (const [field, fieldOps] of fieldGroups) {
                const conflict = this.analyzeFieldConflict(field, fieldOps);
                if (conflict) {
                    conflicts.push(conflict);
                }
            }
            // Record conflict metrics
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('crdt_conflicts_detected', conflicts.length, { tenant_id: tenantId, entity_id: entityId });
            if (conflicts.length > 0) {
                await this.persistConflictDetection(entityId, tenantId, conflicts);
            }
            return conflicts;
        }
        catch (error) {
            logger_js_1.default.error('CRDT conflict detection failed', {
                error: error.message,
                entityId,
                tenantId,
            });
            throw error;
        }
    }
    /**
     * Generate field-level conflict deltas for UI display
     */
    async generateConflictDeltas(conflicts) {
        const deltas = [];
        for (const conflict of conflicts) {
            if (conflict.operations.length >= 2) {
                // Sort operations by timestamp to identify before/after states
                const sortedOps = conflict.operations.sort((a, b) => a.timestamp - b.timestamp);
                const beforeOp = sortedOps[0];
                const afterOp = sortedOps[sortedOps.length - 1];
                // Generate human-readable conflict reason
                const conflictReason = this.generateConflictReason(conflict);
                deltas.push({
                    field: conflict.field,
                    before: {
                        nodeId: beforeOp.nodeId,
                        value: beforeOp.value,
                        timestamp: beforeOp.timestamp,
                        actor: beforeOp.actor,
                    },
                    after: {
                        nodeId: afterOp.nodeId,
                        value: afterOp.value,
                        timestamp: afterOp.timestamp,
                        actor: afterOp.actor,
                    },
                    conflictReason,
                    mergeRationale: conflict.suggestedResolution
                        ? this.generateMergeRationale(conflict)
                        : undefined,
                });
            }
        }
        return deltas;
    }
    /**
     * Resolve conflicts with evidence persistence
     */
    async resolveConflicts(entityId, tenantId, conflicts, resolutionContext) {
        const resolutions = [];
        for (const conflict of conflicts) {
            try {
                const resolution = await this.resolveFieldConflict(conflict, resolutionContext, entityId, tenantId);
                resolutions.push(resolution);
                await this.persistResolutionEvidence(resolution, conflict, entityId, tenantId);
            }
            catch (error) {
                logger_js_1.default.error('Failed to resolve field conflict', {
                    error: error.message,
                    field: conflict.field,
                    entityId,
                    tenantId,
                });
                // Create fallback resolution
                const fallbackResolution = {
                    conflictId: (0, crypto_1.randomUUID)(),
                    resolvedBy: 'system',
                    resolutionType: 'auto',
                    mergeStrategy: 'last_writer_wins',
                    finalValue: conflict.operations[conflict.operations.length - 1]?.value,
                    rationale: `Fallback resolution due to error: ${error.message}`,
                    timestamp: new Date(),
                };
                resolutions.push(fallbackResolution);
                await this.persistResolutionEvidence(fallbackResolution, conflict, entityId, tenantId);
            }
        }
        // Update metrics
        prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('crdt_conflicts_resolved', resolutions.length, {
            tenant_id: tenantId,
            resolution_type: resolutions[0]?.resolutionType || 'unknown',
        });
        return resolutions;
    }
    /**
     * Get conflict history for entity
     */
    async getConflictHistory(entityId, tenantId, limit = 50) {
        const client = await this.pool.connect();
        try {
            const conflictQuery = `
        SELECT 
          id,
          entity_id,
          conflicts,
          detected_at,
          resolved_at,
          resolution_count
        FROM crdt_conflict_log 
        WHERE entity_id = $1 AND tenant_id = $2
        ORDER BY detected_at DESC
        LIMIT $3
      `;
            const resolutionQuery = `
        SELECT cr.* 
        FROM crdt_conflict_resolutions cr
        JOIN crdt_conflict_log cl ON cr.conflict_log_id = cl.id
        WHERE cl.entity_id = $1 AND cl.tenant_id = $2
        ORDER BY cr.timestamp DESC
        LIMIT $3
      `;
            const countQuery = `
        SELECT COUNT(*) as total
        FROM crdt_conflict_log 
        WHERE entity_id = $1 AND tenant_id = $2
      `;
            const [conflictResult, resolutionResult, countResult] = await Promise.all([
                client.query(conflictQuery, [entityId, tenantId, limit]),
                client.query(resolutionQuery, [entityId, tenantId, limit]),
                client.query(countQuery, [entityId, tenantId]),
            ]);
            return {
                conflicts: conflictResult.rows,
                resolutions: resolutionResult.rows.map((row) => ({
                    conflictId: row.conflict_id,
                    resolvedBy: row.resolved_by,
                    resolutionType: row.resolution_type,
                    mergeStrategy: row.merge_strategy,
                    finalValue: row.final_value,
                    rationale: row.rationale,
                    approvedBy: row.approved_by,
                    timestamp: row.timestamp,
                })),
                totalConflicts: parseInt(countResult.rows[0].total),
            };
        }
        finally {
            client.release();
        }
    }
    groupOperationsByField(operations) {
        const groups = new Map();
        for (const op of operations) {
            if (!groups.has(op.field)) {
                groups.set(op.field, []);
            }
            groups.get(op.field).push(op);
        }
        return groups;
    }
    analyzeFieldConflict(field, operations) {
        if (operations.length < 2) {
            return null; // No conflict with single operation
        }
        // Check for concurrent operations (same logical time but different nodes)
        const concurrentOps = this.findConcurrentOperations(operations);
        if (concurrentOps.length >= 2) {
            return {
                field,
                conflictType: 'concurrent_writes',
                operations: concurrentOps,
                autoResolvable: this.isAutoResolvable(concurrentOps),
                suggestedResolution: this.suggestResolution(concurrentOps),
            };
        }
        // Check for semantic conflicts (operations that are logically incompatible)
        const semanticConflict = this.detectSemanticConflict(operations);
        if (semanticConflict) {
            return {
                field,
                conflictType: 'semantic_conflict',
                operations,
                autoResolvable: false,
                suggestedResolution: undefined,
            };
        }
        // Check for schema mismatches
        const schemaMismatch = this.detectSchemaMismatch(operations);
        if (schemaMismatch) {
            return {
                field,
                conflictType: 'schema_mismatch',
                operations,
                autoResolvable: false,
                suggestedResolution: undefined,
            };
        }
        return null;
    }
    findConcurrentOperations(operations) {
        const concurrent = [];
        for (let i = 0; i < operations.length; i++) {
            for (let j = i + 1; j < operations.length; j++) {
                const op1 = operations[i];
                const op2 = operations[j];
                // Check if operations are concurrent (neither causally precedes the other)
                if (this.areConcurrent(op1, op2)) {
                    if (!concurrent.includes(op1))
                        concurrent.push(op1);
                    if (!concurrent.includes(op2))
                        concurrent.push(op2);
                }
            }
        }
        return concurrent;
    }
    areConcurrent(op1, op2) {
        // Operations are concurrent if neither vector clock dominates the other
        const clock1 = op1.vectorClock;
        const clock2 = op2.vectorClock;
        let op1Dominates = false;
        let op2Dominates = false;
        const allNodes = new Set([...Object.keys(clock1), ...Object.keys(clock2)]);
        for (const node of allNodes) {
            const time1 = clock1[node] || 0;
            const time2 = clock2[node] || 0;
            if (time1 > time2)
                op1Dominates = true;
            if (time2 > time1)
                op2Dominates = true;
        }
        // Concurrent if neither dominates or both dominate
        return !(op1Dominates && !op2Dominates) && !(op2Dominates && !op1Dominates);
    }
    detectSemanticConflict(operations) {
        // Look for operations that are semantically incompatible
        const operationTypes = operations.map((op) => op.operation);
        // Example: delete followed by set on same field
        if (operationTypes.includes('delete') && operationTypes.includes('set')) {
            return true;
        }
        // Example: conflicting business logic operations
        return false;
    }
    detectSchemaMismatch(operations) {
        // Check if operations have incompatible value types
        const valueTypes = operations
            .map((op) => typeof op.value)
            .filter((t) => t !== 'undefined');
        const uniqueTypes = new Set(valueTypes);
        return uniqueTypes.size > 1;
    }
    isAutoResolvable(operations) {
        // Simple heuristics for auto-resolution
        if (operations.length === 2) {
            const [op1, op2] = operations;
            // Same value = no conflict
            if (JSON.stringify(op1.value) === JSON.stringify(op2.value)) {
                return true;
            }
            // Numeric values can be merged with LWW or math operations
            if (typeof op1.value === 'number' && typeof op2.value === 'number') {
                return true;
            }
            // Set operations can be merged
            if (op1.operation === 'add_to_set' && op2.operation === 'add_to_set') {
                return true;
            }
        }
        return false;
    }
    suggestResolution(operations) {
        if (operations.length === 2) {
            const [op1, op2] = operations;
            // Same value
            if (JSON.stringify(op1.value) === JSON.stringify(op2.value)) {
                return op1.value;
            }
            // Numeric values - use max
            if (typeof op1.value === 'number' && typeof op2.value === 'number') {
                return Math.max(op1.value, op2.value);
            }
            // Set operations - union
            if (op1.operation === 'add_to_set' && op2.operation === 'add_to_set') {
                return Array.from(new Set([...op1.value, ...op2.value]));
            }
            // Default: last writer wins
            return op1.timestamp > op2.timestamp ? op1.value : op2.value;
        }
        return operations[operations.length - 1].value;
    }
    generateConflictReason(conflict) {
        switch (conflict.conflictType) {
            case 'concurrent_writes':
                return `Concurrent modifications by ${conflict.operations.length} different nodes`;
            case 'semantic_conflict':
                return 'Operations are semantically incompatible';
            case 'schema_mismatch':
                return 'Value types are incompatible';
            default:
                return 'Unknown conflict type';
        }
    }
    generateMergeRationale(conflict) {
        if (conflict.autoResolvable) {
            return `Auto-resolved using ${this.determineMergeStrategy(conflict.operations)} strategy`;
        }
        return 'Manual resolution required due to complex conflict';
    }
    determineMergeStrategy(operations) {
        if (operations.length === 2) {
            const [op1, op2] = operations;
            if (typeof op1.value === 'number' && typeof op2.value === 'number') {
                return 'max_value';
            }
            if (op1.operation === 'add_to_set' && op2.operation === 'add_to_set') {
                return 'set_union';
            }
        }
        return 'last_writer_wins';
    }
    async resolveFieldConflict(conflict, context, entityId, tenantId) {
        const conflictId = (0, crypto_1.randomUUID)();
        // Check for manual override
        if (context.manualOverrides && conflict.field in context.manualOverrides) {
            return {
                conflictId,
                resolvedBy: context.userId,
                resolutionType: 'manual',
                mergeStrategy: 'manual_override',
                finalValue: context.manualOverrides[conflict.field],
                rationale: 'Manual resolution by authorized user',
                approvedBy: context.approver,
                timestamp: new Date(),
            };
        }
        // Auto-resolution if possible
        if (conflict.autoResolvable && conflict.suggestedResolution !== undefined) {
            return {
                conflictId,
                resolvedBy: 'system',
                resolutionType: 'auto',
                mergeStrategy: this.determineMergeStrategy(conflict.operations),
                finalValue: conflict.suggestedResolution,
                rationale: `Auto-resolved: ${this.generateMergeRationale(conflict)}`,
                timestamp: new Date(),
            };
        }
        // Policy-based resolution
        const policyResolution = await this.applyResolutionPolicy(conflict, context, tenantId);
        if (policyResolution) {
            return {
                conflictId,
                resolvedBy: 'policy',
                resolutionType: 'policy_based',
                mergeStrategy: policyResolution.strategy,
                finalValue: policyResolution.value,
                rationale: policyResolution.rationale,
                approvedBy: context.approver,
                timestamp: new Date(),
            };
        }
        // Fallback: last writer wins
        const lastOp = conflict.operations.reduce((latest, op) => op.timestamp > latest.timestamp ? op : latest);
        return {
            conflictId,
            resolvedBy: 'system',
            resolutionType: 'auto',
            mergeStrategy: 'last_writer_wins',
            finalValue: lastOp.value,
            rationale: 'Fallback resolution: last writer wins',
            timestamp: new Date(),
        };
    }
    async applyResolutionPolicy(conflict, context, tenantId) {
        try {
            // Query OPA for conflict resolution policy
            const opaUrl = process.env.OPA_URL || 'http://localhost:8181';
            const response = await fetch(`${opaUrl}/v1/data/intelgraph/crdt/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: {
                        conflict: {
                            field: conflict.field,
                            type: conflict.conflictType,
                            operations: conflict.operations,
                        },
                        context: {
                            tenant: tenantId,
                            user: context.userId,
                            role: context.userRole,
                        },
                    },
                }),
            });
            if (!response.ok) {
                return null;
            }
            const { result } = await response.json();
            return result?.resolution || null;
        }
        catch (error) {
            logger_js_1.default.warn('Failed to apply resolution policy', {
                error: error.message,
            });
            return null;
        }
    }
    async persistConflictDetection(entityId, tenantId, conflicts) {
        const client = await this.pool.connect();
        try {
            await client.query(`
        INSERT INTO crdt_conflict_log (
          id, entity_id, tenant_id, conflicts, detected_at, resolution_count
        ) VALUES ($1, $2, $3, $4, NOW(), $5)
      `, [
                (0, crypto_1.randomUUID)(),
                entityId,
                tenantId,
                JSON.stringify(conflicts),
                conflicts.length,
            ]);
        }
        finally {
            client.release();
        }
    }
    async persistResolutionEvidence(resolution, conflict, entityId, tenantId) {
        const client = await this.pool.connect();
        try {
            // Get the conflict log ID
            const logResult = await client.query(`
        SELECT id FROM crdt_conflict_log 
        WHERE entity_id = $1 AND tenant_id = $2 
        ORDER BY detected_at DESC 
        LIMIT 1
      `, [entityId, tenantId]);
            if (logResult.rows.length > 0) {
                const conflictLogId = logResult.rows[0].id;
                // Persist resolution
                await client.query(`
          INSERT INTO crdt_conflict_resolutions (
            id, conflict_log_id, conflict_id, resolved_by, resolution_type,
            merge_strategy, final_value, rationale, approved_by, timestamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
                    (0, crypto_1.randomUUID)(),
                    conflictLogId,
                    resolution.conflictId,
                    resolution.resolvedBy,
                    resolution.resolutionType,
                    resolution.mergeStrategy,
                    JSON.stringify(resolution.finalValue),
                    resolution.rationale,
                    resolution.approvedBy,
                    resolution.timestamp,
                ]);
                // Update conflict log as resolved
                await client.query(`
          UPDATE crdt_conflict_log 
          SET resolved_at = NOW() 
          WHERE id = $1
        `, [conflictLogId]);
            }
        }
        finally {
            client.release();
        }
    }
}
exports.CRDTConflictResolver = CRDTConflictResolver;
