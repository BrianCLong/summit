import type { Driver } from 'neo4j-driver';
import type { CdcMutation } from './cdc-event.types.js';
import { canonicalChecksum, mutationVersionKey } from './checksum.js';
import { applyMutations } from './neo4j-upsert.js';
import { emitOpenLineage, toOpenLineageEvent } from './openlineage.js';

export interface ConsumerDeps {
  neo4j: Driver;
  lineageEndpoint: string;
  lineageApiKey?: string;
  seenVersions?: Set<string>;
}

export async function processBatch(events: CdcMutation[], deps: ConsumerDeps): Promise<void> {
  const seen = deps.seenVersions ?? new Set<string>();

  const deduped: CdcMutation[] = [];
  for (const event of events) {
    const version = mutationVersionKey(event.txid, event.lsn);
    if (seen.has(version)) {
      continue;
    }

    // Ensure checksum is present and deterministic before applying.
    if (!event.checksum && event.after) {
      event.checksum = canonicalChecksum(event.after);
    }

    seen.add(version);
    deduped.push(event);
  }

  if (deduped.length === 0) {
    return;
  }

  await applyMutations(deps.neo4j, deduped);

  const lineageEvents = deduped.map(toOpenLineageEvent);
  await emitOpenLineage(lineageEvents, deps.lineageEndpoint, deps.lineageApiKey);
}

// Adapter seam: use this with a Kafka consumer that yields parsed CDC events.
export async function consumeForever(
  source: AsyncIterable<CdcMutation[]>,
  deps: ConsumerDeps,
): Promise<void> {
  for await (const batch of source) {
    await processBatch(batch, deps);
  }
}
