// Idempotent customer upsert keyed by PK with tx/lsn replay protection.
UNWIND $events AS ev
WITH ev
MERGE (c:Customer {customer_id: ev.pk.customer_id})
ON CREATE SET c.created_at = datetime()
WITH c, ev,
     coalesce(c.last_txid, '') AS lastTxid,
     coalesce(c.last_lsn, '') AS lastLsn
WHERE (lastTxid = '' AND lastLsn = '') OR (lastTxid < toString(ev.txid)) OR (lastTxid = toString(ev.txid) AND lastLsn < toString(ev.lsn))
SET c.name = ev.after.name,
    c.tier = ev.after.tier,
    c.source_system = ev.source_system,
    c.last_txid = toString(ev.txid),
    c.last_lsn = toString(ev.lsn),
    c.last_commit_ts = ev.commit_ts,
    c.last_checksum = ev.checksum;
