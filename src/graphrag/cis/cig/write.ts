import { NAEFEvent } from '../contracts';

export async function ingestNAEFEvent(event: NAEFEvent) {
  // TODO: Implement ingestion logic to Neo4j
  console.log(`Ingesting event ${event.event_id} for tenant ${event.tenant_id}`);
}
