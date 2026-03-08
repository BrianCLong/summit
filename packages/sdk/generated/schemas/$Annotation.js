"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$Annotation = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$Annotation = {
    properties: {
        id: {
            type: 'string',
            isRequired: true,
        },
        range: {
            type: 'string',
            isRequired: true,
        },
        note: {
            type: 'string',
            isRequired: true,
        },
        author: {
            type: 'string',
            format: 'email',
        },
    },
};
