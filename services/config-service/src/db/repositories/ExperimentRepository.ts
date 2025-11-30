import { query, transaction } from '../postgres.js';
import {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  experimentCacheKey,
  publishInvalidation,
} from '../redis.js';
import { logger } from '../../utils/logger.js';
import type {
  Experiment,
  ExperimentVariant,
  CreateExperimentInput,
  UpdateExperimentInput,
  CreateExperimentVariantInput,
  ExperimentStatus,
} from '../../types/index.js';

const log = logger.child({ module: 'ExperimentRepository' });

interface ExperimentRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  tenant_id: string | null;
  status: string;
  target_segment_id: string | null;
  rollout_percentage: string;
  allowlist: string[];
  blocklist: string[];
  is_governance_protected: boolean;
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: Date | null;
  started_at: Date | null;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
}

interface VariantRow {
  id: string;
  experiment_id: string;
  name: string;
  description: string | null;
  weight: string;
  value: unknown;
  is_control: boolean;
  created_at: Date;
}

function rowToVariant(row: VariantRow): ExperimentVariant {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    weight: parseFloat(row.weight),
    value: row.value,
    isControl: row.is_control,
  };
}

function rowToExperiment(
  row: ExperimentRow,
  variants: ExperimentVariant[] = [],
): Experiment {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    tenantId: row.tenant_id,
    status: row.status as ExperimentStatus,
    variants,
    targetSegmentId: row.target_segment_id,
    rolloutPercentage: parseFloat(row.rollout_percentage),
    allowlist: row.allowlist || [],
    blocklist: row.blocklist || [],
    isGovernanceProtected: row.is_governance_protected,
    requiresApproval: row.requires_approval,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

export class ExperimentRepository {
  /**
   * Create a new experiment with variants.
   */
  async create(
    input: CreateExperimentInput,
    userId: string,
  ): Promise<Experiment> {
    return transaction(async (client) => {
      // Validate variant weights sum to 100
      const totalWeight = input.variants.reduce((sum, v) => sum + v.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        throw new Error(
          `Variant weights must sum to 100, got ${totalWeight}`,
        );
      }

      // Ensure exactly one control variant
      const controlCount = input.variants.filter((v) => v.isControl).length;
      if (controlCount !== 1) {
        throw new Error(
          `Experiment must have exactly one control variant, got ${controlCount}`,
        );
      }

      // Create experiment
      const expResult = await client.query<ExperimentRow>(
        `INSERT INTO experiments (
          key, name, description, tenant_id, status, target_segment_id,
          rollout_percentage, allowlist, blocklist, is_governance_protected,
          requires_approval, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10, $11, $11)
        RETURNING *`,
        [
          input.key,
          input.name,
          input.description,
          input.tenantId,
          input.targetSegmentId,
          input.rolloutPercentage,
          JSON.stringify(input.allowlist),
          JSON.stringify(input.blocklist),
          input.isGovernanceProtected,
          input.requiresApproval,
          userId,
        ],
      );

      const experimentId = expResult.rows[0].id;

      // Create variants
      const variants: ExperimentVariant[] = [];
      for (const variantInput of input.variants) {
        const varResult = await client.query<VariantRow>(
          `INSERT INTO experiment_variants (
            experiment_id, name, description, weight, value, is_control
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *`,
          [
            experimentId,
            variantInput.name,
            variantInput.description,
            variantInput.weight,
            JSON.stringify(variantInput.value),
            variantInput.isControl,
          ],
        );
        variants.push(rowToVariant(varResult.rows[0]));
      }

      const experiment = rowToExperiment(expResult.rows[0], variants);
      log.info({ key: experiment.key, id: experiment.id }, 'Experiment created');
      return experiment;
    });
  }

  /**
   * Update an existing experiment.
   */
  async update(
    id: string,
    input: UpdateExperimentInput,
    userId: string,
  ): Promise<Experiment | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    // Cannot update running experiments (except rollout percentage)
    if (existing.status === 'running') {
      const allowedUpdates = ['rolloutPercentage', 'allowlist', 'blocklist'];
      const attemptedUpdates = Object.keys(input).filter(
        (k) => input[k as keyof UpdateExperimentInput] !== undefined,
      );
      const disallowed = attemptedUpdates.filter(
        (k) => !allowedUpdates.includes(k),
      );
      if (disallowed.length > 0) {
        throw new Error(
          `Cannot update ${disallowed.join(', ')} on running experiment`,
        );
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.rolloutPercentage !== undefined) {
      updates.push(`rollout_percentage = $${paramIndex++}`);
      values.push(input.rolloutPercentage);
    }
    if (input.allowlist !== undefined) {
      updates.push(`allowlist = $${paramIndex++}`);
      values.push(JSON.stringify(input.allowlist));
    }
    if (input.blocklist !== undefined) {
      updates.push(`blocklist = $${paramIndex++}`);
      values.push(JSON.stringify(input.blocklist));
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${paramIndex++}`);
    values.push(userId);
    values.push(id);

    const result = await query<ExperimentRow>(
      `UPDATE experiments SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values,
    );

    if (result.rowCount === 0) return null;

    const variants = await this.getVariants(id);
    const experiment = rowToExperiment(result.rows[0], variants);
    await this.invalidateCache(experiment);
    log.info({ key: experiment.key, id: experiment.id }, 'Experiment updated');
    return experiment;
  }

  /**
   * Delete an experiment.
   */
  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    if (existing.status === 'running') {
      throw new Error('Cannot delete running experiment');
    }

    const result = await query('DELETE FROM experiments WHERE id = $1', [id]);

    if (result.rowCount && result.rowCount > 0) {
      await this.invalidateCache(existing);
      log.info({ key: existing.key, id }, 'Experiment deleted');
      return true;
    }
    return false;
  }

  /**
   * Find an experiment by ID.
   */
  async findById(id: string): Promise<Experiment | null> {
    const result = await query<ExperimentRow>(
      'SELECT * FROM experiments WHERE id = $1',
      [id],
    );

    if (!result.rows[0]) return null;

    const variants = await this.getVariants(id);
    return rowToExperiment(result.rows[0], variants);
  }

  /**
   * Find an experiment by key and tenant.
   */
  async findByKey(
    key: string,
    tenantId: string | null,
  ): Promise<Experiment | null> {
    const cacheKeyStr = experimentCacheKey(key, tenantId);
    const cached = await cacheGet<Experiment>(cacheKeyStr);
    if (cached) {
      log.debug({ key, tenantId }, 'Cache hit for experiment');
      return cached;
    }

    // First try tenant-specific, then global
    let result = await query<ExperimentRow>(
      `SELECT * FROM experiments
       WHERE key = $1 AND tenant_id = $2`,
      [key, tenantId],
    );

    if (!result.rows[0] && tenantId) {
      result = await query<ExperimentRow>(
        `SELECT * FROM experiments
         WHERE key = $1 AND tenant_id IS NULL`,
        [key],
      );
    }

    if (!result.rows[0]) return null;

    const variants = await this.getVariants(result.rows[0].id);
    const experiment = rowToExperiment(result.rows[0], variants);
    await cacheSet(cacheKeyStr, experiment);
    return experiment;
  }

  /**
   * Get variants for an experiment.
   */
  private async getVariants(experimentId: string): Promise<ExperimentVariant[]> {
    const result = await query<VariantRow>(
      'SELECT * FROM experiment_variants WHERE experiment_id = $1 ORDER BY name',
      [experimentId],
    );
    return result.rows.map(rowToVariant);
  }

  /**
   * List experiments by tenant and status.
   */
  async listByTenant(
    tenantId: string | null,
    options?: {
      status?: ExperimentStatus;
      limit?: number;
      offset?: number;
      includeGlobal?: boolean;
    },
  ): Promise<{ experiments: Experiment[]; total: number }> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    const includeGlobal = options?.includeGlobal ?? true;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (includeGlobal && tenantId) {
      conditions.push(`(tenant_id = $${paramIndex++} OR tenant_id IS NULL)`);
      params.push(tenantId);
    } else {
      conditions.push(`tenant_id IS NOT DISTINCT FROM $${paramIndex++}`);
      params.push(tenantId);
    }

    if (options?.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(options.status);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM experiments ${whereClause}`,
      params,
    );

    const result = await query<ExperimentRow>(
      `SELECT * FROM experiments ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset],
    );

    const experiments = await Promise.all(
      result.rows.map(async (row) => {
        const variants = await this.getVariants(row.id);
        return rowToExperiment(row, variants);
      }),
    );

    return {
      experiments,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Start an experiment.
   */
  async start(id: string, userId: string): Promise<Experiment | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    if (existing.status !== 'draft' && existing.status !== 'paused') {
      throw new Error(
        `Cannot start experiment in ${existing.status} status`,
      );
    }

    if (existing.requiresApproval && !existing.approvedBy) {
      throw new Error('Experiment requires approval before starting');
    }

    const result = await query<ExperimentRow>(
      `UPDATE experiments SET
        status = 'running',
        started_at = COALESCE(started_at, NOW()),
        updated_at = NOW(),
        updated_by = $1
       WHERE id = $2
       RETURNING *`,
      [userId, id],
    );

    const variants = await this.getVariants(id);
    const experiment = rowToExperiment(result.rows[0], variants);
    await this.invalidateCache(experiment);
    log.info({ key: experiment.key, id }, 'Experiment started');
    return experiment;
  }

  /**
   * Pause an experiment.
   */
  async pause(id: string, userId: string): Promise<Experiment | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    if (existing.status !== 'running') {
      throw new Error('Can only pause running experiments');
    }

    const result = await query<ExperimentRow>(
      `UPDATE experiments SET
        status = 'paused',
        updated_at = NOW(),
        updated_by = $1
       WHERE id = $2
       RETURNING *`,
      [userId, id],
    );

    const variants = await this.getVariants(id);
    const experiment = rowToExperiment(result.rows[0], variants);
    await this.invalidateCache(experiment);
    log.info({ key: experiment.key, id }, 'Experiment paused');
    return experiment;
  }

  /**
   * Complete an experiment.
   */
  async complete(id: string, userId: string): Promise<Experiment | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    if (existing.status !== 'running' && existing.status !== 'paused') {
      throw new Error('Can only complete running or paused experiments');
    }

    const result = await query<ExperimentRow>(
      `UPDATE experiments SET
        status = 'completed',
        ended_at = NOW(),
        updated_at = NOW(),
        updated_by = $1
       WHERE id = $2
       RETURNING *`,
      [userId, id],
    );

    const variants = await this.getVariants(id);
    const experiment = rowToExperiment(result.rows[0], variants);
    await this.invalidateCache(experiment);
    log.info({ key: experiment.key, id }, 'Experiment completed');
    return experiment;
  }

  /**
   * Approve an experiment.
   */
  async approve(id: string, userId: string): Promise<Experiment | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    if (!existing.requiresApproval) {
      throw new Error('Experiment does not require approval');
    }

    if (existing.approvedBy) {
      throw new Error('Experiment already approved');
    }

    const result = await query<ExperimentRow>(
      `UPDATE experiments SET
        approved_by = $1,
        approved_at = NOW(),
        updated_at = NOW(),
        updated_by = $1
       WHERE id = $2
       RETURNING *`,
      [userId, id],
    );

    const variants = await this.getVariants(id);
    const experiment = rowToExperiment(result.rows[0], variants);
    await this.invalidateCache(experiment);
    log.info({ key: experiment.key, id, approvedBy: userId }, 'Experiment approved');
    return experiment;
  }

  /**
   * Record an experiment assignment.
   */
  async recordAssignment(
    experimentId: string,
    variantId: string,
    userId: string,
    tenantId: string | null,
  ): Promise<void> {
    await query(
      `INSERT INTO experiment_assignments (experiment_id, variant_id, user_id, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (experiment_id, user_id) DO NOTHING`,
      [experimentId, variantId, userId, tenantId],
    );
  }

  /**
   * Get a user's existing assignment for an experiment.
   */
  async getAssignment(
    experimentId: string,
    userId: string,
  ): Promise<{ variantId: string } | null> {
    const result = await query<{ variant_id: string }>(
      `SELECT variant_id FROM experiment_assignments
       WHERE experiment_id = $1 AND user_id = $2`,
      [experimentId, userId],
    );
    return result.rows[0] ? { variantId: result.rows[0].variant_id } : null;
  }

  /**
   * Invalidate cache for an experiment.
   */
  private async invalidateCache(experiment: Experiment): Promise<void> {
    await cacheDelete(experimentCacheKey(experiment.key, experiment.tenantId));
    await cacheDelete(experimentCacheKey(experiment.key, null));
    await cacheDeletePattern(`exp:${experiment.key}:*`);
    await publishInvalidation({
      type: 'experiment',
      key: experiment.key,
      tenantId: experiment.tenantId,
      timestamp: Date.now(),
    });
  }
}

export const experimentRepository = new ExperimentRepository();
