import { pool } from '../lib/db';
import { runScenario } from '../services/scenario/model';
import { Router } from 'express';
export const scenario = Router();

scenario.post('/v1/scenario/run', async (req,res)=>{
  const p = req.body || {};
  res.json(runScenario(p));
});

scenario.post('/v1/scenario/save', async (req,res)=>{
  const { name, params } = req.body || {};
  if (!name || !params) return res.status(400).json({error:'name and params required'});
  const r = await pool.query('INSERT INTO scenarios (name, params, created_by) VALUES ($1,$2,$3) RETURNING id',
    [name, params, req.header('x-user-id')||'anon']);
  res.json({ id: r.rows[0].id });
});

scenario.get('/v1/scenario/list', async (_req,res)=>{
  const r = await pool.query('SELECT id,name,params,created_at FROM scenarios ORDER BY created_at DESC LIMIT 100');
  res.json({ items: r.rows });
});