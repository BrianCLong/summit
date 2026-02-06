import express from 'express';
import { PipelineOrchestrator } from '../ingestion/PipelineOrchestrator.js';
import { RetrievalService } from '../services/RetrievalService.js';
import { getRagContext } from '../services/rag.js';
import { PipelineConfig } from '../data-model/types.js';
import { Pool } from 'pg';
import { QueueService } from '../ingestion/QueueService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { BackpressureGuard } from '../backpressure/guard.js';

const router = express.Router();
const orchestrator = new PipelineOrchestrator();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const queueService = new QueueService();
const singleParam = (value: unknown): string | undefined =>
  Array.isArray(value) ? (value[0] as string | undefined) : typeof value === 'string' ? value : undefined;

// Trigger Pipeline Run
router.post('/pipelines/:key/run', ensureAuthenticated, async (req, res) => {
  const key = singleParam(req.params.key) ?? '';
  // In a real app, we'd fetch config from DB
  // For MVP/Demo, we accept config in body or mock it
  const config = req.body as PipelineConfig;

  if (config.key !== key) {
      return res.status(400).json({ error: 'Pipeline key mismatch' });
  }

  // Enforce tenant isolation
  // If user has a tenantId, force the pipeline execution to that tenant
  if (req.user?.tenantId) {
      config.tenantId = req.user.tenantId;
  }

  if (!config.tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
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
    const jobId = singleParam(req.params.jobId) ?? '';
    const status = await queueService.getJobStatus(jobId);
    if (!status) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Pipelines
router.get('/pipelines', ensureAuthenticated, async (req, res) => {
   // Mock list
   res.json([
       { key: 'demo-file', name: 'Demo File Ingestion', type: 'file' },
       { key: 'demo-api', name: 'Demo API Ingestion', type: 'api' }
   ]);
});

// RAG Retrieval API
router.post('/search/retrieve', ensureAuthenticated, async (req, res) => {
  let { query, tenantId } = req.body;

  // Input validation
  if (!query || typeof query !== 'string' || query.length > 1000) {
      return res.status(400).json({ error: 'Invalid query' });
  }

  // Enforce tenant isolation (Authoritative Binding)
  if (req.user?.tenantId) {
      tenantId = req.user.tenantId;
  }

  if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
  }

  const retrieval = new RetrievalService();
  const results = await retrieval.retrieve(query, tenantId);
  res.json(results);
});

// RAG Context API
router.post('/search/context', ensureAuthenticated, async (req, res) => {
  let { query, tenantId } = req.body;

  // Input validation
  if (!query || typeof query !== 'string' || query.length > 1000) {
      return res.status(400).json({ error: 'Invalid query' });
  }

  // Enforce tenant isolation (Authoritative Binding)
  if (req.user?.tenantId) {
      tenantId = req.user.tenantId;
  }

  if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
  }

  const context = await getRagContext(query, tenantId);
  res.json({ context });
});

// Get DLQ Records
router.get('/dlq', ensureAuthenticated, async (req, res) => {
    // Only allow admins to view DLQ
    // Role values are conventionally uppercase in this system (e.g. ADMIN)
    if ((req.user as any)?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM dlq_records ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } finally {
        client.release();
    }
});

export default router;
