import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import { pickBucket } from './buckets';

const s3 = new S3Client({});

export async function putCAS(bytes: Buffer, bucketOverride?: string) {
  const bucket = pickBucket(bucketOverride);
  const digest = 'sha256:' + createHash('sha256').update(bytes).digest('hex');
  const key = `cas/${digest}`;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { digest, uri: `s3://${bucket}/${key}` };
  } catch {
    await s3.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes }),
    );
    return { digest, uri: `s3://${bucket}/${key}` };
  }
}
