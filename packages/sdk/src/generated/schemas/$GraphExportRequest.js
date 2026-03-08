"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$GraphExportRequest = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$GraphExportRequest = {
    properties: {
        format: {
            type: 'Enum',
            isRequired: true,
        },
        includeProperties: {
            type: 'boolean',
        },
        filters: {
            type: 'GraphExportFilters',
        },
        notificationEmail: {
            type: 'string',
            description: `Optional email to notify when the export is ready`,
            format: 'email',
        },
    },
};
