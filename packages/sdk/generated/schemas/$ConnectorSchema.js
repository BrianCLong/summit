"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$ConnectorSchema = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$ConnectorSchema = {
    properties: {
        required: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
        properties: {
            type: 'dictionary',
            contains: {
                properties: {
                    type: {
                        type: 'string',
                    },
                    format: {
                        type: 'string',
                    },
                    title: {
                        type: 'string',
                    },
                },
            },
        },
    },
};
