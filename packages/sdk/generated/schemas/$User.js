"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$User = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$User = {
    properties: {
        id: {
            type: 'string',
            format: 'uuid',
        },
        email: {
            type: 'string',
            format: 'email',
        },
        name: {
            type: 'string',
        },
        role: {
            type: 'Enum',
        },
        permissions: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
        tenantId: {
            type: 'string',
        },
        createdAt: {
            type: 'string',
            format: 'date-time',
        },
        lastLoginAt: {
            type: 'string',
            format: 'date-time',
        },
    },
};
