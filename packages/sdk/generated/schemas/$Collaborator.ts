/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Collaborator = {
    properties: {
        userId: {
            type: 'string',
            format: 'uuid',
        },
        name: {
            type: 'string',
        },
        email: {
            type: 'string',
            format: 'email',
        },
        role: {
            type: 'Enum',
        },
        addedAt: {
            type: 'string',
            format: 'date-time',
        },
        lastActive: {
            type: 'string',
            format: 'date-time',
        },
    },
} as const;
