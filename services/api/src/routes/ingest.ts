import { Router } from 'express';

type Job = { id: string; connector: string; status: 'queued'|'running'|'completed'|'failed'; progress: number };
const jobs = new Map<string, Job>();

export const ingestRouter = Router();

// List available connectors (scaffold)
ingestRouter.get('/connectors', (_req, res) => {
  res.json({ items: [
    { id: 'twitter', name: 'Twitter/X' },
    { id: 'tiktok', name: 'TikTok' },
    { id: 'rss', name: 'RSS' },
    { id: 'youtube', name: 'YouTube' },
    { id: 'reddit', name: 'Reddit' },
    { id: 'telegram', name: 'Telegram' },
    { id: 'github', name: 'GitHub' },
    { id: 'slack', name: 'Slack' },
    { id: 'gdrive', name: 'Google Drive' },
    { id: 's3', name: 'Amazon S3' },
  ]});
});

// Start an ingest job (scaffold, in-memory)
ingestRouter.post('/start', (req, res) => {
  const connector = String(req.body?.connector||'');
  if(!connector) return res.status(400).json({ ok:false, error: 'connector_required' });
  const id = Math.random().toString(36).slice(2,10);
  const job: Job = { id, connector, status: 'queued', progress: 0 };
  jobs.set(id, job);
  // simulate
  setTimeout(()=>{ job.status='running'; job.progress=25; }, 250);
  setTimeout(()=>{ job.progress=60; }, 1000);
  setTimeout(()=>{ job.progress=100; job.status='completed'; }, 2000);
  res.json({ ok:true, job_id: id, connector });
});

// Check job progress
ingestRouter.get('/progress/:id', (req,res)=>{
  const id = req.params.id;
  const job = jobs.get(id);
  if(!job) return res.status(404).json({ ok:false, error:'not_found' });
  res.json({ ok:true, id: job.id, status: job.status, progress: job.progress });
});

// Cancel job (scaffold)
ingestRouter.post('/cancel/:id', (req,res)=>{
  const id = req.params.id;
  const job = jobs.get(id);
  if(!job) return res.status(404).json({ ok:false, error:'not_found' });
  job.status = 'failed';
  job.progress = 0;
  jobs.set(id, job);
  res.json({ ok:true, id });
});

// Connector schemas (basic examples)
const schemas: Record<string, any> = {
  rss: {
    required: ['feedUrl'],
    properties: { feedUrl: { type: 'string', format: 'uri' } }
  },
  twitter: {
    required: ['bearerToken','query'],
    properties: { bearerToken: { type: 'string' }, query: { type: 'string' } }
  }
};

ingestRouter.get('/schema/:id', (req,res)=>{
  const id = req.params.id;
  res.json(schemas[id] || { required: [], properties: {} });
});

ingestRouter.post('/dry-run/:id', (req,res)=>{
  const id = req.params.id;
  const schema = schemas[id];
  if(!schema) return res.json({ ok:true, warnings: ['no schema registered'] });
  const cfg = req.body||{};
  const missing = (schema.required||[]).filter((k:string)=> cfg[k]===undefined);
  if(missing.length) return res.status(400).json({ ok:false, error: 'missing_required', fields: missing });
  res.json({ ok:true });
});
