"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDelete = handleDelete;
const pkHash_js_1 = require("./pkHash.js");
const emit_delete_event_js_1 = require("../../lineage/emit_delete_event.js");
const DELETE_CYPHER = `
// Parameters: $source, $table, $pk_hash, $pk (map or scalar), $prov (map), $payload (map of node props)
MERGE (ev:DeletionEvent {source:$source, table:$table, pk_hash:$pk_hash})
  ON CREATE SET ev.provenance = $prov, ev.payload = $payload, ev.deleted_at = datetime()
WITH ev
MATCH (n:MyLabel {id:$pk})
OPTIONAL MATCH (n)-[r]-()
WITH n, ev, collect(r) AS rels
CALL {
  WITH n, ev
  WHERE n IS NOT NULL
  CREATE (s:Snapshot {pk:$pk, props: properties(n)})
  SET s.captured_at = datetime()
  CREATE (ev)-[:CAPTURED]->(s)
  RETURN 1
}
DETACH DELETE n
RETURN ev;
`;
async function handleDelete(pgPool, neo4jDriver, openLineageClient, message // The parsed payload from KafkaConsumer
) {
    // If message is null/undefined (tombstone), ignore.
    if (!message || !message.payload)
        return;
    const { op, source, before } = message.payload;
    // Only handle delete operations
    if (op !== 'd')
        return;
    if (!source || !before) {
        // Should not happen for 'd' op if replica identity is correct
        console.warn('Received delete event without source or before state', message);
        return;
    }
    // Extract PK from 'before' state since consumer wrapper might not pass key
    // Assuming 'id' is the PK field
    const pkValue = before.id;
    if (!pkValue) {
        console.warn('No ID found in before state', before);
        return;
    }
    const pkObj = { id: pkValue };
    const pkJson = (0, pkHash_js_1.stablePkJson)(pkObj);
    const pkHash = (0, pkHash_js_1.computePkHash)(pkJson);
    const { db, schema, table, lsn, txId, ts_ms } = source;
    const txidStr = txId ? String(txId) : '0';
    const lsnStr = lsn ? String(lsn) : '0';
    const tsMsStr = String(ts_ms || Date.now());
    const deleted_at_iso = new Date(Number(tsMsStr)).toISOString();
    // 1. Insert into Postgres reconcile.deleted_rows
    const provenance = JSON.stringify({
        lsn: lsnStr,
        txid: txidStr,
        commit_ts: tsMsStr,
        connector: "debezium",
        db
    });
    await pgPool.query(`
    INSERT INTO reconcile.deleted_rows
      (source_system, db_name, schema_name, table_name, pk_jsonb, pk_hash, lsn, txid, provenance)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (source_system, table_name, pk_hash) DO NOTHING
  `, ["postgres", db, schema, table, pkJson, pkHash, lsnStr, txidStr, provenance]);
    // 2. Neo4j delete with snapshot
    const session = neo4jDriver.session();
    try {
        const result = await session.executeWrite(tx => tx.run(DELETE_CYPHER, {
            source: "postgres",
            table: table,
            pk_hash: pkHash,
            pk: pkValue,
            prov: { lsn: lsnStr, txid: txidStr, ts_ms: tsMsStr },
            payload: {}
        }));
        const ev = result.records[0]?.get('ev');
        if (ev) {
            // 3. Emit OpenLineage event
            const ev_id = ev.elementId || ev.identity.toString();
            await (0, emit_delete_event_js_1.emitDeleteEvent)(openLineageClient, {
                db, schema, table,
                ev_id,
                lsn: lsnStr, txid: txidStr,
                deleted_at_iso
            });
        }
    }
    finally {
        await session.close();
    }
}
