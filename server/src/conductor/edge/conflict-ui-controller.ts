// server/src/conductor/edge/conflict-ui-controller.ts

import { Request, Response } from 'express';
import { CRDTConflictResolver } from './crdt-conflict-resolver.js';
import logger from '../../config/logger.js';

export class ConflictUIController {
  private conflictResolver: CRDTConflictResolver;

  constructor() {
    this.conflictResolver = new CRDTConflictResolver();
  }

  async connect(): Promise<void> {
    await this.conflictResolver.connect();
  }

  /**
   * GET /api/conductor/v1/conflicts/:entityId/deltas
   * Get field-level conflict deltas for UI display
   */
  async getConflictDeltas(req: Request, res: Response): Promise<void> {
    try {
      const { entityId } = req.params;
      const tenantId = req.headers['x-tenant-id'] as string;

      if (!tenantId) {
        res.status(400).json({
          code: 'MISSING_TENANT',
          message: 'Tenant ID required',
          traceId: res.locals.traceId,
        });
        return;
      }

      // Get recent conflicts for entity
      const history = await this.conflictResolver.getConflictHistory(
        entityId,
        tenantId,
        10,
      );

      if (history.conflicts.length === 0) {
        res.json({
          entityId,
          conflicts: [],
          deltas: [],
          hasActiveConflicts: false,
        });
        return;
      }

      // Get deltas for unresolved conflicts
      const activeConflicts = history.conflicts.filter((c) => !c.resolved_at);
      const allDeltas = [];

      for (const conflict of activeConflicts) {
        const conflictData = JSON.parse(conflict.conflicts);
        const deltas =
          await this.conflictResolver.generateConflictDeltas(conflictData);
        allDeltas.push(...deltas);
      }

      res.json({
        entityId,
        conflicts: activeConflicts,
        deltas: allDeltas,
        hasActiveConflicts: activeConflicts.length > 0,
        resolutionHistory: history.resolutions.slice(0, 5), // Last 5 resolutions
      });
    } catch (error) {
      logger.error('Failed to get conflict deltas', {
        error: error.message,
        entityId: req.params.entityId,
      });
      res.status(500).json({
        code: 'CONFLICT_DELTA_ERROR',
        message: 'Failed to retrieve conflict deltas',
        traceId: res.locals.traceId,
      });
    }
  }

  /**
   * POST /api/conductor/v1/conflicts/:entityId/resolve
   * Resolve conflicts with manual overrides
   */
  async resolveConflicts(req: Request, res: Response): Promise<void> {
    try {
      const { entityId } = req.params;
      const tenantId = req.headers['x-tenant-id'] as string;
      const { manualOverrides, approver, resolutionRationale } = req.body;

      if (!tenantId) {
        res.status(400).json({
          code: 'MISSING_TENANT',
          message: 'Tenant ID required',
          traceId: res.locals.traceId,
        });
        return;
      }

      // Get active conflicts
      const history = await this.conflictResolver.getConflictHistory(
        entityId,
        tenantId,
        10,
      );
      const activeConflicts = history.conflicts.filter((c) => !c.resolved_at);

      if (activeConflicts.length === 0) {
        res.status(404).json({
          code: 'NO_ACTIVE_CONFLICTS',
          message: 'No active conflicts found for entity',
          traceId: res.locals.traceId,
        });
        return;
      }

      // Extract field conflicts and resolve
      const allFieldConflicts = [];
      for (const conflict of activeConflicts) {
        const conflictData = JSON.parse(conflict.conflicts);
        allFieldConflicts.push(...conflictData);
      }

      const resolutions = await this.conflictResolver.resolveConflicts(
        entityId,
        tenantId,
        allFieldConflicts,
        {
          userId: (req.headers['x-user-id'] as string) || 'system',
          userRole: (req.headers['x-user-role'] as string) || 'user',
          manualOverrides,
          approver,
        },
      );

      // Generate audit trail
      const auditTrail = resolutions.map((resolution) => ({
        field: allFieldConflicts.find((c) => c.operations)?.field || 'unknown',
        resolutionType: resolution.resolutionType,
        resolvedBy: resolution.resolvedBy,
        finalValue: resolution.finalValue,
        rationale:
          resolution.rationale +
          (resolutionRationale
            ? ` | User rationale: ${resolutionRationale}`
            : ''),
        timestamp: resolution.timestamp,
        approvedBy: resolution.approvedBy,
      }));

      res.json({
        entityId,
        conflictsResolved: resolutions.length,
        resolutions: auditTrail,
        message: `Successfully resolved ${resolutions.length} conflicts`,
      });
    } catch (error) {
      logger.error('Failed to resolve conflicts', {
        error: error.message,
        entityId: req.params.entityId,
      });
      res.status(500).json({
        code: 'CONFLICT_RESOLUTION_ERROR',
        message: 'Failed to resolve conflicts',
        traceId: res.locals.traceId,
      });
    }
  }

