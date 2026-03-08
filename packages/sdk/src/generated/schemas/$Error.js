"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$Error = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$Error = {
    properties: {
        error: {
            properties: {
                code: {
                    type: 'string',
                },
                message: {
                    type: 'string',
                },
                details: {
                    type: 'dictionary',
                    contains: {
                        properties: {},
                    },
                },
            },
        },
        timestamp: {
            type: 'string',
            format: 'date-time',
        },
        traceId: {
            type: 'string',
            description: `Request trace ID for debugging`,
        },
    },
};
