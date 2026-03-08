"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$GraphInsightsResponse = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$GraphInsightsResponse = {
    properties: {
        graphId: {
            type: 'string',
            format: 'uuid',
        },
        insights: {
            type: 'array',
            contains: {
                type: 'GraphInsight',
            },
        },
        coverage: {
            type: 'GraphCoverage',
        },
        generatedAt: {
            type: 'string',
            format: 'date-time',
        },
    },
};
