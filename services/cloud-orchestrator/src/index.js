"use strict";
/**
 * Cloud Orchestrator Service
 *
 * Provides unified deployment orchestration across AWS, Azure, and GCP
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const terraform_1 = require("./orchestrators/terraform");
const kubernetes_1 = require("./orchestrators/kubernetes");
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use(express_1.default.json());
const terraformOrchestrator = new terraform_1.TerraformOrchestrator();
const k8sOrchestrator = new kubernetes_1.KubernetesOrchestrator();
// Deploy infrastructure
app.post('/api/deploy/infrastructure', async (req, res) => {
    try {
        const { provider, environment, config } = req.body;
        const result = await terraformOrchestrator.deploy({
            provider,
            environment,
            config
        });
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Infrastructure deployment failed:', error);
        res.status(500).json({ error: error.message });
    }
});
// Deploy application
app.post('/api/deploy/application', async (req, res) => {
    try {
        const { cluster, namespace, manifest } = req.body;
        const result = await k8sOrchestrator.deploy({
            cluster,
            namespace,
            manifest
        });
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Application deployment failed:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get deployment status
app.get('/api/deploy/status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const status = await terraformOrchestrator.getDeploymentStatus(id);
        res.json(status);
    }
    catch (error) {
        logger_1.logger.error('Failed to get deployment status:', error);
        res.status(500).json({ error: error.message });
    }
});
app.listen(PORT, () => {
    logger_1.logger.info(`Cloud Orchestrator Service listening on port ${PORT}`);
});
