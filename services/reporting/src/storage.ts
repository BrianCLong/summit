import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT, // Optional for MinIO
  forcePathStyle: !!process.env.S3_ENDPOINT,
});

const BUCKET = process.env.S3_BUCKET || 'reports';

export async function uploadFile(key: string, body: Buffer | string, contentType: string = 'application/pdf') {
  if (process.env.MOCK_STORAGE) {
    console.log(`[Mock Storage] Uploading ${key} (${body.length} bytes)`);
    return `mock://${BUCKET}/${key}`;
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `s3://${BUCKET}/${key}`;
}

export async function getDownloadUrl(key: string, expiresIn = 3600) {
  if (process.env.MOCK_STORAGE) {
    return `http://localhost:3000/downloads/${key}`; // Mock URL
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}
