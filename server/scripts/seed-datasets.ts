import { Driver } from 'neo4j-driver';
import { connectNeo4j } from '../src/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../..');

async function main() {
  console.log('🌱 Seeding Golden Datasets into Neo4j...');

  let neo4j: Driver | undefined;

  try {
    neo4j = await connectNeo4j();
    const session = neo4j.session();

    const datasetPath = path.join(PROJECT_ROOT, 'GOLDEN/datasets/cognitive-iw/fixtures.seed.jsonl');

    if (!fs.existsSync(datasetPath)) {
      console.error(`❌ Dataset not found at ${datasetPath}`);
      process.exit(1);
    }

    const content = fs.readFileSync(datasetPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() !== '');

    console.log(`📊 Processing ${lines.length} events...`);

    for (const line of lines) {
      const event = JSON.parse(line);

      await session.run(`
        MERGE (e:Event {id: $id})
        SET e.source = $source,
            e.platform = $platform,
            e.occurredAt = datetime($occurredAt),
            e.clusterId = $clusterId,
            e.emotionScore = $emotionScore,
            e.viralityScore = $viralityScore,
            e.tenantId = 'tenant_golden'
      `, {
        id: event.event_id,
        source: event.source,
        platform: event.platform,
        occurredAt: event.occurred_at,
        clusterId: event.features.cluster_id,
        emotionScore: event.features.emotion_score,
        viralityScore: event.features.virality_score
      });
    }

    await session.close();
    console.log('✅ Golden Datasets seeded successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    if (neo4j) await neo4j.close();
  }
}

main();
