"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$CreateEntityRequest = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$CreateEntityRequest = {
    properties: {
        type: {
            type: 'string',
            isRequired: true,
        },
        properties: {
            type: 'dictionary',
            contains: {
                properties: {},
            },
            isRequired: true,
        },
        metadata: {
            properties: {
                source: {
                    type: 'string',
                },
                confidence: {
                    type: 'number',
                    format: 'float',
                    maximum: 1,
                },
            },
        },
    },
};
