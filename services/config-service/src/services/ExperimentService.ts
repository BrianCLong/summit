import {
  experimentRepository,
  segmentRepository,
  auditRepository,
  type AuditContext,
} from '../db/index.js';
import { segmentEvaluator } from './SegmentEvaluator.js';
import { isInRollout, selectVariant } from '../utils/hash.js';
import { logger } from '../utils/logger.js';
import type {
  Experiment,
  ExperimentVariant,
  CreateExperimentInput,
  UpdateExperimentInput,
  ExperimentAssignment,
  EvaluationContext,
} from '../types/index.js';

const log = logger.child({ module: 'ExperimentService' });

export class ExperimentService {
  /**
   * Get experiment assignment for a user.
   * Returns the variant the user should see.
   */
  async getAssignment(
    experimentKey: string,
    context: EvaluationContext,
  ): Promise<ExperimentAssignment> {
    const experiment = await experimentRepository.findByKey(
      experimentKey,
      context.tenantId ?? null,
    );

    if (!experiment) {
      return this.createNotFoundAssignment(experimentKey);
    }

    // Check if experiment is running
    if (experiment.status !== 'running') {
      return this.createNotRunningAssignment(experiment);
    }

    // Check blocklist
    if (experiment.blocklist.includes(context.userId)) {
      return this.createBlockedAssignment(experiment);
    }

    // Check allowlist - if on allowlist, skip rollout check
    const onAllowlist = experiment.allowlist.includes(context.userId);

    // Check segment targeting
    if (experiment.targetSegmentId) {
      const matches = await segmentEvaluator.matchesSegment(
        experiment.targetSegmentId,
        context,
      );
      if (!matches) {
        return this.createNotTargetedAssignment(experiment);
      }
    }

    // Check rollout percentage (unless on allowlist)
    if (!onAllowlist) {
      const rolloutKey = `exp:${experiment.key}:rollout:${context.userId}`;
      if (!isInRollout(rolloutKey, experiment.rolloutPercentage)) {
        return this.createNotInRolloutAssignment(experiment);
      }
    }

    // Check for existing assignment (sticky bucketing)
    const existingAssignment = await experimentRepository.getAssignment(
      experiment.id,
      context.userId,
    );

    if (existingAssignment) {
      const variant = experiment.variants.find(
        (v) => v.id === existingAssignment.variantId,
      );
      if (variant) {
        return this.createAssignment(experiment, variant, 'EXISTING_ASSIGNMENT');
      }
    }

    // Assign to a variant based on consistent hashing
    const bucketKey = `exp:${experiment.key}:bucket:${context.userId}`;
    const variantIndex = selectVariant(
      bucketKey,
      experiment.variants as { weight: number }[],
    );

    if (variantIndex < 0) {
      log.error({ experimentKey }, 'Failed to select variant');
      return this.createErrorAssignment(experiment);
    }

    const selectedVariant = experiment.variants[variantIndex];

    // Record the assignment for sticky bucketing
    await experimentRepository.recordAssignment(
      experiment.id,
      selectedVariant.id,
      context.userId,
      context.tenantId ?? null,
    );

    log.debug(
      {
        experimentKey,
        userId: context.userId,
        variantName: selectedVariant.name,
      },
      'Experiment assignment',
    );

    return this.createAssignment(experiment, selectedVariant, 'NEW_ASSIGNMENT');
  }

  /**
   * Batch get assignments for multiple experiments.
   */
  async getAssignments(
    experimentKeys: string[],
    context: EvaluationContext,
  ): Promise<Record<string, ExperimentAssignment>> {
    const results: Record<string, ExperimentAssignment> = {};

    await Promise.all(
      experimentKeys.map(async (key) => {
        results[key] = await this.getAssignment(key, context);
      }),
    );

    return results;
  }

