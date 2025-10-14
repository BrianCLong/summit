import neo4j from 'neo4j-driver';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

config({ path: path.resolve(process.cwd(), '.env') });

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), { encrypted: 'ENCRYPTION_OFF' });

async function runMigrations() {
  const session = driver.session();
  try {
    const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../server/src/db/migrations');
    const files = await fs.readdir(migrationsDir);
    const cypherFiles = files.filter(file => file.endsWith('.cypher')).sort();

    for (const file of cypherFiles) {
      const filePath = path.join(migrationsDir, file);
      console.log(`Running migration: ${file}`);
      const cypher = await fs.readFile(filePath, 'utf8');
      await session.run(cypher);
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