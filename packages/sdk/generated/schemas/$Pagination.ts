/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export const $Pagination = {
    properties: {
        page: {
            type: 'number',
            minimum: 1,
        },
        limit: {
            type: 'number',
            maximum: 100,
            minimum: 1,
        },
        total: {
            type: 'number',
        },
        totalPages: {
            type: 'number',
        },
        hasNext: {
            type: 'boolean',
        },
        hasPrev: {
            type: 'boolean',
        },
    },
} as const;
