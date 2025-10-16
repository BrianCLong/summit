// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID as uuid } from 'crypto';

// Optional parquet writer (parquetjs-lite). Falls back to CSV if not present.
let parquet: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  parquet = require('parquetjs-lite');
} catch (_) {
  parquet = null;
}

// const s3 = new S3Client({});

// export async function writeUsage(event: { ts: string; tenant_id: string; user_id: string; action: string; quantity: number; metadata?: any; }) {
//   const date = event.ts.slice(0,10);
//   const keyCsv = `csv/ingest_date=${date}/tenant_id=${event.tenant_id}/ev-${uuid()}.csv`;
//   const csv = `${event.ts},${event.tenant_id},${event.user_id},${event.action},${event.quantity},${JSON.stringify(event.metadata||{})}
// `;
//   await s3.send(new PutObjectCommand({ Bucket: process.env.BILLING_BUCKET!, Key: keyCsv, Body: csv }));
//   return `s3://${process.env.BILLING_BUCKET}/${keyCsv}`;
// }

// export async function writeUsageParquet(event: { ts: string; tenant_id: string; user_id: string; action: string; quantity: number; metadata?: any; }) {
//   const date = event.ts.slice(0,10);
//   const key = `parquet/ingest_date=${date}/tenant_id=${event.tenant_id}/ev-${uuid()}.parquet`;
//   const row = {
//     ts: new Date(event.ts),
//     tenant_id: String(event.tenant_id),
//     user_id: String(event.user_id),
//     action: String(event.action),
//     quantity: Number(event.quantity),
//     metadata: JSON.stringify(event.metadata || {}),
//   };

//   if (!parquet) {
//     // Fallback: write JSON to the parquet/ path; Glue crawler can reclassify later
//     const body = Buffer.from(JSON.stringify(row) + '\n');
//     await s3.send(new PutObjectCommand({ Bucket: process.env.BILLING_BUCKET!, Key: key.replace(/\.parquet$/, '.json'), Body: body }));
//     return `s3://${process.env.BILLING_BUCKET}/${key.replace(/\.parquet$/, '.json')}`;
//   }

//   const schema = new parquet.ParquetSchema({
//     ts: { type: 'TIMESTAMP_MILLIS' },
//     tenant_id: { type: 'UTF8' },
//     user_id: { type: 'UTF8' },
//     action: { type: 'UTF8' },
//     quantity: { type: 'INT32' },
//     metadata: { type: 'UTF8' },
//   });

//   const writer = await parquet.ParquetWriter.openAnonymous(schema, { useDataPageV2: true, compression: 'SNAPPY' });
//   await writer.appendRow(row);
//   await writer.close();
//   const parquetBuffer: Buffer = writer.buffer;

//   await s3.send(new PutObjectCommand({ Bucket: process.env.BILLING_BUCKET!, Key: key, Body: parquetBuffer }));
//   return `s3://${process.env.BILLING_BUCKET}/${key}`;
// }
