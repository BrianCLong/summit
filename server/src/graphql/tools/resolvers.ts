import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schema: any = {
  type: 'object',
  required: ['version', 'graph'],
  properties: {
    version: { type: 'string' },
    policy: {
      type: 'object',
      properties: {
        slaMs: { type: 'integer', minimum: 1000 },
        budgetUsd: { type: 'number', minimum: 0 },
      },
    },
    graph: {
      type: 'object',
      required: ['nodes', 'edges'],
      properties: {
        nodes: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['id', 'type'],
            properties: {
              id: { type: 'string', minLength: 1 },
              type: { type: 'string' },
              retries: { type: 'integer', minimum: 0, maximum: 5 },
              timeoutMs: { type: 'integer', minimum: 1000, maximum: 900000 },
            },
          },
        },
        edges: {
          type: 'array',
          items: {
            type: 'object',
            required: ['from', 'to'],
            properties: { from: { type: 'string' }, to: { type: 'string' } },
          },
        },
      },
    },
  },
};
const validate = ajv.compile(schema);

export const toolsResolvers = {
  Query: {
    lintRunbook: async (_: any, { yaml }: any) => {
      const rb = YAML.parse(yaml);
      const issues: any[] = [];
      if (!validate(rb)) {
        for (const e of validate.errors || [])
          issues.push({
            rule: 'SCHEMA',
            severity: 'error',
            path: e.instancePath || '/',
            message: e.message || 'invalid',
          });
      }
      const ids = new Set<string>();
      for (const n of rb.graph?.nodes || []) {
        if (ids.has(n.id))
          issues.push({
            rule: 'NODES_UNIQUE',
            severity: 'error',
            path: `/graph/nodes/${n.id}`,
            message: 'duplicate id',
          });
        ids.add(n.id);
        if ((n.retries ?? 0) > 0 && !n.timeoutMs)
          issues.push({
            rule: 'RETRY_REQUIRES_TIMEOUT',
            severity: 'warn',
            path: `/graph/nodes/${n.id}`,
            message: 'retries without timeout',
            quickFix: 'set timeoutMs: 60000',
          });
      }
      if (
        rb.policy?.residency &&
        rb.meta?.region &&
        !String(rb.meta.region)
          .toLowerCase()
          .startsWith(String(rb.policy.residency).toLowerCase())
      )
        issues.push({
          rule: 'RESIDENCY_CONFLICT',
          severity: 'error',
          path: '/meta/region',
          message: `region ${rb.meta.region} conflicts with residency ${rb.policy.residency}`,
        });
      return issues;
    },
    simulatePolicy: async (_: any, { yaml }: any) => {
      const rb = YAML.parse(yaml);
      // Stub: mark sensitivity:restricted as require-human, others allow
      const out: any[] = [];
      for (const n of rb.graph?.nodes || []) {
        const labels: string[] = Array.isArray(n.policyLabels)
          ? n.policyLabels
          : [];
        if (labels.some((l) => String(l).includes('sensitivity:restricted')))
          out.push({
            stepId: n.id,
            decision: 'require-human',
            reason: 'restricted sensitivity',
          });
        else out.push({ stepId: n.id, decision: 'allow', reason: '' });
      }
      return out;
    },
  },
};
