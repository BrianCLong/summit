"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.has = has;
exports.put = put;
exports.get = get;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3 = new client_s3_1.S3Client({
    endpoint: process.env.CI_CAS_ENDPOINT,
    forcePathStyle: true,
    region: 'us-east-1',
    credentials: {
        accessKeyId: process.env.CI_CAS_KEY,
        secretAccessKey: process.env.CI_CAS_SECRET,
    },
});
const Bucket = process.env.CI_CAS_BUCKET;
async function has(key) {
    try {
        await s3.send(new client_s3_1.HeadObjectCommand({ Bucket, Key: key }));
        return true;
    }
    catch {
        return false;
    }
}
async function put(key, buf) {
    await s3.send(new client_s3_1.PutObjectCommand({ Bucket, Key: key, Body: buf }));
}
async function get(key) {
    const r = await s3.send(new client_s3_1.GetObjectCommand({ Bucket, Key: key }));
    return Buffer.from(await r.Body.transformToByteArray());
}
