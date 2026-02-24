// Idempotent FK->edge materialization with replay guard on relationship metadata.
UNWIND $events AS ev
WITH ev
MERGE (o:Order {order_id: ev.pk.order_id})
SET o.amount = ev.after.amount,
    o.last_txid = toString(ev.txid),
    o.last_lsn = toString(ev.lsn),
    o.last_commit_ts = ev.commit_ts,
    o.last_checksum = ev.checksum
MERGE (c:Customer {customer_id: ev.after.customer_id})
MERGE (o)-[r:PLACED_BY]->(c)
WITH r, ev,
     coalesce(r.last_txid, '') AS lastTxid,
     coalesce(r.last_lsn, '') AS lastLsn
WHERE (lastTxid = '' AND lastLsn = '') OR (lastTxid < toString(ev.txid)) OR (lastTxid = toString(ev.txid) AND lastLsn < toString(ev.lsn))
SET r.last_txid = toString(ev.txid),
    r.last_lsn = toString(ev.lsn),
    r.last_commit_ts = ev.commit_ts,
    r.last_checksum = ev.checksum;
