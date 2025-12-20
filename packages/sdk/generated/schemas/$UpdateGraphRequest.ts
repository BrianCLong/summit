/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $UpdateGraphRequest = {
    properties: {
        name: {
            type: 'string',
            maxLength: 255,
            minLength: 1,
        },
        description: {
            type: 'string',
            maxLength: 1000,
        },
        tags: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
        configuration: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
        },
    },
} as const;
