import { Router } from 'express';
import { requirePermission } from '../middleware/auth.js';
import { auditLog } from '../middleware/auditLog.js';
import { postgresPool } from '../db/postgres.js';

type Case = { id:string; title:string; status:'draft'|'open'|'approved'|'closed'; evidence:string[] };
const cases = new Map<string, Case>();

export const casesRouter = Router();

casesRouter.post('/', requirePermission('investigation:create'), async (req,res)=>{
  const id = Math.random().toString(36).slice(2,10);
  const c: Case = { id, title: String(req.body?.title||'Untitled'), status:'draft', evidence: [] };
  try{
    if(process.env.USE_DB==='true'){
      await postgresPool.insert('cases', { id, title: c.title, status: c.status });
    } else { cases.set(id, c); }
    auditLog(req,'case.create',{ id });
    res.json({ ok:true, case: c });
  }catch(e){ res.status(500).json({ ok:false, error: String(e) }); }
});

casesRouter.get('/:id', requirePermission('investigation:read'), async (req,res)=>{
  const id = req.params.id;
  try{
    let c = cases.get(id)||null;
    if(!c && process.env.USE_DB==='true'){
      const row = await postgresPool.findOne<any>('cases', { id });
      if(row) c = { id: row.id, title: row.title, status: row.status, evidence: [] };
    }
    if(!c) return res.status(404).json({ ok:false });
    res.json({ ok:true, case: c });
  }catch(e){ res.status(500).json({ ok:false, error: String(e) }); }
});

casesRouter.post('/:id/approve', requirePermission('investigation:update'), async (req,res)=>{
  const id = req.params.id;
  try{
    let c = cases.get(id)||null;
    if(process.env.USE_DB==='true'){
      await postgresPool.update('cases', { status:'approved' }, { id });
      const row = await postgresPool.findOne<any>('cases', { id });
      if(row) c = { id: row.id, title: row.title, status: row.status, evidence: [] };
    } else if (c) { c.status='approved'; }
    if(!c) return res.status(404).json({ ok:false });
    auditLog(req,'case.approve',{ id:c.id });
    res.json({ ok:true, case: c });
  }catch(e){ res.status(500).json({ ok:false, error: String(e) }); }
});

casesRouter.get('/:id/export', requirePermission('data:export'), (req,res)=>{
  const c = cases.get(req.params.id); if(!c) return res.status(404).json({ ok:false });
  const bundle = { id: c.id, title: c.title, status: c.status, evidence: c.evidence, watermark: { ts: new Date().toISOString() } };
  auditLog(req,'case.export',{ id:c.id });
  res.json({ ok:true, bundle });
});