  /**
   * Create a new experiment.
   */
  async createExperiment(
    input: CreateExperimentInput,
    auditContext: AuditContext,
  ): Promise<Experiment> {
    // Validate segment exists if specified
    if (input.targetSegmentId) {
      const segment = await segmentRepository.findById(input.targetSegmentId);
      if (!segment) {
        throw new Error(`Segment ${input.targetSegmentId} not found`);
      }
    }

    const experiment = await experimentRepository.create(
      input,
      auditContext.userId,
    );

    await auditRepository.log(
      'experiment',
      experiment.id,
      'create',
      auditContext,
      undefined,
      {
        key: experiment.key,
        variants: experiment.variants.map((v) => v.name),
      },
    );

    log.info({ key: experiment.key, id: experiment.id }, 'Experiment created');
    return experiment;
  }

  /**
   * Update an experiment.
   */
  async updateExperiment(
    id: string,
    input: UpdateExperimentInput,
    auditContext: AuditContext,
  ): Promise<Experiment | null> {
    const existing = await experimentRepository.findById(id);
    if (!existing) return null;

    const updated = await experimentRepository.update(
      id,
      input,
      auditContext.userId,
    );
    if (!updated) return null;

    await auditRepository.log(
      'experiment',
      id,
      'update',
      auditContext,
      { rolloutPercentage: existing.rolloutPercentage },
      { rolloutPercentage: updated.rolloutPercentage },
    );

    log.info({ key: updated.key, id }, 'Experiment updated');
    return updated;
  }

  /**
   * Delete an experiment.
   */
  async deleteExperiment(
    id: string,
    auditContext: AuditContext,
  ): Promise<boolean> {
    const existing = await experimentRepository.findById(id);
    if (!existing) return false;

    if (existing.isGovernanceProtected) {
      throw new Error('Cannot delete governance-protected experiment');
    }

    const deleted = await experimentRepository.delete(id);
    if (deleted) {
      await auditRepository.log(
        'experiment',
        id,
        'delete',
        auditContext,
        { key: existing.key },
        undefined,
      );
      log.info({ key: existing.key, id }, 'Experiment deleted');
    }

    return deleted;
  }

  /**
   * Start an experiment.
   */
  async startExperiment(
    id: string,
    auditContext: AuditContext,
  ): Promise<Experiment | null> {
    const existing = await experimentRepository.findById(id);
    if (!existing) return null;

    // Check governance protection
    if (existing.isGovernanceProtected && existing.requiresApproval) {
      if (!existing.approvedBy) {
        throw new Error(
          'Governance-protected experiment requires approval before starting',
        );
      }
    }

    const updated = await experimentRepository.start(id, auditContext.userId);
    if (!updated) return null;

    await auditRepository.log(
      'experiment',
      id,
      'start',
      auditContext,
      { status: existing.status },
      { status: updated.status },
    );

    log.info({ key: updated.key, id }, 'Experiment started');
    return updated;
  }

  /**
   * Pause an experiment.
   */
  async pauseExperiment(
    id: string,
    auditContext: AuditContext,
  ): Promise<Experiment | null> {
    const existing = await experimentRepository.findById(id);
    if (!existing) return null;

    const updated = await experimentRepository.pause(id, auditContext.userId);
    if (!updated) return null;

    await auditRepository.log(
      'experiment',
      id,
      'pause',
      auditContext,
      { status: existing.status },
      { status: updated.status },
    );

    log.info({ key: updated.key, id }, 'Experiment paused');
    return updated;
  }

  /**
   * Complete an experiment.
   */
  async completeExperiment(
    id: string,
    auditContext: AuditContext,
  ): Promise<Experiment | null> {
    const existing = await experimentRepository.findById(id);
    if (!existing) return null;

    const updated = await experimentRepository.complete(id, auditContext.userId);
    if (!updated) return null;

    await auditRepository.log(
      'experiment',
      id,
      'complete',
      auditContext,
      { status: existing.status },
      { status: updated.status },
    );

    log.info({ key: updated.key, id }, 'Experiment completed');
    return updated;
  }

  /**
   * Approve an experiment.
   */
  async approveExperiment(
    id: string,
    auditContext: AuditContext,
  ): Promise<Experiment | null> {
    const existing = await experimentRepository.findById(id);
    if (!existing) return null;

    const updated = await experimentRepository.approve(id, auditContext.userId);
    if (!updated) return null;

    await auditRepository.log(
      'experiment',
      id,
      'approve',
      auditContext,
      { approvedBy: null },
      { approvedBy: auditContext.userId },
    );

    log.info({ key: updated.key, id, approvedBy: auditContext.userId }, 'Experiment approved');
    return updated;
  }

