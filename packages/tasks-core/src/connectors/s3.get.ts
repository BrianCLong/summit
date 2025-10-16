import { defineTask } from '@summit/maestro-sdk';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

interface In {
  bucket: string;
  key: string;
  region?: string;
}
export default defineTask<In, { body: string }>({
  async execute(_ctx, { payload }) {
    const s3 = new S3Client({
      region: payload.region ?? process.env.AWS_REGION,
    });
    const res = await s3.send(
      new GetObjectCommand({ Bucket: payload.bucket, Key: payload.key }),
    );
    const body = await res.Body!.transformToString();
    return { payload: { body } };
  },
});
