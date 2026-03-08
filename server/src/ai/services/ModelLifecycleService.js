"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelLifecycleService = exports.ModelLifecycleService = void 0;
const logger_js_1 = require("../../config/logger.js");
const postgres_js_1 = require("../../db/postgres.js");
/**
 * Service for Model Lifecycle Automation (Task #102).
 */
class ModelLifecycleService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!ModelLifecycleService.instance) {
            ModelLifecycleService.instance = new ModelLifecycleService();
        }
        return ModelLifecycleService.instance;
    }
    /**
     * Registers a new model version.
     */
    async registerModel(model) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        await pool.query(`INSERT INTO ai_models (id, name, version, state, metadata, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) DO UPDATE SET version = $3, state = $4, metadata = $5, updated_at = NOW()`, [model.id, model.name, model.version, model.state, JSON.stringify(model)]);
        logger_js_1.logger.info({ modelId: model.id, version: model.version }, 'Model registered successfully');
    }
    /**
     * Promotes a model to DEPLOYED state.
     */
    async deployModel(modelId) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        await pool.query("UPDATE ai_models SET state = 'DEPLOYED', updated_at = NOW() WHERE id = $1", [modelId]);
        logger_js_1.logger.info({ modelId }, 'Model promoted to DEPLOYED');
    }
    /**
     * Triggers a simulated retraining process.
     */
    async triggerRetraining(modelId, reason) {
        logger_js_1.logger.warn({ modelId, reason }, 'Model retraining triggered');
        const pool = (0, postgres_js_1.getPostgresPool)();
        await pool.query("UPDATE ai_models SET state = 'TRAINING', last_retrained_at = NOW(), updated_at = NOW() WHERE id = $1", [modelId]);
        // In a real system, this would send a message to a training pipeline (e.g. SageMaker, Vertex AI)
    }
}
exports.ModelLifecycleService = ModelLifecycleService;
exports.modelLifecycleService = ModelLifecycleService.getInstance();
