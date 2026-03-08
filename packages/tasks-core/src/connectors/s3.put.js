"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const maestro_sdk_1 = require("@intelgraph/maestro-sdk");
const client_s3_1 = require("@aws-sdk/client-s3");
exports.default = (0, maestro_sdk_1.defineTask)({
    async execute(_ctx, { payload }) {
        const s3 = new client_s3_1.S3Client({
            region: payload.region ?? process.env.AWS_REGION,
        });
        const res = await s3.send(new client_s3_1.PutObjectCommand({
            Bucket: payload.bucket,
            Key: payload.key,
            Body: payload.body,
            ContentType: payload.contentType,
        }));
        return { payload: { etag: res.ETag || '' } };
    },
});
