"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$SafetyClassification = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$SafetyClassification = {
    properties: {
        ok: {
            type: 'boolean',
        },
        classification: {
            type: 'Enum',
        },
        reasons: {
            type: 'array',
            contains: {
                type: 'string',
            },
        },
    },
};