  /**
   * GET /api/conductor/v1/conflicts/:entityId/history
   * Get conflict resolution history
   */
  async getConflictHistory(req: Request, res: Response): Promise<void> {
    try {
      const { entityId } = req.params;
      const tenantId = req.headers['x-tenant-id'] as string;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!tenantId) {
        res.status(400).json({
          code: 'MISSING_TENANT',
          message: 'Tenant ID required',
          traceId: res.locals.traceId,
        });
        return;
      }

      const history = await this.conflictResolver.getConflictHistory(
        entityId,
        tenantId,
        limit,
      );

      // Format for UI consumption
      const formattedHistory = history.conflicts.map((conflict) => ({
        id: conflict.id,
        detectedAt: conflict.detected_at,
        resolvedAt: conflict.resolved_at,
        conflictCount: conflict.resolution_count,
        status: conflict.resolved_at ? 'resolved' : 'pending',
        conflicts: JSON.parse(conflict.conflicts),
      }));

      res.json({
        entityId,
        totalConflicts: history.totalConflicts,
        conflicts: formattedHistory,
        resolutions: history.resolutions,
        pagination: {
          limit,
          hasMore: history.totalConflicts > limit,
        },
      });
    } catch (error) {
      logger.error('Failed to get conflict history', {
        error: error.message,
        entityId: req.params.entityId,
      });
      res.status(500).json({
        code: 'CONFLICT_HISTORY_ERROR',
        message: 'Failed to retrieve conflict history',
        traceId: res.locals.traceId,
      });
    }
  }

  /**
   * POST /api/conductor/v1/conflicts/batch-resolve
   * Batch resolve conflicts across multiple entities
   */
  async batchResolveConflicts(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { entityIds, resolutionStrategy, approver } = req.body;

      if (!tenantId || !entityIds || !Array.isArray(entityIds)) {
        res.status(400).json({
          code: 'INVALID_BATCH_REQUEST',
          message: 'Tenant ID and entity IDs array required',
          traceId: res.locals.traceId,
        });
        return;
      }

      const results = [];
      let totalResolved = 0;

      for (const entityId of entityIds) {
        try {
          const history = await this.conflictResolver.getConflictHistory(
            entityId,
            tenantId,
            10,
          );
          const activeConflicts = history.conflicts.filter(
            (c) => !c.resolved_at,
          );

          if (activeConflicts.length > 0) {
            const allFieldConflicts = [];
            for (const conflict of activeConflicts) {
              const conflictData = JSON.parse(conflict.conflicts);
              allFieldConflicts.push(...conflictData);
            }

            const resolutions = await this.conflictResolver.resolveConflicts(
              entityId,
              tenantId,
              allFieldConflicts,
              {
                userId: (req.headers['x-user-id'] as string) || 'batch-system',
                userRole: (req.headers['x-user-role'] as string) || 'admin',
                approver,
              },
            );

            results.push({
              entityId,
              conflictsResolved: resolutions.length,
              status: 'success',
            });
            totalResolved += resolutions.length;
          } else {
            results.push({
              entityId,
              conflictsResolved: 0,
              status: 'no_conflicts',
            });
          }
        } catch (error) {
          results.push({
            entityId,
            conflictsResolved: 0,
            status: 'error',
            error: error.message,
          });
        }
      }

      res.json({
        batchId: `batch-${Date.now()}`,
        totalEntities: entityIds.length,
        totalConflictsResolved: totalResolved,
        results,
        summary: {
          successful: results.filter((r) => r.status === 'success').length,
          noConflicts: results.filter((r) => r.status === 'no_conflicts')
            .length,
          errors: results.filter((r) => r.status === 'error').length,
        },
      });
    } catch (error) {
      logger.error('Batch conflict resolution failed', {
        error: error.message,
      });
      res.status(500).json({
        code: 'BATCH_RESOLUTION_ERROR',
        message: 'Batch conflict resolution failed',
        traceId: res.locals.traceId,
      });
    }
  }
}
