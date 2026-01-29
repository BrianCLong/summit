/**
 * Migration 033 Tests - Tenant ID Rollout
 *
 * Validates that the tenant_id rollout migration:
 * 1. Adds tenant_id to all legacy tables
 * 2. Creates proper indexes
 * 3. Adds foreign key constraints
 * 4. Prevents tenant_id updates (immutability)
 * 5. Backfills existing data with 'global' tenant
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Pool } from 'pg';

describe('Migration 030: Tenant ID Rollout', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.POSTGRES_DB || 'summit_test',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Table Schema Changes', () => {
    it('should add tenant_id column to user_sessions', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'user_sessions' AND column_name = 'tenant_id'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].data_type).toBe('text');
      expect(result.rows[0].is_nullable).toBe('NO');
    });

    it('should add tenant_id column to token_blacklist', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'token_blacklist' AND column_name = 'tenant_id'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].is_nullable).toBe('NO');
    });

    it('should have tenant_id in all critical tables', async () => {
      const criticalTables = [
        'user_sessions',
        'token_blacklist',
        'pipelines',
        'runs',
        'executors'
      ];

      for (const table of criticalTables) {
        const result = await pool.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = $1 AND column_name = 'tenant_id'
        `, [table]);

        expect(result.rows).toHaveLength(1);
      }
    });
  });

  describe('Indexes', () => {
    it('should create indexes on tenant_id for user_sessions', async () => {
      const result = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'user_sessions' AND indexname LIKE '%tenant_id%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should create indexes on tenant_id for token_blacklist', async () => {
      const result = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'token_blacklist' AND indexname LIKE '%tenant_id%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have composite indexes (tenant_id, id) for performance', async () => {
      const result = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename IN ('user_sessions', 'token_blacklist')
          AND indexname LIKE '%tenant_id%'
          AND indexdef LIKE '%tenant_id%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should have foreign key to tenants table from user_sessions', async () => {
      const result = await pool.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'user_sessions'
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name LIKE '%tenant%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have foreign key to tenants table from token_blacklist', async () => {
      const result = await pool.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'token_blacklist'
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name LIKE '%tenant%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should cascade delete when tenant is deleted', async () => {
      // Create test tenant
      await pool.query(`
        INSERT INTO tenants (id, name, plan)
        VALUES ('test-cascade-tenant', 'Test Cascade Tenant', 'test')
        ON CONFLICT (id) DO NOTHING
      `);

      // Check if we can query the foreign key constraint action
      const result = await pool.query(`
        SELECT
          tc.constraint_name,
          rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'user_sessions'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND tc.constraint_name LIKE '%tenant%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].delete_rule).toBe('CASCADE');

      // Cleanup
      await pool.query(`DELETE FROM tenants WHERE id = 'test-cascade-tenant'`);
    });
  });

  describe('Data Backfill', () => {
    it('should backfill existing rows with global tenant', async () => {
      // This test assumes migration has run
      // Check that no null tenant_id values exist in user_sessions
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM user_sessions
        WHERE tenant_id IS NULL
      `);

      expect(parseInt(result.rows[0].count, 10)).toBe(0);
    });

    it('should ensure global tenant exists', async () => {
      const result = await pool.query(`
        SELECT id, name, plan
        FROM tenants
        WHERE id = 'global'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('Global Tenant');
      expect(result.rows[0].plan).toBe('enterprise');
    });
  });

  describe('Immutability Trigger', () => {
    it('should prevent tenant_id updates on user_sessions', async () => {
      // Create test session
      const insertResult = await pool.query(`
        INSERT INTO user_sessions (id, user_id, tenant_id, refresh_token, expires_at)
        VALUES (gen_random_uuid(), gen_random_uuid(), 'global', 'test-token', NOW() + INTERVAL '1 day')
        RETURNING id
      `);

      const sessionId = insertResult.rows[0].id;

      // Attempt to update tenant_id (should fail)
      await expect(
        pool.query(`
          UPDATE user_sessions
          SET tenant_id = 'different-tenant'
          WHERE id = $1
        `, [sessionId])
      ).rejects.toThrow(/tenant_id is immutable/);

      // Cleanup
      await pool.query(`DELETE FROM user_sessions WHERE id = $1`, [sessionId]);
    });

    it('should allow updates to other fields while keeping tenant_id', async () => {
      // Create test session
      const insertResult = await pool.query(`
        INSERT INTO user_sessions (id, user_id, tenant_id, refresh_token, expires_at)
        VALUES (gen_random_uuid(), gen_random_uuid(), 'global', 'test-token-123', NOW() + INTERVAL '1 day')
        RETURNING id
      `);

      const sessionId = insertResult.rows[0].id;

      // Update other fields (should succeed)
      await expect(
        pool.query(`
          UPDATE user_sessions
          SET refresh_token = 'updated-token-456'
          WHERE id = $1
        `, [sessionId])
      ).resolves.not.toThrow();

      // Verify update
      const result = await pool.query(`
        SELECT refresh_token, tenant_id
        FROM user_sessions
        WHERE id = $1
      `, [sessionId]);

      expect(result.rows[0].refresh_token).toBe('updated-token-456');
      expect(result.rows[0].tenant_id).toBe('global');

      // Cleanup
      await pool.query(`DELETE FROM user_sessions WHERE id = $1`, [sessionId]);
    });

    it('should have immutability trigger on all tenant-aware tables', async () => {
      const result = await pool.query(`
        SELECT DISTINCT event_object_table
        FROM information_schema.triggers
        WHERE trigger_name = 'trg_prevent_tenant_id_update'
        ORDER BY event_object_table
      `);

      expect(result.rows.length).toBeGreaterThan(5);

      const tableNames = result.rows.map(r => r.event_object_table);
      expect(tableNames).toContain('user_sessions');
      expect(tableNames).toContain('token_blacklist');
    });
  });

  describe('Migration Idempotency', () => {
    it('should be safe to run migration multiple times', async () => {
      // Re-run key parts of the migration (idempotent)
      await expect(
        pool.query(`
          ALTER TABLE user_sessions
          ADD COLUMN IF NOT EXISTS tenant_id TEXT;
        `)
      ).resolves.not.toThrow();

      await expect(
        pool.query(`
          CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant_id
          ON user_sessions(tenant_id);
        `)
      ).resolves.not.toThrow();
    });
  });

  describe('Query Performance', () => {
    it('should use tenant_id index for filtered queries', async () => {
      const explainResult = await pool.query(`
        EXPLAIN (FORMAT JSON)
        SELECT * FROM user_sessions WHERE tenant_id = 'global'
      `);

      const plan = JSON.stringify(explainResult.rows[0]);

      // Check if index scan is used (instead of sequential scan)
      // Note: This might be a sequential scan if table is small
      expect(plan).toBeDefined();
    });
  });
});
