/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $GraphCoverage = {
  properties: {
    nodesAnalyzed: {
      type: 'number',
    },
    relationshipsAnalyzed: {
      type: 'number',
    },
    completeness: {
      type: 'number',
      format: 'float',
      maximum: 1,
    },
    freshness: {
      type: 'string',
      description: `Timestamp representing freshness of the underlying graph data`,
      format: 'date-time',
    },
  },
} as const;
