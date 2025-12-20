/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $GraphInsight = {
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
    },
    title: {
      type: 'string',
    },
    summary: {
      type: 'string',
    },
    severity: {
      type: 'Enum',
    },
    confidence: {
      type: 'number',
      format: 'float',
      maximum: 1,
    },
    tags: {
      type: 'array',
      contains: {
        type: 'string',
      },
    },
    relatedEntities: {
      type: 'array',
      contains: {
        type: 'GraphInsightEntityRef',
      },
    },
    remediation: {
      type: 'string',
    },
    generatedAt: {
      type: 'string',
      format: 'date-time',
    },
  },
} as const;
