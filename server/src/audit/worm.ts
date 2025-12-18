
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// WORM Storage Service
// Supports S3 Object Lock in production and local filesystem in development

const s3 = process.env.AWS_S3_BUCKET ? new S3Client({}) : null;
const LOCAL_WORM_DIR = path.resolve(process.cwd(), 'worm_storage');

// Ensure local directory exists if we are in local mode
if (!s3) {
  if (!fs.existsSync(LOCAL_WORM_DIR)) {
    fs.mkdirSync(LOCAL_WORM_DIR, { recursive: true });
  }
}

export async function putLocked(
  bucket: string,
  key: string,
  body: Buffer | string,
  days = Number(process.env.AUDIT_RETENTION_DAYS || 365)
): Promise<string> {

  if (s3) {
    // S3 Mode (Production)
    const retainUntil = new Date(Date.now() + days * 86400 * 1000);
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ObjectLockMode: 'COMPLIANCE', // Strict compliance mode
        ObjectLockRetainUntilDate: retainUntil,
      })
    );
    return `s3://${bucket}/${key}`;
  } else {
    // Local Filesystem Mode (Development)
    // We simulate WORM by making files read-only after write
    const filePath = path.join(LOCAL_WORM_DIR, key.replace(/\//g, '_'));

    // Check if file exists (Immutability check)
    if (fs.existsSync(filePath)) {
      throw new Error(`WORM Violation: File ${key} already exists and cannot be overwritten.`);
    }

    fs.writeFileSync(filePath, body);

    // Make read-only (chmod 444)
    fs.chmodSync(filePath, 0o444);

    return `file://${filePath}`;
  }
}

export async function getLocked(key: string): Promise<Buffer | null> {
    if (s3) {
        // Implement S3 Get if needed
        return null;
    } else {
        const filePath = path.join(LOCAL_WORM_DIR, key.replace(/\//g, '_'));
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath);
        }
        return null;
    }
}