  /**
   * Get an experiment by ID.
   */
  async getExperiment(id: string): Promise<Experiment | null> {
    return experimentRepository.findById(id);
  }

  /**
   * Get an experiment by key.
   */
  async getExperimentByKey(
    key: string,
    tenantId: string | null,
  ): Promise<Experiment | null> {
    return experimentRepository.findByKey(key, tenantId);
  }

  /**
   * List experiments for a tenant.
   */
  async listExperiments(
    tenantId: string | null,
    options?: {
      status?: Experiment['status'];
      limit?: number;
      offset?: number;
      includeGlobal?: boolean;
    },
  ) {
    return experimentRepository.listByTenant(tenantId, options);
  }

  // Helper methods to create assignment responses

  private createAssignment(
    experiment: Experiment,
    variant: ExperimentVariant,
    reason: string,
  ): ExperimentAssignment {
    return {
      experimentId: experiment.id,
      experimentKey: experiment.key,
      variantId: variant.id,
      variantName: variant.name,
      value: variant.value,
      inExperiment: true,
      reason,
    };
  }

  private createNotFoundAssignment(experimentKey: string): ExperimentAssignment {
    return {
      experimentId: '',
      experimentKey,
      variantId: '',
      variantName: '',
      value: undefined,
      inExperiment: false,
      reason: 'EXPERIMENT_NOT_FOUND',
    };
  }

  private createNotRunningAssignment(
    experiment: Experiment,
  ): ExperimentAssignment {
    const controlVariant = experiment.variants.find((v) => v.isControl);
    return {
      experimentId: experiment.id,
      experimentKey: experiment.key,
      variantId: controlVariant?.id ?? '',
      variantName: controlVariant?.name ?? 'control',
      value: controlVariant?.value,
      inExperiment: false,
      reason: `EXPERIMENT_${experiment.status.toUpperCase()}`,
    };
  }

  private createBlockedAssignment(experiment: Experiment): ExperimentAssignment {
    const controlVariant = experiment.variants.find((v) => v.isControl);
    return {
      experimentId: experiment.id,
      experimentKey: experiment.key,
      variantId: controlVariant?.id ?? '',
      variantName: controlVariant?.name ?? 'control',
      value: controlVariant?.value,
      inExperiment: false,
      reason: 'USER_BLOCKLISTED',
    };
  }

  private createNotTargetedAssignment(
    experiment: Experiment,
  ): ExperimentAssignment {
    const controlVariant = experiment.variants.find((v) => v.isControl);
    return {
      experimentId: experiment.id,
      experimentKey: experiment.key,
      variantId: controlVariant?.id ?? '',
      variantName: controlVariant?.name ?? 'control',
      value: controlVariant?.value,
      inExperiment: false,
      reason: 'NOT_IN_TARGET_SEGMENT',
    };
  }

  private createNotInRolloutAssignment(
    experiment: Experiment,
  ): ExperimentAssignment {
    const controlVariant = experiment.variants.find((v) => v.isControl);
    return {
      experimentId: experiment.id,
      experimentKey: experiment.key,
      variantId: controlVariant?.id ?? '',
      variantName: controlVariant?.name ?? 'control',
      value: controlVariant?.value,
      inExperiment: false,
      reason: 'NOT_IN_ROLLOUT',
    };
  }

  private createErrorAssignment(experiment: Experiment): ExperimentAssignment {
    const controlVariant = experiment.variants.find((v) => v.isControl);
    return {
      experimentId: experiment.id,
      experimentKey: experiment.key,
      variantId: controlVariant?.id ?? '',
      variantName: controlVariant?.name ?? 'control',
      value: controlVariant?.value,
      inExperiment: false,
      reason: 'ASSIGNMENT_ERROR',
    };
  }
}

export const experimentService = new ExperimentService();
