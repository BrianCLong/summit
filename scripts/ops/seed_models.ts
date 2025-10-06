#!/usr/bin/env ts-node
import { getNeo4jDriver } from '../../server/src/db/neo4j';

const MODELS = [
  { provider: 'openai', name: 'gpt-4o' },
  { provider: 'openai', name: 'gpt-4o-mini' },
  { provider: 'anthropic', name: 'claude-3-5-sonnet' },
  { provider: 'google', name: 'gemini-1.5-pro' },
  { provider: 'perplexity', name: 'sonar-pro' }
];

async function main() {
  const driver = getNeo4jDriver();
  const session = driver.session();
  try {
    await session.executeWrite((tx) =>
      tx.run(
        `UNWIND $models AS model
         MERGE (m:Model { provider: model.provider, name: model.name })
         ON CREATE SET m.createdAt = datetime()
         RETURN count(m) AS total`,
        { models: MODELS }
      )
    );
    console.log(`Seeded ${MODELS.length} models.`);
  } finally {
    await session.close();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
