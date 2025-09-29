// server/src/conductor/edge/crdt-conflict-resolver.ts

import { Pool } from 'pg';
import { createClient } from 'redis';
import { randomUUID } from 'crypto';
import logger from '../../config/logger.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';

interface CRDTOperation {
  id: string;
  nodeId: string;
  timestamp: number;
  actor: string;
  field: string;
  operation: 'set' | 'delete' | 'increment' | 'add_to_set' | 'remove_from_set';
  value: any;
  vectorClock: Record<string, number>;
}

interface FieldConflict {
  field: string;
  conflictType: 'concurrent_writes' | 'semantic_conflict' | 'schema_mismatch';
  operations: CRDTOperation[];
  autoResolvable: boolean;
  suggestedResolution?: any;
}

interface ConflictResolution {
  conflictId: string;
  resolvedBy: string;
  resolutionType: 'auto' | 'manual' | 'policy_based';
  mergeStrategy: string;
  finalValue: any;
  rationale: string;
  approvedBy?: string;
  timestamp: Date;
}

interface ConflictDelta {
  field: string;
  before: {
    nodeId: string;
    value: any;
    timestamp: number;
    actor: string;
  };
  after: {
    nodeId: string;
    value: any;
    timestamp: number;
    actor: string;
  };
  conflictReason: string;
  mergeRationale?: string;
}

