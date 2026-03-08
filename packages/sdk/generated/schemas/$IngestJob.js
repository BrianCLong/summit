"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$IngestJob = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$IngestJob = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
        },
        connector: {
            type: 'string',
            isRequired: true,
        },
        status: {
            type: 'Enum',
            isRequired: true,
        },
        progress: {
            type: 'number',
            isRequired: true,
            maximum: 100,
        },
    },
};
