
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { Client } = require('pg');
const neo4j = require('neo4j-driver');
const { parse } = require('graphql');
const dotenv = require('dotenv');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Read GraphQL Schema manually to avoid import resolution issues
const schemaPath = path.resolve(__dirname, '../src/graphql/schema.ts');

function getTypeDefs() {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }
  const content = fs.readFileSync(schemaPath, 'utf8');
  // Simple regex to extract the template string
  const match = content.match(/export const typeDefs = `([\s\S]*?)`;/);
  if (!match) {
    // Fallback for different quote styles or formatting
    const match2 = content.match(/export const typeDefs = "([\s\S]*?)";/);
    if (!match2) {
       throw new Error('Could not extract typeDefs string from schema.ts');
    }
    return match2[1];
  }
  return match[1];
}

async function checkPostgresDrift() {
  console.log('🔍 Checking Postgres drift...');
  const sqlDir = path.resolve(__dirname, '../db/migrations/postgres');

  if (!fs.existsSync(sqlDir)) {
      console.log('No Postgres migrations directory found.');
      return [];
  }

  const connStr = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connStr) {
    console.warn('⚠️ POSTGRES_URL not set. Skipping Postgres check.');
    return [];
  }

  const client = new Client({ connectionString: connStr });
  const drift = [];

  try {
    await client.connect();

    // Check if table exists
    const tableRes = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'schema_migrations'
      );
    `);

    if (!tableRes.rows[0].exists) {
        return ['Postgres: schema_migrations table missing. Run migrations.'];
    }

    const res = await client.query('SELECT migration_name FROM schema_migrations');
    const applied = new Set(res.rows.map(r => r.migration_name));

    const files = fs.readdirSync(sqlDir).filter(f => f.endsWith('.sql'));

    // Check for pending
    const pending = files.filter(f => !applied.has(f));
    if (pending.length > 0) {
        drift.push(`Postgres: ${pending.length} pending migrations: ${pending.join(', ')}`);
    }

    if (drift.length === 0) {
        console.log('✅ Postgres is in sync.');
    }

    return drift;
  } catch (e) {
      // Don't fail the whole check if DB is down locally, just report error
      return [`Postgres Connection Error: ${e.message}`];
  } finally {
    await client.end().catch(() => {});
  }
}

async function checkNeo4jDrift() {
  console.log('🔍 Checking Neo4j/GraphQL schema drift...');
  const drift = [];

  let typeDefs;
  try {
      typeDefs = getTypeDefs();
  } catch (e) {
      return [`GraphQL Parsing Error: ${e.message}`];
  }

  const doc = parse(typeDefs);
  const typeMap = new Map(); // Type -> [UniqueFields]

  // Extract types with 'id: ID!'
  for (const def of doc.definitions) {
      if (def.kind === 'ObjectTypeDefinition' && !['Query', 'Mutation', 'Subscription'].includes(def.name.value)) {
         const typeName = def.name.value;
         // Skip return types that are not entities
         if (typeName.endsWith('Result') || typeName.endsWith('Payload') || typeName.endsWith('Response') || typeName.endsWith('Edge') || typeName.endsWith('Connection')) continue;
         if (typeName === 'PageInfo') continue;

         for (const field of def.fields || []) {
             if (field.name.value === 'id' && field.type.kind === 'NonNullType' && field.type.type.kind === 'NamedType' && field.type.type.name.value === 'ID') {
                 if (!typeMap.has(typeName)) typeMap.set(typeName, []);
                 typeMap.get(typeName).push('id');
             }
         }
      }
  }

  // Connect to Neo4j
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER || process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !user || !password) {
      console.warn('⚠️ Neo4j credentials not set. Skipping Neo4j check.');
      return [];
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();

  try {
      const result = await session.run('SHOW CONSTRAINTS');

      const constraints = result.records.map(r => {
          const obj = r.toObject();
          let labels = [];
          let properties = [];

          if (obj.labelsOrTypes) labels = Array.isArray(obj.labelsOrTypes) ? obj.labelsOrTypes : [obj.labelsOrTypes];
          if (obj.properties) properties = Array.isArray(obj.properties) ? obj.properties : [obj.properties];

          return {
              type: obj.type || obj.constraintType,
              labels,
              properties
          };
      });

      for (const [typeName, fields] of typeMap.entries()) {
          for (const field of fields) {
              const exists = constraints.some(c =>
                  (c.type === 'UNIQUENESS' || c.type === 'UNIQUE') &&
                  c.labels.includes(typeName) &&
                  c.properties.includes(field)
              );

              if (!exists) {
                  // We treat missing constraints as drift
                  drift.push(`Neo4j: Missing UNIQUE constraint for (${typeName}).${field}`);
              }
          }
      }

      if (drift.length === 0) {
          console.log('✅ Neo4j schema is in sync.');
      }

  } catch (e) {
      return [`Neo4j Error: ${e.message}`];
  } finally {
      await session.close();
      await driver.close();
  }

  return drift;
}

(async () => {
    try {
        const pgDrift = await checkPostgresDrift();
        const neoDrift = await checkNeo4jDrift();

        const allDrift = [...pgDrift, ...neoDrift];

        if (allDrift.length > 0) {
            console.error('\n❌ DRIFT DETECTED:');
            allDrift.forEach(d => console.error(` - ${d}`));
            process.exit(1);
        } else {
            console.log('\n✨ No schema drift detected.');
        }
    } catch (err) {
        console.error('Checking drift failed:', err);
        process.exit(1);
    }
})();
