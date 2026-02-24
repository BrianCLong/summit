import type { CdcMutation, OpenLineageRunEvent } from './cdc-event.types.js';

function runId(mutation: CdcMutation): string {
  return `txid:${mutation.txid}/lsn:${mutation.lsn}`;
}

function outputName(mutation: CdcMutation): string {
  const pk = Object.entries(mutation.pk)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
  return `${mutation.table}(${pk})`;
}

export function toOpenLineageEvent(mutation: CdcMutation): OpenLineageRunEvent {
  return {
    eventType: 'COMPLETE',
    eventTime: mutation.commit_ts,
    job: {
      namespace: 'summit/graph-sync',
      name: 'pg-to-neo4j-upsert',
    },
    run: {
      runId: runId(mutation),
    },
    inputs: [
      {
        namespace: `${mutation.source_system}/${mutation.db_name}`,
        name: mutation.table,
        facets: {
          tx: {
            _producer: 'summit/cdc-scaffold',
            txid: mutation.txid,
            lsn: mutation.lsn,
            commit_ts: mutation.commit_ts,
            actor: mutation.actor,
            op_type: mutation.op_type,
          },
        },
      },
    ],
    outputs: [
      {
        namespace: 'neo4j://intelgraph',
        name: outputName(mutation),
        facets: {
          checksum: {
            value: mutation.checksum,
          },
        },
      },
    ],
  };
}

export async function emitOpenLineage(
  events: OpenLineageRunEvent[],
  endpoint: string,
  apiKey?: string,
): Promise<void> {
  if (events.length === 0) {
    return;
  }

  for (const event of events) {
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(event),
    });
  }
}
