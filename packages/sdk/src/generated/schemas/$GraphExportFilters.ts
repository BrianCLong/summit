/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $GraphExportFilters = {
  properties: {
    entityTypes: {
      type: 'array',
      contains: {
        type: 'string',
      },
    },
    relationshipTypes: {
      type: 'array',
      contains: {
        type: 'string',
      },
    },
    timeRange: {
      properties: {
        start: {
          type: 'string',
          format: 'date-time',
        },
        end: {
          type: 'string',
          format: 'date-time',
        },
      },
    },
  },
} as const;
