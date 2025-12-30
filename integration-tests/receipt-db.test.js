const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Optional: only run if INTEGRATION_TESTS=1 is set
const runIntegrationTests = process.env.INTEGRATION_TESTS === '1';

(runIntegrationTests ? describe : describe.skip)('Receipt DB Integration', () => {
  let container;
  let client;

  // jest.setTimeout(60000);

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('testdb')
      .withUsername('testuser')
      .withPassword('testpass')
      .start();

    client = new Client({
      connectionString: container.getConnectionUri(),
    });
    await client.connect();
  }, 60000);

  afterAll(async () => {
    if (client) await client.end();
    if (container) await container.stop();
  });

  it('should run migrations and insert a receipt', async () => {
    // 1. Run Migration
    // Ensure path resolves correctly from where jest is run
    const migrationPath = path.resolve(__dirname, '../services/approvals/migrations/001_initial_schema.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    await client.query(migrationSql);

    // 2. Insert one receipt
    const receiptId = 'receipt-' + Date.now();
    const tenantId = 'tenant-integration-test';
    const actorId = 'actor-integration-test';
    const inputHash = 'hash-' + Date.now();
    const signature = 'sig-' + Date.now();
    const keyId = 'key-integration-test';
    const actionType = 'created';

    // 2a. Insert approval request
    const approvalId = '00000000-0000-0000-0000-000000000001';

    await client.query(`
      INSERT INTO approval_requests (
        id, tenant_id, resource_type, resource_id, action, requestor_id
      ) VALUES (
        $1, $2, 'test-resource', 'res-1', 'test-action', 'req-1'
      )
    `, [approvalId, tenantId]);

    // 2b. Insert receipt
    const insertQuery = `
      INSERT INTO provenance_receipts (
        id, approval_id, tenant_id, actor_id, action_type,
        input_hash, signature, key_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING id
    `;

    const res = await client.query(insertQuery, [
      receiptId, approvalId, tenantId, actorId, actionType,
      inputHash, signature, keyId
    ]);

    expect(res.rows[0].id).toBe(receiptId);

    // 3. Verify insertion
    const selectRes = await client.query('SELECT * FROM provenance_receipts WHERE id = $1', [receiptId]);
    expect(selectRes.rows.length).toBe(1);
    expect(selectRes.rows[0].input_hash).toBe(inputHash);
  });
});
