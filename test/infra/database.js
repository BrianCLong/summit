"use strict";
/**
 * Test Infrastructure: Database Test Fixtures
 *
 * Problem: Tests that rely on shared database state interfere with each other.
 *
 * Solution: Create isolated database schema per test, with automatic cleanup.
 *
 * Usage:
 *   import { createTestDatabase, cleanupTestDatabase } from '../../test/infra/database';
 *
 *   let db: TestDatabase;
 *
 *   beforeEach(async () => {
 *     db = await createTestDatabase();
 *   });
 *
 *   afterEach(async () => {
 *     await cleanupTestDatabase(db);
 *   });
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestDatabase = createTestDatabase;
exports.cleanupTestDatabase = cleanupTestDatabase;
exports.query = query;
exports.seedTestData = seedTestData;
exports.getClient = getClient;
exports.withTransaction = withTransaction;
const pg_1 = require("pg");
const crypto_1 = require("crypto");
/**
 * Create a test database with isolated schema.
 *
 * This creates a new schema in the database, runs migrations, and returns
 * a connection pool scoped to that schema.
 *
 * @param config - Optional pool configuration (defaults to DATABASE_URL env var)
 * @returns Test database instance
 */
async function createTestDatabase(config) {
    const schema = `test_${(0, crypto_1.randomUUID)().replace(/-/g, '_')}`;
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/summit_test';
    // Create pool without schema (for setup)
    const setupPool = new pg_1.Pool(config || { connectionString });
    try {
        // Create schema
        await setupPool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
        // Create pool with schema in search_path
        const pool = new pg_1.Pool({
            ...(config || { connectionString }),
            options: `-c search_path=${schema},public`,
        });
        // Run migrations (if migration script exists)
        try {
            // Import and run migrations dynamically
            // Note: This assumes migrations are idempotent or schema-aware
            // In practice, you may need to customize this for your migration setup
            const { runMigrations } = await Promise.resolve().then(() => __importStar(require('../../server/scripts/run-migrations.js'))).catch(() => ({ runMigrations: null }));
            if (runMigrations) {
                await runMigrations({ pool, schema });
            }
        }
        catch (err) {
            console.warn('Failed to run migrations (may not be implemented yet):', err);
        }
        return {
            pool,
            schema,
            connectionString,
        };
    }
    finally {
        await setupPool.end();
    }
}
/**
 * Clean up test database (truncate tables and drop schema).
 *
 * @param db - Test database instance
 */
async function cleanupTestDatabase(db) {
    if (!db || !db.pool) {
        return;
    }
    try {
        // Truncate all tables in schema (cascade to handle foreign keys)
        await db.pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = '${db.schema}') LOOP
          EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
        // Drop schema
        await db.pool.query(`DROP SCHEMA IF EXISTS ${db.schema} CASCADE`);
    }
    catch (err) {
        console.error('Failed to cleanup test database:', err);
    }
    finally {
        await db.pool.end();
    }
}
/**
 * Execute a query in a test database.
 *
 * @param db - Test database instance
 * @param query - SQL query
 * @param values - Query parameters
 * @returns Query result
 */
async function query(db, query, values) {
    const result = await db.pool.query(query, values);
    return result.rows;
}
/**
 * Seed test data into a test database.
 *
 * @param db - Test database instance
 * @param table - Table name
 * @param data - Array of objects to insert
 */
async function seedTestData(db, table, data) {
    if (data.length === 0) {
        return;
    }
    const columns = Object.keys(data[0]);
    const values = data.map((row) => columns.map((col) => row[col]));
    const placeholders = values
        .map((_, i) => {
        const offset = i * columns.length;
        return `(${columns.map((_, j) => `$${offset + j + 1}`).join(', ')})`;
    })
        .join(', ');
    const flatValues = values.flat();
    await db.pool.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`, flatValues);
}
/**
 * Get a client from the pool (for transactions).
 *
 * @param db - Test database instance
 * @returns Pool client (remember to release it!)
 */
async function getClient(db) {
    return db.pool.connect();
}
/**
 * Execute a function within a transaction (auto-rollback).
 *
 * This is useful for testing code that modifies the database, without
 * persisting changes.
 *
 * @param db - Test database instance
 * @param fn - Function to execute
 * @returns Result of function
 */
async function withTransaction(db, fn) {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('ROLLBACK'); // Always rollback (test isolation)
        return result;
    }
    finally {
        client.release();
    }
}
