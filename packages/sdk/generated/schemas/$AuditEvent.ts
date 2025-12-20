/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $AuditEvent = {
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
                properties: {
                },
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
} as const;
