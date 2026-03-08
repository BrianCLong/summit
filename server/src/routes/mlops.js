"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const registry_js_1 = require("../mlops/registry.js");
const serving_js_1 = require("../mlops/serving.js");
const feature_store_js_1 = require("../mlops/feature_store.js");
const pipeline_js_1 = require("../mlops/pipeline.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// Middleware to ensure user is authenticated
router.use(auth_js_1.ensureAuthenticated);
/**
 * @route POST /mlops/models
 * @desc Register a new model
 */
router.post('/models', async (req, res) => {
    try {
        const authReq = req;
        const { name, description, domain, framework } = req.body;
        const tenantId = authReq.user?.tenantId || 'default';
        const id = await registry_js_1.modelRegistry.registerModel(tenantId, {
            name, description, domain, framework,
            owner: authReq.user?.id || 'system'
        });
        res.json({ id });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @route POST /mlops/predict
 * @desc Get predictions from a model
 */
router.post('/predict', async (req, res) => {
    try {
        const authReq = req;
        const { modelName, version, inputs, options } = req.body;
        const tenantId = authReq.user?.tenantId || 'default';
        const result = await serving_js_1.modelServing.predict(tenantId, {
            modelName,
            version,
            inputs,
            options
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @route POST /mlops/features
 * @desc Ingest features
 */
router.post('/features/ingest', async (req, res) => {
    try {
        const { featureSet, entityId, values } = req.body;
        await feature_store_js_1.featureStore.ingestFeatures(featureSet, entityId, values);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @route POST /mlops/train
 * @desc Trigger a training job
 */
router.post('/train', async (req, res) => {
    try {
        const authReq = req;
        const { modelName, datasetId, parameters } = req.body;
        const tenantId = authReq.user?.tenantId || 'default';
        const jobId = await pipeline_js_1.trainingPipeline.triggerRetraining(tenantId, modelName, datasetId, parameters);
        res.json({ jobId });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
