"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$GraphSummary = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$GraphSummary = {
    properties: {
        id: {
            type: 'string',
            format: 'uuid',
        },
        name: {
            type: 'string',
        },
        description: {
            type: 'string',
        },
        nodeCount: {
            type: 'number',
        },
        edgeCount: {
            type: 'number',
        },
        tags: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
        createdAt: {
            type: 'string',
            format: 'date-time',
        },
        updatedAt: {
            type: 'string',
            format: 'date-time',
        },
        owner: {
            properties: {
                id: {
                    type: 'string',
                    format: 'uuid',
                },
                name: {
                    type: 'string',
                },
            },
        },
    },
};
