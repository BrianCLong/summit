/**
 * Cloud Orchestrator Service
 *
 * Provides unified deployment orchestration across AWS, Azure, and GCP
 */

import express from 'express';
import { z } from 'zod';
import { TerraformOrchestrator } from './orchestrators/terraform';
import { KubernetesOrchestrator } from './orchestrators/kubernetes';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

const terraformOrchestrator = new TerraformOrchestrator();
const k8sOrchestrator = new KubernetesOrchestrator();

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
  } catch (error: any) {
    logger.error('Infrastructure deployment failed:', error);
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
  } catch (error: any) {
    logger.error('Application deployment failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get deployment status
app.get('/api/deploy/status/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const status = await terraformOrchestrator.getDeploymentStatus(id);

    res.json(status);
  } catch (error: any) {
    logger.error('Failed to get deployment status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  logger.info(`Cloud Orchestrator Service listening on port ${PORT}`);
});
