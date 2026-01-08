import type { ReferenceAdapterDefinition } from "../types";

export const s3StorageAdapter: ReferenceAdapterDefinition = {
  manifest: {
    name: "s3-storage",
    title: "S3 Storage Sink",
    version: "0.1.0",
    description:
      "Reference adapter that writes artifacts to S3-compatible object storage with presigned URL support.",
    maintainer: "Platform Reference Team",
    tags: ["storage", "ingestion", "presign"],
  },
  configSchema: {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    required: ["bucket", "region", "accessKeyId", "secretAccessKey"],
    additionalProperties: false,
    properties: {
      bucket: { type: "string", minLength: 3 },
      region: { type: "string", minLength: 2 },
      accessKeyId: { type: "string", minLength: 8 },
      secretAccessKey: { type: "string", minLength: 16 },
      prefix: { type: "string", default: "reference/" },
      serverSideEncryption: {
        type: "string",
        enum: ["AES256", "aws:kms", "none"],
        default: "AES256",
      },
      kmsKeyId: { type: "string" },
      retentionDays: { type: "number", minimum: 1, maximum: 365, default: 30 },
      eventBridge: {
        type: "object",
        additionalProperties: false,
        properties: {
          enabled: { type: "boolean", default: false },
          prefixFilter: { type: "string" },
        },
        default: { enabled: false },
      },
    },
  },
  capabilities: [
    {
      id: "storage.object.put",
      title: "Object ingest",
      description: "Uploads byte streams into the configured S3 bucket with SSE controls.",
      inputs: ["binary", "metadata"],
      outputs: ["object_uri"],
      configUses: ["bucket", "region", "prefix", "serverSideEncryption", "kmsKeyId"],
      guarantees: {
        durability: "writes acknowledged after multi-AZ confirmation",
      },
    },
    {
      id: "storage.object.get",
      title: "Object retrieval",
      description: "Retrieves stored objects for downstream processing.",
      inputs: ["object_uri"],
      outputs: ["binary"],
      configUses: ["bucket", "region"],
      guarantees: {
        slaMsP99: 900,
      },
    },
    {
      id: "storage.presign",
      title: "Presigned URL issuance",
      description: "Generates presigned URLs for uploads and downloads.",
      inputs: ["object_uri", "method"],
      outputs: ["presigned_url"],
      configUses: ["bucket", "region", "prefix"],
      guarantees: {
        slaMsP99: 350,
      },
    },
  ],
  fixtures: {
    config: {
      bucket: "reference-artifacts",
      region: "us-east-1",
      accessKeyId: "AKIAFAKEKEY000000",
      secretAccessKey: "fake-secret-access-key-12345678",
      prefix: "summit/reference/",
      serverSideEncryption: "AES256",
      kmsKeyId: "arn:aws:kms:us-east-1:111122223333:key/abcd-efgh",
      retentionDays: 14,
      eventBridge: {
        enabled: true,
        prefixFilter: "summit/reference/",
      },
    },
    samples: {
      objectWriteEvent: {
        bucket: "reference-artifacts",
        key: "summit/reference/inputs/sample.json",
        etag: "1234567890abcdef",
        size: 2048,
        contentType: "application/json",
      },
      presignedUpload: {
        url: "https://reference-artifacts.s3.amazonaws.com/summit/reference/inputs/sample.json?signature=fake",
        expiresInSeconds: 900,
        method: "PUT",
      },
    },
  },
};

export default s3StorageAdapter;
