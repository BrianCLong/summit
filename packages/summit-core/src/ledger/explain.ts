import { LedgerStore } from "./ledgerStore";

export type ExplainResult = {
  claim_id: string;
  statement: string;
  confidence: number;
  supported_by: Array<{ artifact_id: string; uri: string; observed_at: string; kind: string; sha256?: string | null }>;
  mentions_entities: Array<{ entity_id: string; label: string; kind: string }>;
  sourced_from_writesets: Array<{ writeset_id: string; tx_time: string; sha256: string }>;
};

export async function explainClaim(store: LedgerStore, claimId: string): Promise<ExplainResult> {
  // Find the *latest* claim instance by tx_time (since multiple writesets can carry same claim_id)
  const claimRows = await store.queryAll<{
    writeset_id: string;
    tx_time: string;
    sha256: string;
    claim_id: string;
    statement: string;
    confidence: number;
  }>(
    `
    SELECT w.writeset_id, w.tx_time::VARCHAR as tx_time, w.sha256,
           c.claim_id, c.statement, c.confidence
    FROM ledger_claims c
    JOIN ledger_writesets w ON w.writeset_id = c.writeset_id
    WHERE c.claim_id = ?
    ORDER BY w.tx_time DESC
    LIMIT 1
    `,
    [claimId]
  );

  if (claimRows.length === 0) throw new Error(`Claim not found: ${claimId}`);

  const latest = claimRows[0];

  // Resolve supported_by artifacts via links: (claim_id) -supported_by-> (artifact_id)
  const supported = await store.queryAll<{ artifact_id: string; uri: string; observed_at: string; kind: string; sha256: string | null }>(
    `
    SELECT a.artifact_id, a.uri, a.observed_at::VARCHAR as observed_at, a.kind, a.sha256
    FROM ledger_links l
    JOIN ledger_artifacts a ON a.artifact_id = l.to_id AND a.writeset_id = l.writeset_id
    WHERE l.from_id = ? AND l.type = 'supported_by'
    `,
    [claimId]
  );

  // Resolve mentioned entities via links: claim -mentions_entity-> entity
  const mentions = await store.queryAll<{ entity_id: string; label: string; kind: string }>(
    `
    SELECT e.entity_id, e.label, e.kind
    FROM ledger_links l
    JOIN ledger_entities e ON e.entity_id = l.to_id AND e.writeset_id = l.writeset_id
    WHERE l.from_id = ? AND l.type = 'mentions_entity'
    `,
    [claimId]
  );

  // Source chain: in v0, “latest writeset carrying the claim”
  // Later, you can expand to include upstream derived writesets.
  return {
    claim_id: latest.claim_id,
    statement: latest.statement,
    confidence: latest.confidence,
    supported_by: supported,
    mentions_entities: mentions,
    sourced_from_writesets: [{ writeset_id: latest.writeset_id, tx_time: latest.tx_time, sha256: latest.sha256 }]
  };
}
