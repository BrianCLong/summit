/**
 * Lineage Emitter
 * Consumes Postgres NOTIFY events from 'lineage_events' and emits OpenLineage artifacts.
 */

import pkg from 'pg';
const { Client } = pkg;
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

async function startEmitter() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  await client.connect();
  await client.query('LISTEN lineage_events');

  client.on('notification', async (msg) => {
    if (msg.channel === 'lineage_events' && msg.payload) {
      const event = JSON.parse(msg.payload);
      await emitLineage(event);
    }
  });

  console.log('Lineage emitter listening for events...');
}

async function emitLineage(dbEvent) {
  const runId = dbEvent.id || crypto.randomUUID();
  const lineageEvent = {
    eventType: 'COMPLETE',
    eventTime: new Date().toISOString(),
    run: { runId },
    job: {
      namespace: 'summit.postgres',
      name: `outbox.${dbEvent.topic}`
    },
    producer: 'https://github.com/BrianCLong/summit/lineage-emitter',
    inputs: [{
      namespace: 'summit.postgres',
      name: 'outbox_events',
      facets: {
        aggregate: {
          type: dbEvent.aggregate_type,
          id: dbEvent.aggregate_id
        }
      }
    }]
  };

  const artifactPath = path.join(process.cwd(), 'artifacts/lineage', `${runId}.json`);
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, JSON.stringify(lineageEvent, null, 2));

  console.log(`Emitted lineage event: ${artifactPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startEmitter().catch(console.error);
}

export { emitLineage };
