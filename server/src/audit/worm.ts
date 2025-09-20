// import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// const s3 = new S3Client({});

// export async function putLocked(bucket: string, key: string, body: Buffer, days = Number(process.env.AUDIT_RETENTION_DAYS || 365)) {
//   const retainUntil = new Date(Date.now() + days * 86400 * 1000);
//   await s3.send(
//     new PutObjectCommand({
//       Bucket: bucket,
//       Key: key,
//       Body: body,
//       ObjectLockMode: 'COMPLIANCE' as any,
//       ObjectLockRetainUntilDate: retainUntil as any,
//     }) as any,
//   );
//   return `s3://${bucket}/${key}`;
// }
