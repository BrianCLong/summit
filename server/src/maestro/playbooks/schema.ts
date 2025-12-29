import { MAESTRO_DSL_SCHEMA } from '../dsl-schema.js';

export const PLAYBOOK_STEP_SCHEMA = {
  $id: 'https://intelgraph.dev/schemas/playbook-step.json',
  type: 'object',
  required: ['id', 'kind', 'action'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
    kind: { type: 'string', enum: ['action'] },
    name: { type: 'string' },
    action: { type: 'string', minLength: 1 },
    input: { type: 'object', additionalProperties: true },
    retry: {
      type: 'object',
      additionalProperties: false,
      required: ['maxAttempts'],
      properties: {
        maxAttempts: { type: 'integer', minimum: 1, maximum: 25 },
        backoffSeconds: { type: 'integer', minimum: 0 },
      },
    },
  },
} as const;

export const PLAYBOOK_SCHEMA = {
  $id: 'https://intelgraph.dev/schemas/playbook.json',
  type: 'object',
  required: ['id', 'name', 'steps'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    steps: {
      type: 'array',
      minItems: 1,
      items: { $ref: 'https://intelgraph.dev/schemas/playbook-step.json' },
    },
    schedule: MAESTRO_DSL_SCHEMA.properties.schedule,
  },
} as const;
