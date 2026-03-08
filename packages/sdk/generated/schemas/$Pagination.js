"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$Pagination = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$Pagination = {
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
};
