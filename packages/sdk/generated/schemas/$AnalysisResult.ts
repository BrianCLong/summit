/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $AnalysisResult = {
    properties: {
        analysisType: {
            type: 'string',
        },
        results: {
            type: 'dictionary',
            contains: {
                properties: {
                },
            },
        },
        insights: {
            type: 'array',
            contains: {
                properties: {
                    type: {
                        type: 'string',
                    },
                    confidence: {
                        type: 'number',
                        format: 'float',
                    },
                    description: {
                        type: 'string',
                    },
                },
            },
        },
        executionTime: {
            type: 'number',
            format: 'float',
        },
        createdAt: {
            type: 'string',
            format: 'date-time',
        },
    },
} as const;
