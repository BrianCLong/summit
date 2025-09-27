import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { pool } from '../db/pg';
import { RetentionPolicy, defaultPolicies } from './policy';

// In a real app, this would come from a configuration service or database.
const policyMap = new Map<string, number>(defaultPolicies.map(p => [p.klass, p.ttlDays]));

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'us-east-1',
  forcePathStyle: true, // Required for MinIO
  credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
  }
});

/**
 * Runs a sweep to delete data assets that have exceeded their retention period.
 * This job should be run periodically (e.g., nightly).
 * @param now The current date, to allow for deterministic testing.
 */
export async function runRetentionSweep(now = new Date()): Promise<{ deletedCount: number; skippedHoldCount: number }> {
  console.log(`[${now.toISOString()}] Starting retention sweep...`);
  let deletedCount = 0;
  let skippedHoldCount = 0;
  const client = await pool.connect();

  try {
    // Select all data assets. In a large system, this would need to be paginated.
    const res = await client.query(`SELECT id, tenant_id, s3_key, klass, legal_hold, created_at FROM data_assets`);
    
    for (const asset of res.rows) {
      if (asset.legal_hold) {
        skippedHoldCount++;
        continue;
      }

      const ttlDays = policyMap.get(asset.klass) || policyMap.get('GENERAL')!;
      const createdAt = new Date(asset.created_at);
      const ageInMillis = now.getTime() - createdAt.getTime();
      const ageInDays = ageInMillis / (1000 * 60 * 60 * 24);

      if (ageInDays >= ttlDays) {
        console.log(`[Retention] Deleting asset ${asset.id} (klass: ${asset.klass}, age: ${ageInDays.toFixed(1)}d, ttl: ${ttlDays}d)`);
        
        // 1. Delete from S3/MinIO
        if (asset.s3_key) {
            await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: asset.s3_key }));
        }

        // 2. Delete from Postgres
        await client.query(`DELETE FROM data_assets WHERE id=$1`, [asset.id]);

        // 3. TODO: Emit an audit event for the deletion
        // await auditService.logEvent({ type: 'DATA_ASSET_DELETED', reason: 'RETENTION_POLICY', assetId: asset.id });

        deletedCount++;
      }
    }
  } catch (err) {
    console.error('[Retention] Sweep failed:', err);
  } finally {
    client.release();
  }

  console.log(`[${now.toISOString()}] Retention sweep complete. Deleted: ${deletedCount}, Skipped (Legal Hold): ${skippedHoldCount}`);
  return { deletedCount, skippedHoldCount };
}
