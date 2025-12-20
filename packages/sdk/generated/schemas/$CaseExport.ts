/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $CaseExport = {
    properties: {
        ok: {
            type: 'boolean',
        },
        bundle: {
            properties: {
                id: {
                    type: 'string',
                },
                title: {
                    type: 'string',
                },
                status: {
                    type: 'string',
                },
                evidence: {
                    type: 'array',
                    contains: {
                        type: 'string',
                    },
                },
                watermark: {
                    properties: {
                        ts: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
            },
        },
    },
} as const;
