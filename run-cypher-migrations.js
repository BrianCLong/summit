import neo4j from 'neo4j-driver';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const NEO4J_URI = 'bolt://172.19.0.4:7687';
const NEO4J_USER = 'neo4j';
const NEO4J_PASSWORD = 'password';

console.log(`Attempting to connect to Neo4j at: ${NEO4J_URI}`);
console.log(`User: ${NEO4J_USER}`);
console.log(`Password: ${NEO4J_PASSWORD ? '********' : 'N/A'}`);

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
);

async function runMigrations() {
  console.log('Waiting for database to start...');
  await new Promise((resolve) => setTimeout(resolve, 10000));
  const session = driver.session();
  try {
    const migrationsDir = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      'server/src/db/migrations',
    );
    const files = await fs.readdir(migrationsDir);
    const cypherFiles = files.filter((file) => file.endsWith('.cypher')).sort();

    for (const file of cypherFiles) {
      const filePath = path.join(migrationsDir, file);
      console.log(`Running migration: ${file}`);
      const cypher = await fs.readFile(filePath, 'utf8');
      const statements = cypher.split(';').filter((s) => s.trim() !== '');
      for (const statement of statements) {
        await session.run(statement);
      }
      console.log(`Migration ${file} completed.`);
    }
    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

runMigrations();
