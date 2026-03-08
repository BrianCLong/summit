"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$GraphInsightEntityRef = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$GraphInsightEntityRef = {
    properties: {
        id: {
            type: 'string',
            format: 'uuid',
        },
        type: {
            type: 'string',
        },
        score: {
            type: 'number',
            format: 'float',
            maximum: 1,
        },
    },
};
