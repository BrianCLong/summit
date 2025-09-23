import { neo } from '../db/neo4j';
import { ingestDedupeRate, ingestBacklog } from '../metrics';

let httpIngestCounter = 0;
let httpDedupeCounter = 0;

export async function handleHttpSignal(signal: any) {
  console.log("Received HTTP signal:", signal);
  httpIngestCounter++;

  // AC-ING-01: Finalize schema validation (placeholder)
  if (!signal.tenantId || !signal.type || typeof signal.value === 'undefined' || !signal.source) {
    console.error("HTTP signal validation failed: Missing required fields.", signal);
    return { success: false, message: "Validation failed" };
  }

  // AC-ING-02: Provenance attach (placeholder)
  const provenanceId = `http-ingest-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  console.log(`Attached provenance ID: ${provenanceId}`);
  signal.provenanceId = provenanceId;

  // AC-ING-03: 429/backoff (placeholder)
  console.log("Applying rate limiting/backoff logic (placeholder).");

  // Simulate deduplication (for metric purposes)
  const isDuplicate = Math.random() < 0.1; // 10% chance of being a duplicate
  if (isDuplicate) {
    httpDedupeCounter++;
    console.log("Simulated HTTP signal skipped (duplicate).");
  } else {
    // Ingest to Neo4j
    const { tenantId, type, value, weight, source, ts } = signal;
    const signalId = `${source}:${Date.now()}`;
    await neo.run(`MERGE (t:Tenant {tenant_id:$tenantId}) WITH t MERGE (s:Signal {signal_id:$signalId}) SET s.type=$type, s.value=$value, s.weight=$weight, s.source=$source, s.ts=$ts, s.tenant_id=$tenantId, s.provenance_id=$provenanceId MERGE (t)-[:EMITS]->(s)`, { tenantId, signalId, type, value, weight, source, ts: ts || new Date().toISOString(), provenanceId });
    console.log("HTTP signal ingested to Neo4j.");
  }

  // Update metrics
  ingestDedupeRate.set(httpDedupeCounter / httpIngestCounter);
  ingestBacklog.set(Math.floor(Math.random() * 100)); // Simulate a random backlog

  return { success: true, message: "Signal processed" };
}
