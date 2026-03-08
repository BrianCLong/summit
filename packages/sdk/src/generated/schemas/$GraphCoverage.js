"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$GraphCoverage = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$GraphCoverage = {
    properties: {
        nodesAnalyzed: {
            type: 'number',
        },
        relationshipsAnalyzed: {
            type: 'number',
        },
        completeness: {
            type: 'number',
            format: 'float',
            maximum: 1,
        },
        freshness: {
            type: 'string',
            description: `Timestamp representing freshness of the underlying graph data`,
            format: 'date-time',
        },
    },
};
