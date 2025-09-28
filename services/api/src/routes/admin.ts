import { Router } from 'express';
import { requirePermission } from '../middleware/auth.js';
import { getAuditEvents, auditLog } from '../middleware/auditLog.js';
import fs from 'node:fs';
import path from 'node:path';
import { redisConnection as redisPool } from '../db/redis.js';
import { rateLimitAudit } from './admin.rateLimit.js';

const flags: Record<string, boolean> = {};
const tenants = [ { id:'default', name:'Default' }, { id:'enterprise', name:'Enterprise' } ];
const users = [ { id:'u1', email:'analyst@example.com', role:'analyst', tenantId:'default' } ];

export const adminRouter = Router();

adminRouter.get('/tenants', requirePermission('user:read'), (_req,res)=>{
  res.json({ items: tenants });
});

adminRouter.get('/users', requirePermission('user:read'), (_req,res)=>{
  res.json({ items: users });
});

adminRouter.get('/audit', requirePermission('audit:read'), (req,res)=>{
  const n = Number(req.query.limit || 200);
  const q = String(req.query.query||'').toLowerCase();
  let items = getAuditEvents(n);
  if(q){ items = items.filter(e=> JSON.stringify(e).toLowerCase().includes(q)); }
  res.json({ items });
});

adminRouter.get('/flags', requirePermission('user:read'), (_req,res)=>{
  res.json({ flags });
});

adminRouter.put('/flags/:key', requirePermission('user:read'), (req,res)=>{
  const key = req.params.key; const val = Boolean(req.body?.value);
  flags[key] = val; res.json({ ok:true, key, value: val });
});

// Optional audit hook for external scripts (e.g., backup/DR). Protect with token.
adminRouter.post('/audit/record', rateLimitAudit(parseInt(process.env.AUDIT_RATE_LIMIT||'60',10)), async (req,res)=>{
  try{
    const expected = process.env.AUDIT_HOOK_TOKEN || '';
    const token = String(req.headers['x-audit-token']||'');
    if(expected && token !== expected) return res.status(401).send('unauthorized');
    const nonce = String(req.headers['x-audit-nonce']||'');
    const ts = parseInt(String(req.headers['x-audit-ts']||'0'),10);
    const windowSec = parseInt(process.env.AUDIT_WINDOW_SEC||'60',10);
    const now = Math.floor(Date.now()/1000);
    if(!nonce || !ts || Math.abs(now - ts) > windowSec) return res.status(400).send('stale');
    // Redis-based nonce TTL and optional rate-limit
    try{ await (redisPool as any).connect?.(); }catch{}
    const key = `audit:nonce:${nonce}`;
    const exists = await (redisPool as any).exists?.(key);
    if(exists){ return res.status(409).send('replay'); }
    await (redisPool as any).set?.(key, '1',  windowSec);
    const { action, details } = req.body||{};
    auditLog(req, String(action||'external.event'), details||{});
    res.status(201).json({ ok:true });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

// Policy editor (dev only): read/write policies/policy.rego
adminRouter.get('/policy', requirePermission('user:read'), (_req,res)=>{
  try{
    const p = path.join(process.cwd(),'policies','policy.rego');
    const content = fs.readFileSync(p,'utf8');
    res.type('text/plain').send(content);
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});

adminRouter.put('/policy', requirePermission('user:read'), (req,res)=>{
  try{
    const p = path.join(process.cwd(),'policies','policy.rego');
    const content = String(req.body?.content||'');
    fs.writeFileSync(p, content, 'utf8');
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ ok:false, error:String(e) }); }
});
