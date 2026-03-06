import type { IsoDateTime } from "./bitemporal.types";
import { LedgerStore } from "./ledgerStore";
import { claimsAsOf } from "./ledgerQueries";

export type ViewKind = "RG" | "BG" | "NG";

/**
 * Materialized views are ephemeral products:
 * - RG = Reality Graph view (high confidence + evidence-backed claims)
 * - BG = Belief Graph view (who believes what; can start stubby)
 * - NG = Narrative Graph view (clusters/claims tagged as narratives)
 *
 * In v0 we materialize into tables for query speed.
 * Later you can materialize into Neo4j/Qdrant, etc.
 */
export async function materializeViews(store: LedgerStore, asOfTx: IsoDateTime): Promise<void> {
  // Use duckdb types correctly.
  await (store as any).exec(`
    CREATE TABLE IF NOT EXISTS view_rg_claims (
      asof_tx TIMESTAMP,
      claim_id TEXT,
      statement TEXT,
      confidence DOUBLE
    );
  `);

  await (store as any).exec(`
    CREATE TABLE IF NOT EXISTS view_ng_claims (
      asof_tx TIMESTAMP,
      claim_id TEXT,
      statement TEXT,
      confidence DOUBLE
    );
  `);

  await (store as any).exec(`
    CREATE TABLE IF NOT EXISTS view_bg_claims (
      asof_tx TIMESTAMP,
      claim_id TEXT,
      statement TEXT,
      confidence DOUBLE
    );
  `);

  // Simple demo heuristics:
  // - RG: confidence >= 0.75 (and later enforce supported_by links)
  // - NG: topic contains "narrative" or statement has telltale markers
  // - BG: everything else (stub)
  const all = await claimsAsOf(store, { tx_time_asof: asOfTx });

  // clear any previous materialization at same as-of time
  await (store as any).run(`DELETE FROM view_rg_claims WHERE asof_tx = ?`, [asOfTx]);
  await (store as any).run(`DELETE FROM view_ng_claims WHERE asof_tx = ?`, [asOfTx]);
  await (store as any).run(`DELETE FROM view_bg_claims WHERE asof_tx = ?`, [asOfTx]);

  for (const c of all) {
    const statement = c.statement ?? "";
    const topic = (c.topic ?? "").toLowerCase();

    const isNarrative = topic.includes("narrative") || statement.toLowerCase().includes("narrative:");
    const isReality = c.confidence >= 0.75 && !isNarrative;

    if (isReality) {
      await (store as any).run(`INSERT INTO view_rg_claims VALUES (?, ?, ?, ?)`, [asOfTx, c.claim_id, statement, c.confidence]);
    } else if (isNarrative) {
      await (store as any).run(`INSERT INTO view_ng_claims VALUES (?, ?, ?, ?)`, [asOfTx, c.claim_id, statement, c.confidence]);
    } else {
      await (store as any).run(`INSERT INTO view_bg_claims VALUES (?, ?, ?, ?)`, [asOfTx, c.claim_id, statement, c.confidence]);
    }
  }
}
