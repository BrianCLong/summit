/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $GraphExportJob = {
  properties: {
    exportId: {
      type: 'string',
      format: 'uuid',
    },
    graphId: {
      type: 'string',
      format: 'uuid',
    },
    status: {
      type: 'Enum',
    },
    format: {
      type: 'Enum',
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
    },
    completedAt: {
      type: 'string',
      format: 'date-time',
    },
    downloadUrl: {
      type: 'string',
      format: 'uri',
    },
    expiresAt: {
      type: 'string',
      format: 'date-time',
    },
    recordCount: {
      type: 'number',
    },
    filters: {
      type: 'GraphExportFilters',
    },
    message: {
      type: 'string',
    },
  },
} as const;
