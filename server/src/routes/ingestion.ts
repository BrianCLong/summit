import express from 'express';
import { PipelineOrchestrator } from '../ingestion/PipelineOrchestrator';
import { RetrievalService } from '../services/RetrievalService';
import { getRagContext } from '../services/rag';
import { PipelineConfig } from '../data-model/types';
import { Pool } from 'pg';

const router = express.Router();
const orchestrator = new PipelineOrchestrator();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Trigger Pipeline Run
router.post('/pipelines/:key/run', async (req, res) => {
  const { key } = req.params;
  // In a real app, we'd fetch config from DB
  // For MVP/Demo, we accept config in body or mock it
  const config = req.body as PipelineConfig;

  if (config.key !== key) {
      return res.status(400).json({ error: 'Pipeline key mismatch' });
  }

  // Run async (fire and forget for API)
  orchestrator.runPipeline(config).catch(err => console.error(err));

  res.json({ message: 'Pipeline run initiated', pipeline: key });
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
