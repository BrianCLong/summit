"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$AuditEvent = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$AuditEvent = {
    properties: {
        timestamp: {
            type: 'string',
            format: 'date-time',
        },
        userId: {
            type: 'string',
        },
        action: {
            type: 'string',
        },
        details: {
            type: 'dictionary',
            contains: {
                properties: {},
            },
        },
        ip: {
            type: 'string',
            format: 'ipv4',
        },
        tenantId: {
            type: 'string',
        },
    },
};
