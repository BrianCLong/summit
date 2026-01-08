import type { ReferenceAdapterDefinition } from "../types";

export const webhookSinkAdapter: ReferenceAdapterDefinition = {
  manifest: {
    name: "webhook-sink",
    title: "Webhook Sink",
    version: "0.1.0",
    description: "Reference adapter that posts normalized events to an external HTTPS webhook.",
    maintainer: "Platform Reference Team",
    tags: ["webhook", "notifications", "egress"],
  },
  configSchema: {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    required: ["targetUrl"],
    additionalProperties: false,
    properties: {
      targetUrl: { type: "string", format: "uri" },
      authHeader: { type: "string" },
      hmacSecretBase64: { type: "string", minLength: 16 },
      allowedEvents: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        default: ["ingest.completed", "ingest.failed"],
      },
      retryPolicy: {
        type: "object",
        additionalProperties: false,
        properties: {
          maxAttempts: { type: "number", minimum: 0, maximum: 10, default: 3 },
          backoffMs: { type: "number", minimum: 50, maximum: 30000, default: 500 },
          jitter: { type: "boolean", default: true },
        },
        default: {},
      },
      signatureHeader: { type: "string", default: "x-webhook-signature" },
      includeTraceparent: { type: "boolean", default: true },
    },
  },
  capabilities: [
    {
      id: "webhook.emit",
      title: "Webhook emission",
      description: "Sends JSON events to downstream consumer with optional signing.",
      inputs: ["event", "metadata"],
      outputs: ["delivery_receipt"],
      configUses: ["targetUrl", "authHeader", "signatureHeader", "hmacSecretBase64"],
      guarantees: {
        slaMsP99: 1200,
      },
    },
    {
      id: "webhook.retry",
      title: "Retry with backoff",
      description: "Performs bounded retries with configurable backoff and jitter.",
      inputs: ["delivery_failure"],
      outputs: ["delivery_receipt"],
      configUses: ["retryPolicy"],
    },
    {
      id: "webhook.filter",
      title: "Event filtering",
      description: "Filters outbound events to the allowed set before delivery.",
      inputs: ["event"],
      outputs: ["event"],
      configUses: ["allowedEvents"],
    },
  ],
  fixtures: {
    config: {
      targetUrl: "https://hooks.example.com/intelgraph",
      authHeader: "Bearer example-token",
      hmacSecretBase64: "c2VjdXJlLXNlY3JldC1rZXk=",
      allowedEvents: ["ingest.completed", "ingest.failed", "artifact.available"],
      retryPolicy: {
        maxAttempts: 5,
        backoffMs: 750,
        jitter: true,
      },
      signatureHeader: "x-summit-signature",
      includeTraceparent: true,
    },
    samples: {
      event: {
        id: "evt-123",
        type: "artifact.available",
        source: "reference-adapter",
        time: "2025-01-02T15:04:05.000Z",
        data: {
          uri: "s3://reference-artifacts/summit/reference/outputs/report.pdf",
          checksum: "abc123",
        },
      },
      deliveryReceipt: {
        id: "evt-123",
        status: "delivered",
        attempts: 1,
        latencyMs: 245,
      },
    },
  },
};

export default webhookSinkAdapter;
