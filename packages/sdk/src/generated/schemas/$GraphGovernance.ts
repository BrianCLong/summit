/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $GraphGovernance = {
  properties: {
    sensitivity: {
      type: 'Enum',
    },
    retentionPolicy: {
      properties: {
        retentionDays: {
          type: 'number',
          description: `Number of days to retain graph data`,
        },
        legalHold: {
          type: 'boolean',
        },
      },
    },
    pii: {
      type: 'boolean',
      description: `Indicates whether the graph contains PII that requires masking`,
    },
    complianceTags: {
      type: 'array',
      contains: {
        type: 'string',
      },
    },
    dataQuality: {
      properties: {
        completeness: {
          type: 'number',
          format: 'float',
          maximum: 1,
        },
        freshness: {
          type: 'string',
          description: `Timestamp of the most recent data refresh`,
          format: 'date-time',
        },
        lineageReference: {
          type: 'string',
          description: `External lineage reference for auditing`,
        },
      },
    },
  },
} as const;
