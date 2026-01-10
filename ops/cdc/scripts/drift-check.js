const { Client } = require('pg');
const neo4j = require('neo4j-driver');
const fs = require('fs');
const path = require('path');

async function main() {
  // Configuration from Environment Variables with defaults
  const pgConfig = {
    user: process.env.PGUSER || 'maestro',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'maestro',
    password: process.env.PGPASSWORD || 'maestro-dev-secret',
    port: parseInt(process.env.PGPORT || '5432', 10),
  };

  const neoConfig = {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'testtest1',
  };

  const pgClient = new Client(pgConfig);
  const driver = neo4j.driver(
    neoConfig.uri,
    neo4j.auth.basic(neoConfig.user, neoConfig.password)
  );

  try {
    // 1. Postgres Check
    await pgClient.connect();
    console.log(`Connected to Postgres at ${pgConfig.host}`);

    let pgQuery = 'SELECT count(*) as count FROM maestro.users';
    const pgSqlPath = path.join(__dirname, 'users.sql');
    if (fs.existsSync(pgSqlPath)) {
      pgQuery = fs.readFileSync(pgSqlPath, 'utf8');
    }

    const pgRes = await pgClient.query(pgQuery);
    // Assumes the query returns a 'count' column or we take the first value
    const pgCount = parseInt(pgRes.rows[0].count, 10);
    console.log(`Postgres Count: ${pgCount}`);

    // 2. Neo4j Check
    const session = driver.session();
    try {
      console.log(`Connected to Neo4j at ${neoConfig.uri}`);

      let neoQuery = 'MATCH (n:User) RETURN count(n) as count';
      const neoCypherPath = path.join(__dirname, 'users.cypher');
      if (fs.existsSync(neoCypherPath)) {
        neoQuery = fs.readFileSync(neoCypherPath, 'utf8');
      }

      const neoRes = await session.run(neoQuery);
      // Assumes the query returns a 'count' record
      const neoCount = neoRes.records[0].get('count').toNumber();
      console.log(`Neo4j Count: ${neoCount}`);

      // 3. Comparison
      if (pgCount !== neoCount) {
        console.error(`DRIFT DETECTED: Postgres (${pgCount}) != Neo4j (${neoCount})`);
        process.exit(1);
      } else {
        console.log('SUCCESS: Counts match.');
      }
    } finally {
      await session.close();
    }

  } catch (err) {
    console.error('Error during drift check:', err);
    process.exit(1);
  } finally {
    await pgClient.end();
    await driver.close();
  }
}

main();