export class CRDTConflictResolver {
  private pool: Pool;
  private redis: ReturnType<typeof createClient>;
  
  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.redis = createClient({ url: process.env.REDIS_URL });
  }

  async connect(): Promise<void> {
    await this.redis.connect();
  }

  /**
   * Detect and analyze conflicts between CRDT operations
   */
  async detectConflicts(
    entityId: string,
    tenantId: string,
    operations: CRDTOperation[]
  ): Promise<FieldConflict[]> {
    try {
      const conflicts: FieldConflict[] = [];
      const fieldGroups = this.groupOperationsByField(operations);

      for (const [field, fieldOps] of fieldGroups) {
        const conflict = this.analyzeFieldConflict(field, fieldOps);
        if (conflict) {
          conflicts.push(conflict);
        }
      }

      // Record conflict metrics
      prometheusConductorMetrics.recordOperationalMetric(
        'crdt_conflicts_detected',
        conflicts.length,
        { tenant_id: tenantId, entity_id: entityId }
      );

      if (conflicts.length > 0) {
        await this.persistConflictDetection(entityId, tenantId, conflicts);
      }

      return conflicts;

    } catch (error) {
      logger.error('CRDT conflict detection failed', { 
        error: error.message, 
        entityId, 
        tenantId 
      });
      throw error;
    }
  }

  /**
   * Generate field-level conflict deltas for UI display
   */
  async generateConflictDeltas(conflicts: FieldConflict[]): Promise<ConflictDelta[]> {
    const deltas: ConflictDelta[] = [];

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
            actor: beforeOp.actor
          },
          after: {
            nodeId: afterOp.nodeId,
            value: afterOp.value,
            timestamp: afterOp.timestamp,
            actor: afterOp.actor
          },
          conflictReason,
          mergeRationale: conflict.suggestedResolution ? 
            this.generateMergeRationale(conflict) : undefined
        });
      }
    }

    return deltas;
  }

  /**
   * Resolve conflicts with evidence persistence
   */
  async resolveConflicts(
    entityId: string,
    tenantId: string,
    conflicts: FieldConflict[],
    resolutionContext: {
      userId: string;
      userRole: string;
      manualOverrides?: Record<string, any>;
      approver?: string;
    }
  ): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      try {
        const resolution = await this.resolveFieldConflict(
          conflict,
          resolutionContext,
          entityId,
          tenantId
        );
        
        resolutions.push(resolution);
        await this.persistResolutionEvidence(resolution, conflict, entityId, tenantId);

      } catch (error) {
        logger.error('Failed to resolve field conflict', {
          error: error.message,
          field: conflict.field,
          entityId,
          tenantId
        });

        // Create fallback resolution
        const fallbackResolution: ConflictResolution = {
          conflictId: randomUUID(),
          resolvedBy: 'system',
          resolutionType: 'auto',
          mergeStrategy: 'last_writer_wins',
          finalValue: conflict.operations[conflict.operations.length - 1]?.value,
          rationale: `Fallback resolution due to error: ${error.message}`,
          timestamp: new Date()
        };

        resolutions.push(fallbackResolution);
        await this.persistResolutionEvidence(fallbackResolution, conflict, entityId, tenantId);
      }
    }

    // Update metrics
    prometheusConductorMetrics.recordOperationalMetric(
      'crdt_conflicts_resolved',
      resolutions.length,
      { 
        tenant_id: tenantId,
        resolution_type: resolutions[0]?.resolutionType || 'unknown'
      }
    );

    return resolutions;
  }

  /**
   * Get conflict history for entity
   */
  async getConflictHistory(
    entityId: string,
    tenantId: string,
    limit: number = 50
  ): Promise<{
    conflicts: any[];
    resolutions: ConflictResolution[];
    totalConflicts: number;
  }> {
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
        client.query(countQuery, [entityId, tenantId])
      ]);

      return {
        conflicts: conflictResult.rows,
        resolutions: resolutionResult.rows.map(row => ({
          conflictId: row.conflict_id,
          resolvedBy: row.resolved_by,
          resolutionType: row.resolution_type,
          mergeStrategy: row.merge_strategy,
          finalValue: row.final_value,
          rationale: row.rationale,
          approvedBy: row.approved_by,
          timestamp: row.timestamp
        })),
        totalConflicts: parseInt(countResult.rows[0].total)
      };

    } finally {
      client.release();
    }
  }

  private groupOperationsByField(operations: CRDTOperation[]): Map<string, CRDTOperation[]> {
    const groups = new Map<string, CRDTOperation[]>();
    
    for (const op of operations) {
      if (!groups.has(op.field)) {
        groups.set(op.field, []);
      }
      groups.get(op.field)!.push(op);
    }
    
    return groups;
  }

  private analyzeFieldConflict(field: string, operations: CRDTOperation[]): FieldConflict | null {
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
        suggestedResolution: this.suggestResolution(concurrentOps)
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
        suggestedResolution: undefined
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
        suggestedResolution: undefined
      };
    }

    return null;
  }

  private findConcurrentOperations(operations: CRDTOperation[]): CRDTOperation[] {
    const concurrent: CRDTOperation[] = [];
    
    for (let i = 0; i < operations.length; i++) {
      for (let j = i + 1; j < operations.length; j++) {
        const op1 = operations[i];
        const op2 = operations[j];
        
        // Check if operations are concurrent (neither causally precedes the other)
        if (this.areConcurrent(op1, op2)) {
          if (!concurrent.includes(op1)) concurrent.push(op1);
          if (!concurrent.includes(op2)) concurrent.push(op2);
        }
      }
    }
    
    return concurrent;
  }

  private areConcurrent(op1: CRDTOperation, op2: CRDTOperation): boolean {
    // Operations are concurrent if neither vector clock dominates the other
    const clock1 = op1.vectorClock;
    const clock2 = op2.vectorClock;
    
    let op1Dominates = false;
    let op2Dominates = false;
    
    const allNodes = new Set([...Object.keys(clock1), ...Object.keys(clock2)]);
    
    for (const node of allNodes) {
      const time1 = clock1[node] || 0;
      const time2 = clock2[node] || 0;
      
      if (time1 > time2) op1Dominates = true;
      if (time2 > time1) op2Dominates = true;
    }
    
    // Concurrent if neither dominates or both dominate
    return !(op1Dominates && !op2Dominates) && !(op2Dominates && !op1Dominates);
  }

  private detectSemanticConflict(operations: CRDTOperation[]): boolean {
    // Look for operations that are semantically incompatible
    const operationTypes = operations.map(op => op.operation);
    
    // Example: delete followed by set on same field
    if (operationTypes.includes('delete') && operationTypes.includes('set')) {
      return true;
    }
    
    // Example: conflicting business logic operations
    return false;
  }

  private detectSchemaMismatch(operations: CRDTOperation[]): boolean {
    // Check if operations have incompatible value types
    const valueTypes = operations.map(op => typeof op.value).filter(t => t !== 'undefined');
    const uniqueTypes = new Set(valueTypes);
    
    return uniqueTypes.size > 1;
  }

  private isAutoResolvable(operations: CRDTOperation[]): boolean {
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

  private suggestResolution(operations: CRDTOperation[]): any {
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

  private generateConflictReason(conflict: FieldConflict): string {
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

  private generateMergeRationale(conflict: FieldConflict): string {
    if (conflict.autoResolvable) {
      return `Auto-resolved using ${this.determineMergeStrategy(conflict.operations)} strategy`;
    }
    return 'Manual resolution required due to complex conflict';
  }

  private determineMergeStrategy(operations: CRDTOperation[]): string {
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

  private async resolveFieldConflict(
    conflict: FieldConflict,
    context: {
      userId: string;
      userRole: string;
      manualOverrides?: Record<string, any>;
      approver?: string;
    },
    entityId: string,
    tenantId: string
  ): Promise<ConflictResolution> {
    const conflictId = randomUUID();
    
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
        timestamp: new Date()
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
        timestamp: new Date()
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
        timestamp: new Date()
      };
    }
    
    // Fallback: last writer wins
    const lastOp = conflict.operations.reduce((latest, op) => 
      op.timestamp > latest.timestamp ? op : latest
    );
    
    return {
      conflictId,
      resolvedBy: 'system',
      resolutionType: 'auto',
      mergeStrategy: 'last_writer_wins',
      finalValue: lastOp.value,
      rationale: 'Fallback resolution: last writer wins',
      timestamp: new Date()
    };
  }

  private async applyResolutionPolicy(
    conflict: FieldConflict,
    context: { userId: string; userRole: string },
    tenantId: string
  ): Promise<{ strategy: string; value: any; rationale: string } | null> {
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
              operations: conflict.operations
            },
            context: {
              tenant: tenantId,
              user: context.userId,
              role: context.userRole
            }
          }
        })
      });
      
      if (!response.ok) {
        return null;
      }
      
      const { result } = await response.json();
      return result?.resolution || null;
      
    } catch (error) {
      logger.warn('Failed to apply resolution policy', { error: error.message });
      return null;
    }
  }

  private async persistConflictDetection(
    entityId: string,
    tenantId: string,
    conflicts: FieldConflict[]
  ): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO crdt_conflict_log (
          id, entity_id, tenant_id, conflicts, detected_at, resolution_count
        ) VALUES ($1, $2, $3, $4, NOW(), $5)
      `, [
        randomUUID(),
        entityId,
        tenantId,
        JSON.stringify(conflicts),
        conflicts.length
      ]);
    } finally {
      client.release();
    }
  }

  private async persistResolutionEvidence(
    resolution: ConflictResolution,
    conflict: FieldConflict,
    entityId: string,
    tenantId: string
  ): Promise<void> {
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
          randomUUID(),
          conflictLogId,
          resolution.conflictId,
          resolution.resolvedBy,
          resolution.resolutionType,
          resolution.mergeStrategy,
          JSON.stringify(resolution.finalValue),
          resolution.rationale,
          resolution.approvedBy,
          resolution.timestamp
        ]);
        
        // Update conflict log as resolved
        await client.query(`
          UPDATE crdt_conflict_log 
          SET resolved_at = NOW() 
          WHERE id = $1
        `, [conflictLogId]);
      }
    } finally {
      client.release();
    }
  }
}