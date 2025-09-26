import { S3Client } from '@aws-sdk/client-s3';

let s3Client: S3Client | null = null;

export interface S3ConfigOptions {
  region?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}

export function getS3Client(options?: S3ConfigOptions): S3Client {
  if (s3Client) {
    return s3Client;
  }

  const region = options?.region || process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
  const endpoint = options?.endpoint || process.env.S3_ENDPOINT;
  const forcePathStyleEnv = process.env.S3_FORCE_PATH_STYLE;
  const forcePathStyle =
    typeof options?.forcePathStyle === 'boolean'
      ? options.forcePathStyle
      : forcePathStyleEnv === 'true' || forcePathStyleEnv === '1';

  const accessKeyId = options?.accessKeyId || process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    options?.secretAccessKey || process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = options?.sessionToken || process.env.S3_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN;

  const credentials = accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey, sessionToken } : undefined;

  s3Client = new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials,
  });

  return s3Client;
}

export function setS3Client(client: S3Client | null): void {
  s3Client = client;
}

export function resetS3Client(): void {
  s3Client = null;
}
