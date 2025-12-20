/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Suggestion = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
        },
        type: {
            type: 'Enum',
            isRequired: true,
        },
        data: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
            isRequired: true,
        },
        status: {
            type: 'Enum',
            isRequired: true,
        },
        score: {
            type: 'number',
            format: 'float',
            maximum: 1,
        },
    },
} as const;
