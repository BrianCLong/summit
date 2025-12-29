import express from 'express';
import { PipelineOrchestrator } from '../ingestion/PipelineOrchestrator';
import { RetrievalService } from '../services/RetrievalService';
import { getRagContext } from '../services/rag';
import { PipelineConfig } from '../data-model/types';
import { Pool } from 'pg';
import { QueueService } from '../ingestion/QueueService';
import { ensureAuthenticated } from '../middleware/auth';
import { BackpressureGuard } from '../backpressure/guard';

const router = express.Router();
const orchestrator = new PipelineOrchestrator();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const queueService = new QueueService();

// Trigger Pipeline Run
router.post('/pipelines/:key/run', async (req, res) => {
  const { key } = req.params;
  // In a real app, we'd fetch config from DB
  // For MVP/Demo, we accept config in body or mock it
  const config = req.body as PipelineConfig;

  if (config.key !== key) {
      return res.status(400).json({ error: 'Pipeline key mismatch' });
  }

  // Use QueueService if available for async
  try {
     const jobId = await queueService.enqueueIngestion(config);
     res.json({ message: 'Pipeline run initiated', pipeline: key, jobId });
  } catch (e: any) {
     // Fallback to direct run if queue fails (or just error out)
     console.error('Queue failed, running inline', e);
     orchestrator.runPipeline(config).catch(err => console.error(err));
     res.json({ message: 'Pipeline run initiated (inline fallback)', pipeline: key });
  }
});

// Admin API: Start Ingestion via Queue (New Endpoint)
router.post('/start', ensureAuthenticated, async (req, res) => {
  try {
    if (BackpressureGuard.getInstance().shouldBlock()) {
      return res.status(503).json({ error: 'Service Unavailable: Backpressure applied' });
    }

    const config: PipelineConfig = req.body;

    // Basic validation
    if (!config.tenantId || !config.source) {
        return res.status(400).json({ error: 'Invalid pipeline configuration' });
    }

    // Enforce tenant isolation if user is restricted
    if (req.user?.tenantId && req.user.tenantId !== config.tenantId) {
        return res.status(403).json({ error: 'Tenant mismatch' });
    }

    const jobId = await queueService.enqueueIngestion(config);
    res.json({ jobId, status: 'queued' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin API: Check Job Status (New Endpoint)
router.get('/status/:jobId', ensureAuthenticated, async (req, res) => {
  try {
    const status = await queueService.getJobStatus(req.params.jobId);
    if (!status) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Pipelines
router.get('/pipelines', async (req, res) => {
   // Mock list
   res.json([
       { key: 'demo-file', name: 'Demo File Ingestion', type: 'file' },
       { key: 'demo-api', name: 'Demo API Ingestion', type: 'api' }
   ]);
});

// RAG Retrieval API
router.post('/search/retrieve', async (req, res) => {
  const { query, tenantId } = req.body;
  const retrieval = new RetrievalService();
  const results = await retrieval.retrieve(query, tenantId);
  res.json(results);
});

// RAG Context API
router.post('/search/context', async (req, res) => {
  const { query, tenantId } = req.body;
  const context = await getRagContext(query, tenantId);
  res.json({ context });
});

// Get DLQ Records
router.get('/dlq', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM dlq_records ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } finally {
        client.release();
    }
});

export default router;
