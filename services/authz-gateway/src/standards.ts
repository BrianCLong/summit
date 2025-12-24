export interface StandardSchema<T> {
  version: string;
  schema: T;
}

interface JsonSchema {
  $schema: string;
  $id: string;
  type: string;
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export function buildAuditSchema(): StandardSchema<JsonSchema> {
  return {
    version: '2025-10-01',
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://schemas.summit.intelgraph/audit.json',
      type: 'object',
      additionalProperties: false,
      required: ['id', 'timestamp', 'subject', 'action', 'resource', 'decision'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        timestamp: { type: 'string', format: 'date-time' },
        subject: {
          type: 'object',
          required: ['id', 'tenantId'],
          properties: {
            id: { type: 'string' },
            tenantId: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
            clearance: { type: 'string' },
          },
        },
        action: { type: 'string' },
        resource: {
          type: 'object',
          required: ['id', 'classification', 'residency'],
          properties: {
            id: { type: 'string' },
            classification: { type: 'string' },
            residency: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        decision: {
          type: 'object',
          required: ['allow', 'reason'],
          properties: {
            allow: { type: 'boolean' },
            reason: { type: 'string' },
            obligations: {
              type: 'array',
              items: {
                type: 'object',
                required: ['type'],
                properties: {
                  type: { type: 'string' },
                  parameters: { type: 'object' },
                },
              },
            },
          },
        },
        traceId: { type: 'string' },
      },
    },
  };
}

export function buildEvalReportSchema(): StandardSchema<JsonSchema> {
  return {
    version: '2025-10-01',
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://schemas.summit.intelgraph/eval-report.json',
      type: 'object',
      additionalProperties: false,
      required: ['id', 'generatedAt', 'tests', 'result'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        generatedAt: { type: 'string', format: 'date-time' },
        tests: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'status'],
            properties: {
              name: { type: 'string' },
              status: { type: 'string', enum: ['pass', 'fail', 'warn'] },
              details: { type: 'string' },
            },
          },
        },
        result: { type: 'string', enum: ['pass', 'fail'] },
        coverage: {
          type: 'object',
          properties: {
            statements: { type: 'number' },
            branches: { type: 'number' },
          },
        },
      },
    },
  };
}

export function buildPolicyBundle() {
  const rego = `package summit.abac

default allow = false

allow {
  input.action == "dataset:read"
  input.subject.tenantId == input.resource.tenantId
  input.subject.clearance == input.resource.classification
}

allow {
  input.action == "break-glass:request"
}`;

  return {
    version: process.env.POLICY_BUNDLE_VERSION || 'v1',
    manifest: {
      revision: new Date().toISOString(),
      roots: ['policies', 'data'],
    },
    policies: [
      {
        path: 'policies/abac.rego',
        mediaType: 'text/plain',
        contents: Buffer.from(rego).toString('base64'),
      },
    ],
    metadata: {
      exportedAt: new Date().toISOString(),
      sampler: 'authz-gateway',
      residencyAware: true,
    },
  };
}

export function buildStandardHooks() {
  return {
    audit: buildAuditSchema(),
    evaluation: buildEvalReportSchema(),
    policyBundle: buildPolicyBundle(),
  };
}
