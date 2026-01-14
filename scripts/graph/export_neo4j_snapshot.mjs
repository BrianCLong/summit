import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import neo4j from 'neo4j-driver';

const outputDir = process.env.GRAPH_SNAPSHOT_DIR ?? 'graph_snapshot';
const dateStamp = process.env.SNAPSHOT_DATE ?? new Date().toISOString().slice(0, 10);
const outputPath = path.join(outputDir, `${dateStamp}.jsonl`);

const neo4jUri = process.env.NEO4J_URI ?? 'neo4j://localhost:7687';
const neo4jUser = process.env.NEO4J_USER ?? 'neo4j';
const neo4jPassword = process.env.NEO4J_PASSWORD;

if (!neo4jPassword) {
  throw new Error('NEO4J_PASSWORD must be set to export the snapshot.');
}

const driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword));

const stream = fs.createWriteStream(outputPath, { encoding: 'utf8' });

function writeLine(payload) {
  stream.write(`${JSON.stringify(payload)}\n`);
}

async function exportNodes(session) {
  const result = await session.run(
    'MATCH (n) RETURN labels(n) AS labels, properties(n) AS props',
  );

  for (const record of result.records) {
    const labels = record.get('labels');
    const props = record.get('props');
    writeLine({
      kind: 'node',
      tenant_id: props.tenant_id ?? null,
      uuid: props.uuid ?? null,
      type: labels?.[0] ?? null,
      version: props.version ?? null,
      provenance_id: props.provenance_id ?? null,
      properties: props,
      exported_at: new Date().toISOString(),
      host: os.hostname(),
    });
  }
}

async function exportEdges(session) {
  const result = await session.run(
    'MATCH (a)-[r]->(b) RETURN type(r) AS type, properties(r) AS props, properties(a) AS source, properties(b) AS target',
  );

  for (const record of result.records) {
    const props = record.get('props');
    const source = record.get('source');
    const target = record.get('target');
    writeLine({
      kind: 'edge',
      tenant_id: props.tenant_id ?? source.tenant_id ?? target.tenant_id ?? null,
      uuid: props.uuid ?? null,
      type: record.get('type') ?? null,
      version: props.version ?? null,
      provenance_id: props.provenance_id ?? null,
      source_uuid: source.uuid ?? null,
      target_uuid: target.uuid ?? null,
      source_tenant_id: source.tenant_id ?? null,
      target_tenant_id: target.tenant_id ?? null,
      properties: props,
      exported_at: new Date().toISOString(),
      host: os.hostname(),
    });
  }
}

try {
  fs.mkdirSync(outputDir, { recursive: true });
  const session = driver.session();
  await exportNodes(session);
  await exportEdges(session);
  await session.close();
} finally {
  await driver.close();
  stream.end();
}

console.log(`Neo4j snapshot written to ${outputPath}`);
