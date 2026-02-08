export const reportSchema = {
  $id: 'ui-fuzz-report.schema.json',
  type: 'object',
  required: ['schemaVersion', 'baseUrl', 'seed', 'violations', 'summary'],
  properties: {
    schemaVersion: { type: 'number' },
    baseUrl: { type: 'string' },
    seed: { type: 'number' },
    violations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['type', 'message'],
        properties: {
          type: { type: 'string' },
          message: { type: 'string' },
          step: { type: 'number' },
        },
      },
    },
    summary: {
      type: 'object',
      required: ['count', 'byType'],
      properties: {
        count: { type: 'number' },
        byType: { type: 'object' },
      },
    },
  },
} as const;
