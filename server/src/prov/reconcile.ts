import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function reconcileRoots(runId: string) {
  const { rows } = await pg.query(
    `SELECT payload->>'root' AS root FROM run_ledger WHERE run_id=$1 AND event='prov.root'`,
    [runId],
  );
  if (!rows.length) return { ok: false } as const;
  const roots = new Set(rows.map((r: any) => r.root));
  if (roots.size === 1)
    return { ok: true, root: roots.values().next().value } as const;
  return { ok: false, conflict: Array.from(roots) } as const;
}
