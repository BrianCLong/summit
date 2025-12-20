/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CreateGraphRequest = {
    properties: {
        name: {
            type: 'string',
            isRequired: true,
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
            properties: {
                layout: {
                    type: 'Enum',
                },
            },
        },
    },
} as const;
