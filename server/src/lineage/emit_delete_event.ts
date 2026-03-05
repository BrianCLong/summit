export interface OpenLineageClient {
  emit(event: any): Promise<void>;
}

export interface DeleteEventParams {
  db: string;
  schema: string;
  table: string;
  ev_id: string; // DeletionEvent ID/URI
  lsn: string;
  txid: string;
  deleted_at_iso: string;
}

export async function emitDeleteEvent(client: OpenLineageClient, params: DeleteEventParams) {
  const { db, schema, table, ev_id, lsn, txid, deleted_at_iso } = params;

  const event = {
    eventType: "COMPLETE",
    eventTime: new Date().toISOString(),
    job: { namespace: "summit/deletes", name: "neo4j-delete-canary" },
    producer: "summit://openlineage",
    outputs: [{
      namespace: `${db}.${schema}`,
      name: `${table}`,
      facets: {
        operation: { _producer: "summit://openlineage", _schemaURL: "https://openlineage.io/spec/1-0-0/OpenLineage.json", name: "delete" },
        prov: {
          wasInvalidatedBy: {
            activityId: ev_id,
            agent: "debezium",
            lsn: lsn, txid: txid,
            timestamp: deleted_at_iso
          }
        }
      }
    }]
  };

  await client.emit(event);
}
