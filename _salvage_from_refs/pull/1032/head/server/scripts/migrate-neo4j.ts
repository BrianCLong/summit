import { promises as fs } from 'fs';
import path from 'path';
import neo4j from 'neo4j-driver';

export async function migrateNeo4j() {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const user = process.env.NEO4J_USERNAME || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'password';

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();
  const migrationsDir = path.resolve(process.cwd(), 'server/db/migrations/neo4j');
  const files = (await fs.readdir(migrationsDir)).filter(f => f.endsWith('.cypher')).sort();

  try {
    await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (m:Migration) REQUIRE m.id IS UNIQUE');
    for (const file of files) {
      const id = file;
      const exists = await session.run('MATCH (m:Migration {id: $id}) RETURN m', { id });
      if (exists.records.length) continue;
      const contents = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      if (contents.trim()) {
        await session.run(contents);
      }
      await session.run('CREATE (m:Migration {id: $id, ranAt: datetime()})', { id });
    }
  } finally {
    await session.close();
    await driver.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrateNeo4j().catch(err => {
    console.error('Neo4j migration failed', err);
    process.exit(1);
  });
}
