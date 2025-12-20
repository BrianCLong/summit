/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ServiceHealth = {
  properties: {
    status: {
      type: 'Enum',
    },
    responseTime: {
      type: 'number',
      description: `Response time in milliseconds`,
      format: 'float',
    },
    lastCheck: {
      type: 'string',
      format: 'date-time',
    },
  },
} as const;
