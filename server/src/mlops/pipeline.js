"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.trainingPipeline = exports.TrainingPipelineManager = void 0;
const logger_js_1 = require("../config/logger.js");
/**
 * Service for managing ML training pipelines.
 * Integrates with Maestro (Orchestrator) to schedule and run training jobs.
 */
class TrainingPipelineManager {
    static instance;
    constructor() { }
    static getInstance() {
        if (!TrainingPipelineManager.instance) {
            TrainingPipelineManager.instance = new TrainingPipelineManager();
        }
        return TrainingPipelineManager.instance;
    }
    /**
     * Trigger a retraining job for a specific model.
     */
    async triggerRetraining(tenantId, modelName, datasetId, parameters) {
        logger_js_1.logger.info(`Triggering retraining for ${modelName} on dataset ${datasetId}`);
        // In a real implementation, we would import the Maestro singleton and dispatch a job
        // e.g., maestro.dispatch('train_model', { ... });
        // For now, we simulate the job creation and return an ID
        const jobId = `job_${Date.now()}_${modelName}`;
        // We could append an entry to the provenance ledger to track this job initiation
        try {
            const { provenanceLedger } = await Promise.resolve().then(() => __importStar(require('../provenance/ledger.js')));
            await provenanceLedger.appendEntry({
                tenantId,
                actionType: 'TRIGGER_TRAINING',
                resourceType: 'TrainingJob',
                resourceId: jobId,
                actorId: 'system',
                actorType: 'system',
                payload: { modelName, datasetId, parameters },
                metadata: { jobId }
            });
        }
        catch (e) {
            logger_js_1.logger.warn('Failed to log training trigger to ledger', e);
        }
        return jobId;
    }
    /**
     * Schedule automated retraining.
     */
    async scheduleRetraining(tenantId, modelName, schedule) {
        logger_js_1.logger.info(`Scheduled retraining for ${modelName} at ${schedule}`);
        // Integration with pg-boss or similar scheduler would happen here
    }
}
exports.TrainingPipelineManager = TrainingPipelineManager;
exports.trainingPipeline = TrainingPipelineManager.getInstance();
