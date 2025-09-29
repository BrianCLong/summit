import express from 'express';
import { scimAuth } from './scimAuth';
import { pool } from '../db/pg';
import { scimOps } from '../metrics/identity';

export const scim = express.Router();
scim.use(express.json({ limit: '1mb' }));
scim.use(scimAuth());

const wrap = (resource: 'Users'|'Groups', op: string, fn: Function) => async (req, res) => {
  try {
    await fn(req, res);
    scimOps.labels(resource, op, (req as any).orgId, '200').inc();
  } catch (e: any) {
    scimOps.labels(resource, op, (req as any).orgId, String(e?.status || 500)).inc();
    if (!res.headersSent) res.status(500).json({ detail: 'SCIM error' });
  }
};

/** USERS */
scim.get('/v2/Users', wrap('Users','LIST', async (req,res)=>{
  const q = String(req.query.filter||''); // very minimal filter support: userName eq "email"
  const m = q.match(/userName\s+eq\s+"([^"]+)"/i);
  const emailEq = m ? m[1].toLowerCase() : null;
  const r = emailEq
    ? await pool.query(`SELECT id,email,display_name,status FROM "user" WHERE lower(email)=$1`,[emailEq])
    : await pool.query(`SELECT id,email,display_name,status FROM "user" LIMIT 200`);
  res.json({
    Resources: r.rows.map(u=>({ id: u.id, userName: u.email, name: { formatted: u.display_name }, active: u.status==='active' })),
    totalResults: r.rowCount, itemsPerPage: r.rowCount, startIndex: 1, schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"]
  });
}));

scim.post('/v2/Users', wrap('Users','CREATE', async (req,res)=>{
  const { userName, name, active=true } = req.body;
  const r = await pool.query(
    `INSERT INTO "user"(email,display_name,status,org_id) VALUES ($1,$2,$3,(SELECT id FROM org WHERE tenant_id=current_setting('app.tenant_id')::uuid)) RETURNING id`,
    [userName, name?.formatted||userName, active?'active':'inactive']
  );
  res.status(201).json({ id: r.rows[0].id, userName, active });
}));

scim.get('/v2/Users/:id', wrap('Users','GET', async (req,res)=>{
  const r = await pool.query(`SELECT id,email,display_name,status FROM "user" WHERE id=$1`, [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ detail: 'Not found' });
  const u = r.rows[0];
  res.json({ id: u.id, userName: u.email, name: { formatted: u.display_name }, active: u.status==='active' });
}));

scim.patch('/v2/Users/:id', wrap('Users','PATCH', async (req,res)=>{
  // RFC7644 PATCH; handle activate/deactivate + rename
  const ops = req.body?.Operations || [];
  let status: 'active'|'inactive'|undefined, display: string|undefined;
  for (const op of ops) {
    const path = (op.path||'').toLowerCase();
    if (path==='active') status = op.value ? 'active' : 'inactive';
    if (path.startsWith('name')) display = op.value?.formatted;
  }
  await pool.query(`UPDATE "user" SET status=COALESCE($2,status), display_name=COALESCE($3,display_name) WHERE id=$1`,
    [req.params.id, status, display]);
  res.status(204).end();
}));

scim.delete('/v2/Users/:id', wrap('Users','DELETE', async (req,res)=>{
  await pool.query(`UPDATE "user" SET status='inactive' WHERE id=$1`, [req.params.id]); // soft delete
  res.status(204).end();
}));

/** GROUPS (minimal create/patch list) */
scim.get('/v2/Groups', wrap('Groups','LIST', async (_req,res)=>{
  const r = await pool.query(`SELECT id,name,external_id FROM "group" LIMIT 200`);
  res.json({ Resources: r.rows.map(g=>({ id:g.id, displayName:g.name, externalId:g.external_id })), totalResults:r.rowCount, itemsPerPage:r.rowCount, startIndex:1,
    schemas:["urn:ietf:params:scim:api:messages:2.0:ListResponse"] });
}));

scim.post('/v2/Groups', wrap('Groups','CREATE', async (req,res)=>{
  const { displayName, externalId } = req.body || {};
  const r = await pool.query(
    `INSERT INTO "group"(name, external_id, org_id) VALUES ($1,$2,(SELECT id FROM org WHERE tenant_id=current_setting('app.tenant_id')::uuid)) RETURNING id`,
    [displayName, externalId||null]
  );
  res.status(201).json({ id: r.rows[0].id, displayName, externalId });
}));

scim.patch('/v2/Groups/:id', wrap('Groups','PATCH', async (req,res)=>{
  const ops = req.body?.Operations || [];
  for (const op of ops) {
    if (op.path?.toLowerCase()==='displayname') {
      await pool.query(`UPDATE "group" SET name=$2 WHERE id=$1`, [req.params.id, op.value]);
    }
  }
  res.status(204).end();
}));