import { runRetentionSweep } from '../server/src/governance/retentionJob';
import { pool } from '../server/src/db/pg';

// This is an end-to-end test and requires a running database.
describe('Governance: Retention and Legal Hold', () => {
  beforeAll(async () => {
    // Seed the database with test data
    await pool.query('TRUNCATE TABLE data_assets');
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    const assets = [
      // This asset is expired and should be deleted
      { id: 'expired-asset-1', klass: 'OSINT_RAW', legal_hold: false, created_at: ninetyDaysAgo },
      // This asset is expired but should be preserved due to legal hold
      { id: 'expired-asset-on-hold', klass: 'OSINT_RAW', legal_hold: true, created_at: ninetyDaysAgo },
      // This asset is not expired and should not be deleted
      { id: 'active-asset-1', klass: 'OSINT_RAW', legal_hold: false, created_at: tenDaysAgo },
    ];

    for (const asset of assets) {
      await pool.query(
        `INSERT INTO data_assets (id, klass, legal_hold, created_at, tenant_id) VALUES ($1, $2, $3, $4, '00000000-0000-0000-0000-000000000000')`,
        [asset.id, asset.klass, asset.legal_hold, asset.created_at]
      );
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should delete expired assets while respecting legal hold', async () => {
    // Run the retention sweep
    const { deletedCount, skippedHoldCount } = await runRetentionSweep();

    // Assert that one asset was deleted and one was skipped
    expect(deletedCount).toBe(1);
    expect(skippedHoldCount).toBe(1);

    // Verify the state of the database
    const remaining = await pool.query('SELECT id FROM data_assets');
    const remainingIds = remaining.rows.map(r => r.id);

    expect(remainingIds).toHaveLength(2);
    expect(remainingIds).toContain('expired-asset-on-hold');
    expect(remainingIds).toContain('active-asset-1');
    expect(remainingIds).not.toContain('expired-asset-1');
  });
});
