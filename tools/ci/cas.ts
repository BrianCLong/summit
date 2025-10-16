import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
const s3 = new S3Client({
  endpoint: process.env.CI_CAS_ENDPOINT,
  forcePathStyle: true,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.CI_CAS_KEY!,
    secretAccessKey: process.env.CI_CAS_SECRET!,
  },
});
const Bucket = process.env.CI_CAS_BUCKET!;
export async function has(key: string) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}
export async function put(key: string, buf: Buffer) {
  await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: buf }));
}
export async function get(key: string) {
  const r = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
  return Buffer.from(await r.Body!.transformToByteArray());
}
