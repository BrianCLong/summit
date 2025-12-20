/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $IngestJob = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
        },
        connector: {
            type: 'string',
            isRequired: true,
        },
        status: {
            type: 'Enum',
            isRequired: true,
        },
        progress: {
            type: 'number',
            isRequired: true,
            maximum: 100,
        },
    },
} as const;
