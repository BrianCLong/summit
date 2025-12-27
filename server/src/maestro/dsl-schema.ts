export const MAESTRO_DSL_SCHEMA = {
  $id: 'https://intelgraph.dev/schemas/maestro-runbook.json',
  type: 'object',
  required: ['nodes', 'edges'],
  additionalProperties: false,
  properties: {
    nodes: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'kind'],
        additionalProperties: true,
        properties: {
          id: { type: 'string', minLength: 1 },
          kind: {
            type: 'string',
            enum: ['task', 'agent_call', 'subflow', 'gateway'],
          },
          name: { type: 'string' },
          ref: { type: 'string' },
          inputMapping: { type: 'object', additionalProperties: true },
          outputMapping: { type: 'object', additionalProperties: true },
          conditions: {
            type: 'array',
            items: {
              type: 'object',
              required: ['expression', 'targetNodeId'],
              properties: {
                expression: { type: 'string' },
                targetNodeId: { type: 'string' },
              },
              additionalProperties: false,
            },
          },
          config: { type: 'object', additionalProperties: true },
        },
      },
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        required: ['from', 'to'],
        additionalProperties: false,
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          conditionId: { type: 'string' },
        },
      },
    },
    schedule: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        cron: { type: 'string' },
        timezone: { type: 'string' },
      },
      required: ['enabled'],
    },
  },
} as const;
