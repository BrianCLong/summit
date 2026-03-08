"use strict";
/**
 * Chaos Controller
 *
 * Central controller for managing chaos engineering experiments.
 * Provides API for enabling/disabling experiments and middleware integration.
 *
 * SOC 2 Controls: CC7.1 (System Operations), CC7.3 (Incident Response Testing)
 *
 * @module chaos/ChaosController
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChaosController = void 0;
exports.getChaosController = getChaosController;
exports.resetChaosController = resetChaosController;
const uuid_1 = require("uuid");
const events_1 = require("events");
const ChaosConfig_js_1 = require("./ChaosConfig.js");
const ChaosInjectors_js_1 = require("./ChaosInjectors.js");
const data_envelope_js_1 = require("../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'chaos-controller-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'ChaosController',
    };
}
// ============================================================================
// Chaos Controller Implementation
// ============================================================================
class ChaosController extends events_1.EventEmitter {
    globalConfig;
    experiments = new Map();
    injectionHistory = [];
    stats;
    environment;
    optedInTenants = new Set();
    constructor(environment = process.env.NODE_ENV || 'development', config) {
        super();
        this.environment = environment;
        this.globalConfig = { ...ChaosConfig_js_1.DEFAULT_GLOBAL_CONFIG, ...config };
        this.stats = {
            totalExperiments: 0,
            activeExperiments: 0,
            totalInjections: 0,
            injectionsByType: {
                latency: 0,
                failure: 0,
                cpu: 0,
                memory: 0,
                disk: 0,
                network_partition: 0,
                packet_loss: 0,
                dns_failure: 0,
                region_kill: 0,
                timeout: 0,
                exception: 0,
            },
            lastInjectionAt: null,
            isEnabled: this.globalConfig.enabled,
        };
        logger_js_1.default.info({
            environment: this.environment,
            enabled: this.globalConfig.enabled,
            allowedEnvironments: this.globalConfig.allowedEnvironments,
        }, 'ChaosController initialized');
    }
    // --------------------------------------------------------------------------
    // Global Control
    // --------------------------------------------------------------------------
    /**
     * Enable chaos engineering globally
     */
    enable() {
        if (!(0, ChaosConfig_js_1.isEnvironmentAllowed)(this.environment, this.globalConfig)) {
            logger_js_1.default.warn({ environment: this.environment }, 'Cannot enable chaos in this environment');
            return (0, data_envelope_js_1.createDataEnvelope)(false, {
                source: 'ChaosController',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, `Chaos not allowed in ${this.environment} environment`),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        this.globalConfig.enabled = true;
        this.stats.isEnabled = true;
        this.emit('chaos:enabled', { environment: this.environment });
        logger_js_1.default.info({ environment: this.environment }, 'Chaos engineering enabled');
        return (0, data_envelope_js_1.createDataEnvelope)(true, {
            source: 'ChaosController',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Chaos enabled'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Disable chaos engineering globally (kill switch)
     */
    disable() {
        this.globalConfig.enabled = false;
        this.stats.isEnabled = false;
        // Disable all active experiments
        for (const [id, experiment] of this.experiments) {
            if (experiment.enabled) {
                experiment.enabled = false;
            }
        }
        this.emit('chaos:disabled', { environment: this.environment });
        logger_js_1.default.info('Chaos engineering disabled (kill switch activated)');
        return (0, data_envelope_js_1.createDataEnvelope)(true, {
            source: 'ChaosController',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Chaos disabled'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Check if chaos is enabled
     */
    isEnabled() {
        return this.globalConfig.enabled;
    }
    // --------------------------------------------------------------------------
    // Tenant Opt-In
    // --------------------------------------------------------------------------
    /**
     * Opt a tenant into chaos experiments
     */
    optInTenant(tenantId) {
        this.optedInTenants.add(tenantId);
        logger_js_1.default.info({ tenantId }, 'Tenant opted into chaos experiments');
        return (0, data_envelope_js_1.createDataEnvelope)(true, {
            source: 'ChaosController',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Tenant opted in'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Opt a tenant out of chaos experiments
     */
    optOutTenant(tenantId) {
        this.optedInTenants.delete(tenantId);
        logger_js_1.default.info({ tenantId }, 'Tenant opted out of chaos experiments');
        return (0, data_envelope_js_1.createDataEnvelope)(true, {
            source: 'ChaosController',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Tenant opted out'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Check if tenant is opted in
     */
    isTenantOptedIn(tenantId) {
        return this.optedInTenants.has(tenantId);
    }
    // --------------------------------------------------------------------------
    // Experiment Management
    // --------------------------------------------------------------------------
    /**
     * Create a new experiment
     */
    createExperiment(options) {
        // Check concurrent experiment limit
        const activeCount = Array.from(this.experiments.values())
            .filter(e => e.enabled).length;
        if (activeCount >= this.globalConfig.maxConcurrentExperiments) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'ChaosController',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Maximum concurrent experiments reached'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        // Check probability limit
        if (options.probability > this.globalConfig.maxProbability) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'ChaosController',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, `Probability exceeds maximum (${this.globalConfig.maxProbability})`),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        const experiment = {
            id: (0, uuid_1.v4)(),
            name: options.name,
            type: options.type,
            targets: options.targets,
            probability: options.probability,
            config: options.config,
            enabled: false,
            tenantId: options.tenantId || null,
            maxInjections: options.maxInjections,
            injectionCount: 0,
            startTime: options.durationMs ? new Date() : undefined,
            endTime: options.durationMs
                ? new Date(Date.now() + options.durationMs)
                : undefined,
        };
        // Validate
        const errors = (0, ChaosConfig_js_1.validateExperiment)(experiment);
        if (errors.length > 0) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'ChaosController',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, `Validation errors: ${errors.join(', ')}`),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        this.experiments.set(experiment.id, experiment);
        this.stats.totalExperiments++;
        this.emit('experiment:created', { experiment });
        logger_js_1.default.info({
            experimentId: experiment.id,
            name: experiment.name,
            type: experiment.type,
        }, 'Chaos experiment created');
        return (0, data_envelope_js_1.createDataEnvelope)(experiment, {
            source: 'ChaosController',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Experiment created'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Create experiment from preset
     */
    createFromPreset(presetName, overrides) {
        const preset = ChaosConfig_js_1.EXPERIMENT_PRESETS[presetName];
        if (!preset) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'ChaosController',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, `Preset '${presetName}' not found`),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        return this.createExperiment({
            ...preset,
            ...overrides,
        });
    }
    /**
     * Enable an experiment
     */
    enableExperiment(experimentId) {
        const experiment = this.experiments.get(experimentId);
        if (!experiment) {
            return (0, data_envelope_js_1.createDataEnvelope)(false, {
                source: 'ChaosController',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Experiment not found'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        if (!this.globalConfig.enabled) {
            return (0, data_envelope_js_1.createDataEnvelope)(false, {
                source: 'ChaosController',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Chaos is globally disabled'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        experiment.enabled = true;
        experiment.startTime = new Date();
        this.stats.activeExperiments++;
        this.emit('experiment:enabled', { experimentId, name: experiment.name });
        logger_js_1.default.info({ experimentId, name: experiment.name }, 'Chaos experiment enabled');
        return (0, data_envelope_js_1.createDataEnvelope)(true, {
            source: 'ChaosController',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Experiment enabled'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Disable an experiment
     */
    disableExperiment(experimentId) {
        const experiment = this.experiments.get(experimentId);
        if (!experiment) {
            return (0, data_envelope_js_1.createDataEnvelope)(false, {
                source: 'ChaosController',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Experiment not found'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        if (experiment.enabled) {
            experiment.enabled = false;
            this.stats.activeExperiments--;
        }
        this.emit('experiment:disabled', { experimentId, name: experiment.name });
        logger_js_1.default.info({ experimentId, name: experiment.name }, 'Chaos experiment disabled');
        return (0, data_envelope_js_1.createDataEnvelope)(true, {
            source: 'ChaosController',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Experiment disabled'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Delete an experiment
     */
    deleteExperiment(experimentId) {
        const experiment = this.experiments.get(experimentId);
        if (!experiment) {
            return (0, data_envelope_js_1.createDataEnvelope)(false, {
                source: 'ChaosController',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.DENY, 'Experiment not found'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        if (experiment.enabled) {
            this.stats.activeExperiments--;
        }
        this.experiments.delete(experimentId);
        this.stats.totalExperiments--;
        this.emit('experiment:deleted', { experimentId, name: experiment.name });
        return (0, data_envelope_js_1.createDataEnvelope)(true, {
            source: 'ChaosController',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Experiment deleted'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Get experiment by ID
     */
    getExperiment(experimentId) {
        return this.experiments.get(experimentId);
    }
    /**
     * List all experiments
     */
    listExperiments() {
        return (0, data_envelope_js_1.createDataEnvelope)(Array.from(this.experiments.values()), {
            source: 'ChaosController',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Experiments listed'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    // --------------------------------------------------------------------------
    // Injection Execution
    // --------------------------------------------------------------------------
    /**
     * Attempt to inject chaos for a request
     */
    async maybeInject(context) {
        // Check global enabled
        if (!this.globalConfig.enabled) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'ChaosController',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Chaos disabled'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        // Check protected endpoints
        if ((0, ChaosConfig_js_1.isEndpointProtected)(context.path, this.globalConfig)) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'ChaosController',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Protected endpoint'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        // Check tenant opt-in
        if (this.globalConfig.requireTenantOptIn &&
            !this.isTenantOptedIn(context.tenantId)) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'ChaosController',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Tenant not opted in'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        // Find applicable experiments
        const activeExperiments = Array.from(this.experiments.values()).filter(e => {
            if (!e.enabled)
                return false;
            if (e.tenantId && e.tenantId !== context.tenantId)
                return false;
            if (e.maxInjections && e.injectionCount >= e.maxInjections)
                return false;
            if (e.endTime && new Date() > e.endTime)
                return false;
            return true;
        });
        if (activeExperiments.length === 0) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'ChaosController',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'No active experiments'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        // Try each experiment
        for (const experiment of activeExperiments) {
            const result = await (0, ChaosInjectors_js_1.executeInjection)(experiment, context);
            if (result.data) {
                // Injection occurred
                experiment.injectionCount++;
                this.stats.totalInjections++;
                this.stats.injectionsByType[experiment.type]++;
                this.stats.lastInjectionAt = new Date().toISOString();
                // Store in history
                this.injectionHistory.push(result.data);
                if (this.injectionHistory.length > 1000) {
                    this.injectionHistory.shift();
                }
                // Audit if configured
                if (this.globalConfig.auditInjections) {
                    this.emit('injection:occurred', {
                        result: result.data,
                        context,
                    });
                }
                return result;
            }
        }
        return (0, data_envelope_js_1.createDataEnvelope)(null, {
            source: 'ChaosController',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'No injection triggered'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    // --------------------------------------------------------------------------
    // Stats & History
    // --------------------------------------------------------------------------
    /**
     * Get controller statistics
     */
    getStats() {
        return (0, data_envelope_js_1.createDataEnvelope)({ ...this.stats }, {
            source: 'ChaosController',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Stats retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Get injection history
     */
    getHistory(limit = 100) {
        return (0, data_envelope_js_1.createDataEnvelope)(this.injectionHistory.slice(-limit), {
            source: 'ChaosController',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'History retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Clear injection history
     */
    clearHistory() {
        this.injectionHistory = [];
    }
    // --------------------------------------------------------------------------
    // Middleware
    // --------------------------------------------------------------------------
    /**
     * Express middleware for chaos injection
     */
    middleware() {
        return async (req, res, next) => {
            const context = {
                requestId: req.requestId || (0, uuid_1.v4)(),
                path: req.path,
                method: req.method,
                tenantId: req.tenantId || 'unknown',
                timestamp: new Date(),
            };
            const result = await this.maybeInject(context);
            if (result.data) {
                const injection = result.data;
                // Handle different injection types
                if (injection.injectorType === 'failure') {
                    const details = injection.details;
                    res.status(details.statusCode).json({
                        error: details.errorType,
                        message: details.message,
                        chaosInjected: true,
                        experimentId: injection.experimentId,
                    });
                    return;
                }
                if (injection.injectorType === 'exception') {
                    const details = injection.details;
                    throw new ChaosInjectors_js_1.ChaosInjectedError(details.message, details.statusCode || 500, injection.experimentId, injection.experimentName);
                }
                // For latency/timeout, the delay was already applied in the injector
                // Attach injection info to request for downstream use
                req.chaosInjection = injection;
            }
            next();
        };
    }
}
exports.ChaosController = ChaosController;
// ============================================================================
// Singleton Instance
// ============================================================================
let instance = null;
function getChaosController(environment, config) {
    if (!instance) {
        instance = new ChaosController(environment, config);
    }
    return instance;
}
function resetChaosController() {
    if (instance) {
        instance.disable();
        instance = null;
    }
}
exports.default = ChaosController;
