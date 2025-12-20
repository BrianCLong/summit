/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CreateRelationshipRequest = {
  properties: {
    type: {
      type: 'string',
      isRequired: true,
    },
    sourceId: {
      type: 'string',
      isRequired: true,
      format: 'uuid',
    },
    targetId: {
      type: 'string',
      isRequired: true,
      format: 'uuid',
    },
    properties: {
      type: 'dictionary',
      contains: {
        properties: {
        },
      },
    },
  },
} as const;
