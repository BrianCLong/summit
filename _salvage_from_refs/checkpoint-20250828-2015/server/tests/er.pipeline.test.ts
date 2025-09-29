import { EntityVectorRepo } from '../src/osint/er/vectorRepo';
import { ErPipeline } from '../src/osint/er/pipeline';
import { Pool } from 'pg';

const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const itif = (url ? it : it.skip);

describe('ER pipeline (deterministic embedding)', () => {
  itif('suggests duplicates with high confidence', async () => {
    const pool = new Pool({ connectionString: url });
    const repo = new EntityVectorRepo(pool);
    const er = new ErPipeline(pool);
    // deterministic embeddings (NLP_EMBED_URL not set)
    await repo.upsert('entA', 'PERSON', 'Alice Johnson', new Array(384).fill(0.5));
    // Now run suggest for similar name
    const out = await er.suggestForEntity({ id: 'entB', kind: 'PERSON', name: 'Alicia Johnson' });
    expect(out.some(s => s.left_id === 'entB' && s.right_id === 'entA')).toBeTruthy();
    await pool.end();
  });
});

