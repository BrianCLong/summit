/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $SafetyClassification = {
    properties: {
        ok: {
            type: 'boolean',
        },
        classification: {
            type: 'Enum',
        },
        reasons: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
    },
} as const;
