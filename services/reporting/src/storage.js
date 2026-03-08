"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
exports.getDownloadUrl = getDownloadUrl;
// @ts-nocheck
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT, // Optional for MinIO
    forcePathStyle: !!process.env.S3_ENDPOINT,
});
const BUCKET = process.env.S3_BUCKET || 'reports';
async function uploadFile(key, body, contentType = 'application/pdf') {
    if (process.env.MOCK_STORAGE) {
        console.log(`[Mock Storage] Uploading ${key} (${body.length} bytes)`);
        return `mock://${BUCKET}/${key}`;
    }
    const command = new client_s3_1.PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
    });
    await s3Client.send(command);
    return `s3://${BUCKET}/${key}`;
}
async function getDownloadUrl(key, expiresIn = 3600) {
    if (process.env.MOCK_STORAGE) {
        return `http://localhost:3000/downloads/${key}`; // Mock URL
    }
    const command = new client_s3_1.GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
    });
    return (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn });
}
