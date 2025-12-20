/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $GraphInsightsResponse = {
  properties: {
    graphId: {
      type: 'string',
      format: 'uuid',
    },
    insights: {
      type: 'array',
      contains: {
        type: 'GraphInsight',
      },
    },
    coverage: {
      type: 'GraphCoverage',
    },
    generatedAt: {
      type: 'string',
      format: 'date-time',
    },
  },
} as const;
