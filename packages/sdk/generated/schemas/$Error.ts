/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Error = {
    properties: {
        error: {
            properties: {
                code: {
                    type: 'string',
                },
                message: {
                    type: 'string',
                },
                details: {
                    type: 'dictionary',
                    contains: {
                        properties: {
                        },
                    },
                },
            },
        },
        timestamp: {
            type: 'string',
            format: 'date-time',
        },
        traceId: {
            type: 'string',
            description: `Request trace ID for debugging`,
        },
        fields: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
    },
} as const;
