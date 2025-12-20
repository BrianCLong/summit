/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Entity = {
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
    },
    type: {
      type: 'string',
    },
    properties: {
      type: 'dictionary',
      contains: {
        properties: {
        },
      },
    },
    metadata: {
      properties: {
        source: {
          type: 'string',
        },
        confidence: {
          type: 'number',
          format: 'float',
          maximum: 1,
        },
        lastVerified: {
          type: 'string',
          format: 'date-time',
        },
      },
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
    },
    labels: {
      type: 'array',
      contains: {
        type: 'string',
      },
    },
  },
} as const;
