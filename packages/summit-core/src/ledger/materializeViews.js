"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.materializeViews = materializeViews;
const ledgerQueries_1 = require("./ledgerQueries");
/**
 * Materialized views are ephemeral products:
 * - RG = Reality Graph view (high confidence + evidence-backed claims)
 * - BG = Belief Graph view (who believes what; can start stubby)
 * - NG = Narrative Graph view (clusters/claims tagged as narratives)
 *
 * In v0 we materialize into tables for query speed.
 * Later you can materialize into Neo4j/Qdrant, etc.
 */
async function materializeViews(store, asOfTx) {
    await store.exec(`
    CREATE TABLE IF NOT EXISTS view_rg_claims (
      asof_tx TIMESTAMP,
      claim_id TEXT,
      statement TEXT,
      confidence DOUBLE
    );
  `);
    await store.exec(`
    CREATE TABLE IF NOT EXISTS view_ng_claims (
      asof_tx TIMESTAMP,
      claim_id TEXT,
      statement TEXT,
      confidence DOUBLE
    );
  `);
    await store.exec(`
    CREATE TABLE IF NOT EXISTS view_bg_claims (
      asof_tx TIMESTAMP,
      claim_id TEXT,
      statement TEXT,
      confidence DOUBLE
    );
  `);
    // Simple demo heuristics:
    // - RG: confidence >= 0.75 (and enforce supported_by links)
    // - NG: topic contains "narrative" or statement has telltale markers
    // - BG: everything else (stub)
    const all = await (0, ledgerQueries_1.claimsAsOf)(store, { tx_time_asof: asOfTx });
    // clear any previous materialization at same as-of time
    await store.run(`DELETE FROM view_rg_claims WHERE asof_tx = ?`, [asOfTx]);
    await store.run(`DELETE FROM view_ng_claims WHERE asof_tx = ?`, [asOfTx]);
    await store.run(`DELETE FROM view_bg_claims WHERE asof_tx = ?`, [asOfTx]);
    for (const c of all) {
        const statement = c.statement ?? "";
        const topic = (c.topic ?? "").toLowerCase();
        const isNarrative = topic.includes("narrative") || statement.toLowerCase().includes("narrative:");
        let isReality = c.confidence >= 0.75 && !isNarrative;
        if (isReality) {
            // Enforce supported_by rule with bitemporal constraint
            const supportedByLinks = await store.queryAll(`
        SELECT l.from_id
        FROM ledger_links l
        JOIN ledger_writesets w ON w.writeset_id = l.writeset_id
        WHERE l.from_id = ? AND l.type = 'supported_by' AND w.tx_time <= ?
        LIMIT 1
        `, [c.claim_id, asOfTx]);
            if (supportedByLinks.length === 0) {
                isReality = false;
            }
        }
        if (isReality) {
            await store.run(`INSERT INTO view_rg_claims VALUES (?, ?, ?, ?)`, [asOfTx, c.claim_id, statement, c.confidence]);
        }
        else if (isNarrative) {
            await store.run(`INSERT INTO view_ng_claims VALUES (?, ?, ?, ?)`, [asOfTx, c.claim_id, statement, c.confidence]);
        }
        else {
            await store.run(`INSERT INTO view_bg_claims VALUES (?, ?, ?, ?)`, [asOfTx, c.claim_id, statement, c.confidence]);
        }
    }
}
