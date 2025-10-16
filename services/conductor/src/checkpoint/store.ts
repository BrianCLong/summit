import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Pool } from 'pg';
const s3 = new S3Client({});
const pg = new Pool({ connectionString: process.env.DATABASE_URL });
export async function writeCheckpoint(
  runId: string,
  stepId: string,
  buf: Buffer,
  bucket: string,
) {
  const key = `chkpt/${runId}/${stepId}.bin`;
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buf }));
  await pg.query(
    `INSERT INTO step_checkpoints(run_id, step_id, digest, size) VALUES ($1,$2,$3,$4)
                  ON CONFLICT (run_id, step_id) DO UPDATE SET digest=$3, size=$4`,
    [runId, stepId, `s3://${bucket}/${key}`, buf.length],
  );
  return { uri: `s3://${bucket}/${key}` };
}
