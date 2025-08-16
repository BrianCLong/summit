import { z } from 'zod';
import pino from 'pino';
import { getPostgresPool } from '../../config/database.js';
import { withAuthAndPolicy } from '../../middleware/withAuthAndPolicy.js';

const log = pino({ name: 'similarity' });
let pool: any = null;

function getPool() {
  if (!pool) {
    pool = getPostgresPool();
  }
  return pool;
}
const Args = z.object({
  entityId: z.string().optional(),
  text: z.string().optional(),
  topK: z.number().int().min(1).max(100).default(20),
  tenantId: z.string()
}).refine(a => a.entityId || a.text, { message:'entityId or text required' });

async function embeddingForText(text: string): Promise<number[]> {
  // call embedding model (server-side). Return numeric array.
  return new Array(1536).fill(0); // placeholder
}

export const similarityResolvers = {
  Query: {
    similarEntities: withAuthAndPolicy('read:entities', (args:any, ctx:any)=>({ type:'tenant', id: ctx.user.tenant }))(
      async (_: any, args: any, ctx: any) => {
        const { entityId, text, topK } = Args.parse({ ...args, tenantId: ctx.user.tenant });
        let embedding: number[];
        if (entityId) {
          const r = await getPool().query(
            'SELECT embedding FROM entity_embeddings WHERE entity_id=$1 AND tenant_id=$2',
            [entityId, ctx.user.tenant]
          );
          if (!r.rowCount) return [];
          embedding = r.rows[0].embedding;
        } else {
          embedding = await embeddingForText(text!);
        }
        const rows = await getPool().query(
          `SELECT e.entity_id, 1 - (e.embedding <=> $1::vector) AS score
           FROM entity_embeddings e
           WHERE e.tenant_id = $2
           ORDER BY e.embedding <=> $1::vector ASC
           LIMIT $3`,
          [`[${embedding.join(',')}]`, ctx.user.tenant, topK]
        );
        // hydrate minimal entity data (fast path) if a cache exists; else return ids+scores
        log.info({ count: rows.rowCount }, 'similarEntities');
        return rows.rows.map(r => ({ id: r.entity_id, score: Number(r.score) }));
      }
    )
  }
};