import fetch from 'node-fetch';
import natural from 'natural';
import { EntityVectorRepo } from './vectorRepo';
import { Pool } from 'pg';
import { getPostgresPool } from '../../config/database';

function jwDistance(a:string,b:string){
  try { return natural.JaroWinklerDistance(a,b) as number; } catch { return 0; }
}

export class ErPipeline {
  private vectors: EntityVectorRepo;
  private pool: Pool;
  constructor(pool: Pool = getPostgresPool()){
    this.vectors = new EntityVectorRepo(pool);
    this.pool = pool;
  }

  async embed(text: string): Promise<number[]> {
    const url = process.env.NLP_EMBED_URL;
    if (!url) {
      // deterministic fake embedding
      const seed = Array.from(Buffer.from(text)).reduce((a,b)=>a+b,0);
      const arr = new Array(384).fill(0).map((_,i)=> ((seed + i) % 100) / 100);
      return arr;
    }
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text }) });
    const j:any = await res.json();
    return j.embedding || j.vector;
  }

  async suggestForEntity(entity: { id:string; kind:string; name?:string }){
    const text = entity.name || entity.id;
    const emb = await this.embed(text);
    await this.vectors.upsert(entity.id, entity.kind || 'UNKNOWN', text, emb);
    const nn = await this.vectors.nearest(emb, entity.kind || undefined, 5);
    const out: any[] = [];
    for (const n of nn) {
      if (n.hash === entity.id) continue;
      const nameScore = jwDistance(String(entity.name||''), String(n.text||''));
      const conf = Math.min(1, Math.max(0, 0.6 * (n.score || 0) + 0.4 * nameScore));
      if (conf >= 0.7) out.push({ left_id: entity.id, right_id: n.hash, confidence: conf, rationale: { nameScore, vectorScore:n.score } });
    }
    // persist suggestions
    for (const s of out) {
      await this.pool.query(
        `INSERT INTO er_suggestions(left_id,right_id,confidence,rationale,status) VALUES($1,$2,$3,$4,'OPEN')
         ON CONFLICT DO NOTHING`,
        [s.left_id, s.right_id, s.confidence, s.rationale]
      );
    }
    return out;
  }
}

