#!/usr/bin/env ts-node
/**
 * IntelGraph Golden Path Seed Data
 *
 * Creates deterministic test data for E2E Golden Path testing.
 * Contract:
 * - User: analyst@intelgraph.tech / password123
 * - Investigation: inv_golden_path_01
 * - Entities: Person (John Doe), Organization (Acme Corp)
 * - Relationship: WORKS_FOR
 */

import { Driver } from 'neo4j-driver';
import { Pool } from 'pg';
import { connectNeo4j, connectPostgres } from '../src/config/database.js';
import argon2 from 'argon2';

async function main() {
  console.log('🌟 Seeding Golden Path Data...');

  let neo4j: Driver | undefined;
  let postgres: Pool | undefined;

  try {
    neo4j = await connectNeo4j();
    postgres = await connectPostgres();

    // 1. Clear Data (optional, based on env?)
    // For Golden Path, we usually want a clean slate or ensure idempotency.
    // Let's use MERGE (upsert) to be safe, or just clear if it's a dedicated test env.
    const FORCE_CLEAR = process.env.SEED_CLEAR === 'true';

    if (FORCE_CLEAR) {
      console.log('🧹 Clearing data...');
      const session = neo4j.session();
      await session.run('MATCH (n) DETACH DELETE n');
      await session.close();
      const pgClient = await postgres.connect();
      await pgClient.query('TRUNCATE TABLE users, audit_logs CASCADE');
      pgClient.release();
    }

    // 2. Create User
    console.log('👤 Seeding User...');
    const pgClient = await postgres.connect();
    const passwordHash = await argon2.hash('password123');
    // Using ON CONFLICT to make it idempotent
    await pgClient.query(`
      INSERT INTO users (email, username, password_hash, first_name, last_name, role, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = $3,
        first_name = $4,
        last_name = $5,
        role = $6
    `, ['analyst@intelgraph.tech', 'analyst_golden', passwordHash, 'Golden', 'Analyst', 'analyst', 'tenant_golden']);
    pgClient.release();

    // 3. Create Investigation & Graph Data
    console.log('🕸️ Seeding Graph Data...');
    const session = neo4j.session();
    try {
      await session.run(`
        MERGE (inv:Investigation {id: 'inv_golden_path_01'})
        SET inv.title = 'Golden Path Investigation',
            inv.description = 'E2E Test Investigation',
            inv.status = 'active',
            inv.priority = 'high',
            inv.tenantId = 'tenant_golden',
            inv.createdAt = datetime('2025-01-01T00:00:00Z')

        MERGE (p:Entity {id: 'entity_gp_person_1'})
        SET p.type = 'PERSON',
            p.label = 'John Doe',
            p.tenantId = 'tenant_golden',
            p.investigationId = 'inv_golden_path_01',
            p.properties = '{"role":"CEO","age":45}'

        MERGE (o:Entity {id: 'entity_gp_org_1'})
        SET o.type = 'ORGANIZATION',
            o.label = 'Acme Corp',
            o.tenantId = 'tenant_golden',
            o.investigationId = 'inv_golden_path_01',
            o.properties = '{"industry":"Tech"}'

        MERGE (p)-[r:RELATIONSHIP {id: 'rel_gp_1'}]->(o)
        SET r.type = 'WORKS_FOR',
            r.label = 'WORKS_FOR',
            r.tenantId = 'tenant_golden',
            r.confidence = 1.0
      `);
    } finally {
      await session.close();
    }

    console.log('✅ Golden Path Data Seeded!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    if (neo4j) await neo4j.close();
    if (postgres) await postgres.end();
  }
}

if (require.main === module) {
  main();
}
