"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$ServiceHealth = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$ServiceHealth = {
    properties: {
        status: {
            type: 'Enum',
        },
        responseTime: {
            type: 'number',
            description: `Response time in milliseconds`,
            format: 'float',
        },
        lastCheck: {
            type: 'string',
            format: 'date-time',
        },
    },
};
