/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $QueryResult = {
    properties: {
        data: {
            type: 'array',
            contains: {
                type: 'dictionary',
                contains: {
                    properties: {
                    },
                },
            },
        },
        columns: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
        stats: {
            properties: {
                nodesCreated: {
                    type: 'number',
                },
                nodesDeleted: {
                    type: 'number',
                },
                relationshipsCreated: {
                    type: 'number',
                },
                relationshipsDeleted: {
                    type: 'number',
                },
                executionTime: {
                    type: 'number',
                    description: `Execution time in milliseconds`,
                    format: 'float',
                },
            },
        },
    },
} as const;
