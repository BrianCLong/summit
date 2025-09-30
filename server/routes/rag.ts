import type { Request, Response } from 'express';
import { answerWithRag } from '../services/rag';
import { opaAllow } from '../lib/policy';
import { ragLatency, ragContextCount } from '../metrics';
import { Pool } from 'pg';
import fetch from 'node-fetch';
import { answerKey, redis } from '../lib/cache';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default function ragRoutes(app){
  app.post('/v1/rag/answer', async (req: Request, res: Response) => {
    const started = Date.now();
    const subject = {
      userId: req.header('x-user-id') || 'anon',
      roles: (req.header('x-roles')||'').split(',').map(s=>s.trim()).filter(Boolean),
      tenant: req.header('x-tenant') || 'default'
    };
    const question = (req.body?.question || '').trim();
    const topK = Math.min(12, Math.max(3, Number(req.body?.topK || 6)));
    if (!question) return res.status(400).json({ error: 'question required' });

    const cacheKey = answerKey(question, subject.roles||[], subject.tenant||'default');
    const hit = await redis.get(cacheKey);
    if (hit) { ragLatency.observe((Date.now()-started)/1000); return res.set('x-cache','hit').json(JSON.parse(hit)); }

    const client = await pool.connect();
    try {
      // pull a generous candidate set to survive policy filtering
      const CANDIDATES = topK * 4;
      const r = await client.query(
        `SELECT id, text, provenance->>'title' AS title, provenance->>'url' AS url,
                provenance->'tags' AS tags,
                1 - (embedding <=> (SELECT embedding FROM query_embed($1))) AS score
           FROM rag_snippets
          ORDER BY embedding <=> (SELECT embedding FROM query_embed($1))
          LIMIT $2`,
        [question, CANDIDATES]
      );

      const allowed: any[] = [];
      for (const row of r.rows) {
        const { allow } = await opaAllow({
          subject,
          action: 'read_snippet',
          resource: { type:'rag_snippet', id: row.id, tags: row.tags || [] },
          context: { question }
        });
        if (allow) {
          allowed.push(row);
          if (allowed.length >= topK) break;
        }
      }
      if (!allowed.length) return res.status(403).json({ error: 'no context permitted' });

      const ctx = allowed.map((x,i)=>`[${i+1}] ${x.text}`).join('\n');

      const resp = await fetch(process.env.GENERATE_URL || 'http://model-runner:8080/generate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          prompt:
`Answer the question using ONLY the context. Cite sources like [1], [2], etc.

Question: ${question}

Context:
${ctx}

Return concise, executive-ready prose.`,
          max_tokens: 512
        })
      });
      const j = await resp.json();
      const answer = j.text || j.output || '';

      // final policy on returning answer (optional)
      const gate = await opaAllow({
        subject, action:'answer_question',
        resource: { type:'rag_answer' },
        context: { question, citations: allowed.map(a=>a.id) }
      });
      if (!gate.allow) return res.status(403).json({ error:'answer blocked by policy' });

      const citations = allowed.map((x,i)=>({n: i+1, id:x.id, title:x.title || `Source ${i+1}`, url:x.url || '', snippet: x.text.slice(0,280)
      }));

      ragLatency.observe((Date.now()-started)/1000);
      ragContextCount.observe(allowed.length);
      const result = { answer, citations };
      await redis.setex(cacheKey, Number(process.env.ANSWER_TTL_SEC||"600"), JSON.stringify(result));
      res.set('x-cache','miss').json(result);
    } finally {
      client.release();
    }
  });

  app.post('/v1/rag/answer/stream', async (req: Request, res: Response) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    const subject = {
      userId: req.header('x-user-id') || 'anon',
      roles: (req.header('x-roles')||'').split(',').map(s=>s.trim()).filter(Boolean),
      tenant: req.header('x-tenant') || 'default'
    };
    const question = (req.body?.question || '').trim();
    if (!question) { res.write(`event:error\ndata: missing question\n\n`); return res.end(); }

    const client = await pool.connect();
    try {
      const CANDIDATES = 8 * 4;
      const r = await client.query(
        `SELECT id, text, provenance->>'title' AS title, provenance->>'url' AS url,
                provenance->'tags' AS tags,
                1 - (embedding <=> (SELECT embedding FROM query_embed($1))) AS score
           FROM rag_snippets
          ORDER BY embedding <=> (SELECT embedding FROM query_embed($1))
          LIMIT $2`, [question, CANDIDATES]
      );
      const allowed = [];
      for (const row of r.rows) {
        const { allow } = await opaAllow({ subject, action:'read_snippet', resource:{ type:'rag_snippet', id:row.id }, context:{question} });
        if (allow) { allowed.push(row); if (allowed.length >= 8) break; }
      }
      if (!allowed.length) { res.write(`event:error\ndata: no permitted context\n\n`); return res.end(); }

      res.write(`event:citations\ndata:${JSON.stringify(allowed.map((x,i)=>({n:i+1,id:x.id})))}\n\n`);

      const mr = await fetch((process.env.GENERATE_STREAM_URL || 'http://model-runner:8080/generate/stream'), {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          prompt: `Answer using ONLY the context. Cite [1..]. Question: ${question}\n\nContext:\n${allowed.map((x,i)=>`[${i+1}] ${x.text}`).join('\n')}`,
          max_tokens: 512, stream: true
        })
      });

      if (!mr.ok || !mr.body) { res.write(`event:error\ndata: model unavailable\n\n`); return res.end(); }

      const reader = mr.body.getReader(); const dec = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        res.write(`data:${dec.decode(value)}\n\n`);
      }
      res.end();
    } catch (e:any) {
      res.write(`event:error\ndata:${JSON.stringify({message: e.message})}

`);
      res.end();
    } finally { client.release(); }
  });
}
