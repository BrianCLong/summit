import { defineTask } from '@summit/maestro-sdk';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface In { bucket: string; key: string; body: string; region?: string; contentType?: string }
export default defineTask<In, { etag: string }> ({
  async execute(_ctx, { payload }){
    const s3 = new S3Client({ region: payload.region ?? process.env.AWS_REGION });
    const res = await s3.send(new PutObjectCommand({ Bucket: payload.bucket, Key: payload.key, Body: payload.body, ContentType: payload.contentType }));
    return { payload: { etag: res.ETag || '' } };
  }
});
