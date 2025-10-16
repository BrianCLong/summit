import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
const s3 = new S3Client({ region: process.env.AWS_REGION });
export async function put(key: string, buf: Buffer) {
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.TURBO_BUCKET!,
      Key: key,
      Body: buf,
    }),
  );
}
export async function get(key: string) {
  try {
    const r = await s3.send(
      new GetObjectCommand({ Bucket: process.env.TURBO_BUCKET!, Key: key }),
    );
    return Buffer.from(await r.Body!.transformToByteArray());
  } catch (e) {
    return null;
  }
}
