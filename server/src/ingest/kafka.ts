import { neo } from '../db/neo4j';
import { ingestDedupeRate, ingestBacklog } from '../metrics';

let kafkaIngestCounter = 0;
let kafkaDedupeCounter = 0;

export async function startKafkaConsumer() {
  console.log(
    'Starting Kafka consumer for coherence.signals.v1 (placeholder).',
  );

  // AC-ING-05: At-least-once with dedupe key (tenant,source,signal_id,ts) (placeholder)
  // In a real system, this would involve a Kafka consumer client, processing messages,
  // and using a transactional approach or a separate deduplication store (e.g., Redis).

  const dummySignal = {
    tenantId: 'kafka-tenant-1',
    type: 'kafka_test',
    value: Math.random(),
    weight: 1.0,
    source: 'kafka',
    ts: new Date().toISOString(),
    signal_id: `kafka-signal-${Date.now()}`, // Unique ID for deduplication
  };

  // Simulate deduplication check (very basic placeholder)
  const isDuplicate = Math.random() < 0.1; // 10% chance of being a duplicate
  kafkaIngestCounter++;

  if (!isDuplicate) {
    await neo.run(
      `MERGE (t:Tenant {tenant_id:$tenantId}) WITH t MERGE (s:Signal {signal_id:$signalId}) SET s.type=$type, s.value=$value, s.weight=$weight, s.source=$source, s.ts=$ts, s.tenant_id=$tenantId MERGE (t)-[:EMITS]->(s)`,
      { ...dummySignal },
    );
    console.log('Simulated Kafka signal ingested to Neo4j (deduplicated).');
  } else {
    kafkaDedupeCounter++;
    console.log('Simulated Kafka signal skipped (duplicate).');
  }

  // Update metrics
  ingestDedupeRate.set(kafkaDedupeCounter / kafkaIngestCounter);
  ingestBacklog.set(Math.floor(Math.random() * 100)); // Simulate a random backlog
}
