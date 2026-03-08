"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.put = put;
exports.get = get;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3 = new client_s3_1.S3Client({ region: process.env.AWS_REGION });
async function put(key, buf) {
    await s3.send(new client_s3_1.PutObjectCommand({
        Bucket: process.env.TURBO_BUCKET,
        Key: key,
        Body: buf,
    }));
}
async function get(key) {
    try {
        const r = await s3.send(new client_s3_1.GetObjectCommand({ Bucket: process.env.TURBO_BUCKET, Key: key }));
        return Buffer.from(await r.Body.transformToByteArray());
    }
    catch (e) {
        return null;
    }
}
