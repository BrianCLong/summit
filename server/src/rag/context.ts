import type { Pool } from 'pg';

export type Turn = { q:string; cypher:string; evidenceIds:string[]; ts:number };

export async function getContext(caseId:string, k=4, db:Pool): Promise<Turn[]> {
  const res = await db.query(
    `SELECT question as q, cypher, evidence_ids as "evidenceIds", created_at as ts
     FROM rag_turns
     WHERE case_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [caseId, k]
  );
  return res.rows;
}

export async function recordTurn(caseId:string, t:Turn, db:Pool) {
  await db.query(
    `INSERT INTO rag_turns (case_id, question, cypher, evidence_ids, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [caseId, t.q, t.cypher, t.evidenceIds, t.ts]
  );
}
