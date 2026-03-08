"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$JobStatus = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$JobStatus = {
    properties: {
        jobId: {
            type: 'string',
            format: 'uuid',
        },
        status: {
            type: 'Enum',
        },
        progress: {
            type: 'number',
            format: 'float',
            maximum: 1,
        },
        results: {
            type: 'AnalysisResult',
        },
        error: {
            type: 'string',
        },
        createdAt: {
            type: 'string',
            format: 'date-time',
        },
        completedAt: {
            type: 'string',
            format: 'date-time',
        },
    },
};
