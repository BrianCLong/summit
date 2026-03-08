"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$GraphInsight = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$GraphInsight = {
    properties: {
        id: {
            type: 'string',
            format: 'uuid',
        },
        title: {
            type: 'string',
        },
        summary: {
            type: 'string',
        },
        severity: {
            type: 'Enum',
        },
        confidence: {
            type: 'number',
            format: 'float',
            maximum: 1,
        },
        tags: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
        relatedEntities: {
            type: 'array',
            contains: {
                type: 'GraphInsightEntityRef',
            },
        },
        remediation: {
            type: 'string',
        },
        generatedAt: {
            type: 'string',
            format: 'date-time',
        },
    },
};
