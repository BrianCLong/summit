/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $GraphSummary = {
    properties: {
        id: {
            type: 'string',
            format: 'uuid',
        },
        name: {
            type: 'string',
        },
        description: {
            type: 'string',
        },
        nodeCount: {
            type: 'number',
        },
        edgeCount: {
            type: 'number',
        },
        tags: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
        createdAt: {
            type: 'string',
            format: 'date-time',
        },
        updatedAt: {
            type: 'string',
            format: 'date-time',
        },
        owner: {
            properties: {
                id: {
                    type: 'string',
                    format: 'uuid',
                },
                name: {
                    type: 'string',
                },
            },
        },
    },
} as const;
