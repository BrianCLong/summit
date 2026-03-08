"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.putCAS = putCAS;
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = require("crypto");
const buckets_1 = require("./buckets");
const s3 = new client_s3_1.S3Client({});
async function putCAS(bytes, bucketOverride) {
    const bucket = (0, buckets_1.pickBucket)(bucketOverride);
    const digest = 'sha256:' + (0, crypto_1.createHash)('sha256').update(bytes).digest('hex');
    const key = `cas/${digest}`;
    try {
        await s3.send(new client_s3_1.HeadObjectCommand({ Bucket: bucket, Key: key }));
        return { digest, uri: `s3://${bucket}/${key}` };
    }
    catch {
        await s3.send(new client_s3_1.PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes }));
        return { digest, uri: `s3://${bucket}/${key}` };
    }
}
