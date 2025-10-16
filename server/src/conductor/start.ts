import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function startRun({
  runbookYaml,
  runbookRef,
  parentRunId,
  labels,
  idempotency,
}: {
  runbookYaml?: string;
  runbookRef?: string;
  parentRunId?: string;
  labels?: string[];
  idempotency?: string;
}) {
  const {
    rows: [r],
  } = await pg.query(
    `INSERT INTO run (id, runbook, status, started_at, parent_run_id, idempotency_key)
    VALUES (gen_random_uuid(), $1, 'PENDING', now(), $2, $3) RETURNING id`,
    [runbookRef || 'inline', parentRunId || null, idempotency || null],
  );
  return { id: r.id };
}

export async function onRunComplete(runId: string, _cancel?: AbortSignal) {
  // Placeholder: in a real system, subscribe to completion; here just a no-op
  return { id: runId };
}
