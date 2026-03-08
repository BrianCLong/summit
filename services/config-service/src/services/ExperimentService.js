"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.experimentService = exports.ExperimentService = void 0;
const index_js_1 = require("../db/index.js");
const SegmentEvaluator_js_1 = require("./SegmentEvaluator.js");
const hash_js_1 = require("../utils/hash.js");
const logger_js_1 = require("../utils/logger.js");
const log = logger_js_1.logger.child({ module: 'ExperimentService' });
class ExperimentService {
    /**
     * Get experiment assignment for a user.
     * Returns the variant the user should see.
     */
    async getAssignment(experimentKey, context) {
        const experiment = await index_js_1.experimentRepository.findByKey(experimentKey, context.tenantId ?? null);
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
            const matches = await SegmentEvaluator_js_1.segmentEvaluator.matchesSegment(experiment.targetSegmentId, context);
            if (!matches) {
                return this.createNotTargetedAssignment(experiment);
            }
        }
        // Check rollout percentage (unless on allowlist)
        if (!onAllowlist) {
            const rolloutKey = `exp:${experiment.key}:rollout:${context.userId}`;
            if (!(0, hash_js_1.isInRollout)(rolloutKey, experiment.rolloutPercentage)) {
                return this.createNotInRolloutAssignment(experiment);
            }
        }
        // Check for existing assignment (sticky bucketing)
        const existingAssignment = await index_js_1.experimentRepository.getAssignment(experiment.id, context.userId);
        if (existingAssignment) {
            const variant = experiment.variants.find((v) => v.id === existingAssignment.variantId);
            if (variant) {
                return this.createAssignment(experiment, variant, 'EXISTING_ASSIGNMENT');
            }
        }
        // Assign to a variant based on consistent hashing
        const bucketKey = `exp:${experiment.key}:bucket:${context.userId}`;
        const variantIndex = (0, hash_js_1.selectVariant)(bucketKey, experiment.variants);
        if (variantIndex < 0) {
            log.error({ experimentKey }, 'Failed to select variant');
            return this.createErrorAssignment(experiment);
        }
        const selectedVariant = experiment.variants[variantIndex];
        // Record the assignment for sticky bucketing
        await index_js_1.experimentRepository.recordAssignment(experiment.id, selectedVariant.id, context.userId, context.tenantId ?? null);
        log.debug({
            experimentKey,
            userId: context.userId,
            variantName: selectedVariant.name,
        }, 'Experiment assignment');
        return this.createAssignment(experiment, selectedVariant, 'NEW_ASSIGNMENT');
    }
    /**
     * Batch get assignments for multiple experiments.
     */
    async getAssignments(experimentKeys, context) {
        const results = {};
        await Promise.all(experimentKeys.map(async (key) => {
            results[key] = await this.getAssignment(key, context);
        }));
        return results;
    }
    /**
     * Create a new experiment.
     */
    async createExperiment(input, auditContext) {
        // Validate segment exists if specified
        if (input.targetSegmentId) {
            const segment = await index_js_1.segmentRepository.findById(input.targetSegmentId);
            if (!segment) {
                throw new Error(`Segment ${input.targetSegmentId} not found`);
            }
        }
        const experiment = await index_js_1.experimentRepository.create(input, auditContext.userId);
        await index_js_1.auditRepository.log('experiment', experiment.id, 'create', auditContext, undefined, {
            key: experiment.key,
            variants: experiment.variants.map((v) => v.name),
        });
        log.info({ key: experiment.key, id: experiment.id }, 'Experiment created');
        return experiment;
    }
    /**
     * Update an experiment.
     */
    async updateExperiment(id, input, auditContext) {
        const existing = await index_js_1.experimentRepository.findById(id);
        if (!existing)
            return null;
        const updated = await index_js_1.experimentRepository.update(id, input, auditContext.userId);
        if (!updated)
            return null;
        await index_js_1.auditRepository.log('experiment', id, 'update', auditContext, { rolloutPercentage: existing.rolloutPercentage }, { rolloutPercentage: updated.rolloutPercentage });
        log.info({ key: updated.key, id }, 'Experiment updated');
        return updated;
    }
    /**
     * Delete an experiment.
     */
    async deleteExperiment(id, auditContext) {
        const existing = await index_js_1.experimentRepository.findById(id);
        if (!existing)
            return false;
        if (existing.isGovernanceProtected) {
            throw new Error('Cannot delete governance-protected experiment');
        }
        const deleted = await index_js_1.experimentRepository.delete(id);
        if (deleted) {
            await index_js_1.auditRepository.log('experiment', id, 'delete', auditContext, { key: existing.key }, undefined);
            log.info({ key: existing.key, id }, 'Experiment deleted');
        }
        return deleted;
    }
    /**
     * Start an experiment.
     */
    async startExperiment(id, auditContext) {
        const existing = await index_js_1.experimentRepository.findById(id);
        if (!existing)
            return null;
        // Check governance protection
        if (existing.isGovernanceProtected && existing.requiresApproval) {
            if (!existing.approvedBy) {
                throw new Error('Governance-protected experiment requires approval before starting');
            }
        }
        const updated = await index_js_1.experimentRepository.start(id, auditContext.userId);
        if (!updated)
            return null;
        await index_js_1.auditRepository.log('experiment', id, 'start', auditContext, { status: existing.status }, { status: updated.status });
        log.info({ key: updated.key, id }, 'Experiment started');
        return updated;
    }
    /**
     * Pause an experiment.
     */
    async pauseExperiment(id, auditContext) {
        const existing = await index_js_1.experimentRepository.findById(id);
        if (!existing)
            return null;
        const updated = await index_js_1.experimentRepository.pause(id, auditContext.userId);
        if (!updated)
            return null;
        await index_js_1.auditRepository.log('experiment', id, 'pause', auditContext, { status: existing.status }, { status: updated.status });
        log.info({ key: updated.key, id }, 'Experiment paused');
        return updated;
    }
    /**
     * Complete an experiment.
     */
    async completeExperiment(id, auditContext) {
        const existing = await index_js_1.experimentRepository.findById(id);
        if (!existing)
            return null;
        const updated = await index_js_1.experimentRepository.complete(id, auditContext.userId);
        if (!updated)
            return null;
        await index_js_1.auditRepository.log('experiment', id, 'complete', auditContext, { status: existing.status }, { status: updated.status });
        log.info({ key: updated.key, id }, 'Experiment completed');
        return updated;
    }
    /**
     * Approve an experiment.
     */
    async approveExperiment(id, auditContext) {
        const existing = await index_js_1.experimentRepository.findById(id);
        if (!existing)
            return null;
        const updated = await index_js_1.experimentRepository.approve(id, auditContext.userId);
        if (!updated)
            return null;
        await index_js_1.auditRepository.log('experiment', id, 'approve', auditContext, { approvedBy: null }, { approvedBy: auditContext.userId });
        log.info({ key: updated.key, id, approvedBy: auditContext.userId }, 'Experiment approved');
        return updated;
    }
    /**
     * Get an experiment by ID.
     */
    async getExperiment(id) {
        return index_js_1.experimentRepository.findById(id);
    }
    /**
     * Get an experiment by key.
     */
    async getExperimentByKey(key, tenantId) {
        return index_js_1.experimentRepository.findByKey(key, tenantId);
    }
    /**
     * List experiments for a tenant.
     */
    async listExperiments(tenantId, options) {
        return index_js_1.experimentRepository.listByTenant(tenantId, options);
    }
    // Helper methods to create assignment responses
    createAssignment(experiment, variant, reason) {
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
    createNotFoundAssignment(experimentKey) {
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
    createNotRunningAssignment(experiment) {
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
    createBlockedAssignment(experiment) {
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
    createNotTargetedAssignment(experiment) {
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
    createNotInRolloutAssignment(experiment) {
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
    createErrorAssignment(experiment) {
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
exports.ExperimentService = ExperimentService;
exports.experimentService = new ExperimentService();
