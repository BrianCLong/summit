#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const neo4j = require('neo4j-driver');

const fixturesPath = path.resolve(__dirname, '../../server/db/fixtures/local-dev.json');
const postgresUrl = process.env.POSTGRES_URL || `postgres://${process.env.POSTGRES_USER || 'intelgraph'}:${process.env.POSTGRES_PASSWORD || 'password'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'intelgraph'}`;
const neo4jUrl = process.env.NEO4J_URI || 'bolt://localhost:7687';
const neo4jUser = process.env.NEO4J_USERNAME || 'neo4j';
const neo4jPassword = process.env.NEO4J_PASSWORD || 'password';

function log(step, message) {
  console.log(`➡️  [${step}] ${message}`);
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function seedPostgres(fixtures) {
  log('postgres', 'connecting to database');
  const pool = new Pool({ connectionString: postgresUrl });
  let client;
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      client = await pool.connect();
      break;
    } catch (err) {
      if (attempt === 10) {
        throw err;
      }
      await wait(attempt * 500);
    }
  }
  if (!client) {
    throw new Error('Unable to establish Postgres connection');
  }
  try {
    await client.query('BEGIN');
    await client.query('CREATE SCHEMA IF NOT EXISTS devkit');
    await client.query(`CREATE TABLE IF NOT EXISTS devkit.cases (
      case_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      owner TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await client.query(`CREATE TABLE IF NOT EXISTS devkit.entities (
      entity_id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      display_name TEXT NOT NULL,
      risk_score NUMERIC(4,2) NOT NULL DEFAULT 0
    )`);
    await client.query('TRUNCATE devkit.cases');
    await client.query('TRUNCATE devkit.entities');

    for (const row of fixtures.postgres.cases) {
      await client.query(
        `INSERT INTO devkit.cases (case_id, title, status, priority, owner, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (case_id) DO UPDATE SET
           title = EXCLUDED.title,
           status = EXCLUDED.status,
           priority = EXCLUDED.priority,
           owner = EXCLUDED.owner,
           created_at = EXCLUDED.created_at`,
        [row.case_id, row.title, row.status, row.priority, row.owner, row.created_at]
      );
    }

    for (const row of fixtures.postgres.entities) {
      await client.query(
        `INSERT INTO devkit.entities (entity_id, entity_type, display_name, risk_score)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (entity_id) DO UPDATE SET
           entity_type = EXCLUDED.entity_type,
           display_name = EXCLUDED.display_name,
           risk_score = EXCLUDED.risk_score`,
        [row.entity_id, row.entity_type, row.display_name, row.risk_score]
      );
    }

    await client.query('COMMIT');
    log('postgres', `seeded ${fixtures.postgres.cases.length} cases and ${fixtures.postgres.entities.length} entities`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ postgres seeding failed', err);
    throw err;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

async function seedNeo4j(fixtures) {
  log('neo4j', 'connecting to database');
  const driver = neo4j.driver(neo4jUrl, neo4j.auth.basic(neo4jUser, neo4jPassword));
  let session;
  try {
    for (let attempt = 1; attempt <= 10; attempt++) {
      try {
        session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
        await session.run('RETURN 1');
        break;
      } catch (err) {
        if (session) await session.close();
        if (attempt === 10) {
          throw err;
        }
        await wait(attempt * 500);
      }
    }
    if (!session) {
      throw new Error('Unable to establish Neo4j session');
    }
    await session.executeWrite(async (tx) => {
      await tx.run('MATCH (n) DETACH DELETE n');
      for (const node of fixtures.neo4j.nodes) {
        await tx.run(
          `MERGE (n {id: $id})
           SET n += $props
           WITH n
           CALL apoc.create.setLabels(n, $labels) YIELD node
           RETURN node`,
          { id: node.id, props: node.properties, labels: node.labels }
        );
      }
      for (const rel of fixtures.neo4j.relationships) {
        await tx.run(
          `MATCH (a {id: $from})
           MATCH (b {id: $to})
           CALL apoc.create.relationship(a, $type, {display: $type}, b) YIELD rel
           RETURN rel`,
          { from: rel.from, to: rel.to, type: rel.type }
        );
      }
    });
    log('neo4j', `seeded ${fixtures.neo4j.nodes.length} nodes and ${fixtures.neo4j.relationships.length} relationships`);
  } catch (err) {
    console.error('❌ neo4j seeding failed', err);
    throw err;
  } finally {
    if (session) {
      await session.close();
    }
    await driver.close();
  }
}

async function main() {
  if (!fs.existsSync(fixturesPath)) {
    console.error(`Fixture file not found at ${fixturesPath}`);
    process.exit(1);
  }

  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
  console.log('🚀 Seeding IntelGraph DevKit fixtures');
  await seedPostgres(fixtures);
  await seedNeo4j(fixtures);
  console.log('✅ Fixtures seeded successfully');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
