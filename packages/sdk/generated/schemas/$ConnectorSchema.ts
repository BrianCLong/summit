/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $ConnectorSchema = {
    properties: {
        required: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
        properties: {
            type: 'dictionary',
            contains: {
                properties: {
                    type: {
                        type: 'string',
                    },
                    format: {
                        type: 'string',
                    },
                    title: {
                        type: 'string',
                    },
                },
            },
        },
    },
} as const;
