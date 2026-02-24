// Soft delete keeps lineage intact while suppressing active reads.
UNWIND $events AS ev
WITH ev
MATCH (c:Customer {customer_id: ev.pk.customer_id})
SET c.deleted = true,
    c.deleted_txid = toString(ev.txid),
    c.deleted_lsn = toString(ev.lsn),
    c.deleted_commit_ts = ev.commit_ts,
    c.last_checksum = ev.checksum;
