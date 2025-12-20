/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Case = {
    properties: {
        id: {
            type: 'string',
            description: `Unique case identifier`,
            isRequired: true,
        },
        title: {
            type: 'string',
            description: `Case title`,
            isRequired: true,
        },
        status: {
            type: 'Enum',
            isRequired: true,
        },
        evidence: {
            type: 'array',
            contains: {
                type: 'string',
            },
            isRequired: true,
        },
        createdAt: {
            type: 'string',
            format: 'date-time',
        },
    },
} as const;
