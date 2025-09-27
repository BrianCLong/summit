import fs from 'fs';
import path from 'path';
import { runCypher } from '../../graph/neo4j';

const cypherPath = path.resolve(process.cwd(), 'db/cypher/osint_upsert.cypher');
let upsertCypher = 'RETURN 1';
try {
  upsertCypher = fs.readFileSync(cypherPath, 'utf8');
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[osint] Could not load cypher at', cypherPath);
}

export async function upsertOsintDocument(doc: any) {
  await runCypher(upsertCypher, {
    hash: doc.hash,
    title: doc.title ?? null,
    summary: doc.summary ?? null,
    url: doc.url ?? null,
    language: doc.language ?? null,
    publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : null,
    license: JSON.stringify(doc.license || {}),
    policy: JSON.stringify(doc.policy || {}),
    entities: doc.entities || [],
    claims: doc.claims || [],
  });
}

