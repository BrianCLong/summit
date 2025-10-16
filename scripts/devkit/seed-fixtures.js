#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const neo4j = require('neo4j-driver');

const fixtureRoot = path.resolve(
  __dirname,
  '..',
  '..',
  'ops',
  'devkit',
  'fixtures',
);
const datasetPath = path.join(fixtureRoot, 'datasets.json');
const graphPath = path.join(fixtureRoot, 'graph.json');

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn(`[devkit] Unable to read ${filePath}:`, error.message);
    return fallback;
  }
}

async function seedPostgres(fixtures) {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'postgres',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'intelgraph',
    password: process.env.POSTGRES_PASSWORD || 'dev_password',
    database: process.env.POSTGRES_DB || 'intelgraph_dev',
  });

  await client.connect();

  await client.query(`
    CREATE SCHEMA IF NOT EXISTS devkit;
    CREATE TABLE IF NOT EXISTS devkit.datasets (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT,
      owner_team TEXT,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const entries = fixtures.datasets || [];
  for (const entry of entries) {
    await client.query(
      `INSERT INTO devkit.datasets (slug, name, category, summary, owner_team, data, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
       ON CONFLICT (slug)
       DO UPDATE SET name = EXCLUDED.name,
                     category = EXCLUDED.category,
                     summary = EXCLUDED.summary,
                     owner_team = EXCLUDED.owner_team,
                     data = EXCLUDED.data,
                     updated_at = NOW();`,
      [
        entry.slug,
        entry.name,
        entry.category,
        entry.summary,
        entry.ownerTeam || 'unknown',
        JSON.stringify(entry.sample),
      ],
    );
  }

  await client.end();
  console.log(`[devkit] Seeded ${entries.length} datasets into Postgres`);
}

async function seedNeo4j(graph) {
  const uri = process.env.NEO4J_URI || 'bolt://neo4j:7687';
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'dev_password';

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();

  try {
    await session.run(
      `CREATE CONSTRAINT devkit_dataset IF NOT EXISTS FOR (d:DevkitDataset) REQUIRE d.slug IS UNIQUE`,
    );
    await session.run(
      `CREATE CONSTRAINT devkit_persona IF NOT EXISTS FOR (p:DevkitPersona) REQUIRE p.slug IS UNIQUE`,
    );

    for (const node of graph.nodes || []) {
      if (node.labels?.includes('DevkitDataset')) {
        await session.run(
          `MERGE (d:DevkitDataset { slug: $slug })
           SET d += $props`,
          { slug: node.properties.slug, props: node.properties },
        );
      }
      if (node.labels?.includes('DevkitPersona')) {
        await session.run(
          `MERGE (p:DevkitPersona { slug: $slug })
           SET p += $props`,
          { slug: node.properties.slug, props: node.properties },
        );
      }
    }

    for (const rel of graph.relationships || []) {
      await session.run(
        `MATCH (a { slug: $from }), (b { slug: $to })
         MERGE (a)-[r:${rel.type}]->(b)
         SET r += $props`,
        { from: rel.from, to: rel.to, props: rel.properties || {} },
      );
    }

    console.log(`[devkit] Seeded ${graph.nodes?.length || 0} graph nodes`);
  } finally {
    await session.close();
    await driver.close();
  }
}

async function seedOpa(fixtures) {
  const opaUrl = process.env.OPA_URL || 'http://opa:8181';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${opaUrl}/v1/data/devkit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: fixtures }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OPA responded with status ${response.status}`);
    }

    console.log('[devkit] Seeded policy data into OPA');
  } catch (error) {
    console.warn('[devkit] Failed to seed OPA data:', error.message);
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const fixtures = readJson(datasetPath, {
    datasets: [],
    personas: [],
    cases: [],
  });
  const graph = readJson(graphPath, { nodes: [], relationships: [] });

  await seedPostgres(fixtures);
  await seedNeo4j(graph);
  await seedOpa(fixtures);

  console.log('[devkit] Fixture seeding complete');
}

main().catch((error) => {
  console.error('[devkit] Fixture seeding failed:', error);
  process.exit(1);
});
