/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $HealthStatus = {
  properties: {
    status: {
      type: 'Enum',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
    },
    version: {
      type: 'string',
    },
    services: {
      properties: {
        database: {
          type: 'ServiceHealth',
        },
        redis: {
          type: 'ServiceHealth',
        },
        neo4j: {
          type: 'ServiceHealth',
        },
      },
    },
  },
} as const;
