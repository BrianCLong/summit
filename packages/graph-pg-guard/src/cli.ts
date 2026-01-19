import { Command } from 'commander';
import dotenv from 'dotenv';
import pg from 'pg';
import neo4j from 'neo4j-driver';
import { readCursor, writeCursor } from './reconcile/cursor_store.js';
import { pollLogicalChanges, ensureReplicationSlot } from './capture/logical.js';
import { pollOutboxChanges, cleanupOutbox } from './capture/triggers.js';
import { CaptureCursor, ChangeEvent } from './capture/types.js';

dotenv.config();

const program = new Command();

program
  .name('graph-pg-guard')
  .description('Postgres to Neo4j change capture and reconciliation')
  .version('0.1.0')
  .option('--mode <mode>', 'Capture mode: wal or outbox', process.env.CAPTURE_MODE || 'outbox')
  .option('--pg-url <url>', 'Postgres URL', process.env.PG_URL)
  .option('--neo4j-url <url>', 'Neo4j URL', process.env.NEO4J_URL)
  .option('--neo4j-user <user>', 'Neo4j User', process.env.NEO4J_USER || 'neo4j')
  .option('--neo4j-pass <pass>', 'Neo4j Password', process.env.NEO4J_PASS)
  .option('--cursor-path <path>', 'Path to cursor file', process.env.CURSOR_PATH || '.graph-pg-guard.cursor.json')
  .option('--slot <slot>', 'WAL replication slot name', process.env.WAL_SLOT || 'graph_guard_slot')
  .option('--validate-only', 'Only validate, do not capture', !!process.env.VALIDATE_ONLY)
  .option('--poll-interval <ms>', 'Polling interval in ms', '5000')
  .action(async (options) => {
    if (!options.pgUrl || !options.neo4jUrl) {
      console.error('Error: PG_URL and NEO4J_URL are required');
      process.exit(1);
    }

    const pgClient = new pg.Client({ connectionString: options.pgUrl });
    await pgClient.connect();

    const neoDriver = neo4j.driver(
      options.neo4jUrl,
      neo4j.auth.basic(options.neo4jUser, options.neo4jPass)
    );

    try {
      if (options.validateOnly) {
        console.log('Running in validate-only mode (not implemented yet)');
        return;
      }

      await runCaptureLoop(pgClient, neoDriver, options);
    } finally {
      await pgClient.end();
      await neoDriver.close();
    }
  });

async function runCaptureLoop(pgClient: pg.Client, neoDriver: any, options: any) {
  const mode = options.mode as 'wal' | 'outbox';
  const cursorPath = options.cursorPath;

  let cursor = await readCursor(cursorPath);

  if (!cursor) {
    if (mode === 'wal') {
      cursor = { kind: 'wal', slot: options.slot, lsn: '0/0' };
      await ensureReplicationSlot(pgClient, options.slot);
    } else {
      cursor = { kind: 'outbox', last_id: 0 };
    }
    await writeCursor(cursorPath, cursor);
  }

  console.log(`Starting capture loop in ${mode} mode...`);

  while (true) {
    try {
      let result: { events: ChangeEvent[]; nextCursor: CaptureCursor };

      if (mode === 'wal') {
        result = await pollLogicalChanges(pgClient, { slotName: options.slot }, cursor as any);
      } else {
        result = await pollOutboxChanges(pgClient, cursor as any);
      }

      if (result.events.length > 0) {
        console.log(`Processing ${result.events.length} events...`);
        await reconcileEvents(neoDriver, result.events);

        if (mode === 'outbox') {
          await cleanupOutbox(pgClient, (result.nextCursor as any).last_id);
        }

        await writeCursor(cursorPath, result.nextCursor);
        cursor = result.nextCursor;
      } else {
        // No events, wait for interval
        await new Promise((resolve) => setTimeout(resolve, parseInt(options.pollInterval)));
      }
    } catch (error) {
      console.error('Error in capture loop:', error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

async function reconcileEvents(neoDriver: any, events: ChangeEvent[]) {
  const session = neoDriver.session();
  try {
    for (const event of events) {
      await reconcileEvent(session, event);
    }
  } finally {
    await session.close();
  }
}

async function reconcileEvent(session: any, event: ChangeEvent) {
  const { table, op, pk, after } = event;

  // Basic mapping for 'accounts' table as requested in deliverables
  if (table !== 'accounts') {
    console.log(`Skipping unknown table: ${table}`);
    return;
  }

  const label = 'Account';

  if (op === 'INSERT' || op === 'UPDATE') {
    const properties = { ...after };
    // Neo4j MERGE for idempotency
    await session.run(
      `MERGE (n:${label} { id: $id })
       SET n += $props`,
      { id: pk.id, props: properties }
    );
  } else if (op === 'DELETE') {
    await session.run(
      `MATCH (n:${label} { id: $id })
       DETACH DELETE n`,
      { id: pk.id }
    );
  }
}

program.parse();
