
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';

const s3 = new S3Client({});

export async function putLocked(bucket: string, key: string, body: Buffer, days = Number(process.env.AUDIT_RETENTION_DAYS || 365)) {
  // Check if we are in local mode or if AWS credentials/Bucket are not provided
  if (process.env.NODE_ENV === 'test' || !process.env.AWS_ACCESS_KEY_ID) {
    const auditDir = path.join(process.cwd(), 'audit_logs', bucket);
    await fs.mkdir(auditDir, { recursive: true });
    const filePath = path.join(auditDir, key);

    // Simulate "locked" by making it read-only (though root can still delete, it's good enough for dev/test simulation of WORM)
    await fs.writeFile(filePath, body);
    await fs.chmod(filePath, 0o444); // Read-only

    return `file://${filePath}`;
  }

  const retainUntil = new Date(Date.now() + days * 86400 * 1000);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ObjectLockMode: 'COMPLIANCE' as any,
      ObjectLockRetainUntilDate: retainUntil as any,
    }) as any,
  );
  return `s3://${bucket}/${key}`;
}
