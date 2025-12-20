
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const neo4j = require('neo4j-driver');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function seedPostgres() {
  const sqlDir = path.resolve(__dirname, '../db/seeds/postgres');
  if (!fs.existsSync(sqlDir)) return console.log('Postgres seeds: none');
  const connStr = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connStr)
    return console.warn('Skip Postgres: POSTGRES_URL/DATABASE_URL not set');
  const client = new Client({ connectionString: connStr });
  await client.connect();
  const files = fs
    .readdirSync(sqlDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(sqlDir, f), 'utf8');
    console.log(`Seeding Postgres: ${f}`);
    await client.query(sql);
  }
  await client.end();
}

async function seedNeo4j() {
  const cypherDir = path.resolve(__dirname, '../db/seeds/neo4j');
  if (!fs.existsSync(cypherDir)) return console.log('Neo4j seeds: none');
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !user || !password)
    return console.warn('Skip Neo4j: NEO4J_URI/USER/PASSWORD not set');
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();
  const files = fs
    .readdirSync(cypherDir)
    .filter((f) => f.endsWith('.cypher'))
    .sort();
  try {
    for (const f of files) {
      const cypher = fs.readFileSync(path.join(cypherDir, f), 'utf8');
      console.log(`Seeding Neo4j: ${f}`);
      if (cypher.trim()) await session.run(cypher);
    }
  } finally {
    await session.close();
    await driver.close();
  }
}

(async () => {
  await seedPostgres();
  await seedNeo4j();
  console.log('Seeding complete');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
