"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWritesetsAsOf = listWritesetsAsOf;
exports.claimsAsOf = claimsAsOf;
exports.diffAsOf = diffAsOf;
async function listWritesetsAsOf(store, asOf) {
    return store.queryAll(`SELECT writeset_id, tx_time::VARCHAR as tx_time, sha256
     FROM ledger_writesets
     WHERE tx_time <= ?
     ORDER BY tx_time ASC`, [asOf.tx_time_asof]);
}
async function claimsAsOf(store, asOf) {
    // include claims from all writesets <= asOf.tx_time
    return store.queryAll(`
    SELECT c.claim_id, c.statement, c.topic, c.valid_start::VARCHAR as valid_start, c.valid_end::VARCHAR as valid_end, c.confidence
    FROM ledger_claims c
    JOIN ledger_writesets w ON w.writeset_id = c.writeset_id
    WHERE w.tx_time <= ?
    `, [asOf.tx_time_asof]);
}
async function diffAsOf(store, a, b) {
    const aClaims = await claimsAsOf(store, a);
    const bClaims = await claimsAsOf(store, b);
    const aMap = new Map(aClaims.map((c) => [c.claim_id, c]));
    const bMap = new Map(bClaims.map((c) => [c.claim_id, c]));
    const added = [];
    const removed = [];
    const changed = [];
    for (const [id, bc] of bMap) {
        if (!aMap.has(id))
            added.push(id);
        else {
            const ac = aMap.get(id);
            if (Math.abs(ac.confidence - bc.confidence) > 1e-9) {
                changed.push({ claim_id: id, from: ac.confidence, to: bc.confidence });
            }
        }
    }
    for (const [id] of aMap) {
        if (!bMap.has(id))
            removed.push(id);
    }
    return { added_claim_ids: added.sort(), removed_claim_ids: removed.sort(), changed_confidence: changed };
}
