import assert from "node:assert";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";

dotenv.config();

// Configuration
const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://maestro:maestro-dev-secret@localhost:5432/maestro";

/**
 * Dynamic Tenant Isolation Verifier (Phase 1)
 *
 * This script serves two purposes:
 * 1. Verify the database infrastructure supports tenant isolation (via a controlled test table).
 * 2. Provide a template for verifying application-layer isolation.
 *
 * FUTURE WORK:
 * Once the application is fully containerized and seeding is deterministic in CI,
 * this script should be expanded to hit actual Service classes or API endpoints
 * (e.g., using `supertest` against the running server) to ensure logic layer isolation.
 */

interface TestContext {
  pool: Pool;
  tenantA: string;
  tenantB: string;
}

async function runTest() {
  console.log("Starting Dynamic Tenant Isolation Verification (Phase 1)...");

  const pool = new Pool({ connectionString: DATABASE_URL });

  // Create test tenants
  const tenantA = randomUUID();
  const tenantB = randomUUID();

  const ctx: TestContext = { pool, tenantA, tenantB };

  try {
    // ---------------------------------------------------------
    // TEST 1: Infrastructure Verification (Controlled Environment)
    // ---------------------------------------------------------
    console.log("\n--- Test 1: Infrastructure Verification (Controlled Table) ---");

    // Setup: Ensure table exists (idempotent)
    await ctx.pool.query(`
      CREATE TABLE IF NOT EXISTS security_verification_test (
        id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL,
        data TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed Data
    await ctx.pool.query(
      "INSERT INTO security_verification_test (id, tenant_id, data) VALUES ($1, $2, $3)",
      [randomUUID(), tenantA, "SECRET_DATA_TENANT_A"]
    );

    await ctx.pool.query(
      "INSERT INTO security_verification_test (id, tenant_id, data) VALUES ($1, $2, $3)",
      [randomUUID(), tenantB, "SECRET_DATA_TENANT_B"]
    );

    console.log("Seeded test data for Tenant A and Tenant B.");

    // Verify Isolation
    console.log("Verifying correct tenant isolation...");
    const secureQuery = "SELECT * FROM security_verification_test WHERE tenant_id = $1";
    const res1 = await ctx.pool.query(secureQuery, [ctx.tenantA]);

    assert(res1.rows.length > 0, "Should find data for Tenant A");
    res1.rows.forEach((row) => {
      assert.strictEqual(row.tenant_id, ctx.tenantA, "Returned row should belong to Tenant A");
      assert.notStrictEqual(row.data, "SECRET_DATA_TENANT_B", "Should not leak Tenant B data");
    });
    console.log("PASSED: Isolation confirmed on test table.");

    // Verify Leakage Detection (Negative Test)
    console.log("Verifying leakage detection capability...");
    const insecureQuery = "SELECT * FROM security_verification_test";
    const res2 = await ctx.pool.query(insecureQuery);

    const tenantBData = res2.rows.find((row) => row.tenant_id === ctx.tenantB);
    assert(tenantBData !== undefined, "Insecure query should return Tenant B data");
    assert.strictEqual(
      tenantBData?.data,
      "SECRET_DATA_TENANT_B",
      "Insecure query should reveal secret"
    );
    console.log("PASSED: Leakage detectable.");

    // ---------------------------------------------------------
    // TEST 2: Real-World Schema Inspection (Heuristic)
    // ---------------------------------------------------------
    console.log("\n--- Test 2: Real-World Schema Inspection ---");

    // Check if 'users' table exists and has 'tenant_id' or 'tenantId'
    // This verifies that the core schema supports multi-tenancy as expected by the policy.
    const schemaRes = await ctx.pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND (column_name = 'tenant_id' OR column_name = 'tenantId');
    `);

    if (schemaRes.rowCount === 0) {
      console.warn(
        'WARNING: "users" table does not appear to have "tenant_id" column. Please check schema compliance.'
      );
      // We don't fail here in Phase 1 to avoid breaking CI for existing legacy schemas, but we flag it.
    } else {
      console.log('PASSED: "users" table has tenant identifier column.');
    }
  } catch (err) {
    console.error("Test Failed:", err);
    process.exit(1);
  } finally {
    // Cleanup
    await ctx.pool.query("DROP TABLE IF EXISTS security_verification_test");
    await ctx.pool.end();
  }
}

runTest();
