/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Relationship = {
    properties: {
        id: {
            type: 'string',
            format: 'uuid',
        },
        type: {
            type: 'string',
        },
        sourceId: {
            type: 'string',
            format: 'uuid',
        },
        targetId: {
            type: 'string',
            format: 'uuid',
        },
        properties: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
        },
        metadata: {
            properties: {
                source: {
                    type: 'string',
                },
                confidence: {
                    type: 'number',
                    format: 'float',
                    maximum: 1,
                },
            },
        },
        createdAt: {
            type: 'string',
            format: 'date-time',
        },
    },
} as const;
