"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$AuthResponse = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$AuthResponse = {
    properties: {
        token: {
            type: 'string',
            description: `JWT access token`,
        },
        refreshToken: {
            type: 'string',
            description: `Refresh token for obtaining new access tokens`,
        },
        expiresIn: {
            type: 'number',
            description: `Token expiration time in seconds`,
        },
        user: {
            type: 'User',
        },
    },
};
