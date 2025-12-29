import { updateUser } from '../src/graphql/resolvers/user';
import { ReceiptService } from '../src/services/receipt.service';
import { getPostgresPool } from '../src/config/database';
import assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';

jest.mock('../src/services/receipt.service');
jest.mock('../src/config/database');

async function runVerification() {
  console.log('Running signed receipt verification script...');

  const mockPool = {
    query: jest.fn().mockResolvedValue({ rows: [{ id: 'user-123' }] }),
  };
  (getPostgresPool as jest.Mock).mockReturnValue(mockPool);

  const mockContext = {
    user: {
      id: 'admin-user-id',
      tenant_id: 'test-tenant-id',
      role: 'ADMIN',
    },
  };

  const id = 'user-123';
  const input = { email: 'new-email@example.com' };

  await updateUser(null, { id, input }, mockContext);

  // 1. Verify that the receipt generation service was called with the correct data.
  const expectedReceiptData = {
    actionId: expect.any(String),
    tenantId: 'test-tenant-id',
    actorId: 'admin-user-id',
    actionType: 'UPDATE_USER',
    resourceType: 'user',
    resourceId: id,
    signedData: {
      userId: id,
      changes: input,
    },
  };
  assert.deepStrictEqual(
    (ReceiptService.generateReceipt as jest.Mock).mock.calls[0][0],
    expectedReceiptData,
    'Test Case 1 Failed: ReceiptService.generateReceipt was not called with the correct data.'
  );

  // 2. Verify that the receipt was saved to the database.
  const insertQuery = (mockPool.query as jest.Mock).mock.calls.find(c => c[0].includes('INSERT INTO signed_receipts'));
  assert.ok(insertQuery, 'Test Case 2 Failed: The receipt was not saved to the database.');

  const insertValues = insertQuery[1];
  assert.strictEqual(insertValues[1], 'test-tenant-id', 'Test Case 2 Failed: tenant_id is incorrect.');
  assert.strictEqual(insertValues[2], 'admin-user-id', 'Test Case 2 Failed: actor_id is incorrect.');

  console.log('All verification tests passed!');
}

runVerification().catch((err) => {
  console.error('Verification script failed:', err);
  process.exit(1);
});
