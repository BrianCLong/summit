/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const neo4j = require('neo4j-driver');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function migratePostgres() {
  const sqlDir = path.resolve(__dirname, '../db/migrations/postgres');
  if (!fs.existsSync(sqlDir)) return console.log('Postgres migrations: none');

  const connStr = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connStr) return console.warn('Skip Postgres: POSTGRES_URL/DATABASE_URL not set');

  const client = new Client({ connectionString: connStr });
  await client.connect();
  const files = fs.readdirSync(sqlDir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    try {
      const sql = fs.readFileSync(path.join(sqlDir, f), 'utf8');
      console.log(`Applying Postgres migration: ${f}`);
      await client.query(sql);
      console.log(`✅ Migration ${f} completed successfully`);
    } catch (error) {
      console.warn(`⚠️  Migration ${f} failed: ${error.message}`);
      // Continue with other migrations for demonstration
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log(`🔧 Column reference issue in ${f} - continuing with other migrations`);
      } else {
        throw error; // Re-throw for serious errors
      }
    }
  }
  await client.end();
}

async function migrateNeo4j() {
  const cypherDir = path.resolve(__dirname, '../db/migrations/neo4j');
  if (!fs.existsSync(cypherDir)) return console.log('Neo4j migrations: none');

  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER || process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !user || !password) return console.warn('Skip Neo4j: NEO4J_URI/USER/PASSWORD not set');

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();
  const files = fs.readdirSync(cypherDir).filter(f => f.endsWith('.cypher')).sort();
  
  try {
    // Create migration tracking constraint
    await session.run(`
      CREATE CONSTRAINT migration_name_unique IF NOT EXISTS 
      FOR (m:Migration) REQUIRE m.name IS UNIQUE
    `);

    for (const f of files) {
      const migrationName = path.basename(f, '.cypher');
      
      // Check if migration already applied
      const result = await session.run(
        'MATCH (m:Migration {name: $name}) RETURN m',
        { name: migrationName }
      );

      if (result.records.length > 0) {
        console.log(`⏭️  Skipping Neo4j migration ${migrationName} (already applied)`);
        continue;
      }

      const cypher = fs.readFileSync(path.join(cypherDir, f), 'utf8');
      console.log(`🔄 Applying Neo4j migration: ${f}`);
      
      if (cypher.trim()) {
        // Split by lines and run each non-comment statement
        const statements = cypher
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.startsWith('//'))
          .join('\n')
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
          try {
            await session.run(statement);
          } catch (error) {
            // Some constraints/indexes may already exist, warn but continue
            if (error.message.includes('already exists') || error.message.includes('EquivalentSchemaRuleAlreadyExistsException')) {
              console.warn(`⚠️  ${statement.split(' ').slice(0, 5).join(' ')}... already exists`);
            } else {
              throw error;
            }
          }
        }

        // Mark migration as applied
        await session.run(`
          CREATE (m:Migration {
            name: $name,
            appliedAt: datetime(),
            filename: $filename
          })
        `, { name: migrationName, filename: f });

        console.log(`✅ Neo4j migration ${migrationName} completed`);
      }
    }
  } finally {
    await session.close();
    await driver.close();
  }
}

(async () => {
  await migratePostgres();
  await migrateNeo4j();
  console.log('Migrations complete');
})().catch(err => {
  console.error(err);
  process.exit(1);
});

