"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$AnalysisResult = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$AnalysisResult = {
    properties: {
        jobId: {
            type: 'string',
            format: 'uuid',
        },
        summary: {
            type: 'string',
        },
        analysisType: {
            type: 'string',
        },
        results: {
            type: 'dictionary',
            contains: {
                properties: {},
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
        coverage: {
            type: 'GraphCoverage',
        },
        qualityScore: {
            type: 'number',
            format: 'float',
            maximum: 1,
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
};
