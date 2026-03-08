"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeCheckpoint = writeCheckpoint;
const client_s3_1 = require("@aws-sdk/client-s3");
const pg_1 = require("pg");
const s3 = new client_s3_1.S3Client({});
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function writeCheckpoint(runId, stepId, buf, bucket) {
    const key = `chkpt/${runId}/${stepId}.bin`;
    await s3.send(new client_s3_1.PutObjectCommand({ Bucket: bucket, Key: key, Body: buf }));
    await pg.query(`INSERT INTO step_checkpoints(run_id, step_id, digest, size) VALUES ($1,$2,$3,$4)
                  ON CONFLICT (run_id, step_id) DO UPDATE SET digest=$3, size=$4`, [runId, stepId, `s3://${bucket}/${key}`, buf.length]);
    return { uri: `s3://${bucket}/${key}` };
}
