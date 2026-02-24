import type { Driver, Session } from 'neo4j-driver';
import type { CdcMutation, Neo4jApplyResult } from './cdc-event.types.js';

const CUSTOMER_UPSERT_CYPHER = `
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
    c.last_txid = toString(ev.txid),
    c.last_lsn = toString(ev.lsn),
    c.last_commit_ts = ev.commit_ts,
    c.last_checksum = ev.checksum,
    c.source_system = ev.source_system
`;

const ORDER_EDGE_UPSERT_CYPHER = `
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
WITH r, ev, coalesce(r.last_txid, '') AS lastTxid, coalesce(r.last_lsn, '') AS lastLsn
WHERE (lastTxid = '' AND lastLsn = '') OR (lastTxid < toString(ev.txid)) OR (lastTxid = toString(ev.txid) AND lastLsn < toString(ev.lsn))
SET r.last_txid = toString(ev.txid),
    r.last_lsn = toString(ev.lsn),
    r.last_commit_ts = ev.commit_ts,
    r.last_checksum = ev.checksum
`;

const CUSTOMER_SOFT_DELETE_CYPHER = `
UNWIND $events AS ev
WITH ev
MATCH (c:Customer {customer_id: ev.pk.customer_id})
SET c.deleted = true,
    c.deleted_txid = toString(ev.txid),
    c.deleted_lsn = toString(ev.lsn),
    c.deleted_commit_ts = ev.commit_ts,
    c.last_checksum = ev.checksum
`;

export async function applyMutations(driver: Driver, events: CdcMutation[]): Promise<Neo4jApplyResult> {
  const session = driver.session();
  try {
    const grouped = {
      customerUpserts: events.filter((event) => event.table === 'public.customer' && event.op_type !== 'delete'),
      orderUpserts: events.filter((event) => event.table === 'public.order' && event.op_type !== 'delete'),
      customerDeletes: events.filter((event) => event.table === 'public.customer' && event.op_type === 'delete'),
    };

    let applied = 0;
    if (grouped.customerUpserts.length > 0) {
      await run(session, CUSTOMER_UPSERT_CYPHER, { events: grouped.customerUpserts });
      applied += grouped.customerUpserts.length;
    }
    if (grouped.orderUpserts.length > 0) {
      await run(session, ORDER_EDGE_UPSERT_CYPHER, { events: grouped.orderUpserts });
      applied += grouped.orderUpserts.length;
    }
    if (grouped.customerDeletes.length > 0) {
      await run(session, CUSTOMER_SOFT_DELETE_CYPHER, { events: grouped.customerDeletes });
      applied += grouped.customerDeletes.length;
    }

    return { applied, skippedAsReplay: Math.max(0, events.length - applied) };
  } finally {
    await session.close();
  }
}

async function run(session: Session, query: string, params: Record<string, unknown>) {
  await session.executeWrite((tx) => tx.run(query, params));
}
