/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $User = {
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
    },
    email: {
      type: 'string',
      format: 'email',
    },
    name: {
      type: 'string',
    },
    role: {
      type: 'Enum',
    },
    permissions: {
      type: 'array',
      contains: {
        type: 'string',
      },
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
    },
    lastLoginAt: {
      type: 'string',
      format: 'date-time',
    },
  },
} as const;
