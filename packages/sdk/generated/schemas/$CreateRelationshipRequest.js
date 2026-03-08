"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$CreateRelationshipRequest = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$CreateRelationshipRequest = {
    properties: {
        type: {
            type: 'string',
            isRequired: true,
        },
        sourceId: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        targetId: {
            type: 'string',
            isRequired: true,
            format: 'uuid',
        },
        properties: {
            type: 'dictionary',
            contains: {
                properties: {},
            },
        },
    },
};
