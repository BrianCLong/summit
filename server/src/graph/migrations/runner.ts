import * as fs from 'fs';
import * as path from 'path';
import { runCypher } from '../neo4j.js';

/**
 * Basic Graph Data Migration Runner.
 * Ensures schema constraints, indexes, and graph structural updates are safely executed.
 */
export async function runGraphMigrations(migrationsDir: string) {
  console.log(`Starting Graph Data Migrations from ${migrationsDir}`);

  // Ensure migration tracking table exists implicitly
  await runCypher(
    `CREATE CONSTRAINT graph_migration_id IF NOT EXISTS FOR (m:GraphMigration) REQUIRE m.id IS UNIQUE`,
    {},
    { write: true }
  );

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.cypher'))
    .sort();

  for (const file of files) {
    const migrationId = path.basename(file, '.cypher');

    // Check if applied
    const applied = await runCypher<{ count: number }>(
      `MATCH (m:GraphMigration { id: $id }) RETURN count(m) AS count`,
      { id: migrationId },
      { write: false }
    );

    const isApplied = applied[0]?.count > 0;

    if (!isApplied) {
      console.log(`Applying migration: ${migrationId}`);
      const filePath = path.join(migrationsDir, file);
      const cypherScript = fs.readFileSync(filePath, 'utf8');

      // Splitting by semicolon isn't perfect for complex cypher,
      // but works for standard index/constraint files.
      const statements = cypherScript.split(';').map(s => s.trim()).filter(s => s.length > 0);

      for (const stmt of statements) {
        try {
          await runCypher(stmt, {}, { write: true });
        } catch (e: any) {
          console.error(`Failed executing statement in ${migrationId}: \n${stmt}`);
          throw e;
        }
      }

      // Record success
      await runCypher(
        `CREATE (m:GraphMigration { id: $id, appliedAt: datetime() })`,
        { id: migrationId },
        { write: true }
      );
      console.log(`Successfully applied: ${migrationId}`);
    }
  }

  console.log('Graph Data Migrations complete.');
}
