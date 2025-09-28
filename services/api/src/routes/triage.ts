import { Router } from 'express';
import { requirePermission } from '../middleware/auth.js';
import { auditLog } from '../middleware/auditLog.js';
import { postgresPool } from '../db/postgres.js';

type Suggestion = { id:string; type:'link'|'anomaly'; data:any; status:'new'|'approved'|'rejected'|'materialized' };
const queue: Suggestion[] = [];

export const triageRouter = Router();

triageRouter.get('/suggestions', requirePermission('analytics:run'), async (_req,res)=>{
  try{
    if(process.env.USE_DB==='true'){
      const rows = await postgresPool.findMany<any>('triage_suggestions', {}, { orderBy:'created_at desc', limit:200 });
      return res.json({ items: rows });
    }
    res.json({ items: queue });
  }catch(e){ res.status(500).json({ ok:false, error: String(e) }); }
});

triageRouter.post('/suggestions', requirePermission('analytics:run'), async (req,res)=>{
  const s: Suggestion = { id: Math.random().toString(36).slice(2,10), type: req.body?.type||'link', data: req.body?.data||{}, status:'new' };
  try{
    if(process.env.USE_DB==='true'){
      await postgresPool.insert('triage_suggestions', { id:s.id, type:s.type, data: s.data, status: s.status });
    } else { queue.push(s); }
    res.json({ ok:true, suggestion:s });
  }catch(e){ res.status(500).json({ ok:false, error: String(e) }); }
});

triageRouter.post('/suggestions/:id/approve', requirePermission('analytics:run'), async (req,res)=>{
  const id = req.params.id;
  try{
    let s = queue.find(x=>x.id===id)||null;
    if(process.env.USE_DB==='true'){
      await postgresPool.update('triage_suggestions', { status:'approved' }, { id });
      const row = await postgresPool.findOne<any>('triage_suggestions', { id });
      if(row) s = row;
    } else if(s) s.status='approved';
    if(!s) return res.status(404).json({ ok:false });
    auditLog(req,'triage.approve',{ id }); res.json({ ok:true, suggestion:s });
  }catch(e){ res.status(500).json({ ok:false, error: String(e) }); }
});

triageRouter.post('/suggestions/:id/materialize', requirePermission('relationship:create'), async (req,res)=>{
  const id = req.params.id;
  try{
    let s = queue.find(x=>x.id===id)||null;
    if(process.env.USE_DB==='true'){
      await postgresPool.update('triage_suggestions', { status:'materialized' }, { id });
      const row = await postgresPool.findOne<any>('triage_suggestions', { id });
      if(row) s = row;
    } else if(s) s.status='materialized';
    if(!s) return res.status(404).json({ ok:false });
    auditLog(req,'triage.materialize',{ id }); res.json({ ok:true, suggestion:s });
  }catch(e){ res.status(500).json({ ok:false, error: String(e) }); }
});
