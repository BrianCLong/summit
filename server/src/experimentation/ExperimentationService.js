"use strict";
/**
 * Experimentation Service
 *
 * Provides A/B testing infrastructure with governance integration.
 * All experiments respect privacy and data provenance requirements.
 *
 * SOC 2 Controls: CC6.1, PI1.1 | GDPR Article 5
 *
 * @module experimentation/ExperimentationService
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.experimentationService = exports.ExperimentationService = void 0;
const crypto_1 = require("crypto");
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const data_envelope_js_1 = require("../types/data-envelope.js");
/**
 * Experimentation Service
 */
class ExperimentationService {
    static instance;
    experiments;
    assignments;
    hashSalt;
    constructor() {
        this.experiments = new Map();
        this.assignments = new Map();
        this.hashSalt = process.env.EXPERIMENT_SALT || 'summit-experiments';
        this.loadExperiments();
    }
    static getInstance() {
        if (!ExperimentationService.instance) {
            ExperimentationService.instance = new ExperimentationService();
        }
        return ExperimentationService.instance;
    }
    /**
     * Create a new experiment
     */
    async createExperiment(experiment) {
        // Validate experiment configuration
        this.validateExperiment(experiment);
        const newExperiment = {
            ...experiment,
            id: (0, crypto_1.randomUUID)(),
            status: 'draft',
            approvals: this.getRequiredApprovals(experiment),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        // Get governance verdict
        newExperiment.governanceVerdict = await this.getExperimentGovernanceVerdict(newExperiment);
        // Save to database
        await this.saveExperiment(newExperiment);
        this.experiments.set(newExperiment.id, newExperiment);
        logger_js_1.default.info('Experiment created', { experimentId: newExperiment.id, name: newExperiment.name });
        return this.wrapInEnvelope(newExperiment, 'create_experiment');
    }
    /**
     * Start an experiment
     */
    async startExperiment(experimentId) {
        const experiment = this.experiments.get(experimentId);
        if (!experiment) {
            throw new Error(`Experiment not found: ${experimentId}`);
        }
        // Check approvals
        const pendingApprovals = experiment.approvals.filter((a) => a.status === 'pending');
        if (pendingApprovals.length > 0) {
            throw new Error('Experiment has pending approvals');
        }
        const rejectedApprovals = experiment.approvals.filter((a) => a.status === 'rejected');
        if (rejectedApprovals.length > 0) {
            throw new Error('Experiment has rejected approvals');
        }
        experiment.status = 'running';
        experiment.startDate = new Date();
        experiment.updatedAt = new Date();
        await this.saveExperiment(experiment);
        logger_js_1.default.info('Experiment started', { experimentId, name: experiment.name });
        return this.wrapInEnvelope(experiment, 'start_experiment');
    }
    /**
     * Get variant assignment for user
     */
    async getAssignment(experimentId, context) {
        // Check consent
        if (!context.consent) {
            return this.wrapInEnvelope(null, 'get_assignment');
        }
        const experiment = this.experiments.get(experimentId);
        if (!experiment || experiment.status !== 'running') {
            return this.wrapInEnvelope(null, 'get_assignment');
        }
        // Check targeting rules
        if (!this.matchesTargeting(experiment.targetingRules, context)) {
            return this.wrapInEnvelope(null, 'get_assignment');
        }
        // Check traffic allocation
        if (!this.isInTrafficAllocation(context.userId, experimentId, experiment.trafficAllocation)) {
            return this.wrapInEnvelope(null, 'get_assignment');
        }
        // Get or create assignment
        const userHash = this.hashIdentifier(context.userId);
        const tenantHash = this.hashIdentifier(context.tenantId);
        const assignmentKey = `${experimentId}:${userHash}`;
        let assignment = this.assignments.get(assignmentKey);
        if (!assignment) {
            // Determine variant based on consistent hashing
            const variant = this.assignVariant(experiment, context.userId);
            assignment = {
                experimentId,
                variantId: variant.id,
                userHash,
                tenantHash,
                assignedAt: new Date(),
                context: this.sanitizeContext(context),
            };
            this.assignments.set(assignmentKey, assignment);
            await this.saveAssignment(assignment);
            // Track exposure
            await this.trackExposure(assignment);
        }
        return this.wrapInEnvelope(assignment, 'get_assignment');
    }
    /**
     * Track a metric event
     */
    async trackMetric(experimentId, userId, metricName, metricValue) {
        const userHash = this.hashIdentifier(userId);
        const assignmentKey = `${experimentId}:${userHash}`;
        const assignment = this.assignments.get(assignmentKey);
        if (!assignment) {
            // User not in experiment
            return;
        }
        const event = {
            eventId: (0, crypto_1.randomUUID)(),
            experimentId,
            variantId: assignment.variantId,
            userHash,
            metricName,
            metricValue,
            timestamp: new Date(),
        };
        await this.saveMetricEvent(event);
        logger_js_1.default.debug('Experiment metric tracked', {
            experimentId,
            metricName,
            variantId: assignment.variantId,
        });
    }
    /**
     * Get experiment results
     */
    async getResults(experimentId) {
        const experiment = this.experiments.get(experimentId);
        if (!experiment) {
            throw new Error(`Experiment not found: ${experimentId}`);
        }
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool) {
            throw new Error('Database not available');
        }
        // Get variant statistics
        const statsResult = await pool.query(`SELECT
        variant_id,
        COUNT(DISTINCT user_hash) as sample_size,
        SUM(metric_value) as conversions,
        AVG(metric_value) as conversion_rate
      FROM experiment_metrics
      WHERE experiment_id = $1 AND metric_name = $2
      GROUP BY variant_id`, [experimentId, experiment.primaryMetric]);
        const controlVariant = experiment.variants.find((v) => v.isControl);
        const controlStats = statsResult.rows.find((r) => r.variant_id === controlVariant?.id);
        const controlRate = parseFloat(controlStats?.conversion_rate || '0');
        const variantResults = experiment.variants.map((variant) => {
            const stats = statsResult.rows.find((r) => r.variant_id === variant.id);
            const sampleSize = parseInt(stats?.sample_size || '0');
            const conversionRate = parseFloat(stats?.conversion_rate || '0');
            const conversionCount = parseInt(stats?.conversions || '0');
            const improvement = controlRate > 0 ? (conversionRate - controlRate) / controlRate : 0;
            return {
                variantId: variant.id,
                variantName: variant.name,
                sampleSize,
                conversionRate,
                conversionCount,
                improvementOverControl: improvement,
                confidenceInterval: this.calculateConfidenceInterval(conversionRate, sampleSize),
                isWinner: false,
            };
        });
        // Determine winner
        const totalSampleSize = variantResults.reduce((sum, v) => sum + v.sampleSize, 0);
        const significance = this.calculateStatisticalSignificance(variantResults);
        let winner;
        let recommendation = 'continue';
        if (significance >= experiment.confidenceLevel && totalSampleSize >= experiment.minSampleSize) {
            const best = variantResults.reduce((a, b) => a.conversionRate > b.conversionRate ? a : b);
            if (!experiment.variants.find((v) => v.id === best.variantId)?.isControl) {
                winner = best.variantId;
                best.isWinner = true;
                recommendation = 'stop_winner';
            }
            else {
                recommendation = 'stop_no_winner';
            }
        }
        else if (totalSampleSize < experiment.minSampleSize * 0.5) {
            recommendation = 'insufficient_data';
        }
        const results = {
            experimentId,
            status: experiment.status,
            startDate: experiment.startDate || new Date(),
            endDate: experiment.endDate,
            variants: variantResults,
            winner,
            statisticalSignificance: significance,
            confidenceInterval: [0.95 - 0.02, 0.95 + 0.02], // Simplified
            sampleSize: totalSampleSize,
            powerAnalysis: {
                currentPower: Math.min(1, totalSampleSize / experiment.minSampleSize),
                requiredSampleSize: experiment.minSampleSize,
                estimatedTimeRemaining: undefined,
                minimumDetectableEffect: 0.05,
            },
            recommendation,
            governanceVerdict: this.createGovernanceVerdict('get_results'),
        };
        return this.wrapInEnvelope(results, 'get_results');
    }
    /**
     * Approve experiment
     */
    async approveExperiment(experimentId, approver, role, approved, comment) {
        const experiment = this.experiments.get(experimentId);
        if (!experiment) {
            throw new Error(`Experiment not found: ${experimentId}`);
        }
        const approval = experiment.approvals.find((a) => a.role === role);
        if (!approval) {
            throw new Error(`No approval required for role: ${role}`);
        }
        approval.approver = approver;
        approval.status = approved ? 'approved' : 'rejected';
        approval.approvedAt = new Date();
        approval.comment = comment;
        experiment.updatedAt = new Date();
        await this.saveExperiment(experiment);
        logger_js_1.default.info('Experiment approval updated', {
            experimentId,
            role,
            status: approval.status,
        });
        return this.wrapInEnvelope(experiment, 'approve_experiment');
    }
    /**
     * Complete experiment and roll out winner
     */
    async completeExperiment(experimentId, rolloutWinner = false) {
        const experiment = this.experiments.get(experimentId);
        if (!experiment) {
            throw new Error(`Experiment not found: ${experimentId}`);
        }
        experiment.status = 'completed';
        experiment.endDate = new Date();
        experiment.updatedAt = new Date();
        if (rolloutWinner) {
            const results = await this.getResults(experimentId);
            if (results.data.winner) {
                // In production, this would trigger feature flag update
                logger_js_1.default.info('Rolling out experiment winner', {
                    experimentId,
                    winnerId: results.data.winner,
                });
            }
        }
        await this.saveExperiment(experiment);
        logger_js_1.default.info('Experiment completed', { experimentId, name: experiment.name });
        return this.wrapInEnvelope(experiment, 'complete_experiment');
    }
    // Private helper methods
    validateExperiment(experiment) {
        // Check variant weights sum to 100
        const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
        if (Math.abs(totalWeight - 100) > 0.01) {
            throw new Error('Variant weights must sum to 100');
        }
        // Check for control variant
        const controlVariants = experiment.variants.filter((v) => v.isControl);
        if (controlVariants.length !== 1) {
            throw new Error('Experiment must have exactly one control variant');
        }
        // Check traffic allocation
        if (experiment.trafficAllocation < 0 || experiment.trafficAllocation > 100) {
            throw new Error('Traffic allocation must be between 0 and 100');
        }
    }
    getRequiredApprovals(experiment) {
        const approvals = [
            { approver: '', role: 'product', status: 'pending' },
        ];
        // Add governance approval for experiments affecting user data
        if (experiment.targetingRules.some((r) => r.attribute.includes('pii'))) {
            approvals.push({ approver: '', role: 'governance', status: 'pending' });
        }
        // Add compliance approval for high-traffic experiments
        if (experiment.trafficAllocation > 50) {
            approvals.push({ approver: '', role: 'compliance', status: 'pending' });
        }
        return approvals;
    }
    async getExperimentGovernanceVerdict(experiment) {
        // In production, this would call the governance service
        return this.createGovernanceVerdict('experiment_creation');
    }
    matchesTargeting(rules, context) {
        for (const rule of rules) {
            const value = context.attributes[rule.attribute];
            switch (rule.operator) {
                case 'equals':
                    if (value !== rule.value)
                        return false;
                    break;
                case 'not_equals':
                    if (value === rule.value)
                        return false;
                    break;
                case 'contains':
                    if (!String(value).includes(String(rule.value)))
                        return false;
                    break;
                case 'in':
                    if (!Array.isArray(rule.value) || !rule.value.includes(value))
                        return false;
                    break;
                case 'not_in':
                    if (Array.isArray(rule.value) && rule.value.includes(value))
                        return false;
                    break;
                case 'gt':
                    if (Number(value) <= Number(rule.value))
                        return false;
                    break;
                case 'lt':
                    if (Number(value) >= Number(rule.value))
                        return false;
                    break;
            }
        }
        return true;
    }
    isInTrafficAllocation(userId, experimentId, allocation) {
        const hash = (0, crypto_1.createHash)('sha256')
            .update(`${this.hashSalt}:${experimentId}:traffic:${userId}`)
            .digest('hex');
        const bucket = parseInt(hash.substring(0, 8), 16) % 100;
        return bucket < allocation;
    }
    assignVariant(experiment, userId) {
        const hash = (0, crypto_1.createHash)('sha256')
            .update(`${this.hashSalt}:${experiment.id}:variant:${userId}`)
            .digest('hex');
        const bucket = parseInt(hash.substring(0, 8), 16) % 100;
        let cumulative = 0;
        for (const variant of experiment.variants) {
            cumulative += variant.weight;
            if (bucket < cumulative) {
                return variant;
            }
        }
        // Fallback to control
        return experiment.variants.find((v) => v.isControl) || experiment.variants[0];
    }
    sanitizeContext(context) {
        // Remove PII from context
        const sanitized = { ...context.attributes };
        delete sanitized.email;
        delete sanitized.name;
        delete sanitized.ip;
        return sanitized;
    }
    hashIdentifier(id) {
        return (0, crypto_1.createHash)('sha256')
            .update(`${this.hashSalt}:${id}`)
            .digest('hex')
            .substring(0, 16);
    }
    calculateConfidenceInterval(rate, n) {
        if (n === 0)
            return [0, 0];
        const z = 1.96; // 95% confidence
        const stderr = Math.sqrt((rate * (1 - rate)) / n);
        return [Math.max(0, rate - z * stderr), Math.min(1, rate + z * stderr)];
    }
    calculateStatisticalSignificance(variantResults) {
        // Simplified z-test for significance
        const control = variantResults.find((v) => v.variantId.includes('control'));
        if (!control)
            return 0;
        let maxSignificance = 0;
        for (const variant of variantResults) {
            if (variant === control)
                continue;
            const p1 = control.conversionRate;
            const p2 = variant.conversionRate;
            const n1 = control.sampleSize;
            const n2 = variant.sampleSize;
            if (n1 === 0 || n2 === 0)
                continue;
            const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
            const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));
            if (se === 0)
                continue;
            const z = Math.abs(p2 - p1) / se;
            const significance = this.zToConfidence(z);
            if (significance > maxSignificance) {
                maxSignificance = significance;
            }
        }
        return maxSignificance;
    }
    zToConfidence(z) {
        // Approximate z-score to confidence level
        if (z < 1.645)
            return 0.90;
        if (z < 1.96)
            return 0.95;
        if (z < 2.576)
            return 0.99;
        return 0.999;
    }
    async trackExposure(assignment) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            return;
        await pool.query(`INSERT INTO experiment_exposures (
        event_id, experiment_id, variant_id, user_hash, tenant_hash, timestamp, context
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
            (0, crypto_1.randomUUID)(),
            assignment.experimentId,
            assignment.variantId,
            assignment.userHash,
            assignment.tenantHash,
            assignment.assignedAt,
            JSON.stringify(assignment.context),
        ]);
    }
    async saveExperiment(experiment) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            return;
        await pool.query(`INSERT INTO experiments (
        id, name, description, type, status, hypothesis, primary_metric,
        secondary_metrics, variants, targeting_rules, traffic_allocation,
        start_date, end_date, min_sample_size, confidence_level, owner,
        approvals, governance_verdict, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        approvals = EXCLUDED.approvals,
        updated_at = NOW()`, [
            experiment.id,
            experiment.name,
            experiment.description,
            experiment.type,
            experiment.status,
            experiment.hypothesis,
            experiment.primaryMetric,
            JSON.stringify(experiment.secondaryMetrics),
            JSON.stringify(experiment.variants),
            JSON.stringify(experiment.targetingRules),
            experiment.trafficAllocation,
            experiment.startDate,
            experiment.endDate,
            experiment.minSampleSize,
            experiment.confidenceLevel,
            experiment.owner,
            JSON.stringify(experiment.approvals),
            JSON.stringify(experiment.governanceVerdict),
            experiment.createdAt,
            experiment.updatedAt,
        ]);
    }
    async saveAssignment(assignment) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            return;
        await pool.query(`INSERT INTO experiment_assignments (
        experiment_id, variant_id, user_hash, tenant_hash, assigned_at, context
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (experiment_id, user_hash) DO NOTHING`, [
            assignment.experimentId,
            assignment.variantId,
            assignment.userHash,
            assignment.tenantHash,
            assignment.assignedAt,
            JSON.stringify(assignment.context),
        ]);
    }
    async saveMetricEvent(event) {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            return;
        await pool.query(`INSERT INTO experiment_metrics (
        event_id, experiment_id, variant_id, user_hash, metric_name, metric_value, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
            event.eventId,
            event.experimentId,
            event.variantId,
            event.userHash,
            event.metricName,
            event.metricValue,
            event.timestamp,
        ]);
    }
    async loadExperiments() {
        const pool = (0, database_js_1.getPostgresPool)();
        if (!pool)
            return;
        try {
            const result = await pool.query("SELECT * FROM experiments WHERE status IN ('draft', 'running', 'paused')");
            for (const row of result.rows) {
                const experiment = {
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    type: row.type,
                    status: row.status,
                    hypothesis: row.hypothesis,
                    primaryMetric: row.primary_metric,
                    secondaryMetrics: row.secondary_metrics,
                    variants: row.variants,
                    targetingRules: row.targeting_rules,
                    trafficAllocation: row.traffic_allocation,
                    startDate: row.start_date,
                    endDate: row.end_date,
                    minSampleSize: row.min_sample_size,
                    confidenceLevel: row.confidence_level,
                    owner: row.owner,
                    approvals: row.approvals,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                    governanceVerdict: row.governance_verdict,
                };
                this.experiments.set(experiment.id, experiment);
            }
            logger_js_1.default.info('Loaded experiments', { count: this.experiments.size });
        }
        catch (error) {
            logger_js_1.default.warn('Could not load experiments from database', { error });
        }
    }
    createGovernanceVerdict(operation) {
        return {
            verdictId: (0, crypto_1.randomUUID)(),
            policyId: `experiment_${operation}`,
            result: data_envelope_js_1.GovernanceResult.ALLOW,
            decidedAt: new Date(),
            reason: 'Experiment operation permitted',
            evaluator: 'experimentation-service',
        };
    }
    wrapInEnvelope(data, operation) {
        return (0, data_envelope_js_1.createDataEnvelope)(data, {
            source: 'experimentation-service',
            actor: 'system',
            version: '3.1.0',
            classification: data_envelope_js_1.DataClassification.INTERNAL,
            governanceVerdict: this.createGovernanceVerdict(operation),
        });
    }
}
exports.ExperimentationService = ExperimentationService;
exports.experimentationService = ExperimentationService.getInstance();
