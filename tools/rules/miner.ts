import { Pool } from 'pg';
import fs from 'fs';
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

// Define proper types instead of using 'any'
type Condition = {
  [key: string]: any;
} | string;

type Action = {
  do: string;
  with?: Record<string, any>;
};

type Candidate = {
  id: string;
  when: Condition;
  if?: string;
  then: Action[];
  support: number;
  precision: number;
};

async function mine(): Promise<Candidate[]> {
  // Example heuristics over history: high-risk + infra touched → owners:required
  const { rows: infra } = await pg.query(`
    SELECT COUNT(*) filter (WHERE owners_required=true) AS ok, COUNT(*) AS total
    FROM pr_events
    WHERE risk='high' AND (paths ~ '^(charts/|\.github/workflows/)')`);
  const prec = Number(infra[0].ok) / Math.max(1, Number(infra[0].total));
  const c1: Candidate = {
    id: 'risk-block-infra-mined',
    when: { '==': [{ var: 'kind' }, 'pull_request'] },
    if: "payload.risk=='high' && payload.files.some(f => f.startsWith('charts/') || f.startsWith('.github/workflows/'))",
    then: [
      {
        do: 'label',
        with: { labels: ['needs:arch-review', 'owners:required'] },
      },
    ],
    support: Number(infra[0].total),
    precision: prec,
  };

  // Confidence <85 → no automerge
  const { rows: conf } = await pg.query(`
    SELECT COUNT(*) filter (WHERE merge_blocked=true) AS ok, COUNT(*) AS total
    FROM pr_events WHERE confidence < 85`);
  const c2: Candidate = {
    id: 'no-automerge-low-confidence',
    when: { '==': [{ var: 'kind' }, 'pull_request'] },
    if: 'payload.confidence < 85',
    then: [{ do: 'label', with: { labels: ['automerge:deny'] } }],
    support: Number(conf[0].total),
    precision: Number(conf[0].ok) / Math.max(1, Number(conf[0].total)),
  };

  return [c1, c2].filter((c) => c.support >= 20 && c.precision >= 0.9);
}

(async () => {
  const out = await mine();
  fs.writeFileSync('rules_proposals.json', JSON.stringify(out, null, 2));
  // eslint-disable-next-line no-console
  console.log(`proposed ${out.length} rules`);
})();
